use anchor_lang::prelude::*;
use anchor_lang::system_program;


declare_id!("EikP4VFoFwUazfDZrHNp4ZjVgofW1grYy9pp55dupHHy");


#[program]
pub mod anchor_sol_vault {
    use super::*;

    // pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
    //     msg!("Greetings from: {:?}", ctx.program_id);
    //     Ok(())
    // }

 pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        // Check if amount is greater than 0
        require!(amount > 0, VaultError::InvalidAmount);

        // Transfer SOL from user to vault
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.user.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
            },
        );

        system_program::transfer(cpi_context, amount)?;

        // Update user's balance in vault account
        let vault = &mut ctx.accounts.vault_state;
        vault.balance = vault.balance.checked_add(amount).ok_or(VaultError::Overflow)?;
        vault.owner = ctx.accounts.user.key();

        emit!(DepositEvent {
            user: ctx.accounts.user.key(),
            amount,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        // Check if amount is greater than 0
        require!(amount > 0, VaultError::InvalidAmount);

        let vault = &mut ctx.accounts.vault_state;
        
        // Check if user has sufficient balance
        require!(vault.balance >= amount, VaultError::InsufficientBalance);

        // Create the seeds array first to extend its lifetime
        let bump_seed = ctx.bumps.vault;
        let seeds: &[&[&[u8]]] = &[&[b"vault", &[bump_seed]]];
        
        // Transfer SOL from vault to user
        let cpi_context = CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.vault.to_account_info(),
                to: ctx.accounts.user.to_account_info(),
            },
            seeds,
        );

        system_program::transfer(cpi_context, amount)?;

        // Update user's balance
        vault.balance = vault.balance.checked_sub(amount).ok_or(VaultError::Overflow)?;

        emit!(WithdrawEvent {
            user: ctx.accounts.user.key(),
            amount,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"vault"],
        bump
    )]
    pub vault: SystemAccount<'info>,
    
    #[account(
        init_if_needed,
        payer = user,
        space = VaultState::SIZE,
        seeds = [b"vault_state", user.key().as_ref()],
        bump
    )]
    pub vault_state: Account<'info, VaultState>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"vault"],
        bump
    )]
    pub vault: SystemAccount<'info>,
    
    #[account(
        mut,
        seeds = [b"vault_state", user.key().as_ref()],
        bump,
        constraint = vault_state.owner == user.key()
    )]
    pub vault_state: Account<'info, VaultState>,
    
    pub system_program: Program<'info, System>,
}

#[account]
pub struct VaultState {
    pub owner: Pubkey,
    pub balance: u64,
}

impl VaultState {
    pub const SIZE: usize = 8 + 32 + 8; // discriminator + pubkey + u64
}

#[event]
pub struct DepositEvent {
    pub user: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct WithdrawEvent {
    pub user: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[error_code]
pub enum VaultError {
    #[msg("Amount must be greater than 0")]
    InvalidAmount,
    #[msg("Insufficient balance for withdrawal")]
    InsufficientBalance,
    #[msg("Arithmetic overflow")]
    Overflow,
}
