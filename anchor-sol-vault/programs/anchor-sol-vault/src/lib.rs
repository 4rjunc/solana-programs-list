use anchor_lang::prelude::*;

declare_id!("95PBwSnYLX2128paSCqctDZngY2NLrvmawZXiprETNxi");

#[program]
pub mod anchor_sol_vault {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
