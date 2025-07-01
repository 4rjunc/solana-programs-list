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

use mpl_token_metadata::{
    instructions::{CreateMetadataAccountV3CpiBuilder, CreateV1CpiBuilder},
    types::{DataV2, PrintSupply, TokenStandard},
    ID as TOKEN_METADATA_PROGRAM_ID,
};
use spl_token::{instruction as token_ix, state::Mint};

pub const SYSVAR_INSTRUCTIONS_PUBKEY: Pubkey = solana_program::sysvar::instructions::ID;

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
    let [mint_account, mint_authority, metadata_account, payer, rent, system_program, token_program, token_metadata_program, sysvar_instructions_info] =
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

    msg!("Initializing mint account");
    msg!("Mint Account: {}", mint_account.key);
    invoke(
        &token_ix::initialize_mint(
            token_program.key,
            mint_account.key,
            mint_authority.key,
            Some(mint_authority.key),
            args.decimal,
        )?,
        &[
            mint_account.clone(),
            mint_authority.clone(),
            token_program.clone(),
            rent.clone(),
        ],
    )?;

    msg!("Creating metadata account");
    msg!("Metadata Account: {}", mint_account.key);
    CreateV1CpiBuilder::new(token_metadata_program)
        .metadata(metadata_account)
        .mint(mint_account, false)
        .authority(mint_authority)
        .payer(payer)
        .update_authority(mint_authority, false)
        .system_program(system_program)
        .sysvar_instructions(sysvar_instructions_info)
        .spl_token_program(Some(token_program))
        .token_standard(TokenStandard::Fungible)
        .name(String::from(args.title))
        .uri(args.uri)
        .seller_fee_basis_points(0)
        .print_supply(PrintSupply::Zero)
        .invoke()?;

    msg!("Token mint created successfully.");

    Ok(())
}
