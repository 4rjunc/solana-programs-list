use anchor_lang::prelude::*;
use anchor_spl::token_interface::{self, MintTo};
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

    pub fn create_pda_token_account(ctx: Context<CreatePDATokenAccount>) -> Result<()> {
        msg!(
            "creating a pda token account: {}",
            ctx.accounts.token_account.key()
        );
        Ok(())
    }

    pub fn mint_token(ctx: Context<MintTokens>, amount: u64) -> Result<()> {
        // Create the MintTo struct with the accounts required for the CPI
        let cpi_accounts = MintTo {
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.token_account.to_account_info(),
            authority: ctx.accounts.signer.to_account_info(),
        };

        // The program being invoked in the CPI
        let cpi_program_id = ctx.accounts.token_program.to_account_info();

        // Combine the accounts and program into a "CpiContext"
        let cpi_context = CpiContext::new(cpi_program_id, cpi_accounts);

        // Make CPI to mint_to instruction on the token program
        token_interface::mint_to(cpi_context, amount)?;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
