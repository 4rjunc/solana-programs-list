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

pub fn process(accounts: &[AccountInfo], data: EscrowAccount) -> ProgramResult {
    let seed = data.seed;
    let amount = data.amount;
    let recieve = data.receive;

    //  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
    //  │   maker_ta_a    │───▶│      vault      │◄───│     escrow      │
    //  │ (Token Account) │    │ (Token Account) │    │ (State Account) │
    //  │                 │    │                 │    │                 │
    //  │ • Holds tokens  │    │ • Holds tokens  │    │ • Holds metadata│
    //  │ • Owned by user │    │ • Owned by PDA  │    │ • Controls vault│
    //  └─────────────────┘    └─────────────────┘    └─────────────────┘
    //
    //  Make: maker_ta_a → vault (mint_a tokens escrowed)
    //  Take: vault → taker (mint_a released) + taker → maker (mint_b provided)
    //
    //  maker_ta_a:
    //  Holds maker's mint_a tokens BEFORE escrow creation
    //  Loses tokens when escrow is created (transferred to vault)
    //  Empty (or reduced) during escrow period
    //
    //  vault:
    //  Receives mint_a tokens from maker_ta_a during escrow creation
    //  Holds the escrowed mint_a tokens securely
    //  Controlled by the program PDA (not the user)
    //  Releases tokens when escrow is taken or refunded

    let [maker, mint_a, mint_b, maker_ta_a, escrow, vault, token_program, _system_program] =
        accounts
    else {
        return Err(ProgramError::NotEnoughAccountKeys);
    };

    // Make logic
    // derive pda for escrow account
    let (escrow_pda, bump) = Pubkey::find_program_address(
        &[b"escrow", maker.key.as_ref(), &seed.to_le_bytes()],
        &crate::ID,
    );

    if escrow.key != &escrow_pda {
        return Err(ProgramError::InvalidAccountData);
    }

    // INITIALIZING
    msg!("Initializing escrow account");
    let space = core::mem::size_of::<Escrow>();
    let rent = Rent::get()?.minimum_balance(space);

    //    Argument	Description of invoke_signed
    //    instruction	The instruction you want to invoke. Here it's create_account(...) from system_instruction.
    //    account_infos	Array of AccountInfos involved in the instruction: the payer (maker), the new account (escrow), and the system program.
    //    signers_seeds	An array of seeds used to re-derive the PDA's signing authority. This allows your program to "sign" for a PDA without needing a private key.

    //    Argument	Description of create_account
    //    maker.key	The payer creating and funding the new account (maker pays rent).
    //    escrow.key	The new account to be created. Usually a PDA or generated keypair.
    //    rent	Amount of lamports to make the account rent-exempt. Use Rent::get()?
    //    space	The size in bytes the account will store (e.g., 8 + YourStruct::LEN).
    //    crate::ID	The program ID that owns the account (typically your program's ID).
    invoke_signed(
        &create_account(maker.key, escrow.key, rent, space as u64, &crate::ID),
        &[maker.clone(), escrow.clone(), _system_program.clone()],
        &[&[b"escrow", maker.key.as_ref(), &seed.to_le_bytes(), &[bump]]],
    )?;

    // saving escrow data after serializing
    let escrow_state = Escrow {
        seed,
        maker: *maker.key,
        mint_a: *mint_a.key,
        mint_b: *mint_b.key,
        receive: recieve,
    };
    let mut escrow_data = escrow.try_borrow_mut_data()?; // get a mutable reference to the account's byte buffer

    //  &mut &mut [u8]
    //  serialize() expects something that implements std::io::Write, like a &mut dyn Write.
    //  &mut [u8] does implement Write.
    //  But you need to pass a mutable reference to that slice — hence the double &mut.
    escrow_state.serialize(&mut &mut escrow_data[..])?;

    // DEPOSIT
    msg!("Depositing Tokens");
    //    It safely transfers amount of mint_a tokens from maker_ta_a (maker’s token account) to vault
    //
    //    Argument Description of transfer_checked
    //    token_program.key	The SPL Token program ID (spl_token::ID)
    //    maker_ta_a.key	The source token account (user's wallet TA)
    //    mint_a.key	The mint of the token (for checked decimals)
    //    vault.key	The destination token account (like escrow)
    //    maker.key	The authority to sign the transfer
    //    &[]	No signer seeds used (not a PDA)
    //    amount	Amount to transfer (e.g., 1_000_000)
    //    decimals	Token precision (e.g., 6 for USDC)

    // CHECK: vault is owned by escrow pda

    let decimals = spl_token::state::Mint::unpack(&mint_a.try_borrow_data()?)?.decimals; // Get token decimals from the mint

    // TODO: vault should be token account, test this
    //
    // first try to do it from testcase itself
    // second comment the code that create vault as token account from client and run the tests
    // third uncomment the vault creation from program and run test
    //
    //invoke_signed(
    //    &create_account(
    //        maker.key,
    //        vault.key,
    //        rent,
    //        spl_token::state::Account::LEN as u64,
    //        &spl_token::ID,
    //    ),
    //    &[maker.clone(), vault.clone()],
    //    &[&[b"vault", escrow.key.as_ref(), &[bump]]],
    //)?;

    invoke(
        &transfer_checked(
            token_program.key,
            maker_ta_a.key,
            mint_a.key,
            vault.key,
            maker.key,
            &[],
            amount,
            decimals,
        )?,
        &[
            maker_ta_a.clone(),
            mint_a.clone(),
            vault.clone(),
            maker.clone(),
        ],
    )?;

    Ok(())
}
