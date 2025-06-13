import { Buffer } from 'node:buffer';
import { describe, test } from 'node:test';
import { Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js';
import * as borsh from 'borsh';
import { start } from 'solana-bankrun';

class Assignable {
  constructor(properties) {
    for (const [key, value] of Object.entries(properties)) {
      this[key] = value;
    }
  }
}

class Student extends Assignable {
  name: any;
  reg_number: any;
  sub: any;
  toBuffer() {
    return Buffer.from(borsh.serialize(Student, this));
  }

  static fromBuffer(buffer: Buffer) {
    return borsh.deserialize(StudentSchema, Student, this);
  }
}

const StudentSchema = new Map([
  [
    Student,
    {
      kind: 'struct',
      field;[
        ['name', 'string'],
        ['reg_number', 'u8'],
        ['sub', 'string']
      ],
    },
  ],
])
