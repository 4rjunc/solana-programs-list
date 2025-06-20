# native-pda-crud

To install dependencies:

```bash
bun install
```

To build and run tests:

```bash
bun run build-and-test
```

## Create PDA 

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

    let account_span = (to_vec(&message)?).len();
    let lamports_required = (Rent::get()?).minimum_balance(account_span);

    let (_, bump) = Pubkey::find_program_address(
        &[MessageAccount::SEED_PREFIX.as_bytes(), payer.key.as_ref()],
        &crate::ID,
    );

    invoke_signed(
        &instruction::create_account(
            payer.key,
            message_account.key,
            lamports_required,
            account_span as u64,
            &crate::ID,
        ),
        &[
            payer.clone(),
            message_account.clone(),
            system_program.clone(),
        ],
        &[&[
            MessageAccount::SEED_PREFIX.as_bytes(),
            payer.key.as_ref(),
            &[bump],
        ]],
    )?;

    message.serialize(&mut &mut message_account.data.borrow_mut()[..])?;

    Ok(())
}
```


## Update PDA 
```rust
pub fn update(_program_id: &Pubkey, accounts: &[AccountInfo], message: String) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();
    let message_account = next_account_info(accounts_iter)?;
    let payer = next_account_info(accounts_iter)?;
    let system_program = next_account_info(accounts_iter)?;

    let mut message_data = MessageAccount::try_from_slice(&message_account.data.borrow())?;
    message_data.message = message;

    let account_span = (to_vec(&message_data)?).len();
    let lamports_required = (Rent::get()?).minimum_balance(account_span);

    let diff = lamports_required - message_account.lamports();

    let _ = &invoke(
        &instruction::transfer(payer.key, message_account.key, diff),
        &[
            payer.clone(),
            message_account.clone(),
            system_program.clone(),
        ],
    );

    message_account.resize(account_span)?;

    message_data.serialize(&mut &mut message_account.data.borrow_mut()[..])?;

    Ok(())
}

```

## Delete PDA
```rust
pub fn delete(_program_id: &Pubkey, accounts: &[AccountInfo]) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();
    let message_account = next_account_info(accounts_iter)?;
    let payer = next_account_info(accounts_iter)?;
    let system_program = next_account_info(accounts_iter)?;

    let account_span = 0usize;
    let lamports_required = (Rent::get()?).minimum_balance(account_span);

    let diff = message_account.lamports() - lamports_required;

    **message_account.lamports.borrow_mut() -= diff;
    **payer.lamports.borrow_mut() += diff;

    message_account.resize(account_span)?;

    message_account.assign(system_program.key);

    Ok(())
}
```


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


