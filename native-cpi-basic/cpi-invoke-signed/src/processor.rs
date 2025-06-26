use borsh::BorshDeserialize;

use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    program::invoke_signed,
    program_error::ProgramError,
    pubkey::Pubkey,
};

use solana_system_interface::instruction::*;

#[derive(BorshDeserialize, Debug)]
enum Instruction {
    SolTransfer { amount: u64 },
}

impl Instruction {
    fn unpack(input: &[u8]) -> Result<Self, ProgramError> {
        Self::try_from_slice(input).map_err(|_| ProgramError::InvalidInstructionData)
    }
}

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let instruction = Instruction::unpack(instruction_data)?;

    if program_id.ne(&crate::ID) {
        return Err(ProgramError::IncorrectProgramId);
    }

    match instruction {
        Instruction::SolTransfer { amount } => {
            let account_iter = &mut accounts.iter();
            let pda_account = next_account_info(account_iter)?;
            let recipient = next_account_info(account_iter)?;
            let system_program_info = next_account_info(account_iter)?;

            let recipient_pubkey = recipient.key;
            let seeds = &[b"pda_account", recipient_pubkey.as_ref()];
            let (expected_pda, bump_seed) = Pubkey::find_program_address(seeds, &crate::ID);

            if expected_pda != *pda_account.key {
                return Err(ProgramError::InvalidArgument);
            }

            let ix = transfer(pda_account.key, recipient_pubkey, amount);

            let signer_seeds: &[&[&[u8]]] =
                &[&[b"pda_account", recipient_pubkey.as_ref(), &[bump_seed]]];
            invoke_signed(
                &ix,
                &[
                    pda_account.clone(),
                    recipient.clone(),
                    system_program_info.clone(),
                ],
                signer_seeds,
            )?;
        }
    }

    Ok(())
}
