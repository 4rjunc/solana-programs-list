use anchor_lang::prelude::*;

declare_id!("96KJa3QnFirfkBGYqfkpirVbaMWAFYyhPVpq2a1dHmwz");

#[program]
pub mod spl_token {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
