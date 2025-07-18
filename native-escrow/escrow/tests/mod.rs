use core::mem;
use mollusk_svm::{program, result::ProgramResult, Mollusk};
use solana_program::instruction::AccountMeta;
use solana_sdk::{
    account::{AccountSharedData, WritableAccount},
    instruction::Instruction,
    program_option::COption,
    program_pack::Pack,
    pubkey::Pubkey,
};
use spl_token::state::AccountState;

use escrow::state::Escrow;

#[test]
fn make() {
    let mut mollusk: Mollusk = Mollusk::new(&escrow::ID, "target/deploy/escrow");
}
