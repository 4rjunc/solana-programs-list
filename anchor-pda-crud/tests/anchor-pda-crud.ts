import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { AnchorPdaCrud } from "../target/types/anchor_pda_crud";
import { PublicKey, Keypair } from "@solana/web3.js";
import { assert } from "chai";

describe("anchor-pda-crud", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.anchorPdaCrud as Program<AnchorPdaCrud>;
  const provider = anchor.getProvider();
  const user = provider.wallet;

  it("Create PDA", async () => {
    // Add your test here.
    const [messagePda, messageBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("message"), user.publicKey.toBuffer()],
      program.programId
    );

    const message = "Hello, World!";
    const transactionSignature = await program.methods
      .create(message)
      .accounts({
        messageAccount: messagePda
      })
      .rpc({ commitment: "confirmed" });

    const messageAccount = await program.account.messageAccount.fetch(
      messagePda,
      "confirmed"
    );

    console.log(JSON.stringify(messageAccount, null, 2));
    console.log(
      "Transaction Signature:",
      `https://solana.fm/tx/${transactionSignature}?cluster=devnet-solana`
    );
  });

  it("Update PDA", async () => {
    // Add your test here.
    const [messagePda, messageBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("message"), user.publicKey.toBuffer()],
      program.programId
    );

    const message = "Hello Solana World!";
    const transactionSignature = await program.methods
      .update(message)
      .accounts({
        messageAccount: messagePda
      })
      .rpc({ commitment: "confirmed" });

    const messageAccount = await program.account.messageAccount.fetch(
      messagePda,
      "confirmed"
    );

    console.log(JSON.stringify(messageAccount, null, 2));
    console.log(
      "Transaction Signature:",
      `https://solana.fm/tx/${transactionSignature}?cluster=devnet-solana`
    );

  });

  it("Delete PDA", async () => {
    // Add your test here.
    const [messagePda, messageBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("message"), user.publicKey.toBuffer()],
      program.programId
    );

    const message = "Hello Solana World!";
    const transactionSignature = await program.methods
      .delete()
      .accounts({
        messageAccount: messagePda
      })
      .rpc({ commitment: "confirmed" });

    const messageAccount = await program.account.messageAccount.fetchNullable(
      messagePda,
      "confirmed"
    );

    console.log(JSON.stringify(messageAccount, null, 2));
    console.log(
      "Transaction Signature:",
      `https://solana.fm/tx/${transactionSignature}?cluster=devnet-solana`
    );

  });


});
