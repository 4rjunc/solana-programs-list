use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};

declare_id!("22222222222222222222222222222222222222222222");

#[program]
pub mod blueshift_anchor_vault {

    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }

    // Verifies the vault currently holds zero lamports (it must not already exist).
    // Ensures the deposit amount exceeds the rent-exempt minimum for a SystemAccount.
    // Transfers lamports from the signer to the vault via a CPI to the System Program.
    pub fn deposit(ctx: Context<VaultAction>, amount: u64) -> Result<()> {
        require_eq!(
            ctx.accounts.vault.lamports(),
            0,
            VaultError::VaultAlreadyExists
        );
        require_gt!(
            amount,
            Rent::get()?.minimum_balance(0),
            VaultError::InvalidAmount
        );

        transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.signer.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                },
            ),
            amount,
        )?;

        Ok(())
    }

    // Uses the vault’s PDA to sign the transfer out of the vault on its own behalf.
    // Transfers all lamports in the vault back to the signer.
    // TODO: Print the signer.key()
    pub fn withdraw(ctx: Context<VaultAction>) -> Result<()> {
        let bindings = ctx.accounts.signer.key();
        let signer_seeds = &[b"vault", bindings.as_ref(), &[ctx.bumps.vault]];

        transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.signer.to_account_info(),
                },
                &[&signer_seeds[..]],
            ),
            ctx.accounts.vault.lamports(),
        )?;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}

// Account types used in VaultAction
// Signer<'info>: Verifies the account signed the transaction; essential for security and for CPIs that demand a signature.
// SystemAccount<'info>: Confirms ownership of the account by the System Program.
// Program<'info, System>: Ensures the account is executable and matches the System Program ID, enabling CPIs such as account creation or lamport transfers.
#[derive(Accounts)]
pub struct VaultAction<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        mut,
        seeds = [b"vault", signer.key().as_ref()],
        bump
    )]
    pub vault: SystemAccount<'info>,

    pub system_program: Program<'info, System>, // Since vault : SystemAccount implies System Program ownership, Anchor expects the system_program to be available for potential operations.
}

#[error_code]
pub enum VaultError {
    #[msg("Vault already exists")]
    VaultAlreadyExists,
    #[msg("Invalid amount")]
    InvalidAmount,
}
