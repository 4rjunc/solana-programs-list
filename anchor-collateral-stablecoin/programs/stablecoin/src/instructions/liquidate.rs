use crate::{
    constants::{
        SEED_COLLATERAL_ACCOUNT, SEED_CONFIG_ACCOUNT, SEED_MINT_ACCOUNT, SEED_MINT_AUTHORITY,
        SEED_POSITION_ACCOUNT, SEED_TREASURY_ACCOUNT,
    },
    error::ErrorCode,
    state::{Config, Position},
    utils::{accrue_interest, calculate_collateral_value, calculate_liquidation_amounts},
    FEED_ID, MAXIMUM_AGE,
};
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_2022::Token2022,
    token_interface::{burn, Burn, Mint, TokenAccount},
};
use pyth_solana_receiver_sdk::price_update::{get_feed_id_from_hex, PriceUpdateV2};

#[derive(Accounts)]
pub struct Liquidate<'info> {
    #[account(mut)]
    pub liquidator: Signer<'info>,

    #[account(
        seeds = [SEED_CONFIG_ACCOUNT],
        bump = config.bump
    )]
    pub config: Account<'info, Config>,

    #[account(
        mut,
        seeds = [SEED_POSITION_ACCOUNT, position.owner.as_ref()],
        bump = position.bump,
        constraint = position.active @ ErrorCode::PositionNotActive
    )]
    pub position: Account<'info, Position>,

    #[account(mut)]
    pub position_owner: SystemAccount<'info>,

    #[account(
        mut,
        seeds = [SEED_COLLATERAL_ACCOUNT, position.owner.as_ref()],
        bump = position.vault_bump
    )]
    pub collateral_vault: SystemAccount<'info>,

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
        payer = liquidator,
        associated_token::mint = mint_account,
        associated_token::authority = liquidator
    )]
    pub liquidator_stablecoin_ata: InterfaceAccount<'info, TokenAccount>,

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

impl<'info> Liquidate<'info> {
    /// Fetch latest oracle price
    fn fetch_price(&self) -> Result<pyth_solana_receiver_sdk::price_update::Price> {
        let price = self.price_update.get_price_no_older_than(
            &Clock::get()?,
            MAXIMUM_AGE,
            &get_feed_id_from_hex(FEED_ID)?,
        )?;

        Ok(price)
    }

    /// Accrue interest on borrower debt
    fn accrue_debt(&mut self) -> Result<u64> {
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

    /// Compute current LTV based on oracle price
    fn compute_ltv(&self, collateral_value_usd: u64) -> Result<u16> {
        if collateral_value_usd == 0 {
            return Ok(u16::MAX);
        }

        let ltv = (self.position.debt_shares as u128)
            .checked_mul(10_000)
            .ok_or(ErrorCode::MathOverflow)?
            .checked_div(collateral_value_usd as u128)
            .ok_or(ErrorCode::MathOverflow)?;

        let ltv_u16 =
            u16::try_from(ltv.min(u16::MAX as u128)).map_err(|_| ErrorCode::MathOverflow)?;

        Ok(ltv_u16)
    }

    /// Ensure liquidator has enough stablecoin
    fn verify_liquidator_balance(&self) -> Result<()> {
        require!(
            self.liquidator_stablecoin_ata.amount >= self.position.debt_shares,
            ErrorCode::InsufficientBalance
        );
        Ok(())
    }

    /// Burn liquidator's stablecoin equal to borrower's debt
    fn burn_liquidator_tokens(&self) -> Result<()> {
        let cpi_accounts = Burn {
            mint: self.mint_account.to_account_info(),
            from: self.liquidator_stablecoin_ata.to_account_info(),
            authority: self.liquidator.to_account_info(),
        };

        let ctx = CpiContext::new(self.token_program.to_account_info(), cpi_accounts);
        burn(ctx, self.position.debt_shares)?;
        Ok(())
    }

    /// Move seized collateral to liquidator
    fn transfer_seized_collateral(&mut self, seized: u64) -> Result<()> {
        let vault_lamports = self.collateral_vault.lamports();
        require!(vault_lamports >= seized, ErrorCode::InsufficientCollateral);

        **self
            .collateral_vault
            .to_account_info()
            .try_borrow_mut_lamports()? = self
            .collateral_vault
            .lamports()
            .checked_sub(seized)
            .ok_or(ErrorCode::MathOverflow)?;

        **self
            .liquidator
            .to_account_info()
            .try_borrow_mut_lamports()? = self
            .liquidator
            .lamports()
            .checked_add(seized)
            .ok_or(ErrorCode::MathOverflow)?;

        Ok(())
    }

    /// Send leftover collateral back to borrower
    fn return_remaining_collateral(&mut self, remaining: u64) -> Result<()> {
        if remaining == 0 {
            return Ok(());
        }

        let vault_balance = self.collateral_vault.lamports();
        let to_transfer = remaining.min(vault_balance);

        if to_transfer > 0 {
            **self
                .collateral_vault
                .to_account_info()
                .try_borrow_mut_lamports()? = self
                .collateral_vault
                .lamports()
                .checked_sub(to_transfer)
                .ok_or(ErrorCode::MathOverflow)?;

            **self
                .position_owner
                .to_account_info()
                .try_borrow_mut_lamports()? = self
                .position_owner
                .lamports()
                .checked_add(to_transfer)
                .ok_or(ErrorCode::MathOverflow)?;
        }

        Ok(())
    }

    /// Reset position to empty + inactive
    fn clear_position(&mut self) -> Result<()> {
        self.position.debt_shares = 0;
        self.position.deposited_collateral = 0;
        self.position.active = false;
        self.position.last_update_timestamp = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn liquidate(&mut self) -> Result<()> {
        require!(!self.config.paused, ErrorCode::SystemPaused);

        // 1) Get oracle price
        let price = self.fetch_price()?;

        // 2) Accrue interest
        let debt = self.accrue_debt()?;

        // 3) Compute collateral value
        let collateral_value_usd = calculate_collateral_value(
            self.position.deposited_collateral,
            price.price,
            price.exponent,
        )?;

        // 4) Check LTV
        let current_ltv = self.compute_ltv(collateral_value_usd)?;
        require!(
            current_ltv >= self.config.liquidation_ltv_bps,
            ErrorCode::PositionNotLiquidatable
        );

        // 5) Compute liquidation amounts
        let (collateral_to_seize, remaining_collateral) = calculate_liquidation_amounts(
            self.position.debt_shares,
            self.position.deposited_collateral,
            self.config.liquidation_bonus_bps,
            price.price,
            price.exponent,
        )?;

        // 6) Ensure liquidator can burn stablecoin
        self.verify_liquidator_balance()?;

        // 7) Burn stablecoin
        self.burn_liquidator_tokens()?;

        // 8) Transfer seized collateral to liquidator
        self.transfer_seized_collateral(collateral_to_seize)?;

        // 9) Return remainder to borrower
        self.return_remaining_collateral(remaining_collateral)?;

        // 10) Clear position
        self.clear_position()?;

        msg!(
            "Liquidated position: debt={}, collateral_seized={}, remaining={}",
            debt,
            collateral_to_seize,
            remaining_collateral
        );
        msg!("LTV at liquidation: {}%", current_ltv);

        Ok(())
    }
}
