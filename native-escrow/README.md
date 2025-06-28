# native-escrow

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.2.8. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.

AccountInfo Structure [here](https://docs.rs/solana-program/1.5.0/solana_program/account_info/struct.AccountInfo.html#structfield.data)
The `AccountInfo` is Solana's generic account wrapper that contains metadata about any account on the blockchain:

- key: The account's public key (address)
- is_signer: Whether this account signed the transaction
- is_writable: Whether the account can be modified
- lamports: The SOL balance (in lamports)
- data: The actual account data (this is where the token account struct lives)
- owner: Which program owns this account (for token accounts, this is the Token Program)
- executable: Whether this account contains executable program code
- rent_epoch: When rent is next due

All internal Solana internal account information are saved into fields on the account but never into the data field which is solely meant for user space information

Token Account Structure [here](https://github.com/solana-labs/solana-program-library/blob/80e29ef6b9a081d457849a2ca42db50d7da0e37e/token/program/src/state.rs#L86)
The `Account` struct is what gets serialized and stored in the `data` field of the `AccountInfo` for token accounts:

- mint: The token type this account holds (e.g., USDC mint address)
- owner: Who owns the tokens in this account
- amount: How many tokens are in the account
- delegate: Optional delegate who can spend tokens on behalf of the owner
- state: Account state (Initialized, Frozen, etc.)
- is_native: If this is a wrapped SOL account, tracks the rent-exempt reserve
- delegated_amount: How many tokens the delegate is authorized to spend
- close_authority: Optional authority that can close this account
