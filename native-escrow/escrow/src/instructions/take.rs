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
    assert_eq!(mint_a.key, &escrow_data.mint_a);
    assert_eq!(mint_b.key, &escrow_data.mint_b);

    // Get decimals of token
    let decimals_a = spl_token::state::Mint::unpack(&mint_a.try_borrow_data()?)?.decimals; // Get token decimals from the mint_a
    let decimals_b = spl_token::state::Mint::unpack(&mint_b.try_borrow_data()?)?.decimals; // Get token decimals from the mint_b

    //Get the token a amount in the vault
    let amount_a = spl_token::state::Account::unpack(&vault.try_borrow_data()?)?.amount;

    // By checking this, we know our token accounts are correct by virtue of Token Program checking them
    // assert!([&spl_token::ID, &spl_token_2022::ID].contains(&token_program));

    // transfer token A from vault owned by escrow pda -> taker_ta_a
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
            taker_ta_a.key,
            escrow.key,
            &[],
            amount_a,
            decimals_a,
        )?,
        &[
            vault.clone(),
            mint_a.clone(),
            taker_ta_a.clone(),
            escrow.clone(),
        ],
        &[&[
            b"escrow",
            maker.key.as_ref(),
            escrow_data.seed.to_le_bytes().as_ref(),
            &[bump],
        ]],
    )?;

    // transfer token B from taker to maker
    invoke(
        &transfer_checked(
            token_program.key,
            taker_ta_b.key,
            mint_b.key,
            maker_ta_b.key,
            taker.key,
            &[],
            escrow_data.receive,
            decimals_b,
        )?,
        &[
            taker_ta_b.clone(),
            mint_b.clone(),
            mint_b.clone(),
            maker_ta_b.clone(),
            taker.clone(),
        ],
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
