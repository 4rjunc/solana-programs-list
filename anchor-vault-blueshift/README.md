# Anchor Vault 

<p align="center">
  <img src="https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExODM2eW93emg1aGk4Z29iNHFnZnhpd3Q4Z2VhNzNuZ282eGM4a3RpaSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/8Xg7lrwftwTzWbjhmr/giphy.gif" alt="vault" width="200" />
</p>

## Notes 

1. What is `signer_seeds`?

`signer_seeds` is the **seed array used to derive and authorize the PDA (Program Derived Address)**. It's NOT the signer's key - it's the recipe to recreate the vault's address and prove ownership.

```rust
let signer_seeds = &[b"vault", bindings.as_ref(), &[ctx.bumps.vault]];
//                   ^^^^^^^^  ^^^^^^^^^^^^^^^^  ^^^^^^^^^^^^^^^^^^
//                   literal   signer's pubkey   bump byte
```

2. Can anyone with these seeds drive the PDA?

No, absolutely not! Here's why:
- The bindings.as_ref() is the signer's public key from the current transaction
- Only someone who can sign the transaction (has the private key) can execute this
- The seeds alone are useless without the actual transaction signature
- The signer: Signer<'info> constraint ensures the transaction is properly signed

```rust
// This person must SIGN the transaction to execute withdraw
#[account(mut)]
pub signer: Signer<'info>,  // <-- This validates the signature!
```

3. More about `signer_seeds`

`signer_seeds` serves two purposes:

   - A) PDA Derivation: Recreates the vault address

        ```rust
        // Anchor internally does: 
        // Pubkey::find_program_address(&[b"vault", signer_key], program_id)
        ```

   - B) CPI Authorization: Allows the PDA to "sign" on behalf of itself
        ```rust
        CpiContext::new_with_signer(
            // ...
            &[&signer_seeds[..]], // <-- This lets the PDA authorize the transfer
        )
        ```
The PDA can only be controlled by the program that created it, and only when the correct seeds are provided.

4. The `0` in `minimum_balance(0)` ?

```
Rent::get()?.minimum_balance(0)
//                           ^
//                           Account data size = 0 bytes
```
This calculates the rent-exempt minimum for an account with zero data storage - just the basic account structure with no additional data. Since this vault only stores lamports (not custom data), it needs 0 bytes of data storage.
For comparison:
```rust
Rent::get()?.minimum_balance(100)  // Account with 100 bytes of data
Rent::get()?.minimum_balance(0)    // Account with no data (just lamports)
```
The check ensures the deposit amount exactly matches what's needed to make the account rent-exempt.

5. Why `system_program` is required in `VaultAction`?

In this Anchor account struct, system_program is required because the `vault` account is defined as a `SystemAccount<'info>`, which means it's owned by the System Program.

Here's why it's necessary:
Program Derived Address (PDA) Operations
The `vault` account uses seeds and a bump, making it a PDA. When you need to:
- `Initialize` the vault account (allocate space and assign ownership)
- `Reallocate` space for the account
- `Transfer` ownership between programs

Read more on account types: https://www.anchor-lang.com/docs/references/account-types
