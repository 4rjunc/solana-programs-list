use crate::{
    accrue_interest, calculate_health_factor,
    constants::{SEED_MINT_ACCOUNT, SEED_TREASURY_ACCOUNT},
    error::ErrorCode,
    utils::calculate_collateral_value,
    Config, Position, FEED_ID, MAXIMUM_AGE, SEED_COLLATERAL_ACCOUNT, SEED_CONFIG_ACCOUNT,
    SEED_MINT_AUTHORITY, SEED_POSITION_ACCOUNT,
};
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_2022::Token2022,
    token_interface::{burn, Burn, Mint, TokenAccount},
};
use pyth_solana_receiver_sdk::price_update::{get_feed_id_from_hex, PriceUpdateV2};

#[derive(Accounts)]
pub struct RedeemCollateral<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        seeds = [SEED_CONFIG_ACCOUNT],
        bump = config.bump
    )]
    pub config: Account<'info, Config>,

    #[account(
        mut,
        seeds = [SEED_POSITION_ACCOUNT, owner.key().as_ref()],
        bump
    )]
    pub position: Account<'info, Position>,

    // PDA vault that stores SOL (NOT a token account)
    /// CHECK: PDA acts as a system account vault
    #[account(
        mut,
        seeds = [SEED_COLLATERAL_ACCOUNT, owner.key().as_ref()],
        bump
    )]
    pub collateral_vault: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [SEED_MINT_ACCOUNT],
        bump,
    )]
    pub mint_account: InterfaceAccount<'info, Mint>,

    /// CHECK: PDA mint authority
    #[account(
        seeds = [SEED_MINT_AUTHORITY, config.key().as_ref()],
        bump = config.mint_authority_bump
    )]
    pub mint_authority: UncheckedAccount<'info>,

    #[account(
        init_if_needed,
        payer = owner,
        associated_token::mint = mint_account,
        associated_token::authority = owner
    )]
    pub user_stablecoin_ata: InterfaceAccount<'info, TokenAccount>,

    #[account(
        seeds = [SEED_TREASURY_ACCOUNT, config.key().as_ref()],
        bump,
    )]
    pub treasury: InterfaceAccount<'info, TokenAccount>,

    pub price_update: Account<'info, PriceUpdateV2>,

    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_program: Program<'info, Token2022>,
    pub system_program: Program<'info, System>,
}

impl<'info> RedeemCollateral<'info> {
    /// Accrue interest on debt
    fn accrue_existing_debt(&mut self) -> Result<u64> {
        let current_ts = Clock::get()?.unix_timestamp;

        let new_debt = accrue_interest(
            self.position.debt_shares,
            self.config.borrow_rate_bps,
            self.position.last_update_timestamp,
            current_ts,
        )?;

        self.position.debt_shares = new_debt;
        Ok(new_debt)
    }

    /// Burn stablecoin from the user's ATA & reduce debt
    fn burn_stablecoin(&mut self, amount: u64) -> Result<()> {
        require!(
            self.user_stablecoin_ata.amount >= amount,
            ErrorCode::InsufficientBalance
        );

        let cpi_accounts = Burn {
            mint: self.mint_account.to_account_info(),
            from: self.user_stablecoin_ata.to_account_info(),
            authority: self.owner.to_account_info(),
        };

        let ctx = CpiContext::new(self.token_program.to_account_info(), cpi_accounts);
        burn(ctx, amount)?;

        self.position.debt_shares = self
            .position
            .debt_shares
            .checked_sub(amount)
            .ok_or(ErrorCode::MathOverflow)?;

        Ok(())
    }

    /// Withdraw SOL collateral from the PDA vault
    fn withdraw_collateral(&mut self, amount: u64) -> Result<()> {
        require!(
            self.position.deposited_collateral >= amount,
            ErrorCode::InsufficientCollateral
        );

        let vault_lamports = self.collateral_vault.lamports();
        require!(vault_lamports >= amount, ErrorCode::InsufficientCollateral);

        // Get the PDA seeds for the collateral vault
        let owner_key = self.owner.key();
        let seeds = &[
            SEED_COLLATERAL_ACCOUNT,
            owner_key.as_ref(),
            &[self.position.vault_bump],
        ];
        let signer_seeds = &[&seeds[..]];

        // Transfer SOL from PDA vault to user using invoke_signed
        let ix = anchor_lang::solana_program::system_instruction::transfer(
            &self.collateral_vault.key(),
            &self.owner.key(),
            amount,
        );

        anchor_lang::solana_program::program::invoke_signed(
            &ix,
            &[
                self.collateral_vault.to_account_info(),
                self.owner.to_account_info(),
                self.system_program.to_account_info(),
            ],
            signer_seeds,
        )?;

        // Update position state
        self.position.deposited_collateral = self
            .position
            .deposited_collateral
            .checked_sub(amount)
            .ok_or(ErrorCode::MathOverflow)?;

        Ok(())
    }

    /// Verify health factor if debt remains
    fn check_health_factor(&self) -> Result<()> {
        if self.position.debt_shares == 0 {
            return Ok(());
        }

        let price = self.price_update.get_price_no_older_than(
            &Clock::get()?,
            MAXIMUM_AGE,
            &get_feed_id_from_hex(FEED_ID)?,
        )?;

        let collateral_value_usd = calculate_collateral_value(
            self.position.deposited_collateral,
            price.price,
            price.exponent,
        )?;

        let health_factor = calculate_health_factor(
            collateral_value_usd,
            self.position.debt_shares,
            self.config.liquidation_ltv_bps,
        )?;

        require!(
            health_factor >= self.config.min_health_factor_bps,
            ErrorCode::HealthFactorTooLow
        );

        msg!("Health factor after withdrawal: {}", health_factor);
        Ok(())
    }

    /// Close the user position only if fully repaid AND empty
    fn close_position_if_clear(&mut self) {
        if self.position.debt_shares == 0 && self.position.deposited_collateral == 0 {
            self.position.active = false;
            msg!("Position closed");
        }
    }

    pub fn redeem_collateral_and_burn_tokens(
        &mut self,
        stablecoin_to_burn: u64,
        collateral_to_withdraw: u64,
    ) -> Result<()> {
        require!(!self.config.paused, ErrorCode::SystemPaused);
        require!(
            stablecoin_to_burn > 0 || collateral_to_withdraw > 0,
            ErrorCode::InvalidAmount
        );

        // 1) Accrue interest
        self.accrue_existing_debt()?;

        // 2) Burn tokens if requested
        if stablecoin_to_burn > 0 {
            self.burn_stablecoin(stablecoin_to_burn)?;
        }

        // 3) Withdraw collateral if requested
        if collateral_to_withdraw > 0 {
            self.withdraw_collateral(collateral_to_withdraw)?;
        }

        // 4) Check health factor if debt remains
        self.check_health_factor()?;

        // 5) Update timestamp
        self.position.last_update_timestamp = Clock::get()?.unix_timestamp;

        // 6) Close position if empty
        self.close_position_if_clear();

        msg!(
            "Burned {} stablecoin, withdrew {} lamports",
            stablecoin_to_burn,
            collateral_to_withdraw
        );

        Ok(())
    }
}
