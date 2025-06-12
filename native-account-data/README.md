Saving an address with name, house number, street and city in an account.	

change serilize and deseralize to bytemuck


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

