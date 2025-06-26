import * as path from 'path';
import { Keypair, LAMPORTS_PER_SOL, Transaction, TransactionInstruction, PublicKey, SystemProgram } from '@solana/web3.js';
import { LiteSVM } from 'litesvm';
import { describe, test } from "bun:test";

describe('Simple CPI', async () => {
  const svm = new LiteSVM();

  const programId = new PublicKey("8otW43hh4aZq6ht7sW8PFSuuHD9rM9gTJnETgXLLk5xx");
  const program = path.join(`${__dirname}/fixtures`, "cpi_invoke_signed.so")
  svm.addProgramFromFile(programId, program);

  test('test', () => {
    const recipient = Keypair.generate();

    const [pdaAddress] = PublicKey.findProgramAddressSync([Buffer.from("pda_account"), recipient.publicKey.toBuffer()], programId)

    const amount = BigInt(LAMPORTS_PER_SOL);
    svm.airdrop(recipient.publicKey, amount);
    svm.airdrop(pdaAddress, amount);

    const transferAmount = amount / BigInt(2);
    const instructionIndex = 0;

    const data = Buffer.alloc(9);
    data.writeInt8(instructionIndex, 0);
    data.writeBigInt64BE(transferAmount, 1);

    console.log("================Balance Before Transaction================")
    console.log("\nPDA: ", svm.getBalance(pdaAddress))
    console.log("\nRecipient: ", svm.getBalance(recipient.publicKey))
    console.log("==========================================================")

    const ix = new TransactionInstruction({
      keys: [
        { pubkey: pdaAddress, isSigner: false, isWritable: true },
        { pubkey: recipient.publicKey, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
      ],
      data,
      programId,
    })

    const tx = new Transaction().add(ix);
    tx.recentBlockhash = svm.latestBlockhash();
    tx.sign(recipient);
    //console.log("Transaction: ", tx)

    svm.sendTransaction(tx);

    console.log("================Balance After Transaction================")
    console.log("\nPDA: ", svm.getBalance(pdaAddress))
    console.log("\nRecipient: ", svm.getBalance(recipient.publicKey))
    console.log("==========================================================")



  })
})
