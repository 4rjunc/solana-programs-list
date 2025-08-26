use anchor_lang::prelude::*;

pub mod contexts;
pub mod state;

use self::contexts::*;

declare_id!("3mTs3YNzFV9g3dgQb1FDdarKDtrVcMq2qZE1pfgiuF8P");

#[program]
pub mod escrow {
    use super::*;

    pub fn make(
        ctx: Context<Make>,
        seed: u64,
        deposit_amount: u64,
        receive_amount: u64,
    ) -> Result<()> {
        ctx.accounts
            .make(seed, deposit_amount, receive_amount, &ctx.bumps)?;
        ctx.accounts.deposit(deposit_amount)?;
        Ok(())
    }

    pub fn take(ctx: Context<Take>) -> Result<()> {
        ctx.accounts.deposit()?;
        ctx.accounts.release()?;
        ctx.accounts.close()?;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
