import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { AnchorPda } from "../target/types/anchor_pda";
import { PublicKey, Keypair } from "@solana/web3.js";
import { assert } from "chai";

describe("anchor-pda", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.AnchorPda as Program<AnchorPda>;
  const user = Keypair.generate();
  const [PDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("data"), user.publicKey.toBuffer()],
    program.programId
  );

  // airdrop some SOL to the user
  it("Airdrop", async () => {
    const airdropSignature = await program.provider.connection.requestAirdrop(
      user.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    );
    await program.provider.connection.confirmTransaction(airdropSignature);
  });

  it("Is initialized!", async () => {
    const transactionSignature = await program.methods
      .initialize()
      .accounts({
        user: user.publicKey,
        pdaAccount: PDA,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([user])
      .rpc();

    console.log("Transaction Signature:", transactionSignature);
  });

  it("Fetch Account", async () => {
    try {
      const pdaAccount = await program.account.dataAccount.fetch(PDA);
      console.log("Account data:", JSON.stringify(pdaAccount, null, 2));
    } catch (error) {
      console.error("Error fetching account:", error);
      throw error;
    }
  });
});
