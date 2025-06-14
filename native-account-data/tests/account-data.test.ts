import { Buffer } from 'node:buffer';
import { describe, test } from 'bun:test';
import { Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js';
import * as borsh from 'borsh';
import { start } from 'solana-bankrun';

class Assignable {
  constructor(properties) {
    if (properties) {
      for (const [key, value] of Object.entries(properties)) {
        this[key] = value;
      }
    }
  }
}

class Student extends Assignable {
  name: string;
  reg_number: number;
  sub: string;

  constructor(properties: { name: string; reg_number: number; sub: string }) {
    super(properties);
    this.name = properties.name;
    this.reg_number = properties.reg_number;
    this.sub = properties.sub;
  }

  toBuffer() {
    return Buffer.from(borsh.serialize(StudentSchema, this));
  }

  static fromBuffer(buffer: Buffer) {
    return borsh.deserialize(StudentSchema, Student, buffer);
  }
}

const StudentSchema = new Map([
  [
    Student,
    {
      kind: 'struct',
      fields: [
        ['name', 'string'],
        ['reg_number', 'u8'],
        ['sub', 'string']
      ],
    },
  ],
]);

describe('Storing Student Data', async () => {
  const student = Keypair.generate();
  const programID = PublicKey.unique();
  const context = await start([{ name: 'account_data', programId: programID }], []);
  const client = context.banksClient;

  test('Creating account for student data', async () => {
    const payer = context.payer;

    console.log(`Program Address      : ${programID}`);
    console.log(`Payer Address        : ${payer.publicKey}`);
    console.log(`Student account      : ${student.publicKey}`);

    // isWritable: true - account's data or SOL balance will be modified
    // isWritable: false - account is only being read from or used for verification
    const ix = new TransactionInstruction({
      keys: [
        {
          pubkey: student.publicKey,
          isWritable: true,
          isSigner: true
        },
        {
          pubkey: payer.publicKey,
          isWritable: true, //  because the payer account needs to be debited to pay for the transaction fees and account creation costs.
          isSigner: true
        },
        {
          pubkey: SystemProgram.programId,
          isWritable: false,
          isSigner: false
        }
      ],
      programId: programID,
      data: new Student({
        name: 'Arjun C',
        reg_number: 123,
        sub: 'Math'
      }).toBuffer()
    });

    const blockhash = context.lastBlockhash;

    const tx = new Transaction();
    tx.recentBlockhash = blockhash;
    tx.add(ix).sign(payer, student);
    await client.processTransaction(tx);
  });

  test('Read student data', async () => {
    const accountData = await client.getAccount(student.publicKey);

    if (!accountData) {
      throw new Error('Account data not found');
    }

    const readStudent = Student.fromBuffer(Buffer.from(accountData.data)); // `data` field from AccountStruct

    console.log(`name        : ${readStudent.name}`);
    console.log(`reg_number  : ${readStudent.reg_number}`);
    console.log(`sub         : ${readStudent.sub}`);
  });
});
