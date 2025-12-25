## SPL TOKENS

A comprehensive guide to working with SPL tokens in Anchor programs, covering mint creation, token accounts, minting, and transfers using both regular accounts and PDAs.

---

## Token Mint

The mint account is the unique identifier for a token on Solana and stores global metadata. For example, check USDC's mint account: [EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v](https://orbmarkets.io/token/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/history?hideSpam=true)

### Mint Account Structure
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

**Key Points:**
- Use `token_interface` module from `anchor-spl` crate for compatibility with both Token Program and Token-2022
- Mint authority is the only account that can mint new tokens
- Setting `mint_authority` to `None` creates a fixed supply token (like Bitcoin)
- `freeze_authority` can freeze/unfreeze individual token accounts (optional)

### Creating Mint with Generated Keypair

```rust
#[derive(Accounts)]
pub struct CreateMint<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        init,
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

**TypeScript:**
```typescript
const mint = Keypair.generate();

await program.methods.createMint()
  .accounts({
    mint: mint.publicKey,
    tokenProgram: TOKEN_2022_PROGRAM_ID
  })
  .signers([mint])  // Mint keypair must sign during creation
  .rpc();
```

### Creating Mint with PDA

```rust
#[derive(Accounts)]
pub struct CreateMintPDA<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        init,
        payer = signer,
        mint::decimals = 6,
        mint::authority = mint.key(),  // PDA is its own authority
        mint::freeze_authority = mint.key(),
        seeds = [b"mint"],
        bump
    )]
    pub mint: InterfaceAccount<'info, Mint>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}
```

**When to use PDA mint:**
- Program-controlled token issuance
- Deterministic mint addresses
- No external authority needed (fully programmatic)

### Under the Hood: Account Creation

Anchor's `init` and `mint::` constraints generate two CPIs:

**1. System Program CPI (Create Account):**
```rust
anchor_lang::system_program::create_account(
    cpi_context.with_signer(&[&[b"mint", &[bump]]]),  // PDA signs if using seeds
    lamports,        // Rent-exempt amount
    82,              // Mint::LEN (82 bytes)
    &token_program.key(),  // Token Program owns the account
)?;
```

**2. Token Program CPI (Initialize Mint):**
```rust
::anchor_spl::token_interface::initialize_mint2(
    cpi_ctx,
    6,                          // decimals
    &signer.key(),             // mint_authority
    Some(&signer.key()),       // freeze_authority (optional)
)?;
```

**To see generated code:** `cargo install cargo-expand` → `cargo expand instructions::create_mint`

---

## Token Account 

A token account holds a user's balance of a specific token (mint). Think of it as a wallet for one specific token type.

### Token Account Structure
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

### Understanding Two Types of "Ownership"

**System-level ownership (AccountInfo.owner):**
- Always the Token Program or Token-2022 Program
- Determines which program can modify the account data
- Set during account creation

**Token-level authority (Account.owner):**
- The pubkey who can transfer, burn, or delegate tokens
- Can be a user wallet, PDA, or any account
- This is what most people mean by "owner"

### Associated Token Account (ATA)

An ATA is a token account at a **PDA address** with a standardized derivation formula, making it discoverable for any (wallet, mint) pair.

**Key characteristics:**
- **Is a PDA** derived by Associated Token Program
- Deterministic address: easy to find any user's token account for any mint
- Same `Account` structure as regular token accounts
- **System-owned by Token Program** (not ATA Program)
- Standard for user wallets

### ATA Derivation Formula
```rust
pub fn get_associated_token_address_and_bump_seed_internal(
    wallet_address: &Pubkey,        // Token authority (who owns the tokens)
    token_mint_address: &Pubkey,    // Which token
    program_id: &Pubkey,            // Associated Token Program ID
    token_program_id: &Pubkey,      // Token Program or Token-2022
) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[
            &wallet_address.to_bytes(),      // Seed 1: Authority
            &token_program_id.to_bytes(),    // Seed 2: Token Program
            &token_mint_address.to_bytes(),  // Seed 3: Mint
        ],
        program_id,  // ATA Program derives the PDA
    )
}
```

### ATA Creation Process

When creating an ATA, the Associated Token Program:
1. Derives the PDA address using the formula above
2. CPIs System Program to create the account
3. CPIs Token Program to initialize the token account
4. **Sets Token Program as system-level owner** (not ATA Program!)
5. Sets wallet address as token-level authority (`Account.owner`)

**Result:** A PDA with deterministic address, owned by Token Program, enabling standard token operations.

### Creating Associated Token Account

```rust
#[derive(Accounts)]
pub struct CreateAssociatedTokenAccount<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        init_if_needed,
        payer = signer,
        associated_token::mint = mint,
        associated_token::authority = signer,
        associated_token::token_program = token_program,
    )]
    pub token_account: InterfaceAccount<'info, TokenAccount>,
    
    pub mint: InterfaceAccount<'info, Mint>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}
```

**Anchor auto-resolves:**
- `signer` → `provider.wallet.publicKey`
- `token_account` → Derived from ATA formula
- `associated_token_program` → Known constant
- `system_program` → Known constant

### Creating Custom PDA Token Account

```rust
#[derive(Accounts)]
pub struct CreatePDATokenAccount<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        init,
        payer = signer,
        token::mint = mint,
        token::authority = token_account,  // PDA is its own authority
        token::token_program = token_program,
        seeds = [b"vault"],
        bump
    )]
    pub token_account: InterfaceAccount<'info, TokenAccount>,
    
    pub mint: InterfaceAccount<'info, Mint>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}
```

**Use custom PDAs for:**
- Program-controlled vaults
- Escrow accounts
- Protocol-owned liquidity
- Any scenario where program logic controls token transfers

**Key difference:** Custom seeds (`b"vault"`) vs ATA's standardized seeds. Program can sign for transfers using the PDA's seeds.

---

## Minting Tokens

Minting creates new tokens and adds them to the total supply. Only the mint authority can mint tokens.

### Requirements
- Mint authority must sign (or program signs if authority is PDA)
- Authority must match `mint.mint_authority`
- Destination must be a valid token account for that mint

### Minting with Wallet Authority

```rust
#[derive(Accounts)]
pub struct MintTokens<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,  // Must be mint authority
    
    #[account(mut)]
    pub mint: InterfaceAccount<'info, Mint>,
    
    #[account(mut)]
    pub token_account: InterfaceAccount<'info, TokenAccount>,
    
    pub token_program: Interface<'info, TokenInterface>,
}

pub fn mint_tokens(ctx: Context<MintTokens>, amount: u64) -> Result<()> {
    let cpi_accounts = MintTo {
        mint: ctx.accounts.mint.to_account_info(),
        to: ctx.accounts.token_account.to_account_info(),
        authority: ctx.accounts.signer.to_account_info(),
    };
    
    let cpi_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        cpi_accounts
    );
    
    token_interface::mint_to(cpi_ctx, amount)?;
    Ok(())
}
```

**Key:** `signer` must be the wallet set as `mint_authority` during mint creation.

### Minting with PDA Authority

```rust
#[derive(Accounts)]
pub struct MintTokensPDA<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        init_if_needed,
        payer = signer,
        mint::decimals = 6,
        mint::authority = mint,  // Mint PDA is its own authority
        mint::freeze_authority = mint,
        seeds = [b"mint"],
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

pub fn mint_tokens_pda(ctx: Context<MintTokensPDA>, amount: u64) -> Result<()> {
    let bump = ctx.bumps.mint;
    let signer_seeds: &[&[&[u8]]] = &[&[b"mint", &[bump]]];
    
    let cpi_accounts = MintTo {
        mint: ctx.accounts.mint.to_account_info(),
        to: ctx.accounts.token_account.to_account_info(),
        authority: ctx.accounts.mint.to_account_info(),  // PDA signs
    };

    let cpi_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        cpi_accounts
    ).with_signer(signer_seeds);  // Program provides PDA signature

    token_interface::mint_to(cpi_ctx, amount)?;
    Ok(())
}
```

**Key:** Program signs for PDA using `with_signer(seeds)`. Only the program that derived the PDA can provide valid signature.

---

## Token Transfers

Transfer tokens from one token account to another of the same mint. Only the token account's authority can transfer tokens out.

### Basic Transfer

```rust
#[derive(Accounts)]
pub struct TransferTokens<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,  // Must be sender authority
    
    #[account(mut)]
    pub mint: InterfaceAccount<'info, Mint>,
    
    #[account(mut)]
    pub sender_token_account: InterfaceAccount<'info, TokenAccount>,
    
    #[account(mut)]
    pub recipient_token_account: InterfaceAccount<'info, TokenAccount>,
    
    pub token_program: Interface<'info, TokenInterface>,
}

pub fn transfer_tokens(ctx: Context<TransferTokens>, amount: u64) -> Result<()> {
    let decimals = ctx.accounts.mint.decimals;

    let cpi_accounts = TransferChecked {
        mint: ctx.accounts.mint.to_account_info(),
        from: ctx.accounts.sender_token_account.to_account_info(),
        to: ctx.accounts.recipient_token_account.to_account_info(),
        authority: ctx.accounts.signer.to_account_info(),
    };

    let cpi_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        cpi_accounts
    );
    
    token_interface::transfer_checked(cpi_ctx, amount, decimals)?;
    Ok(())
}
```

**Why `transfer_checked`?** It verifies the mint and decimals match, preventing accidental transfers to wrong token accounts.

### Transfer from PDA (Vault Pattern)

```rust
#[derive(Accounts)]
pub struct TransferFromVault<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,  // Initiates transaction
    
    #[account(mut)]
    pub mint: InterfaceAccount<'info, Mint>,
    
    #[account(
        mut,
        token::mint = mint,
        token::authority = vault_token_account,  // PDA is authority
        seeds = [b"vault"],
        bump
    )]
    pub vault_token_account: InterfaceAccount<'info, TokenAccount>,
    
    #[account(
        init_if_needed,
        payer = signer,
        associated_token::mint = mint,
        associated_token::authority = signer,
        associated_token::token_program = token_program,
    )]
    pub user_token_account: InterfaceAccount<'info, TokenAccount>,
    
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn transfer_from_vault(ctx: Context<TransferFromVault>, amount: u64) -> Result<()> {
    let bump = ctx.bumps.vault_token_account;
    let signer_seeds: &[&[&[u8]]] = &[&[b"vault", &[bump]]];

    let decimals = ctx.accounts.mint.decimals;

    let cpi_accounts = TransferChecked {
        mint: ctx.accounts.mint.to_account_info(),
        from: ctx.accounts.vault_token_account.to_account_info(),
        to: ctx.accounts.user_token_account.to_account_info(),
        authority: ctx.accounts.vault_token_account.to_account_info(),  // PDA signs
    };
    
    let cpi_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        cpi_accounts
    ).with_signer(signer_seeds);  // Program signs for PDA
    
    token_interface::transfer_checked(cpi_ctx, amount, decimals)?;
    Ok(())
}
```

**Use cases:**
- Staking/unstaking
- Escrow releases
- Protocol-owned liquidity
- Vault withdrawals

---

## Important Concepts

### Interface vs Program Types
```rust
// Accepts both Token Program and Token-2022
Interface<'info, TokenInterface>  ✅

// Only accepts classic Token Program
Program<'info, Token>  ❌ Limited
```

**Always use `Interface<TokenInterface>`** for maximum compatibility.

### Authority Patterns

| Pattern | Authority | Use Case |
|---------|-----------|----------|
| **Wallet authority** | `mint::authority = signer` | User-controlled minting |
| **PDA as authority** | `mint::authority = mint` | Program-controlled minting |
| **Separate PDA authority** | `mint::authority = mint_authority_pda` | Shared authority across mints |

### Common Pitfalls

❌ **Wrong:** Using `Account<'info, Mint>` with `init`
✅ **Correct:** Use `InterfaceAccount<'info, Mint>` or `Signer<'info>` (for keypair mints)

❌ **Wrong:** Authority mismatch in CPIs
✅ **Correct:** Ensure CPI authority matches account's authority field

❌ **Wrong:** Forgetting `with_signer` for PDA authorities
✅ **Correct:** Always use `with_signer(seeds)` when PDA is authority

---

## References

- [Solana Program Library Documentation](https://www.solana-program.com/docs/token)
- [Anchor Tokens Guide](https://www.anchor-lang.com/docs/tokens)
- [Solana Token Examples](https://solana.com/docs/programs/examples#tokens)
- [Understanding PDAs and ATAs](https://www.youtube.com/watch?v=d9YoonqoBaw)
- [Helius: Solana PDA Deep Dive](https://www.helius.dev/blog/solana-pda)
