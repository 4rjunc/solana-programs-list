use crate::state::{Escrow, EscrowAccount};
use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::AccountInfo,
    entrypoint::ProgramResult,
    msg,
    program::{invoke, invoke_signed},
    program_error::ProgramError,
    program_pack::Pack,
    pubkey::Pubkey,
    rent::Rent,
    system_instruction::create_account,
    sysvar::Sysvar,
};
use spl_token::instruction::transfer_checked;

pub fn process(accounts: &[AccountInfo]) -> ProgramResult {
    // Change the Assosiative Token Account var names
    let [taker, maker, mint_a, mint_b, taker_ta_a, taker_ta_b, maker_ta_b, escrow, vault, token_program, _system_program] =
        accounts
    else {
        return Err(ProgramError::NotEnoughAccountKeys);
    };

    // Take escrow account data from chain
    let escrow_data = Escrow::try_from_slice(&escrow.data.borrow())?;

    // Check PDA
    let (escrow_pda, bump) = Pubkey::find_program_address(
        &[
            b"escrow",
            maker.key.as_ref(),
            &escrow_data.seed.to_le_bytes(),
        ],
        &crate::ID,
    );

    if escrow.key != &escrow_pda {
        return Err(ProgramError::InvalidAccountData);
    }

    // Check mint account to escrow data
    // Get decimals of token

    Ok(())
}
