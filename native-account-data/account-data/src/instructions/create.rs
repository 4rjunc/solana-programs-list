use crate::states::Student;
use borsh::{to_vec, BorshSerialize};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    program::invoke,
    pubkey::Pubkey,
    rent::Rent,
    system_instruction,
    sysvar::Sysvar,
};

pub fn create_student_info(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    student_info: Student,
) -> ProgramResult {
    // create iterator to safely traverse through the accounts array
    let account_iter = &mut accounts.iter();

    // extract the first account - this will store the student information
    let student_info_account = next_account_info(account_iter)?;

    // extract the second account - this pays for the account creation
    let payer = next_account_info(account_iter)?;

    // extract the third account - solana's system program for account operations
    let system_program = next_account_info(account_iter)?;

    // calculate how many bytes we need to store the serialized student data
    let account_span = (to_vec(&student_info)?).len();

    // calculate minimum rent (lamports) needed to keep this account rent-exempt
    let lamports_required = (Rent::get()?).minimum_balance(account_span);

    // call solana's system program to actually create the account on-chain
    invoke(
        &system_instruction::create_account(
            payer.key,                // who pays for the account
            student_info_account.key, // the new account's public key
            lamports_required,        // how many lamports to deposit
            account_span as u64,      // how much storage space to allocate
            &crate::ID,               // which program will own this account
        ),
        &[
            payer.clone(),
            student_info_account.clone(),
            system_program.clone(),
        ],
    )?;

    // serialize the student data directly into the newly created account's data field
    student_info.serialize(&mut &mut student_info_account.data.borrow_mut()[..])?;

    Ok(())
}
