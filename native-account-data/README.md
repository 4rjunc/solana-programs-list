Saving an address with name, house number, street and city in an account.	

change serilize and deseralize to bytemuck

## what

This program store data into newlt created account's data field 
[Accounts struct](https://docs.rs/solana-program/1.5.0/solana_program/account_info/struct.AccountInfo.html#fields)

## Deep dive into the serialization line:
```student_info.serialize(&mut &mut student_info_account.data.borrow_mut()[..])?;```

1. `student_info.serialize(...)`

- This calls the `serialize` method on the `Student` struct
- The method comes from the `BorshSerialize` trait that was imported
- It converts the struct into a binary format that can be stored on-chain

2. `student_info_account.data`

- Every Solana account has a `data` field that holds the account's raw bytes
- This is where all the actual information gets stored on the blockchain

3. `.borrow_mut()`

- The account data is wrapped in a `RefCell` for interior mutability
- `borrow_mut()` gives us mutable access to the data
- This allows us to modify the account's contents

4. `[..]`

- This creates a slice of the entire data array
- It's equivalent to taking the full range from start to end
- Gives us access to all available bytes in the account

5. `&mut &mut` (the tricky part)

- The inner `&mut` creates a mutable reference to the slice
- The outer `&mut` is needed because serialize() expects a mutable reference to something that implements Write
- The slice `&mut [u8]` implements the `Write` trait, allowing borsh to write serialized bytes directly into it

## Here are the key components of a Solana TransactionInstruction:

1. Keys Array (Accounts)

```javascript
keys: [
  {
    pubkey: student.publicKey,  // account that will store the data
    isSigner: true,                        // needs to sign the transaction
    isWritable: true,                      // data will be written to this account
  },
  { 
    pubkey: payer.publicKey,               // account paying for transaction fees
    isSigner: true,                        // must sign (authorizes payment)
    isWritable: true,                      // lamports will be deducted
  },
  { 
    pubkey: SystemProgram.programId,       // solana's built-in system program
    isSigner: false,                       // programs don't sign
    isWritable: false,                     // program code isn't modified
  },
],```

### Account roles:

- Data account: Where your information gets stored
- Payer account: Pays transaction fees and rent
- System program: Handles account creation/management

2. Program ID

```javascript
programId: PROGRAM_ID,  // your custom program's address
```

- Tells Solana which program should process this instruction

3. Instruction Data

```javascript
data: new Student({
  name: 'arjun',
  reg_number: 136,
  sub: 'computer',
}).toBuffer(),
```

- Serialized data that gets passed to your program
- Your Rust program deserializes this to understand what to do
- Contains the actual information to store/process

Complete instruction flow:

1. Solana runtime receives the instruction
2. Loads the specified accounts (addressInfoAccount, payer, SystemProgram)
3. Calls your program (PROGRAM_ID) 
4. Passes the accounts + data to your Rust program's entrypoint
5. Your program processes the data and modifies account state
6. Transaction completes

In your Rust program, you receive:
```rust
pub fn process_instruction(
    program_id: &Pubkey,           // PROGRAM_ID
    accounts: &[AccountInfo],      // [addressInfoAccount, payer, SystemProgram]
    instruction_data: &[u8],       // serialized AddressInfo data
) -> ProgramResult {
    // Your program logic here
}
```

Think of it as: A complete "message" telling Solana exactly what to do, which accounts to use, which program to run, and what data to process.
