# native-cpi-basic


## Cross Program Invocations

The `invoke` function handles CPIs that don't require PDA signers. The function calls the invoke_signed function with an empty `signers_seeds` array, indicating no PDAs required for signing.

```rust
pub fn invoke(instruction: &Instruction, account_infos: &[AccountInfo]) -> ProgramResult {
    invoke_signed(instruction, account_infos, &[])
}
```

## Cross Program Invocations with PDA Signers
The `invoke_signed` function handles CPIs that require PDA signers. The function takes the seeds for deriving signer PDAs as `signer_seeds`.

```rust
pub fn invoke_signed(
    instruction: &Instruction,
    account_infos: &[AccountInfo],
    signers_seeds: &[&[&[u8]]],
) -> ProgramResult {
    // --snip--
    invoke_signed_unchecked(instruction, account_infos, signers_seeds)
}
```


To run build and test of cpi-invoke:

```bash
bun run build-and-test-cpi
```

To run build and test of cpi-signed:

```bash
bun run build-and-test-cpi-signed
```
