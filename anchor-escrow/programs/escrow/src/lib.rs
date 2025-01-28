use anchor_lang::prelude::*;

pub mod contexts;
pub mod state;

use self::contexts::*;

declare_id!("B7xXE92N35vPUFQtxtJ9ycnDqLRw3HtKqjNSdKgG4CP8");

#[program]
pub mod escrow {
    use super::*;

    pub fn make(ctx: Context<Make>, seed: u64, receive_amount: u64) -> Result<()> {
        ctx.accounts.make(seed, receive_amount, &ctx.bumps)?;
        ctx.accounts.deposit(receive_amount)?;
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
