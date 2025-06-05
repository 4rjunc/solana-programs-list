use anchor_lang::prelude::*;

declare_id!("DfrhYpR3Uu751wLkPVC8m6EX4ryQSSzj1XecdcfNEaUj");

#[program]
pub mod cpi {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
