use solana_program::entrypoint;

use processor::process_instruction;

mod processor;
//mod state;

entrypoint!(process_instruction);

solana_program::declare_id!("FPwoyR8SybaSHfAGyyjWum8PSiZ4YuYvev117A2fboM4");
