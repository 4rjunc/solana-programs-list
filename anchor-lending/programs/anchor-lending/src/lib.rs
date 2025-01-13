use anchor_lang::prelude::*;

declare_id!("3i7P53xVkwagtxsKiRQhfGYDSveinDy6TpvPdAdDJV5z");

#[program]
pub mod anchor_lending {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
