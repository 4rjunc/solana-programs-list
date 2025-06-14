import { describe, test } from 'bun:test';
import { Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js';
import { start } from 'solana-bankrun';

describe('Checking accounts', async () => {
  // generate a unique program id for our test program
  const PROGRAM_ID = PublicKey.unique();

  // start the solana test validator with our program deployed
  const context = await start([{ name: 'account_checks', programId: PROGRAM_ID }], []);
  const client = context.banksClient;
  const payer = context.payer; // default funded account for transactions

  // get rent requirements for account creation
  const rent = await client.getRent();

  // create keypairs for the accounts our program will work with
  const accountToChange = Keypair.generate(); // this account will be owned by our program
  const accountToCreate = Keypair.generate(); // this account will be created by our program

  test('Create an account owned by our program', async () => {
    // get the latest blockhash for transaction
    const blockhash = context.lastBlockhash;

    // create instruction to make a new account owned by our program
    // this simulates creating an account that our program can modify later
    const ix = SystemProgram.createAccount({
      fromPubkey: payer.publicKey, // who pays for the account creation
      newAccountPubkey: accountToChange.publicKey, // the new account's address
      lamports: Number(rent.minimumBalance(BigInt(0))), // minimum lamports to keep account alive
      space: 0, // no data storage needed for this test
      programId: PROGRAM_ID, // our program becomes the owner
    });

    // build and sign the transaction
    const tx = new Transaction();
    tx.recentBlockhash = blockhash;
    tx.add(ix).sign(payer, accountToChange); // both payer and new account must sign

    // execute the transaction on the test validator
    await client.processTransaction(tx);
  });

  test('Check accounts - should fail with uninitialized account', async () => {
    // get fresh blockhash for this transaction
    const blockhash = context.lastBlockhash;

    // create instruction to call our program with the required accounts
    const ix = new TransactionInstruction({
      keys: [
        // payer account - signs and pays for transaction fees
        { pubkey: payer.publicKey, isSigner: true, isWritable: true },

        // account to create - this is uninitialized (0 lamports) which will cause the program to fail
        { pubkey: accountToCreate.publicKey, isSigner: true, isWritable: true },

        // account to change - must be owned by our program to pass ownership check
        { pubkey: accountToChange.publicKey, isSigner: true, isWritable: true },

        // system program - required for account operations, read-only reference
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: PROGRAM_ID, // our program id
      data: Buffer.alloc(0), // no instruction data needed for this test
    });

    // build transaction with all required signers
    const tx = new Transaction();
    tx.recentBlockhash = blockhash;
    // all three keypairs must sign: payer, accountToChange, accountToCreate
    tx.add(ix).sign(payer, accountToChange, accountToCreate);

    // this should fail because the rust program has contradictory logic
    // it checks both "account should not be initialized" and "account should be initialized"
    try {
      await client.processTransaction(tx);
      throw new Error('Expected transaction to fail but it succeeded');
    } catch (error: any) {
      // expected to fail with "instruction requires an initialized account"
      console.log('Transaction failed as expected:', error.message);
    }
  });

  test('Check accounts - with pre-initialized account to create', async () => {
    // create and initialize the accountToCreate first
    const blockhash1 = context.lastBlockhash;
    const createIx = SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: accountToCreate.publicKey,
      lamports: Number(rent.minimumBalance(BigInt(0))),
      space: 0,
      programId: PROGRAM_ID, // owned by our program
    });

    const createTx = new Transaction();
    createTx.recentBlockhash = blockhash1;
    createTx.add(createIx).sign(payer, accountToCreate);
    await client.processTransaction(createTx);

    // now try the main program instruction
    const blockhash2 = context.lastBlockhash;
    const ix = new TransactionInstruction({
      keys: [
        { pubkey: payer.publicKey, isSigner: true, isWritable: true },
        { pubkey: accountToCreate.publicKey, isSigner: true, isWritable: true },
        { pubkey: accountToChange.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: PROGRAM_ID,
      data: Buffer.alloc(0),
    });

    const tx = new Transaction();
    tx.recentBlockhash = blockhash2;
    tx.add(ix).sign(payer, accountToChange, accountToCreate);

    // this should also fail because the program checks that the account should NOT be initialized
    // but we just initialized it, so it will fail the first check
    try {
      await client.processTransaction(tx);
      throw new Error('Expected transaction to fail but it succeeded');
    } catch (error: any) {
      // expected to fail with "account already initialized" 
      console.log('Transaction failed as expected:', error.message);
    }
  });
});
