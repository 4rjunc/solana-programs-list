use anchor_lang::prelude::*;
use anchor_spl::token::{transfer, Mint, Token, TokenAccount, Transfer};

declare_id!("2eH4VtkkB5X5592hmuQqFQvQ9QKaTEmRZyvQgf9EWyxp");

#[program]
pub mod vault_manager {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Valut Manager Initialized | Greetings from: {:?}", ctx.program_id);
        Ok(())
    }

    pub fn deposit(
        ctx: Context<Deposit>,
        amount: u64,
    ) -> Result<()> {
        msg!("Amount Deposting: {}", amount); //logs the amount deposited
        //creates reference to the senders's token amount from ctx.accounts
        let sender_token_account: &Account<TokenAccount> = &ctx.accounts.sender_token_account;

        //checks the senders has enough tokens to send
        if sender_token_account.amount < amount{
            return Err(VaultError::InsufficientFunds.into());
        }

        // display balance in senders account
        msg!("Senders account balance: {}", sender_token_account.amount);

        // Creats a transfer instruction for SPL token program
        let tx_instruct: anchor_spl::token::Transfer = Transfer {
            from: ctx.accounts.sender_token_account.to_account_info(),
            to: ctx.accounts.vault.to_account_info(),
            authority: ctx.accounts.signer.to_account_info(),
        };  

        //creates a CPI cross platform invocation Context
        //it combines the token program account with the transfer instruction
        // READ MORE: https://solana.com/docs/core/cpi
        let cpi_ctx: CpiContext<anchor_spl::token::Transfer> = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            tx_instruct
        );

        //executes transfer instruction usign CPI Context
        // ? shows any errors the may occur during transfer
        anchor_spl::token::transfer(cpi_ctx, amount)?;
        Ok(()) // if no erros are thrown is returns Ok(())
    }

    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()>{
        msg!("Amount Withdrawing: {}", amount);
        
        // checks vault has enough tokens 
        let vault = &ctx.accounts.vault;
        if vault.amount < amount {
            return Err(VaultError::InsufficientFunds.into());
        }

        //Vaults balance
        msg!("Vaults Balance: {}", vault.amount);

        let seeds = &[b"VAULT_MANAGER".as_ref(), &[ctx.bumps.token_account_owner_pda]];
        let signer_seeds = &[&seeds[..]];

        let tx_instruct = Transfer {
            from: ctx.accounts.vault.to_account_info(),
            to: ctx.accounts.receiver_token_account.to_account_info(),
            authority: ctx.accounts.token_account_owner_pda.to_account_info(),
        };

        let cpi_program = ctx.accounts.token_program.to_account_info();
        transfer(CpiContext::new_with_signer(cpi_program, tx_instruct, signer_seeds), amount)?;

        msg!("Withdrawal successful");
        Ok(())
    }
       
}


#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
		init_if_needed,
		payer = signer,
		seeds = [b"VAULT_MANAGER"],
		bump,
		space = 8
	)]
	/// CHECK: Struct field "token_account_owner_pda" is unsafe, but is not documented.
	token_account_owner_pda: AccountInfo<'info>,

	#[account(mut)]
	signer: Signer<'info>,

	system_program: Program<'info, System>,
	token_program:  Program<'info, Token>,
	rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct Deposit<'info>{
	#[account(mut,
		seeds=[b"VAULT_MANAGER"],
		bump
	)]
	token_account_owner_pda: AccountInfo<'info>,
	#[account(
		init_if_needed,
		seeds = [
			b"VAULT_MANAGER_PDA_VAULT",
			mint_account.key().as_ref()
		],
		token::mint      = mint_account,
		token::authority = token_account_owner_pda,
		payer            = signer,
		bump
	)]
	pub vault: Account<'info, TokenAccount>,

	#[account(mut)]
	pub signer: Signer<'info>,

	pub mint_account: Account<'info, Mint>,

	#[account(mut)]
	pub sender_token_account: Account<'info, TokenAccount>,

	pub token_program:  Program<'info, Token>,
	pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Withdraw<'info>{
    #[account(mut,
    seeds = [b"VAULT_MANAGER"],
    bump
    )]
    pub token_account_owner_pda: AccountInfo<'info>,

    #[account(mut, 
    seeds=[b"VAULT_MANAGER_PDA_VAULT", mint_account.key().as_ref()],
    bump,
    token::mint = mint_account,
    token::authority = token_account_owner_pda,
    )]
    pub vault: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub receiver_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub signer: Signer<'info>,

    pub mint_account: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[error_code]
pub enum VaultError {
	#[msg("Insufficient Funds in Wallet!")]
	InsufficientFunds,
}
