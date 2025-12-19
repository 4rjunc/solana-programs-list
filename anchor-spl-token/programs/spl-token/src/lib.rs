use anchor_lang::prelude::*;

pub mod instructions;

use instructions::*;

declare_id!("44jtHxHi3uJ9w2KWtF1L2Ai1BVTGFksbyw9fWTEGLZ1Y");

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

    pub fn create_mint_pda(ctx: Context<CreateMintPDA>) -> Result<()> {
        msg!("creating a mint account: {}", ctx.accounts.mint.key());
        Ok(())
    }

    pub fn create_ata(ctx: Context<CreateAssociatedTokenAccount>) -> Result<()> {
        msg!(
            "creating a associated token account: {}",
            ctx.accounts.token_account.key()
        );
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
