use pinocchio::{account_info::AccountInfo, program_error::ProgramError, ProgramResult};

use crate::{
    error::MyProgramError,
    state::{
        utils::{load_acc_mut, load_ix_data, DataLen},
        MyState,
    },
};

#[repr(C)]
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct UpdateMyStateIxData {
    pub data: [u8; 32],
}

impl DataLen for UpdateMyStateIxData {
    const LEN: usize = core::mem::size_of::<UpdateMyStateIxData>(); // 32 bytes for data
}

pub fn process_update_state(accounts: &[AccountInfo], data: &[u8]) -> ProgramResult {
    let [payer_acc, state_acc] = accounts else {
        return Err(ProgramError::NotEnoughAccountKeys);
    };

    if !payer_acc.is_signer() {
        return Err(ProgramError::MissingRequiredSignature);
    }

    let my_state = unsafe { load_acc_mut::<MyState>(state_acc.borrow_mut_data_unchecked())? };

    if my_state.owner.ne(payer_acc.key()) {
        return Err(MyProgramError::InvalidOwner.into());
    }

    let ix_data = unsafe { load_ix_data::<UpdateMyStateIxData>(data)? };

    my_state.update(ix_data)?;

    Ok(())
}
