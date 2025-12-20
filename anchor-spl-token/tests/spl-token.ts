import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SplToken } from "../target/types/spl_token";
import { TOKEN_2022_PROGRAM_ID, getMint, getAssociatedTokenAddress, getAccount } from "@solana/spl-token";
import { BN } from "bn.js";

describe("spl-token", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.splToken as Program<SplToken>;
  const mint = anchor.web3.Keypair.generate();

  let associatedTokenAccountAddress: anchor.web3.PublicKey;

  const [pda_mint, _] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("mint1")],
    program.programId,
  );



  it("Is initialized!", async () => {
    // Add your test here.
    const tx = await program.methods.initialize().rpc();
    console.log(`Your transaction signature: https://solscan.io/tx/${tx}?cluster=devnet`);
  });

  it("Create Mint Account", async () => {

    console.log("============================================================")
    console.log("Create Mint Account")
    console.log("============================================================")

    const tx = await program.methods.createMint()
      .accounts({
        mint: mint.publicKey,
        tokenProgram: TOKEN_2022_PROGRAM_ID
      })
      .signers([mint])
      .rpc();
    console.log(`Your transaction signature: https://solscan.io/tx/${tx}?cluster=devnet`);

    const mintAccount = await getMint(
      program.provider.connection,
      mint.publicKey,
      "confirmed",
      TOKEN_2022_PROGRAM_ID
    )
    console.log("\nMint Account", mintAccount);
  });

  // it("Create Mint Account With PDA", async () => {
  //
  //   console.log("============================================================")
  //   console.log("Create Mint Account With PDA")
  //   console.log("============================================================")
  //
  //   const [pda_mint, _] = anchor.web3.PublicKey.findProgramAddressSync(
  //     [Buffer.from("mint5")],
  //     program.programId,
  //   );
  //
  //   const tx = await program.methods.createMintPda()
  //     .accounts({
  //       tokenProgram: TOKEN_2022_PROGRAM_ID
  //     })
  //     .rpc({ commitment: "confirmed" });
  //   console.log(`Your transaction signature: https://solscan.io/tx/${tx}?cluster=devnet`);
  //
  //   const mintAccount = await getMint(
  //     program.provider.connection,
  //     pda_mint,
  //     "confirmed",
  //     TOKEN_2022_PROGRAM_ID
  //   )
  //   console.log("\nMint Account", mintAccount);
  // });

  it("Create Associated Token Account ", async () => {

    console.log("============================================================")
    console.log("Creating Associated Token Account")
    console.log("============================================================")

    const tx = await program.methods.createAta()
      .accounts({
        mint: mint.publicKey,
        tokenProgram: TOKEN_2022_PROGRAM_ID
      })
      .rpc({ commitment: "confirmed" });
    console.log(`Your transaction signature: https://solscan.io/tx/${tx}?cluster=devnet`);

    associatedTokenAccountAddress = await getAssociatedTokenAddress(
      mint.publicKey,
      program.provider.publicKey,
      false,
      TOKEN_2022_PROGRAM_ID
    )

    const tokenAccount = await getAccount(
      program.provider.connection,
      associatedTokenAccountAddress,
      "confirmed",
      TOKEN_2022_PROGRAM_ID,
    );

    console.log("\nAssociated Token Account", tokenAccount);
  });

  // it("Create PDA Token Account ", async () => {
  //
  //   console.log("============================================================")
  //   console.log("Creating PDA Token Account")
  //   console.log("============================================================")
  // const [token, tokenBump] = anchor.web3.PublicKey.findProgramAddressSync(
  //   [Buffer.from("token")],
  //   program.programId,
  // );
  //   const tx = await program.methods.createPdaTokenAccount()
  //     .accounts({
  //       mint: pda_mint,
  //       tokenProgram: TOKEN_2022_PROGRAM_ID
  //     })
  //     .rpc({ commitment: "confirmed" });
  //   console.log(`Your transaction signature: https://solscan.io/tx/${tx}?cluster=devnet`);
  //
  //   const tokenAccount = await getAccount(
  //     program.provider.connection,
  //     token,
  //     "confirmed",
  //     TOKEN_2022_PROGRAM_ID,
  //   );
  //
  //   console.log("\nPDA Token Account", tokenAccount);
  // });

  it("Mint token to ATA", async () => {

    console.log("============================================================")
    console.log("Minting token to ATA")
    console.log("============================================================")

    const amount = new BN(20 * 1_000_000); // 20 tokens with 6 decimals

    const tx = await program.methods.mintToken(amount)
      .accounts({
        mint: mint.publicKey,
        tokenAccount: associatedTokenAccountAddress,
        tokenProgram: TOKEN_2022_PROGRAM_ID
      })
      .rpc({ commitment: "confirmed" });

    console.log(`Your transaction signature: https://solscan.io/tx/${tx}?cluster=devnet`);

    const tokenAccount = await getAccount(
      program.provider.connection,
      associatedTokenAccountAddress,
      "confirmed",
      TOKEN_2022_PROGRAM_ID,
    );

    console.log("\nToken Account After Minting:");
    console.log("Amount:", tokenAccount.amount.toString(), "(raw)");
    console.log("Amount:", (Number(tokenAccount.amount) / 1_000_000).toString(), "tokens");

  });

});
