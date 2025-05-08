use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::{self, next_account_info, AccountInfo},
    declare_id,
    entrypoint::ProgramResult,
    msg,
    program_error::ProgramError,
    pubkey::Pubkey,
};

mod state;
use state::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[cfg(not(feature = "no-entrypoint"))]
use solana_program::entrypoint;

#[cfg(not(feature = "no-entrypoint"))]
entrypoint!(process_instruction);

pub fn process_instruction(
    _program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    // The split_at() method divides a slice at a specified index, returning two separate slices.
    // instruction_data is the raw byte array passed to your program
    // split_at(1) splits it at the first byte
    // instruction_discriminant gets the first byte (position 0), which works as an instruction ID/type
    // instruction_data_inner gets all remaining bytes (position 1 onward), which contain instruction-specific parameters

    let (instruction_discriminant, instruction_data_inner) = instruction_data.split_at(1);
    match instruction_discriminant[0] {
        0 => {
            msg!("Increment");
            process_increment_counter(accounts, instruction_data_inner)?;
        }
        _ => {
            msg!("Error: unknown instruction");
        }
    }
    Ok(())
}

pub fn process_increment_counter(
    accounts: &[AccountInfo],
    _instruction_data: &[u8],
) -> Result<(), ProgramError> {
    let account_info_iter = &mut accounts.iter();

    let counter_account = next_account_info(account_info_iter)?;
    assert!(
        counter_account.is_writable,
        "Counter account must be writable"
    );

    let mut counter = Counter::try_from_slice(&counter_account.try_borrow_mut_data()?)?;
    counter.count += 1;

    // Converts your counter struct into bytes and writes them to the account storage.
    // counter_account.data is a RefCell containing the account's raw data
    // .borrow_mut() gets a mutable reference to that data
    // * dereferences it to get the raw data slice
    // &mut * creates a mutable reference to that slice
    // .serialize() writes the counter's bytes into that storage location
    // The trailing ? propagates any errors that might occur during serialization

    counter.serialize(&mut *counter_account.data.borrow_mut())?;

    msg!("Incremented to {:?}", counter.count);

    Ok(())
}
