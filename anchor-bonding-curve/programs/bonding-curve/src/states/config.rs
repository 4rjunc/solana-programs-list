use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct ConfigSettings {
    pub authority: Pubkey, // admin wallet authorized to update platform configuration
    pub fee_recipient: Pubkey, // wallet receiving all trading and migration fees
    pub curve_limit: u64, // target SOL amount (lamports) to complete bonding curve and enable migration

    pub initial_virtual_token_reserve: u64, // virtual token supply for price calculation (creates liquidity cushion)
    pub initial_virtual_sol_reserve: u64, // virtual SOL reserve for price calculation (sets starting price)
    pub initial_real_token_reserve: u64,  // actual tokens available for trading on bonding curve
    pub total_token_supply: u64, // maximum token supply minted at launch (immutable after mint authority revoked)

    pub buy_fee_percentage: f64, // fee percentage charged when buying tokens
    pub sell_fee_percentage: f64, // fee percentage charged when selling tokens
    pub migration_fee_percentage: f64, // fee percentage taken from SOL reserves during Raydium migration
    pub reserved: [[u8; 8]; 8], // reserved space (64 bytes) for future upgrades without account reallocation
}

#[account]
#[derive(InitSpace)]
pub struct Config {
    pub authority: Pubkey, // admin wallet authorized to update platform configuration
    pub fee_recipient: Pubkey, // wallet receiving all trading and migration fees
    pub curve_limit: u64, // target SOL amount (lamports) to complete bonding curve and enable migration

    pub initial_virtual_token_reserve: u64, // virtual token supply for price calculation (creates liquidity cushion)
    pub initial_virtual_sol_reserve: u64, // virtual SOL reserve for price calculation (sets starting price)
    pub initial_real_token_reserve: u64,  // actual tokens available for trading on bonding curve
    pub total_token_supply: u64, // maximum token supply minted at launch (immutable after mint authority revoked)

    pub buy_fee_percentage: f64, // fee percentage charged when buying tokens
    pub sell_fee_percentage: f64, // fee percentage charged when selling tokens
    pub migration_fee_percentage: f64, // fee percentage taken from SOL reserves during Raydium migration
    pub reserved: [[u8; 8]; 8], // reserved space (64 bytes) for future upgrades without account reallocation
}

impl Config {
    pub const SEED_PREFIX: &'static str = "master_config";
    //pub const LEN: usize = 32 + 32 + (8 * 5) + (8 * 3) + 64;
}
