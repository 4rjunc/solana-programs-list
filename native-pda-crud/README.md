# Solana Native CRUD Program

Simple CRUD (Create, Read, Update, Delete) program written in native Rust. This program manage a PDA where users can create, update, and delete.

## Program Overview

The program can :
- Create a message account with associated text
- Update existing messages
- Delete message accounts

Each message account is tied to a specific user's public key and stores the message content.

## Project Structure

```
src/
├── lib.rs              # program entry point and ID declaration
├── processor.rs        # instruction processing logic
├── state/              # account state  
│   ├── mod.rs
│   └── message.rs      # MessageAccount struct
└── instructions/       # instructions
    ├── mod.rs
    ├── create.rs       # create message logic
    ├── update.rs       # update message logic
    └── delete.rs       # delete message logic
```

## Core Components

### MessageAccount Structure

The `MessageAccount` struct represents the data stored on-chain for each message:

```rust
pub struct MessageAccount {
    pub user: Pubkey,      // owner of the message
    pub message: String,   // the message text
    pub bump: u8,         // bump seed for PDA derivation
}
```

### Program Derived Addresses (PDAs)

The program uses PDAs to create for message accounts. Each account is derived using:
- Seed prefix: "message"
- User's public key
- Bump seed (for canonical derivation)

This ensures each user can have exactly one message account with a predictable address. Read More: [1](https://solana.com/docs/core/pda) [2](https://www.brianfriel.xyz/understanding-program-derived-addresses/)

### Instruction Types

The program handles three instruction types defined in the `Instructions` enum:

1. **Create(MessageAccount)** - Creates a new message account
2. **Update(MessageAccount)** - Updates an existing message
3. **Delete** - Removes a message account

## Instruction Processing

### Create Operation

The create instruction handles the initial creation of a message account with the following logic:

```rust
pub fn create(
    _program_id: &Pubkey,
    accounts: &[AccountInfo],
    message: MessageAccount,
) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();
    let message_account = next_account_info(accounts_iter)?;
    let payer = next_account_info(accounts_iter)?;
    let system_program = next_account_info(accounts_iter)?;
    
    // calculate the rent required to store account on chain
    let account_span = (to_vec(&message)?).len();
    let lamports_required = (Rent::get()?).minimum_balance(account_span);
    
    // find the bump seed for the PDA
    let (_, bump) = Pubkey::find_program_address(
        &[MessageAccount::SEED_PREFIX.as_bytes(), payer.key.as_ref()],
        &crate::ID,
    );
    
    // create the account using CPI to System Program
    invoke_signed(
        &instruction::create_account(
            payer.key,
            message_account.key,
            lamports_required,
            account_span as u64,
            &crate::ID,
        ),
        &[payer.clone(), message_account.clone(), system_program.clone()],
        &[&[
            MessageAccount::SEED_PREFIX.as_bytes(),
            payer.key.as_ref(),
            &[bump],
        ]],
    )?;
    
    // serialize the message data into the account
    message.serialize(&mut &mut message_account.data.borrow_mut()[..])?;
    
    Ok(())
}
```

**Steps:**

1. **Account Extraction**: Gets the three required accounts - the message account to be created, the payer, and the system program
2. **Size Calculation**: Uses `to_vec()` to serialize the message data and determine the exact space needed
3. **Rent Calculation**: Determines minimum lamports needed for rent exemption
4. **PDA Derivation**: Finds the bump seed for the Program Derived Address
5. **Account Creation**: Uses `invoke_signed` to call the System Program's create_account instruction with the derived seeds
6. **Data Storage**: Serializes the MessageAccount struct directly into the account's data

**Things to note down:**

- Uses `invoke_signed` because we're creating an account with a PDA (requires signature derivation)

    - `create_account` instruction arguments:

        - `payer.key` - The public key of the account that will pay for the account creation and rent
        - `message_account.key` - The public key of the new account being created (this is the PDA)
        - `lamports_required` - The amount of lamports needed to make the account rent-exempt
        - `account_span` as u64 - The size in bytes that the new account will occupy
        - `&crate::ID` - The program ID that will own the newly created account

    - invoke_signed function parameters:

        First argument: The instruction to execute (the create_account instruction)
        Second argument: Array of account infos required by the instruction - the payer (funding the creation), the new message account, and the system program (which handles account creation)
        Third argument: The signer seeds array, which allows the program to sign on behalf of the PDA

    - PDA Signer Seeds:

        The signer seeds `&[MessageAccount::SEED_PREFIX.as_bytes(), payer.key.as_ref(), &[bump]]` are used to derive and prove ownership of the PDA. These seeds consist of a constant prefix, the payer's public key (making each PDA unique per payer), and a bump seed that ensures the derived address falls off the ed25519 curve, making it a valid PDA. The invoke_signed function uses these seeds to cryptographically prove that the calling program has the authority to create and control this specific PDA, even though programs normally cannot sign transactions.


### Update Operation

The update instruction modifies existing message content and handles account resizing:

```rust
pub fn update(_program_id: &Pubkey, accounts: &[AccountInfo], message: String) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();
    let message_account = next_account_info(accounts_iter)?;
    let payer = next_account_info(accounts_iter)?;
    let system_program = next_account_info(accounts_iter)?;
    
    // deserialize existing account data
    let mut message_data = MessageAccount::try_from_slice(&message_account.data.borrow())?;
    message_data.message = message;
    
    // calculate new account size requirements
    let account_span = (to_vec(&message_data)?).len();
    let lamports_required = (Rent::get()?).minimum_balance(account_span);
    
    // add more lamports if the new message is larger
    let diff = lamports_required - message_account.lamports();
    
    let _ = &invoke(
        &instruction::transfer(payer.key, message_account.key, diff),
        &[payer.clone(), message_account.clone(), system_program.clone()],
    );
    
    // resize the account to fit new data
    message_account.resize(account_span)?;
    
    // serialize updated data back to account
    message_data.serialize(&mut &mut message_account.data.borrow_mut()[..])?;
    
    Ok(())
}
```

**Steps:**

1. **Data Retrieval**: Deserializes the existing MessageAccount from the account data
2. **Message Update**: Replaces the old message with the new one
3. **Size Recalculation**: Determines if the account needs to grow or shrink
4. **Lamport Transfer**: If the new message is larger, transfers additional lamports for rent
5. **Account Resize**: Changes the account's data size to match the new requirements
6. **Data Storage**: Serializes the updated MessageAccount back to the account

**Things to note down:**

- Uses regular `invoke` (not `invoke_signed`) because we're not creating new accounts
- Only transfers additional lamports when needed (if new message is larger)


### Delete Operation

The delete instruction removes the message account and returns lamports to the payer:

```rust
pub fn delete(_program_id: &Pubkey, accounts: &[AccountInfo]) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();
    let message_account = next_account_info(accounts_iter)?;
    let payer = next_account_info(accounts_iter)?;
    let system_program = next_account_info(accounts_iter)?;
    
    let account_span = 0usize;
    let lamports_required = (Rent::get()?).minimum_balance(account_span);
    
    // calculate lamports to return to payer
    let diff = message_account.lamports() - lamports_required;
    
    // direct lamport manipulation for efficiency instead of transfer
    **message_account.lamports.borrow_mut() -= diff;
    **payer.lamports.borrow_mut() += diff;
    
    // resize account to zero bytes
    message_account.resize(account_span)?;
    
    // transfer ownership back to System Program
    message_account.assign(system_program.key);
    
    Ok(())
}
```

**Steps:**

1. **Zero Size Calculation**: Sets target account size to 0 bytes
2. **Lamport Calculation**: Determines how many lamports to return to the payer
3. **Direct Transfer**: Manually adjusts lamport balances for both accounts
4. **Account Resize**: Shrinks the account data to zero bytes
5. **Ownership Transfer**: Assigns the account back to the System Program

**Why direct lamport manipulation?**

The code comment explains this design choice:
- **Performance**: Cheaper in compute units than CPI transfers
- **Efficiency**: No Cross-Program Invocation overhead
- **Authority**: Since the account is owned by our program, we can directly modify its lamports
- **Cost**: Avoids invoking the System Program for transfers

## Security Implementation

Several security checks and validations to ensure safe operation:

### Account Validation Checks

**Program ID Verification**
```rust
if program_id.ne(&crate::ID) {
    return Err(ProgramError::IncorrectProgramId);
}
```
Every instruction validates that it's being called with the correct program ID to prevent unauthorized access.

**PDA Validation**
The program enforces bump seeds for all PDAs to prevent account confusion attacks. Each message account is derived using:
```rust
let (_, bump) = Pubkey::find_program_address(
    &[MessageAccount::SEED_PREFIX.as_bytes(), payer.key.as_ref()],
    &crate::ID,
);
```

**Account Ownership Verification**
Before any modification operation, the program verifies that accounts are owned by the correct program and have valid data structures through Borsh deserialization checks.

## Development Notes

The Solana crates used by program:

- `solana-program`: Core Solana programming primitives
- `borsh`: Serialization framework
- `solana-system-interface`: System Program interaction helpers

## How to build and test

```
bun install // install modules 
bun run build-and-test // build the program and run testcases (there are no asserts more like client side code haha)
```
