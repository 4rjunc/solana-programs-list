use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    program_error::ProgramError,
    pubkey::Pubkey,
    system_program,
};

entrypoint!(process_instruction);

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    _instruction_data: &[u8],
) -> ProgramResult {
    //Checks program in Instrction is the actual program id of this program
    if system_program::check_id(program_id) {
        return Err(ProgramError::IncorrectProgramId);
    }

    // Check the number of accounts set is correct from frontend
    if accounts.len() < 4 {
        return Err(ProgramError::NotEnoughAccountKeys);
    }

    // Accounts pass to program are expected in the order
    let account_iter = &mut accounts.iter();
    let _payer = next_account_info(account_iter)?;
    let account_to_create = next_account_info(account_iter)?;
    let account_to_change = next_account_info(account_iter)?;
    let system_program = next_account_info(account_iter)?;

    //Make sure the account is not created
    msg!("Account to create: {}", account_to_create.key);
    if account_to_create.lamports() != 0 {
        return Err(ProgramError::AccountAlreadyInitialized);
    }

    // Account not initiazlized
    if account_to_create.lamports() == 0 {
        return Err(ProgramError::UninitializedAccount);
    }

    // this must be owned by this program to change
    if account_to_change.owner != program_id {
        return Err(ProgramError::IncorrectProgramId);
    }

    if system_program.key != &system_program::ID {
        return Err(ProgramError::IncorrectProgramId);
    };

    Ok(())
}
