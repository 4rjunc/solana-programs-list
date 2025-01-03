import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { AnchorPda } from "../target/types/anchor_pda";
import { PublicKey, Keypair } from "@solana/web3.js";
import { assert } from "chai";

describe("anchor-pda", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.AnchorPda as Program<AnchorPda>;
  const user = Keypair.generate();

  const [PDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("data"), user.publicKey.toBuffer()],
    program.programId
  );

  console.log("PDA:", [PDA]);

  it("Is initialized!", async () => {
    const transactionSignature = await program.methods
      .initialize()
      .accounts({
        user: user.publicKey,
        pdaAccount: PDA,
      })
      .rpc();

    console.log("Transaction Signature:", transactionSignature);
    assert.equal(0, 0);
  });

  it("Fetch Account", async () => {
    const pdaAccount = await program.account.dataAccount.fetch(PDA);
    console.log(JSON.stringify(pdaAccount, null, 2));

    assert.equal(0, 0);
  });
});
