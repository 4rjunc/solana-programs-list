use anchor_lang::{prelude::*, system_program::Transfer};
use anchor_spl::{
    associated_token::AssociatedToken,
    mint,
    token_2022::CloseAccount,
    token_interface::{
        close_account, transfer_checked, Mint, TokenAccount, TokenInterface, TransferChecked,
    },
};

use crate::state::EscrowState;

#[derive(Accounts)]
pub struct Take<'info> {
    #[account(mut)]
    pub taker: Signer<'info>,
    #[account(address = escrow.mint_a)]
    pub mint_a: InterfaceAccount<'info, Mint>,
    #[account(address = escrow.mint_b)]
    pub mint_b: InterfaceAccount<'info, Mint>,
    #[account(
        mut,
        associated_token::mint = escrow.mint_a,
        associated_token::authority = taker,
    )]
    pub taker_ata_a: InterfaceAccount<'info, TokenAccount>,
    #[account(
        mut,
        associated_token::mint = escrow.mint_b,
        associated_token::authority = taker
    )]
    pub taker_ata_b: InterfaceAccount<'info, TokenAccount>,
    #[account(
        mut,
        associated_token::mint = escrow.mint_b, 
        associated_token::authority = escrow.maker,
    )]
    pub maker_ata_b: InterfaceAccount<'info, TokenAccount>,
    #[account(
        mut,
        seeds = [b"escrow", escrow.maker.as_ref(), escrow.seed.to_le_bytes().as_ref()],
        bump = escrow.bump
    )]
    pub escrow: Account<'info, EscrowState>,
    #[account(
        mut,
        associated_token::mint = escrow.mint_a,
        associated_token::authority = escrow,
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

impl<'info> Take<'info> {
    pub fn deposit(&mut self) -> Result<()> {
        let cpi_program = self.token_program.to_account_info();

        let cpi_accounts = TransferChecked {
            from: self.taker_ata_b.to_account_info(),
            mint: self.mint_b.to_account_info(),
            to: self.maker_ata_b.to_account_info(),
            authority: self.taker.to_account_info(),
        };

        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

        transfer_checked(cpi_ctx, self.escrow.receive_amount, self.mint_b.decimals)?;
        Ok(())
    }

    pub fn release(&mut self) -> Result<()> {
        let cpi_program = self.token_program.to_account_info();

        let cpi_accounts = TransferChecked {
            from: self.vault.to_account_info(),
            mint: self.mint_a.to_account_info(),
            to: self.taker_ata_a.to_account_info(),
            authority: self.escrow.to_account_info(),
        };

        let seed_bytes = self.escrow.seed.to_le_bytes();

        let seeds = &[
            b"escrow",
            self.escrow.maker.as_ref(),
            seed_bytes.as_ref(),
            &[self.escrow.bump],
        ];

        let signers_seeds = [&seeds[..]];

        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, &signers_seeds);

        transfer_checked(cpi_ctx, self.escrow.deposit_amount, self.mint_a.decimals)?;
        Ok(())
    }

    pub fn close(&mut self) -> Result<()> {
        let cpi_accounts = CloseAccount {
            account: self.vault.to_account_info(),
            destination: self.taker.to_account_info(),
            authority: self.escrow.to_account_info(),
        };

        let seed_bytes = self.escrow.seed.to_le_bytes();

        let seeds = &[
            b"escrow",
            self.escrow.maker.as_ref(),
            seed_bytes.as_ref(),
            &[self.escrow.bump],
        ];

        let signers_seeds = [&seeds[..]];

        let cpi_ctx = CpiContext::new_with_signer(
            self.token_program.to_account_info(),
            cpi_accounts,
            &signers_seeds,
        );

        close_account(cpi_ctx)?;

        Ok(())
    }
}
