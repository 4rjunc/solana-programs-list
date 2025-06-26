use solana_program::entrypoint;

mod processor;

use processor::process_instruction;

entrypoint!(process_instruction);

solana_program::declare_id!("8otW43hh4aZq6ht7sW8PFSuuHD9rM9gTJnETgXLLk5xx");
