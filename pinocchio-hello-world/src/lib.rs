use pinocchio::{account_info::AccountInfo, entrypoint, pubkey::Pubkey, ProgramResult};

use pinocchio_log::log;

// Define the program entrypoint
entrypoint!(process_instruction);

// Process instruction entrypoint

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    // Log a message to the blockchain
    log!("Hello, Solana World!");

    // If instruction data is provided, log it as well
    if !instruction_data.is_empty() {
        // Convert instruction data to a string if possible
        if let Ok(message) = std::str::from_utf8(instruction_data) {
            log!("Received message: {}", message);
        } else {
            log!("Received binary data of length: {}", instruction_data.len());
        }
    }

    // Log the number of accounts provided
    log!("Number of accounts: {}", accounts.len());

    // Log the program ID
    log!("Program ID: {}", program_id);

    // Return success
    Ok(())
}
