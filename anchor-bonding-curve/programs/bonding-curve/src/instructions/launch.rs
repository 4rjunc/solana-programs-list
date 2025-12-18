use crate::{
    constants::TOKEN_DECIMAL,
    states::{BondingCurve, Config},
};

use anchor_lang::{prelude::*, solana_program::sysvar, system_program};

use anchor_spl::{
    associated_token::{self, AssociatedToken},
    metadata::{self, mpl_token_metadata::types::DataV2, Metadata},
    token::{self, spl_token::instruction::AuthorityType, Mint, Token, TokenAccount},
};

#[derive(Accounts)]
pub struct Launch<'info> {
    #[account(mut)]
    creator: Signer<'info>,

    #[account(
        seeds = [Config::SEED_PREFIX.as_bytes()],
        bump
    )]
    master_config: Account<'info, Config>,

    #[account(
        init,
        payer = creator,
        mint::decimals = TOKEN_DECIMAL,
        mint::authority = master_config.key()
    )]
    token_mint: Account<'info, Mint>,

    #[account(
        init,
        payer = creator,
        space = 8 + BondingCurve::LEN,
        seeds = [BondingCurve::SEED_PREFIX.as_bytes(), &token_mint.key().to_bytes()],
        bump
    )]
    bonding_curve: Account<'info, BondingCurve>,

    #[account(
        init,
        payer = creator,
        associated_token::mint = token_mint,
        associated_token::authority = bonding_curve
    )]
    curve_token_account: Account<'info, TokenAccount>,

    /// CHECK: Initialized by token metadata program
    #[account(mut)]
    token_metadata_account: UncheckedAccount<'info>,

    #[account(address = token::ID)]
    token_program: Program<'info, Token>,

    #[account(address = associated_token::ID)]
    associated_token_program: Program<'info, AssociatedToken>,

    #[account(address = metadata::ID)]
    metadata_program: Program<'info, Metadata>,

    #[account(address = system_program::ID)]
    system_program: Program<'info, System>,

    #[account(address = sysvar::rent::ID)]
    rent: Sysvar<'info, Rent>,
}
