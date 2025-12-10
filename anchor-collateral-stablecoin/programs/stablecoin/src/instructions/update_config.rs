use crate::{
    constants::{SEED_MINT_ACCOUNT, SEED_TREASURY_ACCOUNT},
    error::ErrorCode,
    Config, SEED_CONFIG_ACCOUNT,
};
use anchor_lang::prelude::*;
use anchor_spl::{
    token_2022::Token2022,
    token_interface::{Mint, TokenAccount},
};

#[derive(Accounts)]
pub struct UpdateConfig<'info> {
    #[account(mut, constraint = authority.key() == config.authority @ ErrorCode::Unauthorized)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [SEED_CONFIG_ACCOUNT],
        bump = config.bump
    )]
    pub config: Account<'info, Config>,

    #[account(
        seeds = [SEED_MINT_ACCOUNT],
        bump,
    )]
    pub mint_account: InterfaceAccount<'info, Mint>,

    #[account(
        seeds = [SEED_TREASURY_ACCOUNT, config.key().as_ref()],
        bump,
    )]
    pub treasury: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Program<'info, Token2022>,
    pub system_program: Program<'info, System>,
}

impl<'info> UpdateConfig<'info> {
    pub fn update_config(
        &mut self,
        max_ltv_bps: Option<u16>,
        liquidation_ltv_bps: Option<u16>,
        liquidation_bonus_bps: Option<u16>,
        min_health_factor_bps: Option<u16>,
        borrow_rate_bps: Option<u16>,
        supply_cap: Option<u64>,
        paused: Option<bool>,
    ) -> Result<()> {
        let config = &mut self.config;

        // Validate and update max_ltv_bps
        if let Some(max_ltv) = max_ltv_bps {
            require!(max_ltv > 0 && max_ltv <= 10000, ErrorCode::InvalidBps);
            require!(
                max_ltv < config.liquidation_ltv_bps,
                ErrorCode::MaxLtvMustBeLessThanLiquidationLtv
            );
            config.max_ltv_bps = max_ltv;
        }

        // Validate and update liquidation_ltv_bps
        if let Some(liq_ltv) = liquidation_ltv_bps {
            require!(liq_ltv > 0 && liq_ltv <= 10000, ErrorCode::InvalidBps);
            require!(
                liq_ltv > config.max_ltv_bps,
                ErrorCode::LiquidationLtvMustBeGreaterThanMaxLtv
            );
            config.liquidation_ltv_bps = liq_ltv;
        }

        // Validate and update liquidation_bonus_bps
        if let Some(bonus) = liquidation_bonus_bps {
            require!(bonus <= 2000, ErrorCode::LiquidationBonusTooHigh); // Max 20% bonus
            config.liquidation_bonus_bps = bonus;
        }

        // Validate and update min_health_factor_bps
        if let Some(min_health) = min_health_factor_bps {
            require!(min_health >= 10000, ErrorCode::MinHealthFactorTooLow); // Min 100%
            require!(min_health <= 20000, ErrorCode::MinHealthFactorTooHigh); // Max 200%
            config.min_health_factor_bps = min_health;
        }

        // Validate and update borrow_rate_bps
        if let Some(rate) = borrow_rate_bps {
            require!(rate <= 5000, ErrorCode::BorrowRateTooHigh); // Max 50% APR
            config.borrow_rate_bps = rate;
        }

        // Update supply_cap (no validation needed, can be any u64)
        if let Some(cap) = supply_cap {
            config.supply_cap = cap;
        }

        // Update paused flag
        if let Some(pause_state) = paused {
            config.paused = pause_state;
        }

        Ok(())
    }
}
