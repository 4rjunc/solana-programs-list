use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::AccountInfo, entrypoint::ProgramResult, msg, program_error::ProgramError,
    pubkey::Pubkey,
};

use crate::state::EscrowAccount;

#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub enum Instructions {
    Make(EscrowAccount),
    Take(EscrowAccount),
    Refund(EscrowAccount),
}

pub fn process_instructions(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    if program_id.ne(&crate::ID) {
        return Err(ProgramError::IncorrectProgramId);
    }

    let instruction = Instructions::try_from_slice(instruction_data)?;
    msg!("Received instruction: {:?}", instruction);

    match instruction {
        Instructions::Make(escrow_account) => {
            msg!("Make: {:?}", escrow_account);
        }
        Instructions::Take(escrow_account) => {
            msg!("Take: {:?}", escrow_account)
        }
        Instructions::Refund(escrow_account) => {
            msg!("Refund: {:?}", escrow_account)
        }
    }

    Ok(())
}
