<div align="center">
 <img src="./banner.png" alt="solana" width="380">

 <h2> Solana Programs Collection </h2>
</div>

A curated collection of Solana programs built with Rust

## Repository Structure

Each program is organized in its own dedicated folder with a clear naming convention:

- For Anchor framework programs: `anchor-[programname]`
- For native Solana programs: `native-[programname]`
- For general notation of framework programs: `[framework]-[programname]`

## Programs Included

| Program                                                                                     | Description                      | Features                                      | Framework                              | Status         | Tests |
| ------------------------------------------------------------------------------------------- | -------------------------------- | --------------------------------------------- | -------------------------------------- | -------------- | ----- |
| [Counterapp](https://github.com/4rjunc/solana-programs-list/tree/main/anchor-counterapp)    | Simplecounter app                | `PDA`                                         | [Anchor](https://www.anchor-lang.com/) | 🟢 Completed   | ✅    |
| [NFT Minting](https://github.com/4rjunc/solana-programs-list/tree/main/anchor-nft-metaplex) | Create & manage NFT collections  | `Metadata` `Metaplex` `Mint` `Transfer` `CPI` | [Anchor](https://www.anchor-lang.com/) | 🟡 In Progress | ❌    |
| [Sol Valut](https://github.com/4rjunc/solana-programs-list/tree/main/anchor-sol-vault)      | Deposit and withdraw Sol         | `Deposit` `Withdraw` `PDA`                    | [Anchor](https://www.anchor-lang.com/) | 🟢 Completed   | ✅    |
| [PDA Demo](https://github.com/4rjunc/solana-programs-list/tree/main/anchor-pda)             | Simple program to demostrate PDA | `PDA`                                         | [Anchor](https://www.anchor-lang.com/) | 🟢 Completed   | ✅    |
| Escrow                                                                                      | Secure token swaps               | `Lock` `Release` `Cancel`                     | [Anchor](https://www.anchor-lang.com/) | 🔴 Planned     | ❌    |

## Prerequisites

- Solana CLI
- Rust
- Anchor (for Anchor framework programs)
- Node.js (for deployment and testing scripts)

## Getting Started

1. Clone the repository

```bash
git clone https://github.com/4rjunc/solana-programs-list.git
cd solana-programs-list
```

2. Set up your Solana environment
3. Navigate to individual program directories
4. Follow specific program `README.md` instructions

## Building Programs

For Anchor programs:

```bash
anchor build
```

For native Solana programs:

```bash
cargo build
```

## Testing

Each program includes its own test suite. Refer to individual program documentation for testing instructions.

## Contributing

Please read our [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

[Specify your license, e.g., MIT License]
