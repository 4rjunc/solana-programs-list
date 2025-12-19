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


https://www.solana-program.com/docs/token
