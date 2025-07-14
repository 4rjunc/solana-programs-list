use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::AccountInfo, entrypoint::ProgramResult, msg, program_error::ProgramError,
    pubkey::Pubkey,
};

use crate::instructions::*;
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

    //  Make: maker_ta_a → vault (mint_a tokens escrowed)
    //  Take: vault → taker (mint_a released) + taker → maker (mint_b provided)

    match instruction {
        Instructions::Make(escrow) => {
            make::process(accounts, escrow)?;
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
