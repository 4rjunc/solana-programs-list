use anchor_lang::prelude::*;

declare_id!("v6tcmg9YSMJmmVYc4BFaebCaZCF8yyhjAQbjo2KzFZ7");

#[program]
pub mod anchor_p_nft {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
