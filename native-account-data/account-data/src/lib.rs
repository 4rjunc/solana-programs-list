use solana_program::{entrypoint, pubkey, pubkey::Pubkey};

use processor::process_instruction;

pub mod instructions;
pub mod processor;
pub mod states;

entrypoint!(process_instruction);

const ID: Pubkey = pubkey!("4C2Au9iMf6fgZEvz9EjZBvete8myXjA814XiYYRoGewj");
