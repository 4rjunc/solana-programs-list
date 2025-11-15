use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod states;

use crate::instructions::*;
use crate::states::*;

declare_id!("9k23tjYUuhUq9AJVdsGU81FXiSTd2qjCGsqt2K7uNc8D");

#[program]
pub mod bonding_curve {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }

    pub fn config(ctx: Context<Configure>, new_config: ConfigSettings) -> Result<()> {
        ctx.accounts.process(new_config)
    }
}

#[derive(Accounts)]
pub struct Initialize {}
