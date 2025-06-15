# Cross Program Invocation (CPI)

![cpi](./diagram.png)

refers to action of one program invokes/calls the instructions of another program. Its like an api call to instructions of another program.

## Key Points
- CPI enable solana program to invoke instructions on another program 
- From caller program to callee program signer privilages are extended
- When CPI, program can sign on behalf of PDAs derived from their own program ID.
- only 4 program can be called in CPI call chain

This program has same logic as [⚓ PDA CRUD Program](https://github.com/4rjunc/solana-programs-list/tree/main/anchor-pda-crud). Expect the for demostrating CPI calls I have made changes that user needs to send 0.001 SOL to update the message and after deleting the account the lamports will be send back to user.

## CPI Implementation in This Program

### 1. Update Function CPI

```rust
pub fn update(ctx: Context<Update>, message: String) -> Result<()> {
    // Set up the accounts for the transfer
    let transfer_accounts = Transfer {
        from: ctx.accounts.user.to_account_info(),
        to: ctx.accounts.vault_account.to_account_info(),
    };

    // Create the CPI context
    let cpi_context = CpiContext::new(
        ctx.accounts.system_program.to_account_info(),
        transfer_accounts,
    );

    // Execute the CPI call to System Program's transfer instruction
    transfer(cpi_context, 1_000_000)?;

    // Update the message after successful payment
    account_data.message = message;
    Ok(())
}
```

**What happens here:**
- User calls `update()` to change their message
- Program charges 1,000,000 lamports (0.001 SOL) as an update fee
- Uses CPI to call System Program's `transfer` instruction
- Transfers SOL from user's account to a vault PDA
- Updates the message after successful payment

### 2. Delete Function CPI with Signer Seeds

```rust
pub fn delete(ctx: Context<Delete>) -> Result<()> {
    let user_key = ctx.accounts.user.key();
    
    // Create signer seeds for the vault PDA
    let signer_seeds: &[&[&[u8]]] =
        &[&[b"vault", user_key.as_ref(), &[ctx.bumps.vault_account]]];

    let transfer_accounts = Transfer {
        from: ctx.accounts.vault_account.to_account_info(),
        to: ctx.accounts.user.to_account_info(),
    };

    // Create CPI context with signer seeds
    let cpi_context = CpiContext::new(
        ctx.accounts.system_program.to_account_info(),
        transfer_accounts,
    )
    .with_signer(signer_seeds);

    // Transfer all lamports back to user
    transfer(cpi_context, ctx.accounts.vault_account.lamports())?;

    Ok(())
}
```

**What happens here:**
- User calls `delete()` to remove their message account
- Program refunds all SOL from the vault back to the user
- Uses **signer seeds** because the vault PDA needs to "sign" the transfer
- Transfers all lamports from vault PDA back to user
- Message account gets closed (rent refunded via `close = user`)

## Key CPI Concepts Demonstrated

### 1. Basic CPI Structure
```rust
// 1. Define target accounts
let accounts = TargetAccounts { ... };

// 2. Create CPI context
let cpi_ctx = CpiContext::new(target_program, accounts);

// 3. Call the instruction
target_instruction(cpi_ctx, instruction_data)?;
```

### 2. CPI with Signer Seeds
When a PDA needs to "sign" a transaction, you must provide the seeds used to derive it:

```rust
let signer_seeds: &[&[&[u8]]] = &[&[
    b"vault",                    // seed
    user_key.as_ref(),          // seed
    &[vault_bump]               // bump seed
]];

let cpi_ctx = CpiContext::new(program, accounts)
    .with_signer(signer_seeds);
```

Curious on the `&[&[&[u8]]]` part read this [tweet]()

### 3. Account Info Conversion
Programs receive accounts as specific types, but CPI requires `AccountInfo`:

```rust
ctx.accounts.user.to_account_info()           // Convert Signer to AccountInfo
ctx.accounts.system_program.to_account_info() // Convert Program to AccountInfo
```

## Account Structure

```rust
#[account]
pub struct MessageAccount {
    pub user: Pubkey,    // Owner of the message
    pub message: String, // The stored message
    pub bump: u8,        // PDA bump seed
}
```

## PDAs Used

- **Message PDA**: `["message", user_pubkey]` - Stores the user's message
- **Vault PDA**: `["vault", user_pubkey]` - Holds the update fee in escrow

These patterns form the foundation for more complex DeFi protocols, escrows, and multi-program interactions on Solana.

### References 
- [1](https://solana.com/docs/core/cpi)
- [2](https://www.rareskills.io/post/cross-program-invocation)
- [3](https://www.anchor-lang.com/docs/basics/cpi)
- [4](https://github.com/priyanshpatel18/anchor-cpi)
