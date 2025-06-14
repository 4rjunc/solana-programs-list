use borsh::BorshDeserialize;
use solana_program::{
    account_info::AccountInfo, entrypoint::ProgramResult, program_error::ProgramError,
    pubkey::Pubkey,
};

use crate::instructions::create;
use crate::states::Student;

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    if program_id.ne(&crate::ID) {
        return Err(ProgramError::IncorrectProgramId);
    }

    if let Ok(student_data) = Student::try_from_slice(instruction_data) {
        return create::create_student_info(program_id, accounts, student_data);
    }
    Ok(())
}
