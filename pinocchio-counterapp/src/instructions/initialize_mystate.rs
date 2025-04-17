use pinocchio::{
    account_info::AccountInfo,
    instruction::{Seed, Signer},
    program_error::ProgramError,
    pubkey::Pubkey,
    sysvars::rent::Rent,
    ProgramResult,
};

use pinocchio_system::instructions::CreateAccount;

use crate::{
    error::MyProgramError,
    state::{
        utils::{load_ix_data, DataLen},
        MyState,
    },
};

#[repr(C)]
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct InitializeMyStateIxData {
    pub owner: Pubkey,
    pub data: [u8; 32],
    pub bump: u8,
}

impl DataLen for InitializeMyStateIxData {
    const LEN: usize = core::mem::size_of::<InitializeMyStateIxData>(); // 32 bytes for Pubkey + 32 bytes for data
}

pub fn increment(accounts: &[AccountInfo], data: &[u8]) -> ProgramResult {
    let [payer_acc, state_acc, sysvar_rent_acc, _system_program] = accounts else {
        return Err(ProgramError::NotEnoughAccountKeys);
    };

    if !payer_acc.is_signer() {
        return Err(ProgramError::MissingRequiredSignature);
    }

    if !state_acc.data_is_empty() {
        return Err(ProgramError::AccountAlreadyInitialized);
    }

    let rent = Rent::from_account_info(sysvar_rent_acc)?;

    let ix_data = unsafe { load_ix_data::<InitializeMyStateIxData>(data)? };

    if ix_data.owner.ne(payer_acc.key()) {
        return Err(MyProgramError::InvalidOwner.into());
    }

    let pda_bump_bytes = [ix_data.bump];

    MyState::validate_pda(ix_data.bump, state_acc.key(), &ix_data.owner)?;

    // Signer seeds
    let signer_seeds = [
        Seed::from(MyState::SEED.as_bytes()),
        Seed::from(&ix_data.owner),
        Seed::from(&pda_bump_bytes[..]),
    ];
    let signers = [Signer::from(&signer_seeds[..])];
    // Create the governance config account
    CreateAccount {
        from: payer_acc,
        to: state_acc,
        space: MyState::LEN as u64,
        owner: &crate::ID,
        lamports: rent.minimum_balance(MyState::LEN),
    }
    .invoke_signed(&signers)?;

    MyState::initialize(state_acc, ix_data)?;

    Ok(())
}
