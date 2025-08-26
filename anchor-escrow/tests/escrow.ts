import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { TOKEN_PROGRAM_ID, MINT_SIZE, getMinimumBalanceForRentExemptMint, createInitializeMintInstruction, getAssociatedTokenAddressSync, createAssociatedTokenAccountInstruction, createMintToInstruction, getAccount } from "@solana/spl-token";
import { PublicKey, Keypair, LAMPORTS_PER_SOL, SystemProgram, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { Escrow } from "../target/types/escrow";
import * as fs from "fs";

describe("escrow", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.Escrow as Program<Escrow>;
  const provider = anchor.getProvider();

  it("Setting Up, Mint Accounts, ATA's, Mint Tokens", async () => {
    const maker = Keypair.fromSecretKey(new Uint8Array([249, 53, 151, 93, 232, 251, 119, 58, 247, 123, 12, 181, 48, 158, 145, 249, 80, 93, 155, 59, 80, 35, 17, 216, 19, 5, 34, 111, 2, 6, 227, 89, 97, 141, 73, 33, 204, 189, 51, 254, 42, 85, 248, 35, 184, 110, 43, 81, 111, 85, 93, 94, 63, 245, 203, 115, 53, 235, 182, 140, 249, 200, 8, 204]));

    const taker = Keypair.fromSecretKey(new Uint8Array([3, 183, 242, 179, 150, 59, 210, 239, 230, 79, 78, 129, 41, 69, 77, 67, 248, 192, 40, 18, 92, 1, 100, 113, 138, 184, 0, 228, 208, 28, 43, 182, 192, 213, 116, 109, 20, 62, 120, 94, 173, 156, 25, 13, 144, 177, 44, 247, 88, 126, 247, 173, 137, 169, 5, 69, 188, 205, 2, 121, 205, 30, 244, 130]));

    const airdropAmount = 10 * LAMPORTS_PER_SOL;

    // Airdrop SOL in parallel
    const [makerSig, takerSig] = await Promise.all([
      provider.connection.requestAirdrop(maker.publicKey, airdropAmount),
      provider.connection.requestAirdrop(taker.publicKey, airdropAmount)
    ]);

    await Promise.all([
      provider.connection.confirmTransaction(makerSig, 'confirmed'),
      provider.connection.confirmTransaction(takerSig, 'confirmed')
    ]);

    // Step 1: Create both mints first (parallel)
    const mintA = Keypair.generate();
    const mintB = Keypair.generate();

    const makerAtaA = getAssociatedTokenAddressSync(mintA.publicKey, maker.publicKey);
    const takerAtaB = getAssociatedTokenAddressSync(mintB.publicKey, taker.publicKey);

    const mintCreationTxA = new Transaction().add(
      SystemProgram.createAccount({
        fromPubkey: maker.publicKey,
        newAccountPubkey: mintA.publicKey,
        space: MINT_SIZE,
        lamports: await getMinimumBalanceForRentExemptMint(provider.connection),
        programId: TOKEN_PROGRAM_ID
      }),
      createInitializeMintInstruction(mintA.publicKey, 9, maker.publicKey, maker.publicKey),
      createAssociatedTokenAccountInstruction(maker.publicKey, makerAtaA, maker.publicKey, mintA.publicKey),
      createMintToInstruction(mintA.publicKey, makerAtaA, maker.publicKey, 100)
    );

    const mintCreationTxB = new Transaction().add(
      SystemProgram.createAccount({
        fromPubkey: taker.publicKey,
        newAccountPubkey: mintB.publicKey,
        space: MINT_SIZE,
        lamports: await getMinimumBalanceForRentExemptMint(provider.connection),
        programId: TOKEN_PROGRAM_ID
      }),
      createInitializeMintInstruction(mintB.publicKey, 9, taker.publicKey, taker.publicKey),
      createAssociatedTokenAccountInstruction(taker.publicKey, takerAtaB, taker.publicKey, mintB.publicKey),
      createMintToInstruction(mintB.publicKey, takerAtaB, taker.publicKey, 100)
    );

    // Execute mint creation in parallel
    await Promise.all([
      sendAndConfirmTransaction(provider.connection, mintCreationTxA, [maker, mintA]),
      sendAndConfirmTransaction(provider.connection, mintCreationTxB, [taker, mintB])
    ]);

    // Step 2: Now create cross ATAs (both mints exist on-chain)
    const makerAtaB = getAssociatedTokenAddressSync(mintB.publicKey, maker.publicKey);
    const takerAtaA = getAssociatedTokenAddressSync(mintA.publicKey, taker.publicKey);

    const crossAtaTxMaker = new Transaction().add(
      createAssociatedTokenAccountInstruction(maker.publicKey, makerAtaB, maker.publicKey, mintB.publicKey)
    );

    const crossAtaTxTaker = new Transaction().add(
      createAssociatedTokenAccountInstruction(taker.publicKey, takerAtaA, taker.publicKey, mintA.publicKey)
    );

    // Execute cross ATA creation in parallel
    await Promise.all([
      sendAndConfirmTransaction(provider.connection, crossAtaTxMaker, [maker]),
      sendAndConfirmTransaction(provider.connection, crossAtaTxTaker, [taker])
    ]);

    console.log("\n=== ESCROW SETUP COMPLETE ===");
    console.log("Mint A:", mintA.publicKey.toBase58());
    console.log("Mint B:", mintB.publicKey.toBase58());
    console.log("Maker's ATA A:", makerAtaA.toBase58());
    console.log("Maker's ATA B:", makerAtaB.toBase58());
    console.log("Taker's ATA A:", takerAtaA.toBase58());
    console.log("Taker's ATA B:", takerAtaB.toBase58());

    // Verify balances
    const [makerBalance, takerBalance] = await Promise.all([
      getAccount(provider.connection, makerAtaA, "confirmed"),
      getAccount(provider.connection, takerAtaB, "confirmed")
    ]);

    console.log("\n")

    console.log("Maker balance (Mint A):", Number(makerBalance.amount), "tokens");
    console.log("Taker balance (Mint B):", Number(takerBalance.amount), "tokens");

    console.log("\n============================================================\n")

    // Store for escrow tests
    global.escrowSetup = {
      maker,
      taker,
      mintA,
      mintB,
      makerAtaA,
      makerAtaB,
      takerAtaA,
      takerAtaB
    };
  });

  it("Is initialized!", async () => {
    // Add your test here.
    console.log(`ATA Maker`, associatedTokenAccountMakerMintA);

    const tx = await program.methods.initialize().rpc();
    console.log("Your transaction signature", tx);
  });

});

function readKpJson(path: string): anchor.web3.Keypair {
  const file = fs.readFileSync(path);
  return anchor.web3.Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(file.toString()))
  );
}
