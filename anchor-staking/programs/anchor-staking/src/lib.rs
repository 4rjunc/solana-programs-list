use anchor_lang::prelude::*;

declare_id!("4bXbZLMPyHDow4PbEGycEh559JtkoKCRycRkEerVzzeD");

#[program]
pub mod anchor_staking {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
