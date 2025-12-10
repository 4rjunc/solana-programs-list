use crate::{
    constants::{MINT_DECIMALS, SEED_MINT_ACCOUNT, SEED_TREASURY_ACCOUNT},
    error::ErrorCode,
    Config, SEED_CONFIG_ACCOUNT,
};
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_2022::Token2022,
    token_interface::{Mint, TokenAccount},
};

#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = 8 + Config::INIT_SPACE,
        seeds = [SEED_CONFIG_ACCOUNT],
        bump
    )]
    pub config: Account<'info, Config>,

    #[account(
        init,
        payer = authority,
        seeds = [SEED_MINT_ACCOUNT],
        bump,
        mint::decimals = MINT_DECIMALS,
        mint::authority = mint_authority,
        mint::freeze_authority = mint_authority,
        mint::token_program = token_program
    )]
    pub mint_account: InterfaceAccount<'info, Mint>,

    /// CHECK: PDA that will be the mint authority
    #[account(
        seeds = [b"mint_authority", config.key().as_ref()],
        bump
    )]
    pub mint_authority: UncheckedAccount<'info>,

    #[account(
        init,
        payer = authority,
        seeds = [SEED_TREASURY_ACCOUNT, config.key().as_ref()],
        bump,
        token::mint = mint_account,
        token::authority = treasury,
        token::token_program = token_program
    )]
    pub treasury: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Program<'info, Token2022>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

impl<'info> InitializeConfig<'info> {
    pub fn initialize_config(
        &mut self,
        max_ltv_bps: u16,
        liquidation_ltv_bps: u16,
        liquidation_bonus_bps: u16,
        min_health_factor_bps: u16,
        borrow_rate_bps: u16,
        supply_cap: u64,
        bumps: InitializeConfigBumps,
    ) -> Result<()> {
        // Validate max_ltv_bps
        require!(
            max_ltv_bps > 0 && max_ltv_bps <= 10000,
            ErrorCode::InvalidBps
        );

        // Validate liquidation_ltv_bps
        require!(
            liquidation_ltv_bps > 0 && liquidation_ltv_bps <= 10000,
            ErrorCode::InvalidBps
        );

        // Validate liquidation_ltv > max_ltv
        require!(
            liquidation_ltv_bps > max_ltv_bps,
            ErrorCode::LiquidationLtvMustBeGreaterThanMaxLtv
        );

        // Validate liquidation_bonus_bps (max 20%)
        require!(
            liquidation_bonus_bps <= 2000,
            ErrorCode::LiquidationBonusTooHigh
        );

        // Validate min_health_factor_bps (must be at least 100%, max 200%)
        require!(
            min_health_factor_bps >= 10000,
            ErrorCode::MinHealthFactorTooLow
        );
        require!(
            min_health_factor_bps <= 20000,
            ErrorCode::MinHealthFactorTooHigh
        );

        // Validate borrow_rate_bps (max 50% APR)
        require!(borrow_rate_bps <= 5000, ErrorCode::BorrowRateTooHigh);

        // Validate supply_cap (must be greater than 0)
        require!(supply_cap > 0, ErrorCode::InvalidSupplyCap);

        self.config.set_inner(Config {
            authority: self.authority.key(),
            stablecoin_mint: self.mint_account.key(),
            max_ltv_bps,
            liquidation_ltv_bps,
            liquidation_bonus_bps,
            min_health_factor_bps,
            borrow_rate_bps,
            supply_cap,
            treasury: self.treasury.key(),
            paused: false,
            bump: bumps.config,
            mint_authority_bump: bumps.mint_authority,
        });

        Ok(())
    }
}
