use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::pubkey::Pubkey;

#[derive(BorshDeserialize, BorshSerialize, Debug)]
pub struct EscrowAccount {
    pub seed: u64,
    pub amount: u64,
    pub receive: u64,
}

impl EscrowAccount {
    pub const SEED_PREFIX: &'static str = "escrow";
}

#[repr(C)]
#[derive(BorshDeserialize, BorshSerialize, Debug)]
pub struct Escrow {
    pub seed: u64,
    pub maker: Pubkey,
    pub mint_a: Pubkey,
    pub mint_b: Pubkey,
    pub receive: u64,
}
