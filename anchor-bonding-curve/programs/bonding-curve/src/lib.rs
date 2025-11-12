use anchor_lang::prelude::*;

declare_id!("9k23tjYUuhUq9AJVdsGU81FXiSTd2qjCGsqt2K7uNc8D");

#[program]
pub mod bonding_curve {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
