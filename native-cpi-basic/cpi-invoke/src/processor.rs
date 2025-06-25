use borsh::BorshDeserialize;

use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::{self, ProgramResult},
    program::invoke,
    program_error::ProgramError,
    pubkey::Pubkey,
};

use solana_system_interface::instruction::*;

#[derive(BorshDeserialize)]
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

    if !program_id.ne(&crate::ID) {
        return Err(ProgramError::IncorrectProgramId);
    }

    match instruction {
        Instruction::SolTransfer { amount } => {
            let account_iter = &mut accounts.iter();
            let sender = next_account_info(account_iter)?;
            let recipient = next_account_info(account_iter)?;
            let system_program_info = next_account_info(account_iter)?;

            if !sender.is_signer {
                return Err(ProgramError::MissingRequiredSignature);
            }

            let ix = transfer(sender.key, recipient.key, amount);

            invoke(
                &ix,
                &[
                    sender.clone(),
                    recipient.clone(),
                    system_program_info.clone(),
                ],
            )?;

            Ok(())
        }
    }
}
