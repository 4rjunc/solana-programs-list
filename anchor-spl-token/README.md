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

## Token Account 

A token account is like a wallet for a specific token (mint) owned by an individual. It stores information about ownership of units of a specific token type.

### Account Structure
```rust
/// Token Account data structure
#[repr(C)]
#[derive(Clone, Copy, Debug, Default, PartialEq)]
pub struct Account {
    /// The mint associated with this account
    pub mint: Pubkey,
    /// The owner (authority) of this account
    pub owner: Pubkey,
    /// The amount of tokens this account holds
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
    /// Optional authority to close the account
    pub close_authority: COption<Pubkey>,
}
```

**Ownership Concepts:**

- **System-level ownership**: Token accounts are always owned by the Token Program (or Token-2022 Program) at the system level. This determines which program can modify the account data.
- **Token-level authority**: The `owner` field specifies who has authority to transfer, burn, or delegate tokens from this account. This is sometimes called the "authority" to distinguish it from the program owner.

### Associated Token Account (ATA)

An Associated Token Account (ATA) is a token account whose address is a **Program Derived Address (PDA)** created using a standardized derivation formula by the Associated Token Program. ATAs serve as the default token account for a user to hold a specific token.

**Key characteristics:**
- Deterministic address based on owner and mint
- Same `Account` data structure as regular token accounts
- Owned by Token Program (not Associated Token Program) at system level
- Enables easy discovery of any user's token account for any mint

### ATA Address Derivation
```rust
pub fn get_associated_token_address_and_bump_seed_internal(
    wallet_address: &Pubkey,        // The authority who will own the tokens
    token_mint_address: &Pubkey,    // The token mint
    program_id: &Pubkey,            // Associated Token Program ID
    token_program_id: &Pubkey,      // Token Program or Token-2022
) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[
            &wallet_address.to_bytes(),      // Owner's public key
            &token_program_id.to_bytes(),    // Token Program or Token Extension Program
            &token_mint_address.to_bytes(),  // Token mint address
        ],
        program_id,  // Associated Token Program ID
    )
}
```

**Creation Process:**

When creating an ATA, the Associated Token Program:
1. Derives the PDA address using the formula above
2. Makes a CPI to the System Program to create the account
3. Makes a CPI to the Token Program to initialize the account
4. Sets the Token Program as the system-level owner
5. Sets the wallet address as the token-level authority (`Account.owner`)

The resulting ATA is a PDA with a deterministic address, but owned by the Token Program, allowing it to process token operations like transfers, burns, and delegations. More on ATA and PDA: [1](https://www.youtube.com/watch?v=d9YoonqoBaw), [2](https://www.helius.dev/blog/solana-pda)

## Token Mint

We will do CPI to the Token Program to mint new tokens. This is done by invoking `mint_to` instruction on token program. Only the address specified as mint authority can mint new tokens

Accounts context:

```rust
#[derive(Accounts)]
pub struct MintTokens<'info> {
    // The mint authority
    #[account(mut)]
    pub signer: Signer<'info>,
    // The mint account
    #[account(mut)]
    pub mint: InterfaceAccount<'info, Mint>,
    // The destination token account
    #[account(mut)]
    pub token_account: InterfaceAccount<'info, TokenAccount>,
    // The token program
    pub token_program: Interface<'info, TokenInterface>,
}
```

Instruction:

```rust
    pub fn mint_tokens(ctx: Context<MintTokens>, amount: u64) -> Result<()> {
        let cpi_accounts = MintTo {
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.token_account.to_account_info(),
            authority: ctx.accounts.signer.to_account_info(),
        };
        let cpi_program_id = ctx.accounts.token_program.key();
        let cpi_context = CpiContext::new(cpi_program_id, cpi_accounts);
        token_interface::mint_to(cpi_context, amount)?;
        Ok(())
    }
```

the `token_interface::mint_to` function make a CPI to either the Token Program or Token Extension Program. This function requires:

The `MintTo` struct which specifies the required accounts:

`mint` - The mint account to create new units of tokens for
`to` - The destination token account to receive the minted tokens
`authority` - The mint authority with permission to mint tokens

The amount of tokens to mint, in base units of the token adjusted by decimals. (e.g. if the mint has 6 decimals, amount of 1000000 = 1 token)

The mint authority passed to the `mint_to` instruction must match the `mint_authority` stored on the mint account.

### Mint Tokens with PDA mint authority 

Accounts context (this initialize mint account and token account)

```rust
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
```

Instruction:

```rust 
pub fn mint_token_pda(ctx: Context<MintTokensPDA>, amount: u64) -> Result<()> {
        let signer_seeds: &[&[&[u8]]] = &[&[b"mint7", &[ctx.bumps.mint]]];
        // Create the MintTo struct with the accounts required for the CPI
        let cpi_accounts = MintTo {
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.token_account.to_account_info(),
            authority: ctx.accounts.mint.to_account_info(),
        };

        // The program being invoked in the CPI
        let cpi_program_id = ctx.accounts.token_program.to_account_info();

        // Combine the accounts and program into a "CpiContext"
        let cpi_context = CpiContext::new(cpi_program_id, cpi_accounts).with_signer(signer_seeds);

        // Make CPI to mint_to instruction on the token program
        token_interface::mint_to(cpi_context, amount)?;
        Ok(())
    }

```

## Token Transfer

Moving token from one token account to another token account of same mint. Done by invoking `transfer-checked` instruction in token program. Only the pubkey in owner (authority) of the source account can transfer tokens out of the account. 

`TransferChecked` struct which specifies the required accounts:

`mint` - The mint account specifying the type of token to transfer
`from` - The source token account to transfer tokens from
`to` - The destination token account to receive the transferred tokens
`authority` - The owner of the source token account

Account Context (at minimum these accounts are required):

```rust
#[derive(Accounts)]
pub struct TransferTokens<'info> {
    // The source token account owner
    #[account(mut)]
    pub signer: Signer<'info>,
    // The mint account specifying the type of token
    #[account(mut)]
    pub mint: InterfaceAccount<'info, Mint>,
    // The source token account to transfer tokens from
    #[account(mut)]
    pub sender_token_account: InterfaceAccount<'info, TokenAccount>,
    // The destination token account to receive tokens
    #[account(mut)]
    pub recipient_token_account: InterfaceAccount<'info, TokenAccount>,
    // The token program that will process the transfer
    pub token_program: Interface<'info, TokenInterface>,
}
```

Instruction

```rust
    pub fn transfer_tokens(ctx: Context<TransferToken>, amount: u64) -> Result<()> {
        let decimals = ctx.accounts.mint.decimals;

        let cpi_accounts = TransferChecked {
            mint: ctx.accounts.mint.to_account_info(),
            from: ctx.accounts.sender_token_account.to_account_info(),
            to: ctx.accounts.recipient_token_account.to_account_info(),
            authority: ctx.accounts.signer.to_account_info(),
        };

        let cpi_program_id = ctx.accounts.token_program.to_account_info();
        let cpi_context = CpiContext::new(cpi_program_id, cpi_accounts);
        token_interface::transfer_checked(cpi_context, amount, decimals);

        Ok(())
    }
```

References 

- [1](https://www.solana-program.com/docs/token)
- [2](https://www.anchor-lang.com/docs/tokens)
- [3](https://solana.com/docs/programs/examples#tokens)


