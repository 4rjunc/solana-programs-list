use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::msg;
use solana_program::{
    account_info::AccountInfo, entrypoint::ProgramResult, program_error::ProgramError,
    pubkey::Pubkey,
};

use crate::instructions::*;
use crate::state::message::MessageAccount;

#[derive(BorshDeserialize, BorshSerialize)]
pub enum Instructions {
    Create(MessageAccount),
    Update(MessageAccount),
    Delete,
}

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    if program_id.ne(&crate::ID) {
        return Err(ProgramError::IncorrectProgramId);
    }

    let instruction = Instructions::try_from_slice(instruction_data)?;

    let _ = match instruction {
        Instructions::Create(message) => {
            msg!("Create: message {}", message.message);
            create::create(program_id, accounts, message)
        }
        Instructions::Update(message) => Err(ProgramError::InvalidInstructionData),
        Instructions::Delete => Err(ProgramError::InvalidInstructionData),
        _ => Err(ProgramError::InvalidInstructionData),
    };

    Ok(())
}
