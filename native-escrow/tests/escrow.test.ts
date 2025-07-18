import { LiteSVM, TransactionMetadata } from "litesvm";
import {
  PublicKey,
  TransactionInstruction,
  Transaction,
  SystemProgram,
  Keypair,
  LAMPORTS_PER_SOL
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  createInitializeMintInstruction,
  MINT_SIZE,
  AccountLayout
} from "@solana/spl-token";
import * as borsh from "borsh";
import { describe, test, beforeAll, beforeEach, expect } from "bun:test";
import * as path from 'path';

enum Instruction {
  Make = 0,
  Take = 1,
  Refund = 2
}

class EscrowAccount {
  instruction: Instruction;
  seed: bigint;
  amount: bigint;
  receive: bigint;

  constructor(props: { instruction: Instruction; seed: bigint; amount: bigint, receive: bigint }) {
    this.instruction = props.instruction;
    this.seed = props.seed;
    this.amount = props.amount;
    this.receive = props.receive;
  }

  toBuffer() {
    return Buffer.from(borsh.serialize(EscrowAccountSchema, this));
  }
}

export const EscrowAccountSchema = new Map([
  [
    EscrowAccount,
    {
      kind: 'struct',
      fields: [
        ['instruction', 'u8'],
        ['seed', 'u64'],
        ['amount', 'u64'],
        ['receive', 'u64']
      ],
    },
  ],
]);

// Take
class Take {
  instruction: Instruction;

  constructor() {
    this.instruction = Instruction.Take;
  }

  toBuffer() {
    return Buffer.from(borsh.serialize(TakeSchema, this));
  }
}

export const TakeSchema = new Map([
  [
    Take,
    {
      kind: 'struct',
      fields: [
        ['instruction', 'u8'],
      ],
    },
  ],
]);

// Refund
class Refund {
  instruction: Instruction;

  constructor() {
    this.instruction = Instruction.Refund;
  }

  toBuffer() {
    return Buffer.from(borsh.serialize(RefundSchema, this));
  }
}

export const RefundSchema = new Map([
  [
    Refund,
    {
      kind: 'struct',
      fields: [
        ['instruction', 'u8'],
      ],
    },
  ],
]);


describe("ESCROW BABY!", async () => {
  const PROGRAM_ID = new PublicKey("CCeMau8P6tMvjqBMfUnN5mcsqN3vyn9xTLSpdapbXDUq");

  let svm: LiteSVM;
  let maker: Keypair;
  let taker: Keypair;
  let mintA: Keypair;
  let mintB: Keypair;
  let makerTokenAccountA: PublicKey;
  let makerTokenAccountB: PublicKey;
  let takerTokenAccountA: PublicKey;
  let takerTokenAccountB: PublicKey;
  let vault: PublicKey;
  let escrow: PublicKey;
  let seed: bigint;
  let amount: bigint;
  let receive: bigint;

  beforeAll(async () => {
    svm = new LiteSVM();
    maker = new Keypair();
    taker = new Keypair();

    svm.airdrop(maker.publicKey, BigInt(10 * LAMPORTS_PER_SOL));
    svm.airdrop(taker.publicKey, BigInt(10 * LAMPORTS_PER_SOL));

    // load program
    const program = path.join(`${__dirname}/fixtures`, "escrow.so")
    const tokenProgram = path.join(`${__dirname}/fixtures`, "spl_token-3.5.0.so")
    svm.addProgramFromFile(PROGRAM_ID, program)
    svm.addProgramFromFile(TOKEN_PROGRAM_ID, tokenProgram)
  });


  beforeEach(async () => {
    // random seed will generated eachtime when a test runs, to prevent `address already in use error`
    //seed = BigInt(Math.floor(Math.random() * 1000000));
    seed = BigInt(2002)
    amount = BigInt(1000000); // 1 token with 6 decimals
    receive = BigInt(2000000); // 2 tokens with 6 decimals

    // create new tokens A, B for every testcase
    mintA = new Keypair();
    mintB = new Keypair();

    await setupMints();
    await createEscrow();
  });

  async function setupMints() {
    const mintALamports = svm.minimumBalanceForRentExemption(BigInt(MINT_SIZE));

    // Create and initialize mint A
    const createMintAIx = SystemProgram.createAccount({
      fromPubkey: maker.publicKey,
      newAccountPubkey: mintA.publicKey,
      lamports: Number(mintALamports),
      space: MINT_SIZE,
      programId: TOKEN_PROGRAM_ID,
    });

    const initMintAIx = createInitializeMintInstruction(
      mintA.publicKey,
      6, // decimals
      maker.publicKey, // mint authority
      maker.publicKey  // freeze authority
    );

    // Create and initialize mint B
    const createMintBIx = SystemProgram.createAccount({
      fromPubkey: maker.publicKey,
      newAccountPubkey: mintB.publicKey,
      lamports: Number(mintALamports),
      space: MINT_SIZE,
      programId: TOKEN_PROGRAM_ID,
    });

    const initMintBIx = createInitializeMintInstruction(
      mintB.publicKey,
      6, // decimals
      maker.publicKey, // mint authority
      maker.publicKey  // freeze authority
    );

    // create token accounts/associated token accounts for maker and payer of both A and B tokens
    makerTokenAccountA = await getAssociatedTokenAddress(mintA.publicKey, maker.publicKey);
    makerTokenAccountB = await getAssociatedTokenAddress(mintB.publicKey, maker.publicKey);
    takerTokenAccountA = await getAssociatedTokenAddress(mintA.publicKey, taker.publicKey);
    takerTokenAccountB = await getAssociatedTokenAddress(mintB.publicKey, taker.publicKey);

    // instruction to create associated token account of mintA for maker 
    const createMakerTAAIx = createAssociatedTokenAccountInstruction(
      maker.publicKey,
      makerTokenAccountA,
      maker.publicKey,
      mintA.publicKey
    );

    // instruction to create associated token account of mintB for maker 
    const createMakerTABIx = createAssociatedTokenAccountInstruction(
      maker.publicKey,
      makerTokenAccountB,
      maker.publicKey,
      mintB.publicKey
    );

    // instruction to create associated token account of mintA for taker 
    const createTakerTAAIx = createAssociatedTokenAccountInstruction(
      taker.publicKey,
      takerTokenAccountA,
      taker.publicKey,
      mintA.publicKey
    );

    // instruction to create associated token account of mintB for taker 
    const createTakerTABIx = createAssociatedTokenAccountInstruction(
      taker.publicKey,
      takerTokenAccountB,
      taker.publicKey,
      mintB.publicKey
    );

    // mint A tokens to maker's wallet 
    const mintToMakerAIx = createMintToInstruction(
      mintA.publicKey,
      makerTokenAccountA,
      maker.publicKey,
      amount * BigInt(10)
    );

    // mint B tokens to taker's wallet 
    const mintToTakerBIx = createMintToInstruction(
      mintB.publicKey,
      takerTokenAccountB,
      maker.publicKey,
      receive * BigInt(10)
    );

    const setupTx = new Transaction();
    setupTx.recentBlockhash = svm.latestBlockhash();
    setupTx.add(
      createMintAIx,
      initMintAIx,
      createMintBIx,
      initMintBIx,
      createMakerTAAIx,
      createMakerTABIx,
      createTakerTAAIx,
      createTakerTABIx,
      mintToMakerAIx,
      mintToTakerBIx
    );
    setupTx.sign(maker, taker, mintA, mintB);

    svm.sendTransaction(setupTx);

    // checking account balances
    const makerTokenAAccountBefore = svm.getAccount(makerTokenAccountA);
    const takerTokenBAccountBefore = svm.getAccount(takerTokenAccountB);
    const makerTokenADataBefore = AccountLayout.decode(makerTokenAAccountBefore.data);
    const takerTokenBDataBefore = AccountLayout.decode(takerTokenBAccountBefore.data);
    console.log(`Tokens Minted\nmaker TokenA: ${makerTokenADataBefore.amount}\ntaker TokenB: ${takerTokenBDataBefore.amount}`);
  }

  async function createEscrow() {
    const seedBuffer = Buffer.allocUnsafe(8);
    seedBuffer.writeBigUInt64LE(seed, 0); // Convert to little-endian bytes like Rust does

    // derive PDAs
    const [escrowPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("escrow"),
        maker.publicKey.toBuffer(),
        seedBuffer
      ],
      PROGRAM_ID
    );
    escrow = escrowPDA;
    vault = await getAssociatedTokenAddress(mintA.publicKey, escrow, true);

    // create vault token account to hold tokens of mint A this is also can be as crearing ATA for vault to hold A tokens
    const createVaultIx = createAssociatedTokenAccountInstruction(
      maker.publicKey,
      vault,
      escrow,
      mintA.publicKey
    );

    // create Make instruction
    const makeInstruction = new EscrowAccount({
      instruction: Instruction.Make,
      seed,
      amount,
      receive
    });

    const makeIx = new TransactionInstruction({
      keys: [
        { pubkey: maker.publicKey, isWritable: true, isSigner: true },
        { pubkey: mintA.publicKey, isWritable: false, isSigner: false },
        { pubkey: mintB.publicKey, isWritable: false, isSigner: false },
        { pubkey: makerTokenAccountA, isWritable: true, isSigner: false },
        { pubkey: escrow, isWritable: true, isSigner: false },
        { pubkey: vault, isWritable: true, isSigner: false },
        { pubkey: TOKEN_PROGRAM_ID, isWritable: false, isSigner: false },
        { pubkey: SystemProgram.programId, isWritable: false, isSigner: false }
      ],
      programId: PROGRAM_ID,
      data: makeInstruction.toBuffer()
    });

    const makeTx = new Transaction();
    makeTx.recentBlockhash = svm.latestBlockhash();
    makeTx.add(createVaultIx, makeIx);
    makeTx.sign(maker);

    const simRes = svm.simulateTransaction(makeTx);
    const sendRes = svm.sendTransaction(makeTx);

    if (sendRes instanceof TransactionMetadata) {
      expect(simRes.meta().logs()).toEqual(sendRes.logs());
      expect(sendRes.logs()[1]).toBe("Program log: Create");
    } else {
      console.log("sendRes: ", sendRes.meta().toString())
      throw new Error("Unexpected tx failure");

    }

    // const vaultAccount = svm.getAccount(vaultPDA);
    // const escrowAccount = svm.getAccount(escrowPDA);
    // const vaultAccountData = AccountLayout.decode(vaultAccount.data);
    // const escrowAccountData = AccountLayout.decode(escrowAccount.data);
    //
    // console.log(`vaultAccount: ${vaultAccountData}`);
    // console.log(`escrowAccount: ${escrowAccountData}`);

  }

  test("TAKE", async () => {

    amount = BigInt(1000000); // 1 token with 6 decimals
    receive = BigInt(2000000); // 2 tokens with 6 decimals

    const takeInstruction = new Take();

    const takeIx = new TransactionInstruction({
      keys: [
        { pubkey: taker.publicKey, isWritable: true, isSigner: true },        // taker
        { pubkey: maker.publicKey, isWritable: true, isSigner: false },       // maker
        { pubkey: mintA.publicKey, isWritable: false, isSigner: false },      // mint_a
        { pubkey: mintB.publicKey, isWritable: false, isSigner: false },      // mint_b
        { pubkey: takerTokenAccountA, isWritable: true, isSigner: false },    // taker_ata_a
        { pubkey: takerTokenAccountB, isWritable: true, isSigner: false },    // taker_ata_b
        { pubkey: makerTokenAccountB, isWritable: true, isSigner: false },    // maker_ata_b
        { pubkey: escrow, isWritable: true, isSigner: false },                // escrow
        { pubkey: vault, isWritable: true, isSigner: false },                 // vault
        { pubkey: TOKEN_PROGRAM_ID, isWritable: false, isSigner: false },     // token_program
        { pubkey: SystemProgram.programId, isWritable: false, isSigner: false } // system_program
      ],
      programId: PROGRAM_ID,
      data: takeInstruction.toBuffer()
    });

    const takeTx = new Transaction();
    takeTx.recentBlockhash = svm.latestBlockhash();
    takeTx.add(takeIx);
    takeTx.sign(taker);

    // balances before
    const takerTokenAAccountBefore = svm.getAccount(takerTokenAccountA);
    const makerTokenBAccountBefore = svm.getAccount(makerTokenAccountB);
    const takerTokenADataBefore = AccountLayout.decode(takerTokenAAccountBefore.data);
    const makerTokenBDataBefore = AccountLayout.decode(makerTokenBAccountBefore.data);

    console.log(`BEFORE - takerTokenA: ${takerTokenADataBefore.amount}, makerTokenB: ${makerTokenBDataBefore.amount}`);

    // send transaction
    svm.sendTransaction(takeTx);

    // Check token balances AFTER the transaction
    const takerTokenAAccount = svm.getAccount(takerTokenAccountA);
    const makerTokenBAccount = svm.getAccount(makerTokenAccountB);
    const takerTokenAData = AccountLayout.decode(takerTokenAAccount.data);
    const makerTokenBData = AccountLayout.decode(makerTokenBAccount.data);

    console.log(`AFTER - takerTokenA: ${takerTokenAData.amount}, makerTokenB: ${makerTokenBData.amount}`);
    console.log(`Expected - takerTokenA: ${amount}, makerTokenB: ${receive}`);    // verify escrow account is closed

    // const escrowAccount = svm.getAccount(escrow);
    // expect(escrowAccount).toBeNull();
    //
    // // verify vault is closed
    // const vaultAccount = svm.getAccount(vault);
    // expect(vaultAccount).toBeNull();

    console.log("Take escrow successful!");
    console.log(`Taker received ${amount} tokens of mint A`);
    console.log(`Maker received ${receive} tokens of mint B`);
  })

  test("Refund", async () => {

    // create refund instruction
    const refundInstruction = new Refund()
    const refundIx = new TransactionInstruction({
      keys: [
        { pubkey: maker.publicKey, isWritable: true, isSigner: true },
        { pubkey: mintA.publicKey, isWritable: false, isSigner: false },
        { pubkey: makerTokenAccountA, isWritable: true, isSigner: false },
        { pubkey: escrow, isWritable: true, isSigner: false },
        { pubkey: vault, isWritable: true, isSigner: false },
        { pubkey: TOKEN_PROGRAM_ID, isWritable: false, isSigner: false },
        { pubkey: SystemProgram.programId, isWritable: false, isSigner: false }
      ],
      programId: PROGRAM_ID,
      data: refundInstruction.toBuffer()
    });

    const refundTx = new Transaction();
    refundTx.recentBlockhash = svm.latestBlockhash();
    refundTx.add(refundIx);
    refundTx.sign(maker);

    // balance in associated token account of maker before transaction
    let makerTokenAAccount = svm.getAccount(makerTokenAccountA);
    let makerTokenAData = AccountLayout.decode(makerTokenAAccount.data);
    console.log(`Maker Token Balance: ${makerTokenAData.amount}`);

    const simRes = svm.simulateTransaction(refundTx);
    const sendRes = svm.sendTransaction(refundTx);

    if (sendRes instanceof TransactionMetadata) {
      expect(simRes.meta().logs()).toEqual(sendRes.logs());
      expect(sendRes.logs()[1]).toBe("Program log: Refunding");
    } else {
      console.log("sendRes: ", sendRes.meta().toString())
      throw new Error("Unexpected tx failure");
    }

    // balance in associated token account of maker before transaction
    makerTokenAAccount = svm.getAccount(makerTokenAccountA);
    makerTokenAData = AccountLayout.decode(makerTokenAAccount.data);
    console.log(`Maker Token Balance: ${makerTokenAData.amount}`);
  })
})
