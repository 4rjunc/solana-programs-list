# Accounts 

- all data is stored in what are called "accounts".
- on Solana as a public database with a single "Accounts" table, where each entry in this table is an "account."


Account struct [Here](https://github.com/anza-xyz/agave/blob/v2.1.13/sdk/account/src/lib.rs#L48-L60)

```rust
#[derive(PartialEq, Eq, Clone, Default)]
pub struct Account {
    /// lamports in the account
    pub lamports: u64,
    /// data held in this account
    #[cfg_attr(feature = "serde", serde(with = "serde_bytes"))]
    pub data: Vec<u8>,
    /// the program that owns this account. If executable, the program that loads this account.
    pub owner: Pubkey,
    /// this account's data contains a loaded program (and is now read-only)
    pub executable: bool,
    /// the epoch at which this account will next owe rent
    pub rent_epoch: Epoch,
}
```

## Key Points
- Accounts can store up to 10MiB of data, which contains either executable program code or program state.
- Accounts require a rent deposit in lamports (SOL) that's proportional to the amount of data stored, and you can fully recover it when you close the account.
- Every account has a program owner. Only the program that owns an account can change its data or deduct its lamport balance. But anyone can increase the balance.
- Sysvar accounts are special accounts that store network cluster state.
- Program accounts store the executable code of smart contracts.
- Data accounts are created by programs to store and manage program state.

# Account
- Every account on Solana has a unique 32-byte address, often shown as a base58 encoded string (e.g. 14grJpemFaf88c8tiVb77W7TYg2W3ir6pfkKz3YjhhZ5).

- The relationship between the account and its address works like a key-value pair, where the address is the key to locate the corresponding on-chain data of the account. The account address acts as the "unique ID" for each entry in the "Accounts" table.


## PDA
While public keys are commonly used as account addresses, Solana also supports a feature called Program Derived Addresses (PDAs). PDAs are special addresses that you can deterministically derive from a program ID and optional inputs (seeds).

## Account Type

Accounts have a max size of 10MiB and every account on Solana shares the same base Account type.

- data: bytes 
- lamports: numbers
- executable: bool
- owner: program address 

- data: A byte array that stores arbitrary data for an account. For non-executable accounts, this often stores state that's meant be read from. For program accounts (smart contracts), this contains the executable program code. The data field is commonly called "account data."

- executable: This flag shows if an account is a program.

- lamports: The account's balance in lamports, the smallest unit of SOL (1 SOL = 1 billion lamports).

- owner: The program ID (public key) of the program that owns this account. Only the owner program can change the account's data or deduct its lamports balance. 

- rent_epoch: A legacy field from when Solana had a mechanism that periodically deducted lamports from accounts. While this field still exists in the Account type, it is no longer used since rent collection was deprecated.

### base account type
```rust 
pub struct Account {
    /// lamports in the account
    pub lamports: u64,
    /// data held in this account
    #[cfg_attr(feature = "serde", serde(with = "serde_bytes"))]
    pub data: Vec<u8>,
    /// the program that owns this account. If executable, the program that loads this account.
    pub owner: Pubkey,
    /// this account's data contains a loaded program (and is now read-only)
    pub executable: bool,
    /// the epoch at which this account will next owe rent
    pub rent_epoch: Epoch,
}
```

Only accounts owned by the System Program can pay transaction fees.

## Sysvar Accounts
Sysvar accounts are special accounts at predefined addresses that provide access to cluster state data. These accounts update dynamically with data about the network cluster. You can find the full list of Sysvar Accounts

## Data Account
On Solana, the executable code of a program is stored in a different account than the program's state. This is like how operating systems typically have separate files for programs and their data. To maintain state, programs define instructions to create separate accounts that they own. Each of these accounts has its own unique address and can store any arbitrary data defined by the program.

Note that only the System Program can create new accounts. Once the System Program creates an account, it can then transfer or assign ownership of the new account to another program.

In other words, creating a data account for a custom program takes two steps:

1. Invoke the System Program to create an account, then transfer ownership to the custom program
2. Invoke the custom program, which now owns the account, to initialize the account data as defined by the program's instruction

