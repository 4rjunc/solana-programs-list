import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL
} from '@solana/web3.js';
import * as borsh from 'borsh';
import { Buffer } from 'node:buffer';
import fs from 'fs';
import path from 'path';

// Student class and schema (same as your test)
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

// Configuration
const DEVNET_URL = 'https://api.devnet.solana.com';
const PROGRAM_ID = new PublicKey("DZqZpnJzMRLi31CRkGqFpQPHgMJnBHY7A9PbvAiLmuEv");

// Helper function to load or create keypair
function loadOrCreateKeypair(filename: string): Keypair {
  const keypairPath = path.join(__dirname, filename);

  if (fs.existsSync(keypairPath)) {
    const secretKey = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
    return Keypair.fromSecretKey(new Uint8Array(secretKey));
  }
}



// Calculate rent-exempt minimum for account
async function calculateRentExemption(connection: Connection, dataSize: number): Promise<number> {
  return await connection.getMinimumBalanceForRentExemption(dataSize);
}

// Create student account and store data
async function createStudentAccount(
  connection: Connection,
  payer: Keypair,
  studentData: { name: string; reg_number: number; sub: string }
): Promise<PublicKey> {

  const studentAccount = Keypair.generate();
  const student = new Student(studentData);
  const studentBuffer = student.toBuffer();

  // Calculate rent-exempt minimum
  const rentExemption = await calculateRentExemption(connection, studentBuffer.length);

  console.log(`\nCreating student account...`);
  console.log(`Student account: ${studentAccount.publicKey.toBase58()}`);
  console.log(`Data size: ${studentBuffer.length} bytes`);
  console.log(`Rent exemption: ${rentExemption / LAMPORTS_PER_SOL} SOL`);

  // Create account creation instruction
  // const createAccountIx = SystemProgram.createAccount({
  //   fromPubkey: payer.publicKey,
  //   newAccountPubkey: studentAccount.publicKey,
  //   lamports: rentExemption,
  //   space: studentBuffer.length,
  //   programId: PROGRAM_ID,
  // });

  // Create instruction to store student data
  const storeDataIx = new TransactionInstruction({
    keys: [
      {
        pubkey: studentAccount.publicKey,
        isWritable: true,
        isSigner: true
      },
      {
        pubkey: payer.publicKey,
        isWritable: true,
        isSigner: true
      },
      {
        pubkey: SystemProgram.programId,
        isWritable: false,
        isSigner: false
      }
    ],
    programId: PROGRAM_ID,
    data: studentBuffer
  });

  // Create and send transaction
  const transaction = new Transaction().add(storeDataIx);

  try {
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [payer, studentAccount],
      { commitment: 'confirmed' }
    );

    console.log(`Transaction successful! Signature: ${signature}`);
    return studentAccount.publicKey;

  } catch (error) {
    console.error('Transaction failed:', error);
    throw error;
  }
}

// Read student data from account
async function readStudentData(connection: Connection, studentPublicKey: PublicKey): Promise<Student | null> {
  try {
    const accountInfo = await connection.getAccountInfo(studentPublicKey);

    if (!accountInfo) {
      console.log('Account not found');
      return null;
    }

    if (accountInfo.data.length === 0) {
      console.log('Account has no data');
      return null;
    }

    const student = Student.fromBuffer(Buffer.from(accountInfo.data));
    return student;

  } catch (error) {
    console.error('Error reading student data:', error);
    return null;
  }
}

// Main interaction function
async function main() {
  console.log('🎓 Student Data Program - Devnet Interaction\n');

  // Initialize connection
  const connection = new Connection(DEVNET_URL, 'confirmed');
  console.log(`Connected to devnet: ${DEVNET_URL}`);

  // Load or create payer keypair
  const payer = loadOrCreateKeypair('payer-keypair.json');
  console.log(`Payer address: ${payer.publicKey.toBase58()}`);

  // Ensure payer has enough SOL
  //await ensureBalance(connection, payer);

  // Create student account with sample data
  const studentData = {
    name: 'Alice Johnson',
    reg_number: 42,
    sub: 'Computer Science'
  };

  try {
    const studentPublicKey = await createStudentAccount(connection, payer, studentData);

    // Wait a moment for the transaction to be processed
    console.log('\nWaiting for transaction to be processed...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Read back the student data
    console.log('\nReading student data...');
    const retrievedStudent = await readStudentData(connection, studentPublicKey);

    if (retrievedStudent) {
      console.log('\n✅ Student data retrieved successfully:');
      console.log(`Name: ${retrievedStudent.name}`);
      console.log(`Registration Number: ${retrievedStudent.reg_number}`);
      console.log(`Subject: ${retrievedStudent.sub}`);
    } else {
      console.log('❌ Failed to retrieve student data');
    }

  } catch (error) {
    console.error('Error in main execution:', error);
  }
}

// Additional utility functions for interactive use
export async function createMultipleStudents() {
  const connection = new Connection(DEVNET_URL, 'confirmed');
  const payer = loadOrCreateKeypair('payer-keypair.json');
  await ensureBalance(connection, payer);

  const students = [
    { name: 'Bob Smith', reg_number: 101, sub: 'Mathematics' },
    { name: 'Carol Davis', reg_number: 102, sub: 'Physics' },
    { name: 'Dave Wilson', reg_number: 103, sub: 'Chemistry' }
  ];

  const createdAccounts: PublicKey[] = [];

  for (const studentData of students) {
    try {
      const studentPublicKey = await createStudentAccount(connection, payer, studentData);
      createdAccounts.push(studentPublicKey);
      console.log(`Created account for ${studentData.name}: ${studentPublicKey.toBase58()}`);

      // Small delay between creations
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Error creating account for ${studentData.name}:`, error);
    }
  }

  return createdAccounts;
}

export async function readAllStudents(studentPublicKeys: PublicKey[]) {
  const connection = new Connection(DEVNET_URL, 'confirmed');

  console.log('\n📚 Reading all student data...\n');

  for (const publicKey of studentPublicKeys) {
    const student = await readStudentData(connection, publicKey);
    if (student) {
      console.log(`Account: ${publicKey.toBase58()}`);
      console.log(`  Name: ${student.name}`);
      console.log(`  Reg Number: ${student.reg_number}`);
      console.log(`  Subject: ${student.sub}\n`);
    }
  }
}

// Run main function if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

// Export for use in other files
export {
  createStudentAccount,
  readStudentData,
  loadOrCreateKeypair,
  ensureBalance,
  Student,
  PROGRAM_ID,
  DEVNET_URL
};
