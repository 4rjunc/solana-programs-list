use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{Mint, TokenAccount, TokenInterface},
};

#[derive(Accounts)]
pub struct MintTokens<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    // works because we alreadty initialized the account
    #[account(mut)]
    pub mint: InterfaceAccount<'info, Mint>,

    // works because we alreadty initialized the account
    #[account(mut)]
    pub token_account: InterfaceAccount<'info, TokenAccount>,
    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct MintTokensPDA<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        init_if_needed,
        payer = signer,
        mint::decimals = 6,
        mint::authority = mint,
        mint::freeze_authority = mint,
        seeds = [b"mint7"],
        bump
    )]
    pub mint: InterfaceAccount<'info, Mint>,

    #[account(
        init_if_needed,
        payer = signer,
        associated_token::mint = mint,
        associated_token::authority = signer,
        associated_token::token_program = token_program,
    )]
    pub token_account: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}
