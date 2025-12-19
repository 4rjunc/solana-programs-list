import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SplToken } from "../target/types/spl_token";
import { TOKEN_2022_PROGRAM_ID, getMint } from "@solana/spl-token";

describe("spl-token", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.splToken as Program<SplToken>;
  const mint = anchor.web3.Keypair.generate();

  it("Is initialized!", async () => {
    // Add your test here.
    const tx = await program.methods.initialize().rpc();
    console.log(`Your transaction signature: https://orbmarkets.io/tx/${tx}?cluster=devnet`);
  });

  it("Create Mint Account", async () => {
    const tx = await program.methods.createMint()
      .accounts({
        mint: mint.publicKey,
        tokenProgram: TOKEN_2022_PROGRAM_ID
      })
      .signers([mint])
      .rpc();
    console.log(`Your transaction signature: https://orbmarkets.io/tx/${tx}?cluster=devnet`);

    const mintAccount = await getMint(
      program.provider.connection,
      mint.publicKey,
      "confirmed",
      TOKEN_2022_PROGRAM_ID
    )
    console.log("\nMint Account", mintAccount);
  });

  it("Create Mint Account With PDA", async () => {

    const [mint, bump] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("mint")],
      program.programId,
    );

    const tx = await program.methods.createMintPda()
      .accounts({
        tokenProgram: TOKEN_2022_PROGRAM_ID
      })
      .rpc();
    console.log(`Your transaction signature: https://orbmarkets.io/tx/${tx}?cluster=devnet`);

    const mintAccount = await getMint(
      program.provider.connection,
      mint,
      "confirmed",
      TOKEN_2022_PROGRAM_ID
    )
    console.log("\nMint Account", mintAccount);
  });


});
