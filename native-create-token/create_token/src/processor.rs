use std::task::Wake;

use borsh::{BorshDeserialize, BorshSerialize};

use solana_program::{
    account_info::AccountInfo,
    entrypoint::{self, ProgramResult},
    msg,
    program::invoke,
    program_error::ProgramError,
    program_pack::Pack,
    pubkey::Pubkey,
    rent::Rent,
    sysvar::Sysvar,
};

use solana_system_interface::instruction::create_account;

use spl_token::{instruction as token_ix, state::Mint};

#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct TokenArgs {
    pub title: String,
    pub symbol: String,
    pub uri: String,
    pub decimal: u8,
}

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    if program_id.ne(&crate::ID) {
        return Err(ProgramError::IncorrectProgramId);
    }

    let args = TokenArgs::try_from_slice(instruction_data)?;

    // deconstruction of accounts from argument
    let [mint_account, mint_authority, metadata_account, payer, rent, system_program, token_program, token_metadata_program] =
        accounts
    else {
        return Err(ProgramError::InvalidAccountData);
    };

    msg!("Create Mint Account");
    msg!("Mint Account: {}", mint_account.key);
    let ix = create_account(
        payer.key,
        mint_account.key,
        (Rent::get()?).minimum_balance(Mint::LEN),
        Mint::LEN as u64,
        token_program.key,
    );

    invoke(
        &ix,
        &[
            mint_account.clone(),
            payer.clone(),
            token_program.clone(),
            system_program.clone(),
        ],
    )?;

    Ok(())
}
