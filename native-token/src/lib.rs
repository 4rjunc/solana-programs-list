use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    program::invoke,
    program_pack::Pack,
    pubkey::Pubkey,
    rent::Rent,
    system_instruction,
    sysvar::Sysvar,
};

#[derive(BorshDeserialize, BorshSerialize, Debug)]
pub struct TokenArgs {
    pub title: String,
    pub symbol: String,
    pub uri: String,
    pub decimal: String,
}

entrypoint!(process_instruction);

fn process_instruction(
    _program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let args = TokenArgs::try_from_slice(instruction_data)?;

    let account_iter = &mut accounts.iter();

    let mint_account = next_account_info(account_iter)?;
    let mint_authority = next_account_info(account_iter)?;
    let metadata_account = next_account_info(account_iter)?;
    let payer = next_account_info(account_iter)?;
    let rent = next_account_info(account_iter)?;
    let system_program = next_account_info(account_iter)?;
    let token_program = next_account_info(account_iter)?;
    let token_metadata_program = next_account_info(account_iter)?;

    Ok(())
}
