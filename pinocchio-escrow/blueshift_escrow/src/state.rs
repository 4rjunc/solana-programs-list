use core::mem::size_of;
use pinocchio::{
    account_info::{AccountInfo, Ref},
    program_error::ProgramError,
    pubkey::Pubkey,
};

// Memory layout (approximate):
// Offset 0-7:   seed (u64)
// Offset 8-39:  maker (Pubkey - 32 bytes)
// Offset 40-71: mint_a (Pubkey - 32 bytes)
// Offset 72-103: mint_b (Pubkey - 32 bytes)
// Offset 104-111: receive (u64)
// Offset 112: bump ([u8; 1])
#[repr(C)]
pub struct Escrow {
    pub seed: u64,
    pub maker: Pubkey,
    pub mint_a: Pubkey,
    pub mint_b: Pubkey,
    pub receive: u64,
    pub bump: [u8; 1],
}
