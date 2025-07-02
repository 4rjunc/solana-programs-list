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
