use borsh::{to_vec, BorshDeserialize, BorshSerialize};

// use solana system interface crate
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    program::invoke_signed,
    pubkey::Pubkey,
    rent::Rent,
    system_instruction,
    sysvar::Sysvar,
};

use crate::state::message::MessageAccount;

pub fn create(
    _program_id: &Pubkey,
    accounts: &[AccountInfo],
    message: MessageAccount,
) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();
    let message_account = next_account_info(accounts_iter)?;
    let payer = next_account_info(accounts_iter)?;
    let system_program = next_account_info(accounts_iter)?;

    let account_span = (to_vec(&message)?).len();
    let lamports_required = (Rent::get()?).minimum_balance(account_span);

    let (_, bump) = Pubkey::find_program_address(
        &[MessageAccount::SEED_PREFIX.as_bytes(), payer.key.as_ref()],
        &crate::ID,
    );

    invoke_signed(
        &system_instruction::create_account(
            payer.key,
            message_account.key,
            lamports_required,
            account_span as u64,
            &crate::ID,
        ),
        &[
            payer.clone(),
            message_account.clone(),
            system_program.clone(),
        ],
        &[&[
            MessageAccount::SEED_PREFIX.as_bytes(),
            payer.key.as_ref(),
            &[bump],
        ]],
    )?;

    message.serialize(&mut &mut message_account.data.borrow_mut()[..])?;

    Ok(())
}
