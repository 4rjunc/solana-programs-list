# Anchor PDA CRUD Program

A Solana program built with Anchor framework demonstrating **Program Derived Addresses (PDAs)** with full CRUD operations (Create, Read, Update, Delete) for user messages.

## What This Program Does

This program allows users to:
- **Create** a message account using their wallet as a seed
- **Update** their message content (with dynamic resizing)
- **Delete** their message account and reclaim rent

Each user gets exactly **one message account** per wallet, derived deterministically using PDAs.

##  Key Concepts

### Program Derived Addresses (PDAs)
PDAs are addresses that:
- Are **derived** from seeds + program ID
- Have **no private key** (controlled by program only)
- Are **deterministic** - same seeds always produce same address
- Live **off the curve** (not valid Ed25519 points)

```rust
// PDA derivation: hash(seeds + program_id + bump) → address
seeds = [b"message", user.pubkey()]
```

### Bump Seed
- The **bump** ensures the PDA is off the curve
- Anchor finds the **canonical bump** (highest value that works)
- Stored in account data for future validation

##  Program Structure

### Core Functions

#### 1. Create Message
```rust
pub fn create(ctx: Context<Create>, message: String) -> Result<()>
```
- Initializes a new PDA account
- Sets user, message, and bump
- **Requires `&mut` reference** because we're modifying account fields

#### 2. Update Message  
```rust
pub fn update(ctx: Context<Update>, message: String) -> Result<()>
```
- Updates existing message content
- **Dynamically resizes** account with `realloc`
- Validates PDA ownership with stored bump

#### 3. Delete Message
```rust
pub fn delete(ctx: Context<Delete>) -> Result<()>
```
- Closes the account with `close = user`
- **Transfers lamports back** to user
- Account becomes unusable after deletion

### Account Validation

#### Create Context
```rust
#[account(
    init,                                    // Initialize new account
    seeds = [b"message", user.key().as_ref()], // PDA seeds
    bump,                                    // Canonical bump (auto-derived)
    payer = user,                           // Who pays rent
    space = 8 + 32 + 4 + message.len() + 1  // Account size
)]
```

#### Update Context
```rust
#[account(
    mut,                                    // Mutable (for updates)
    seeds = [b"message", user.key().as_ref()], // Same seeds
    bump = message_account.bump,            // Use stored bump
    realloc = 8 + 32 + 4 + message.len() + 1, // Resize account
    realloc::payer = user,                  // Who pays for size increase
    realloc::zero = true                    // Zero new memory
)]
```

#### Delete Context
```rust
#[account(
    mut,                                    // Mutable (for closing)
    seeds = [b"message", user.key().as_ref()], // Same seeds  
    bump = message_account.bump,            // Use stored bump
    close = user,                           // Transfer lamports to user
)]
```

## 🧪 Testing

### Test Setup
```typescript
const provider = anchor.getProvider();
const user = provider.wallet; // Uses Solana CLI wallet
```

### PDA Derivation in Tests
```typescript
const [messagePda, messageBump] = PublicKey.findProgramAddressSync(
  [Buffer.from("message"), user.publicKey.toBuffer()],
  program.programId
);
```

## Common Questions & Answers

### Q: Why use `&mut` reference for account_data?
**A:** Because we're **modifying** the account's fields:
```rust
let account_data = &mut ctx.accounts.message_account;
account_data.user = ctx.accounts.user.key();     // ← Writing
account_data.message = message;                  // ← Writing  
account_data.bump = ctx.bumps.message_account;   // ← Writing
```
Without `&mut`, Rust would give compiler errors for attempting to modify immutable data.

### Q: Where does the bump come from?
**A:** **Anchor automatically derives it** when you use `bump` constraint:
```rust
#[account(
    seeds = [b"message", user.key().as_ref()],
    bump,  // ← Anchor calls find_program_address() internally
)]
```
The bump is then available as `ctx.bumps.message_account`.

### Q: What does "Left/Right" mean in PDA errors?
**A:** PDA address mismatch:
- **Left**: Expected PDA address (calculated by program)
- **Right**: Actual account address (provided in transaction)

This usually means wrong seeds or wrong signer.

### Q: Why no explicit signing in tests?
**A:** **Signing happens automatically** when using provider wallet:
```typescript
await program.methods
  .create(message)
  .rpc(); // ← Provider wallet signs automatically
```

Explicit signing only needed for different keypairs:
```typescript
.signers([differentKeypair]) // ← Explicit signing required
```

### Q: How to use Solana CLI wallet in tests?
**A:** Use the provider's default wallet:
```typescript
const provider = anchor.getProvider();
const user = provider.wallet; // This is your CLI wallet
```

### @: What is @ ?
The `@` symbol in Anchor constraints is the **error mapping operator**. It connects a constraint condition to a specific error that should be thrown when the condition fails.

#### Syntax Breakdown

```rust
constraint = CONDITION @ ERROR_TYPE
//           ^^^^^^^^^   ^^^^^^^^^^
//           |           |
//           |           Error to throw if condition is false
//           Boolean condition that must be true
```

#### How It Works

```rust
#[account(
    constraint = message_account.user == user.key() @ CustomError::UnauthorizedUser
    //           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    //           |                                 |
    //           Must evaluate to `true`           Error thrown if `false`
)]
```

**Translation**: "If `message_account.user == user.key()` is **false**, then throw `CustomError::UnauthorizedUser`"

#### More Constraint Examples

```rust
#[account(
    // Age validation
    constraint = user_account.age >= 18 @ CustomError::TooYoung,
    
    // Amount validation  
    constraint = transfer_amount <= max_amount @ CustomError::AmountTooHigh,
    
    // Time validation
    constraint = Clock::get()?.unix_timestamp <= deadline @ CustomError::DeadlineExpired,
    
    // Multiple constraints
    constraint = balance > 0 @ CustomError::InsufficientFunds,
    constraint = is_active == true @ CustomError::AccountInactive,
)]
```

#### Without @ (Default Error)

If you omit the `@` part, Anchor uses a generic constraint error:

```rust
constraint = message_account.user == user.key()
// Uses default: ConstraintRaw error (code 2003)
```

#### @ vs require!()

These are equivalent:

```rust
// In constraint (checked before instruction executes)
constraint = message_account.user == user.key() @ CustomError::UnauthorizedUser

// In instruction function (checked during execution)
require!(
    ctx.accounts.message_account.user == ctx.accounts.user.key(),
    CustomError::UnauthorizedUser
);
```

#### When @ Validation Happens

**Constraint validation** (with `@`) happens **before** your instruction function runs:

```
1. Account deserialization
2. Constraint validation ← @ errors thrown here
3. Instruction function execution ← require!() errors thrown here
```

So `@` provides **early validation** - if constraints fail, your instruction function never even gets called! This is more efficient and secure.

The `@` is Anchor's way of saying **"if this condition fails, throw this specific error"** 🎯

## Running the Program

### Prerequisites
- Solana CLI configured
- Anchor installed
- Local validator running

### Commands
```bash
# Build program
anchor build

# Deploy to local validator  
anchor deploy

# Run tests
anchor test
```

## Account Space Calculation

```rust
space = 8 + 32 + 4 + message.len() + 1
//       ^    ^   ^       ^          ^
//       |    |   |       |          |
//    anchor  |   |    message    bump
//  discriminator |  string_len     u8
//             pubkey
//            (32 bytes)
```

- **8**: Anchor account discriminator
- **32**: User pubkey  
- **4**: String length prefix
- **message.len()**: Message content
- **1**: Bump seed (u8)

This program demonstrates core Solana/Anchor patterns for building secure, user-owned data accounts using PDAs.
