use solana_program::{entrypoint, pubkey, pubkey::Pubkey};

use processor::process_instruction;

pub mod instructions;
pub mod processor;
pub mod state;

entrypoint!(process_instruction);

solana_program::declare_id!("5zUvdtYXnCHkyBMi5y8FcMeGtWd2H23Dwp8yiScHkwru");
