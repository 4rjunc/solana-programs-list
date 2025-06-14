use solana_program::{entrypoint, pubkey, pubkey::Pubkey};

use processor::process_instruction;

pub mod instructions;
pub mod processor;
pub mod states;

entrypoint!(process_instruction);

//const ID: Pubkey = pubkey!("DZqZpnJzMRLi31CRkGqFpQPHgMJnBHY7A9PbvAiLmuEv");

solana_program::declare_id!("DZqZpnJzMRLi31CRkGqFpQPHgMJnBHY7A9PbvAiLmuEv");
