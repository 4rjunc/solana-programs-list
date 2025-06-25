import * as path from 'path';
import { Keypair, LAMPORTS_PER_SOL, Transaction, TransactionInstruction, PublicKey, SystemProgram } from '@solana/web3.js';
import { LiteSVM } from 'litesvm';
import { describe, test } from "bun:test";

describe('Simple CPI', async () => {
  const svm = new LiteSVM();

  const programId = new PublicKey("FPwoyR8SybaSHfAGyyjWum8PSiZ4YuYvev117A2fboM4");
  const program = path.join(`${__dirname}/fixtures`, "cpi_invoke.so")
  svm.addProgramFromFile(programId, program);

  const sender = Keypair.generate();
  const recipient = Keypair.generate();

  const amount = BigInt(LAMPORTS_PER_SOL);
  svm.airdrop(sender.publicKey, amount);

  const transferAmount = amount / BigInt(2);
  const instructionIndex = 0;

  const data = Buffer.alloc(9);
  data.writeInt8(instructionIndex, 0);
  data.writeBigInt64BE(transferAmount, 1);

  console.log(data);
})
