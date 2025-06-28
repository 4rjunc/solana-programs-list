use solana_program::entrypoint;

pub mod processor;
pub mod state;

use processor::process_instructions;

entrypoint!(process_instructions);

solana_program::declare_id!("CCeMau8P6tMvjqBMfUnN5mcsqN3vyn9xTLSpdapbXDUq");
