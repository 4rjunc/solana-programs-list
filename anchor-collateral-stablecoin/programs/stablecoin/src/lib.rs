use anchor_lang::prelude::*;

pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;
pub mod utils;

pub use constants::*;
pub use instructions::*;
pub use state::*;
pub use utils::*;

declare_id!("2QNZpDanDBkbspsKkH2eRj7KKf4GxdswzZmbZ5gVzfQQ");

#[program]
pub mod collateral_stablecoin {
    use super::*;

    pub fn initialize_config(
        ctx: Context<InitializeConfig>,
        max_ltv_bps: u16,
        liquidation_ltv_bps: u16,
        liquidation_bonus_bps: u16,
        min_health_factor_bps: u16,
        borrow_rate_bps: u16,
        supply_cap: u64,
    ) -> Result<()> {
        ctx.accounts.initialize_config(
            max_ltv_bps,
            liquidation_ltv_bps,
            liquidation_bonus_bps,
            min_health_factor_bps,
            borrow_rate_bps,
            supply_cap,
            ctx.bumps,
        )
    }

    pub fn update_config(
        ctx: Context<UpdateConfig>,
        max_ltv_bps: Option<u16>,
        liquidation_ltv_bps: Option<u16>,
        liquidation_bonus_bps: Option<u16>,
        min_health_factor_bps: Option<u16>,
        borrow_rate_bps: Option<u16>,
        supply_cap: Option<u64>,
        paused: Option<bool>,
    ) -> Result<()> {
        ctx.accounts.update_config(
            max_ltv_bps,
            liquidation_ltv_bps,
            liquidation_bonus_bps,
            min_health_factor_bps,
            borrow_rate_bps,
            supply_cap,
            paused,
        )
    }

    pub fn deposit_collateral(
        ctx: Context<DepositCollateral>,
        collateral_amount: u64,
        stablecoin_to_mint_amount: u64,
    ) -> Result<()> {
        ctx.accounts.deposit_collateral_and_mint_tokens(
            collateral_amount,
            stablecoin_to_mint_amount,
            ctx.bumps,
        )
    }

    pub fn withdraw_collateral(
        ctx: Context<RedeemCollateral>,
        collateral_amount: u64,
        stablecoin_to_burn_amount: u64,
    ) -> Result<()> {
        ctx.accounts
            .redeem_collateral_and_burn_tokens(collateral_amount, stablecoin_to_burn_amount)
    }

    pub fn liquidate(ctx: Context<Liquidate>) -> Result<()> {
        ctx.accounts.liquidate()
    }
}
