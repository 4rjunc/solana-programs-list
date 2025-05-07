![Relationships between accounts](./banner.png)

Token Program already deployed and ready for anyone to use for creating, minting, trading, and even burning tokens.
- [Token Program](https://spl.solana.com/token)
- [Source Code](https://github.com/solana-program/token)



Mint Accounts 
- Used to create new token, uses the `create-token` function to initialize a new Mint Account. Contains basic information about token 
    - `mint-authority` which is a public key, authorized to mint the token
    - `freeze-authority` who can freeze token accounts
    - `supply` of the token
    - `decimal` number
    - `isInitialized` flag 

Token Accounts
- The token account holds information about tokens owned by a pubkey

This account stores general information about the token and who has permissions over it. Observe that there is no data about token holdings of particular individuals. These are stored in Token Accounts.

Token Accounts
The token account holds information about the tokens owned by a pubkey. Ownership relationships become a bit confusing, though. The token account itself is owned by the Token program and it is the Token program who controls access to these tokens using the owner, close-authority and delegate fields within the account. The owner is the pubkey who can spend/transfer the tokens, the close-authority can close the account, and the owner can give rights to a delegate pubkey to spend up to a delegatedAmount of tokens. Besides these fields, there are also a few flags: isInitialized, isFrozen, isNative. By default, token accounts are initialized upon creation, are not frozen and are not native. Previously, we saw the mint account defines a freeze-authority, who has the right to freeze the tokens in a user account. Often times, the freeze-authority is null (all zeroes). In that case, no one can freeze the corresponding tokens held in the token account.

### Resources 
[Solana Doc 1](https://solana.com/pt/developers/courses/tokens-and-nfts/token-program)
[Solana Doc 2](https://spl.solana.com/token)

## Erros I faced
[No Entrypoint](https://solana.stackexchange.com/questions/14899/getting-build-error-the-global-allocator-in-spl-token-conflicts-with-globa)
