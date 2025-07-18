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
use spl_token::instruction::{close_account, transfer_checked};

pub fn process(accounts: &[AccountInfo]) -> ProgramResult {
    // Change the Assosiative Token Account var names
    let [maker, mint_a, maker_ta_a, escrow, vault, token_program, _system_program] = accounts
    else {
        return Err(ProgramError::NotEnoughAccountKeys);
    };

    msg!("Refunding");
    // Make sure the maker is a signer
    assert!(maker.is_signer);

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

    // Get decimals of token
    let decimals_a = spl_token::state::Mint::unpack(&mint_a.try_borrow_data()?)?.decimals; // Get token decimals from the mint_a

    //Get the token a amount in the vault
    let amount_a = spl_token::state::Account::unpack(&vault.try_borrow_data()?)?.amount;

    // transfer token A from vault owned by escrow pda -> maker_ta_a
    //
    //    Argument Description of transfer_checked
    //
    //    token_program.key	The SPL Token program ID (spl_token::ID)
    //    vault.key	The source token account (user's wallet TA)
    //    mint_a.key	The mint of the token (for checked decimals)
    //    taker_ta_a.key	The destination token account (like escrow)
    //    maker.key	The authority to sign the transfer
    //    &[]	No signer seeds used (not a PDA)
    //    amount	Amount to transfer (e.g., 1_000_000)
    //    decimals	Token precision (e.g., 6 for USDC)
    invoke_signed(
        &transfer_checked(
            token_program.key,
            vault.key,
            mint_a.key,
            maker_ta_a.key,
            escrow.key,
            &[],
            amount_a,
            decimals_a,
        )?,
        &[
            vault.clone(),
            mint_a.clone(),
            maker_ta_a.clone(),
            escrow.clone(),
        ],
        &[&[
            b"escrow",
            maker.key.as_ref(),
            escrow_data.seed.to_le_bytes().as_ref(),
            &[bump],
        ]],
    )?;

    // Close the vault
    //    Argument roll
    //
    //    token_program	The SPL Token program ID (&spl_token::ID)
    //    vault.key	The token account to close — must be initialized & owned by spl_token::ID
    //    maker.key	Recipient of any remaining lamports in the account
    //    escrow.key	Authority of the token account (i.e., token_account.owner in its data)
    //    &[]	Optional signer seeds (if using multisig authority, pass signers here — else keep empty)

    invoke_signed(
        &close_account(token_program.key, vault.key, maker.key, escrow.key, &[])?,
        &[maker.clone(), vault.clone(), escrow.clone()],
        &[&[
            b"escrow",
            maker.key.as_ref(),
            escrow_data.seed.to_le_bytes().as_ref(),
            &[bump],
        ]],
    )?;

    // close escrow account
    let balance = escrow.lamports();
    escrow.resize(0)?;
    **escrow.lamports.borrow_mut() = 0;
    **maker.lamports.borrow_mut() += balance;
    escrow.assign(&Pubkey::default());

    Ok(())
}
