use pinocchio::{
    default_allocator, default_panic_handler, entrypoint::InstructionContext,
    lazy_program_entrypoint, ProgramResult,
};

use pinocchio_log::log;

// Define the program entrypoint
lazy_program_entrypoint!(process_instruction);
default_allocator!();
default_panic_handler!();

// Process instruction entrypoint

pub fn process_instruction(mut context: InstructionContext) -> ProgramResult {
    // Log a message to the blockchain
    log!("Hello, Solana World!");

    // If instruction data is provided, log it as well
    if !context.instruction_data()?.is_empty() {
        // Convert instruction data to a string if possible
        if let Ok(message) = std::str::from_utf8(context.instruction_data()?) {
            log!("Received message: {}", message);
        } else {
            log!(
                "Received binary data of length: {}",
                context.instruction_data()?.len()
            );
        }
    }

    // Log the program ID
    log!("Program ID: {}", context.program_id()?);

    // Return success
    Ok(())
}
