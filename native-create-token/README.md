# native-create-token

Create token and add metaplex data to it

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.2.8. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.



## Errors I faced

1. 

```
solana_runtime::message_processor::stable_log] Account metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s is not executable
```

fix 

dump `mpl_token_metadata.so` from chain using 
`solana program dump metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s mpl_token_metadata.so` to fixtures folder and add the program to bankrun context
    
```
  const context = await start([{ name: 'create_token', programId: PROGRAM_ID }, {
    name: 'mpl_token_metadata',
    programId: new PublicKey(MPL_TOKEN_METADATA_PROGRAM_ID),
  },], [])
```

2. 
```
DEBUG solana_runtime::message_processor::stable_log] Program log: Invalid mint account for specified token standard
```

fix 
```.token_standard(TokenStandard::Fungible)```

3. 
```
solana_runtime::message_processor::stable_log] Program log:  Metadata's key must match seed of ['metadata', program id, mint] provided
```

fix 
```json
    const [metadataAddress, bump] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        new PublicKey(MPL_TOKEN_METADATA_PROGRAM_ID).toBuffer(), 
        mint_account.publicKey.toBuffer()
      ],
      new PublicKey(MPL_TOKEN_METADATA_PROGRAM_ID) 
    );
```



