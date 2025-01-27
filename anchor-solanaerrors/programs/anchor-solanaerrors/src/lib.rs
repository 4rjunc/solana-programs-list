use anchor_lang::prelude::*;

declare_id!("4PkPxBL3XYAm4hcbVGoD4tGAsHXHosqaUSkeyoQCjeWK");

#[program]
pub mod anchor_solanaerrors {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
