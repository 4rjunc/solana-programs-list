import { PublicKey, SystemProgram, Transaction, TransactionInstruction } from "@solana/web3.js";
import { start } from 'solana-bankrun';
import { describe, test } from "bun:test";
import * as borsh from 'borsh';

enum Instruction {
  Create = 0,
  Update = 1,
  Delete = 2
}

class Create {
  instruction: Instruction;
  user: Uint8Array;
  message: string;
  bump: number;

  constructor(props: { instruction: Instruction; user: PublicKey; message: string, bump: number }) {
    this.instruction = props.instruction;
    this.user = props.user.toBytes();
    this.message = props.message;
    this.bump = props.bump;
  }

  toBuffer() {
    return Buffer.from(borsh.serialize(CreateSchema, this));
  }

  static fromBuffer(buffer: Buffer) {
    return borsh.deserialize(CreateSchema, Create, buffer);
  }
}

export const CreateSchema = new Map([
  [
    Create,
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

class Update {
  instruction: Instruction;
  user: Uint8Array;
  message: string;
  bump: number;

  constructor(props: { instruction: Instruction; user: PublicKey; message: string, bump: number }) {
    this.instruction = props.instruction;
    this.user = props.user.toBytes();
    this.message = props.message;
    this.bump = props.bump;
  }

  toBuffer() {
    return Buffer.from(borsh.serialize(UpdateSchema, this));
  }

  static fromBuffer(buffer: Buffer) {
    return borsh.deserialize(UpdateSchema, Update, buffer);
  }
}

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

describe("CRUD on PDA", async () => {
  const PROGRAM_ID = new PublicKey("5zUvdtYXnCHkyBMi5y8FcMeGtWd2H23Dwp8yiScHkwru");
  const context = await start([{ name: 'pda_crud', programId: PROGRAM_ID }], [])
  const client = context.banksClient;
  const payer = context.payer;

  test("Create Account", async () => {
    const [messagePDA, bump] = PublicKey.findProgramAddressSync([Buffer.from("message"), payer.publicKey.toBuffer()], PROGRAM_ID);
    const message = "Hello, Solana";
    const user = payer.publicKey;

    const instructionObject = new Create({
      instruction: Instruction.Create,
      user,
      message,
      bump
    })

    console.log("Instruction Object:", instructionObject)

    const ix = new TransactionInstruction({
      keys: [
        { pubkey: messagePDA, isWritable: true, isSigner: false },
        { pubkey: payer.publicKey, isWritable: true, isSigner: true },
        { pubkey: SystemProgram.programId, isWritable: false, isSigner: false }
      ],
      programId: PROGRAM_ID,
      data: instructionObject.toBuffer()
    })

    const tx = new Transaction();
    tx.recentBlockhash = context.lastBlockhash;
    tx.add(ix).sign(payer);

    await client.processTransaction(tx);
  })

  test("Update Account", async () => {
    const [messagePDA, bump] = PublicKey.findProgramAddressSync([Buffer.from("message"), payer.publicKey.toBuffer()], PROGRAM_ID);
    const message = "Hello, Solana World";
    const user = payer.publicKey;

    const instructionObject = new Update({
      instruction: Instruction.Update,
      user,
      message,
      bump
    })

    console.log("Instruction Object:", instructionObject)

    const ix = new TransactionInstruction({
      keys: [
        { pubkey: messagePDA, isWritable: true, isSigner: false },
        { pubkey: payer.publicKey, isWritable: true, isSigner: true },
        { pubkey: SystemProgram.programId, isWritable: false, isSigner: false }
      ],
      programId: PROGRAM_ID,
      data: instructionObject.toBuffer()
    })

    const tx = new Transaction();
    tx.recentBlockhash = context.lastBlockhash;
    tx.add(ix).sign(payer);

    await client.processTransaction(tx);
  })


})

