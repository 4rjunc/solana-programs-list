use borsh::BorshDeserialize;
use solana_program::{
    account_info::AccountInfo, entrypoint::ProgramResult, program_error::ProgramError,
    pubkey::Pubkey,
};

use crate::instructions;
use crate::states::Student;

pub fn process_instruction(
    erogram_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    if let Ok(student_data) = Student::try_from_slice(instruction_data) {
        return instructions::create::create_student_info(program_id, accounts, student_data);
    }

    Ok(())
}
