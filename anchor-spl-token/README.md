# SPL TOKENS

## Token Mint

two examples of creating a token mint using generated keypair and PDA

Mint account is an account type that is used to store global metadata of a token + it's unique identifier on solana. For example check USDC's mint account [EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v](https://orbmarkets.io/token/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/history?hideSpam=true). It will store 

- mint_authority
- supply
- decimals
- is_initialized
- freeze_authority

```rust
/// Mint data.
#[repr(C)]
#[derive(Clone, Copy, Debug, Default, PartialEq)]
pub struct Mint {
  /// Optional authority used to mint new tokens. The mint authority may only
  /// be provided during mint creation. If no mint authority is present
  /// then the mint has a fixed supply and no further tokens may be
  /// minted.
  pub mint_authority: COption<Pubkey>,
  /// Total supply of tokens.
  pub supply: u64,
  /// Number of base 10 digits to the right of the decimal place.
  pub decimals: u8,
  /// Is `true` if this structure has been initialized
  pub is_initialized: bool,
  /// Optional authority to freeze token accounts.
  pub freeze_authority: COption<Pubkey>,
}
```

`token_interface` module from the `anchor-spl` crate to interact with token program (both Token Program and Token Extension Program)

### Generated keypair

```rust
#[derive(Accounts)]
pub struct CreateMint<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        init,                               // → Generates system_program::create_account
        payer = signer,
        mint::decimals = 6,
        mint::authority = signer.key(),
        mint::freeze_authority = signer.key(),
    )]
    pub mint: InterfaceAccount<'info, Mint>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}
```

### PDA 

```rust
#[derive(Accounts)]
pub struct CreateMintPDA<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        init,                               // → Generates system_program::create_account
        payer = signer,
        mint::decimals = 6,
        mint::authority = signer.key(),
        mint::freeze_authority = signer.key(),
        seeds = [b"mint"],                  // → PDA
        bump
    )]
    pub mint: InterfaceAccount<'info, Mint>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}
```

The macro contraints will create an account. we can check this by expanding macros using `carog install expand` and run `cargo expand instructions::create_mint` (inside `program/spl-token`) 

Creating of account: 

```rust
let cpi_accounts = anchor_lang::system_program::CreateAccount {
    from: signer.to_account_info(),
    to: mint.to_account_info(),
};
let cpi_context = anchor_lang::context::CpiContext::new(
    system_program.to_account_info(),
    cpi_accounts,
);
anchor_lang::system_program::create_account(
    cpi_context.with_signer(&[]),  // ← THIS IS THE CPI CALL!
    lamports,
    space as u64,
    &token_program.key(),
)?;
```

Initializing mint account:

```rust
let cpi_program = token_program.to_account_info();
let accounts = ::anchor_spl::token_interface::InitializeMint2 {
    mint: mint.to_account_info(),
};
let cpi_ctx = anchor_lang::context::CpiContext::new(
    cpi_program,
    accounts,
);
::anchor_spl::token_interface::initialize_mint2(
    cpi_ctx,
    6,                           // ← decimals from mint::decimals = 6
    &signer.key().key(),        // ← authority from mint::authority = signer.key()
    Option::<&anchor_lang::prelude::Pubkey>::Some(&signer.key().key()), // ← freeze_authority
)?;

```

References 

- [1](https://www.solana-program.com/docs/token)
- [2](https://www.anchor-lang.com/docs/tokens)
- [3](https://solana.com/docs/programs/examples#tokens)

## Token Account 

Token account is more like a wallet for a specific token (mint account) of a indivdual. This is an account type that stores information about an indivdual's ownership of a specific token (mint). 

```rust
/// Account data.
#[repr(C)]
#[derive(Clone, Copy, Debug, Default, PartialEq)]
pub struct Account {
    /// The mint associated with this account
    pub mint: Pubkey,
    /// The owner of this account.
    pub owner: Pubkey,
    /// The amount of tokens this account holds.
    pub amount: u64,
    /// If `delegate` is `Some` then `delegated_amount` represents
    /// the amount authorized by the delegate
    pub delegate: COption<Pubkey>,
    /// The account's state
    pub state: AccountState,
    /// If `is_native.is_some`, this is a native token, and the value logs the
    /// rent-exempt reserve. An Account is required to be rent-exempt, so
    /// the value is used by the Processor to ensure that wrapped SOL
    /// accounts do not drop below this threshold.
    pub is_native: COption<u64>,
    /// The amount delegated
    pub delegated_amount: u64,
    /// Optional authority to close the account.
    pub close_authority: COption<Pubkey>,
}

```

owner can transfer, burn, or delegate tokens from the account

### Associated Token Account (ATA)

ATA is same as token accounts with an address that is PDA derived from and created by the Associated Token Program. Its more like a default token account for a user to hold tokens. Because of ATA we can determistically find a user's token account for any given mint. When creating an associated token account, the Associated Token Program makes a CPI (Cross-Program Invocation) to either the Token Program or Token Extension Program. The created account is owned by the token program and has the same Account type structure as defined in the token program

```rust
pub fn get_associated_token_address_and_bump_seed_internal(
    wallet_address: &Pubkey,
    token_mint_address: &Pubkey,
    program_id: &Pubkey,
    token_program_id: &Pubkey,
) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[
            &wallet_address.to_bytes(), // Owner's public key
            &token_program_id.to_bytes(), // Token Program or Token Extension Program
            &token_mint_address.to_bytes(), // Token mint address
        ],
        program_id, // Associated Token Program ID
    )
}
```

