use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Position {
  pub owner: Pubkey,
  pub collateral_vault: Pubkey,
  pub deposited_collateral: u64,
  pub debt_shares: u64,
  pub last_update_timestamp: i64,
  pub active: bool,
  pub bump: u8,
  pub vault_bump: u8,
}