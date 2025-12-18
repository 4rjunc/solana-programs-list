use anchor_lang::prelude::*;
use anchor_spl::token::Mint;

use crate::errors::Error;

#[account]
pub struct BondingCurve {
    pub virtual_token_reserve: u64,
    pub virtual_sol_reserve: u64,
    pub real_token_reserve: u64,
    pub real_sol_reserve: u64,
    pub token_total_supply: u64,
    pub is_completed: bool,
    pub is_migrated: bool,
    pub reserved: [u8; 8],
}

impl<'info> BondingCurve {
    pub const SEED_PREFIX: &'static str = "bonding_curve";
    pub const LEN: usize = 8 * 5 + 1 + 1 + 8;
}
