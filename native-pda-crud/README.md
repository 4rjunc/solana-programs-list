# native-pda-crud

To install dependencies:

```bash
bun install
```

To build and run tests:

```bash
bun run build-and-test
```

This project was created using `bun init` in bun v1.2.8. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.

## Errors and blunders I faced and How I fixed it ?

### `Program log: Error: memory allocation failed, out of memory`

- Cause 
```
/// account struct passed from test case had user, message and bump 
export const UpdateSchema = new Map([
  [
    Update,
    {
      kind: 'struct',
      fields: [
        ['instruction', 'u8'],
        ['user', [32]],
        ['message', 'string'],
        ['bump', 'u8']
      ],
    },
  ],
]);

/// Instruction enum was expecting only a String
#[derive(BorshDeserialize, BorshSerialize, Debug)]
pub enum Instructions {
    Create(MessageAccount),
    Update(String),
    Delete,
}

```
    
- Fix : change the argument in `Update` atribute of `Instruction`
```
#[derive(BorshDeserialize, BorshSerialize, Debug)]
pub enum Instructions {
    Create(MessageAccount),
    Update(MessageAccount),
    Delete,
}
```


