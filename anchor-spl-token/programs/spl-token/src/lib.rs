use anchor_lang::prelude::*;

pub mod instructions;

use instructions::*;

declare_id!("96KJa3QnFirfkBGYqfkpirVbaMWAFYyhPVpq2a1dHmwz");

#[program]
pub mod spl_token {

    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }

    pub fn create_mint(ctx: Context<CreateMint>) -> Result<()> {
        msg!("creating a mint account: {}", ctx.accounts.mint.key());
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
