use solana_program::entrypoint;

pub mod processor;

use processor::process_instruction;

entrypoint!(process_instruction);

solana_program::declare_id!("5ECVZ7mxvdftWR9SEVZKGNWdG5Sqdn7qF2wxenxkDLJo");
