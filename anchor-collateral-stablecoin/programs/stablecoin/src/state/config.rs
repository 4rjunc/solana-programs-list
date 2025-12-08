use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Config {
  pub authority: Pubkey,
  pub stablecoin_mint: Pubkey,
  pub max_ltv_bps: u16,
  pub liquidation_ltv_bps: u16,
  pub liquidation_bonus_bps: u16,
  pub min_health_factor_bps: u16,
  pub borrow_rate_bps: u16,
  pub supply_cap: u64,
  pub treasury: Pubkey,
  pub paused: bool,
  pub bump: u8,
  pub mint_authority_bump: u8
}