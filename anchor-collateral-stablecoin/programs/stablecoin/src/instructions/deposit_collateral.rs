use crate::{
    accrue_interest, calculate_health_factor,
    constants::{SEED_MINT_ACCOUNT, SEED_TREASURY_ACCOUNT},
    error::ErrorCode,
    utils::{calculate_collateral_value, calculate_max_borrowable_amount},
    Config, Position, FEED_ID, MAXIMUM_AGE, SEED_COLLATERAL_ACCOUNT, SEED_CONFIG_ACCOUNT,
    SEED_MINT_AUTHORITY, SEED_POSITION_ACCOUNT,
};
use anchor_lang::{
    prelude::*,
    solana_program::{program::invoke, system_instruction::transfer},
};
use anchor_spl::{
    associated_token::AssociatedToken,
    token_2022::Token2022,
    token_interface::{mint_to, Mint, MintTo, TokenAccount},
};
use pyth_solana_receiver_sdk::price_update::{get_feed_id_from_hex, PriceUpdateV2};

#[derive(Accounts)]
pub struct DepositCollateral<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        seeds = [SEED_CONFIG_ACCOUNT],
        bump = config.bump
    )]
    pub config: Account<'info, Config>,

    #[account(
        init_if_needed,
        payer = owner,
        space = 8 + Position::INIT_SPACE,
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

impl<'info> DepositCollateral<'info> {
    fn transfer_collateral(&self, collateral_amount: u64) -> Result<()> {
        let ix = transfer(
            &self.owner.key(),
            &self.collateral_vault.key(),
            collateral_amount,
        );
        invoke(
            &ix,
            &[
                self.owner.to_account_info(),
                self.collateral_vault.to_account_info(),
                self.system_program.to_account_info(),
            ],
        )?;
        Ok(())
    }

    fn fetch_price_and_accrue_debt(
        &mut self,
    ) -> Result<pyth_solana_receiver_sdk::price_update::Price> {
        let current_ts = Clock::get()?.unix_timestamp;

        let price = self.price_update.get_price_no_older_than(
            &Clock::get()?,
            MAXIMUM_AGE,
            &get_feed_id_from_hex(FEED_ID)?,
        )?;

        if self.position.active {
            let new_debt: u64 = accrue_interest(
                self.position.debt_shares,
                self.config.borrow_rate_bps,
                self.position.last_update_timestamp,
                current_ts,
            )?;
            self.position.debt_shares = new_debt;
        }

        Ok(price)
    }

    fn validate_borrow_limits(
        &self,
        collateral_amount: u64,
        mint_amount: u64,
        price: &pyth_solana_receiver_sdk::price_update::Price,
    ) -> Result<(u64, u64, u64)> {
        let new_collateral = self
            .position
            .deposited_collateral
            .checked_add(collateral_amount)
            .ok_or(ErrorCode::MathOverflow)?;

        let collateral_value_usd =
            calculate_collateral_value(new_collateral, price.price, price.exponent)?;

        let max_borrowable =
            calculate_max_borrowable_amount(collateral_value_usd, self.config.max_ltv_bps)?;

        let new_total_debt = self
            .position
            .debt_shares
            .checked_add(mint_amount)
            .ok_or(ErrorCode::MathOverflow)?;

        require!(new_total_debt <= max_borrowable, ErrorCode::ExceedsMaxLtv);

        // Supply cap check
        let new_supply = self
            .mint_account
            .supply
            .checked_add(mint_amount)
            .ok_or(ErrorCode::MathOverflow)?;
        require!(
            new_supply <= self.config.supply_cap,
            ErrorCode::SupplyCapExceeded
        );

        Ok((collateral_value_usd, max_borrowable, new_total_debt))
    }

    fn mint_stablecoin_to_user(&self, amount: u64) -> Result<()> {
        let config_key = self.config.key();
        let seeds = &[
            SEED_MINT_AUTHORITY,
            config_key.as_ref(),
            &[self.config.mint_authority_bump],
        ];
        let signer_seeds = &[&seeds[..]];

        let cpi_accounts = MintTo {
            mint: self.mint_account.to_account_info(),
            to: self.user_stablecoin_ata.to_account_info(),
            authority: self.mint_authority.to_account_info(),
        };

        let ctx = CpiContext::new_with_signer(
            self.token_program.to_account_info(),
            cpi_accounts,
            signer_seeds,
        );

        mint_to(ctx, amount)?;
        Ok(())
    }

    fn update_position_after_deposit(
        &mut self,
        collateral_amount: u64,
        new_total_debt: u64,
        collateral_value_usd: u64,
        bumps: DepositCollateralBumps,
    ) -> Result<()> {
        self.position.owner = self.owner.key();
        self.position.collateral_vault = self.collateral_vault.key();
        self.position.deposited_collateral = self
            .position
            .deposited_collateral
            .checked_add(collateral_amount)
            .ok_or(ErrorCode::MathOverflow)?;
        self.position.debt_shares = new_total_debt;
        self.position.last_update_timestamp = Clock::get()?.unix_timestamp;
        self.position.active = true;

        if self.position.bump == 0 {
            self.position.bump = bumps.position;
            self.position.vault_bump = bumps.collateral_vault;
        }

        let health_factor = calculate_health_factor(
            collateral_value_usd,
            new_total_debt,
            self.config.liquidation_ltv_bps,
        )?;

        require!(
            health_factor >= self.config.min_health_factor_bps,
            ErrorCode::HealthFactorTooLow
        );

        msg!("Deposited {}, minted {}", collateral_amount, new_total_debt);
        msg!("Health factor: {}", health_factor);

        Ok(())
    }

    pub fn deposit_collateral_and_mint_tokens(
        &mut self,
        collateral_amount: u64,
        stablecoin_to_mint: u64,
        bumps: DepositCollateralBumps,
    ) -> Result<()> {
        require!(!self.config.paused, ErrorCode::SystemPaused);
        require!(collateral_amount > 0, ErrorCode::InvalidAmount);

        // Transfer collateral from user → vault
        self.transfer_collateral(collateral_amount)?;

        // Fetch oracle price & accrue interest on debt
        let price = self.fetch_price_and_accrue_debt()?;

        // Validate LTV, supply cap, debt limits
        let (collateral_value_usd, _max_borrowable, new_total_debt) =
            self.validate_borrow_limits(collateral_amount, stablecoin_to_mint, &price)?;

        // Mint stablecoin to user (includes corrected signer seeds!)
        self.mint_stablecoin_to_user(stablecoin_to_mint)?;

        // Update user position and check health factor
        self.update_position_after_deposit(
            collateral_amount,
            new_total_debt,
            collateral_value_usd,
            bumps,
        )?;

        Ok(())
    }
}
