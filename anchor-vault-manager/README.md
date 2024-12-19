# Vault Manager

This is an Anchor project implementing a simple vault manager on the Solana blockchain. The contract allows users to deposit and withdraw tokens from a vault.

## Contract Structure

### Program ID

```
2eH4VtkkB5X5592hmuQqFQvQ9QKaTEmRZyvQgf9EWyxp
```

[Solana Explorer](https://explorer.solana.com/address/2eH4VtkkB5X5592hmuQqFQvQ9QKaTEmRZyvQgf9EWyxp?cluster=devnet)

### Modules

#### vault_manager

This is the main module of the contract, containing the program's logic.

### Functions

1. `initialize`: Initializes the Vault Manager.
2. `deposit`: Allows users to deposit tokens into the vault.
3. `withdraw`: Allows users to withdraw tokens from the vault.

### Structs

1. `Initialize`: Accounts required for initializing the vault manager.
2. `Deposit`: Accounts required for depositing tokens into the vault.
3. `Withdraw`: Accounts required for withdrawing tokens from the vault.

### Errors

- `VaultError`: Custom error enum for handling insufficient funds errors.

## Contract Details

### Initialize

- Creates a PDA (Program Derived Address) for the token account owner.
- Initializes necessary accounts and programs.

### Deposit

- Checks if the sender has sufficient funds.
- Transfers tokens from the sender's account to the vault.
- Uses Cross-Program Invocation (CPI) to interact with the SPL Token program.

### Withdraw

- Checks if the vault has sufficient funds.
- Transfers tokens from the vault to the receiver's account.
- Uses CPI with signer seeds to authorize the transfer.

## Building and Testing the Project

To build and test this Anchor project, follow these steps:

1. Install Anchor and its dependencies:

   ```
   npm install -g @project-serum/anchor-cli
   ```

2. Build the project:

   ```
   anchor build
   ```

3. Update the program ID in `lib.rs` and `Anchor.toml` with the new program ID generated during the build process.

4. Test the project:

   ```
   anchor test
   ```

5. To deploy the program to a Solana cluster (e.g., devnet):
   ```
   anchor deploy --provider.cluster devnet
   ```

Note: Make sure you have a Solana wallet set up and funded with SOL for deployment costs.

## Additional Notes

- This contract uses the `anchor_lang` and `anchor_spl` crates for Solana program development.
- Proper error handling is implemented for insufficient funds scenarios.
- The contract uses PDAs for secure token management.
- Always ensure you have the latest version of Anchor and its dependencies installed.

For more information on Anchor development, visit the [official Anchor documentation](https://www.anchor-lang.com/).
