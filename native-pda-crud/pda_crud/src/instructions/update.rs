use borsh::{to_vec, BorshDeserialize, BorshSerialize};

use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    program::invoke,
    pubkey::Pubkey,
    rent::Rent,
    sysvar::Sysvar,
};

use solana_system_interface::instruction;

use crate::state::message::MessageAccount;

pub fn update(_program_id: &Pubkey, accounts: &[AccountInfo], message: String) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();
    let message_account = next_account_info(accounts_iter)?;
    let payer = next_account_info(accounts_iter)?;
    let system_program = next_account_info(accounts_iter)?;

    let mut message_data = MessageAccount::try_from_slice(&message_account.data.borrow())?;
    message_data.message = message;

    let account_span = (to_vec(&message_data)?).len();
    let lamports_required = (Rent::get()?).minimum_balance(account_span);

    let diff = lamports_required - message_account.lamports();

    let _ = &invoke(
        &instruction::transfer(payer.key, message_account.key, diff),
        &[
            payer.clone(),
            message_account.clone(),
            system_program.clone(),
        ],
    );

    message_account.resize(account_span)?;

    message_data.serialize(&mut &mut message_account.data.borrow_mut()[..])?;

    Ok(())
}
