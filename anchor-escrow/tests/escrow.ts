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

  // Helper function to create mint and mint tokens
  async function createMintAndTokens(
    connection,
    payer,
    owner,
    decimals = 9,
    mintAmount = 100,
    tokenProgram = TOKEN_PROGRAM_ID
  ) {
    const mint = Keypair.generate();
    const ownerAta = getAssociatedTokenAddressSync(
      mint.publicKey,
      owner.publicKey,
      false,
      tokenProgram
    );

    const instructions = [
      // Create mint account
      SystemProgram.createAccount({
        fromPubkey: payer.publicKey,
        newAccountPubkey: mint.publicKey,
        space: MINT_SIZE,
        lamports: await getMinimumBalanceForRentExemptMint(connection),
        programId: tokenProgram
      }),
      // Initialize mint
      createInitializeMintInstruction(
        mint.publicKey,
        decimals,
        owner.publicKey,
        owner.publicKey,
        tokenProgram
      ),
      // Create ATA
      createAssociatedTokenAccountInstruction(
        payer.publicKey,
        ownerAta,
        owner.publicKey,
        mint.publicKey,
        tokenProgram
      ),
      // Mint tokens
      createMintToInstruction(
        mint.publicKey,
        ownerAta,
        owner.publicKey,
        mintAmount,
        [],
        tokenProgram
      )
    ];

    return {
      mint,
      ownerAta,
      instructions
    };
  }

  it("Setting Up", async () => {
    const maker = Keypair.fromSecretKey(new Uint8Array([249, 53, 151, 93, 232, 251, 119, 58, 247, 123, 12, 181, 48, 158, 145, 249, 80, 93, 155, 59, 80, 35, 17, 216, 19, 5, 34, 111, 2, 6, 227, 89, 97, 141, 73, 33, 204, 189, 51, 254, 42, 85, 248, 35, 184, 110, 43, 81, 111, 85, 93, 94, 63, 245, 203, 115, 53, 235, 182, 140, 249, 200, 8, 204]));

    const taker = Keypair.fromSecretKey(new Uint8Array([3, 183, 242, 179, 150, 59, 210, 239, 230, 79, 78, 129, 41, 69, 77, 67, 248, 192, 40, 18, 92, 1, 100, 113, 138, 184, 0, 228, 208, 28, 43, 182, 192, 213, 116, 109, 20, 62, 120, 94, 173, 156, 25, 13, 144, 177, 44, 247, 88, 126, 247, 173, 137, 169, 5, 69, 188, 205, 2, 121, 205, 30, 244, 130]));

    const airdropAmount = 10 * LAMPORTS_PER_SOL;

    const [makerSig, takerSig] = await Promise.all([
      provider.connection.requestAirdrop(maker.publicKey, airdropAmount),
      provider.connection.requestAirdrop(taker.publicKey, airdropAmount)
    ]);

    await Promise.all([
      provider.connection.confirmTransaction(makerSig, 'confirmed'),
      provider.connection.confirmTransaction(takerSig, 'confirmed')
    ]);

    console.log(`Funded maker: ${maker.publicKey.toString()}, Balance: ${await provider.connection.getBalance(maker.publicKey)}`);
    console.log(`Funded taker: ${taker.publicKey.toString()}, Balance: ${await provider.connection.getBalance(taker.publicKey)}`);

    // Create both mints and their tokens
    const mintASetup = await createMintAndTokens(
      provider.connection,
      maker, // payer
      maker, // owner
      9,     // decimals
      100    // mint amount
    );

    const mintBSetup = await createMintAndTokens(
      provider.connection,
      taker, // payer
      taker, // owner
      9,     // decimals
      100    // mint amount
    );

    // Execute both transactions in parallel
    const [sigA, sigB] = await Promise.all([
      sendAndConfirmTransaction(
        provider.connection,
        new Transaction().add(...mintASetup.instructions),
        [maker, mintASetup.mint]
      ),
      sendAndConfirmTransaction(
        provider.connection,
        new Transaction().add(...mintBSetup.instructions),
        [taker, mintBSetup.mint]
      )
    ]);

    console.log("\n=== MINT A (Maker's Token) ===\n");
    console.log("Mint Address:", mintASetup.mint.publicKey.toBase58());
    console.log("Maker's ATA:", mintASetup.ownerAta.toBase58());
    console.log(`Transaction: https://explorer.solana.com/transaction/${sigA}?cluster=custom&customUrl=${provider.connection.rpcEndpoint}\n`);

    console.log("\n=== MINT B (Taker's Token) ===\n");
    console.log("Mint Address:", mintBSetup.mint.publicKey.toBase58());
    console.log("Taker's ATA:", mintBSetup.ownerAta.toBase58());
    console.log(`Transaction: https://explorer.solana.com/transaction/${sigB}?cluster=custom&customUrl=${provider.connection.rpcEndpoint}\n`);

    // Verify balances
    const [makerBalance, takerBalance] = await Promise.all([
      getAccount(provider.connection, mintASetup.ownerAta, "confirmed"),
      getAccount(provider.connection, mintBSetup.ownerAta, "confirmed")
    ]);

    console.log("\nMaker balance (Mint A):", Number(makerBalance.amount), "tokens");
    console.log("\nTaker balance (Mint B):", Number(takerBalance.amount), "tokens");

    // Store these for use in other tests
    global.testSetup = {
      maker,
      taker,
      mintA: mintASetup.mint,
      mintB: mintBSetup.mint,
      makerAtaA: mintASetup.ownerAta,
      takerAtaB: mintBSetup.ownerAta
    };
  });

  // Alternative: Even more optimized single transaction approach
  it("Setting Up (Single Transaction)", async () => {
    // ... airdrop code same as above ...

    // Create both mints in a single transaction per user
    const mintA = Keypair.generate();
    const mintB = Keypair.generate();

    const makerAtaA = getAssociatedTokenAddressSync(mintA.publicKey, maker.publicKey);
    const takerAtaB = getAssociatedTokenAddressSync(mintB.publicKey, taker.publicKey);

    // For escrow, you might also want to create cross ATAs
    const makerAtaB = getAssociatedTokenAddressSync(mintB.publicKey, maker.publicKey);
    const takerAtaA = getAssociatedTokenAddressSync(mintA.publicKey, taker.publicKey);

    const makerTx = new Transaction().add(
      // Create and setup Mint A
      SystemProgram.createAccount({
        fromPubkey: maker.publicKey,
        newAccountPubkey: mintA.publicKey,
        space: MINT_SIZE,
        lamports: await getMinimumBalanceForRentExemptMint(provider.connection),
        programId: TOKEN_PROGRAM_ID
      }),
      createInitializeMintInstruction(mintA.publicKey, 9, maker.publicKey, maker.publicKey),
      createAssociatedTokenAccountInstruction(maker.publicKey, makerAtaA, maker.publicKey, mintA.publicKey),
      createMintToInstruction(mintA.publicKey, makerAtaA, maker.publicKey, 100),

      // Create cross ATA for receiving Mint B
      createAssociatedTokenAccountInstruction(maker.publicKey, makerAtaB, maker.publicKey, mintB.publicKey)
    );

    const takerTx = new Transaction().add(
      // Create and setup Mint B
      SystemProgram.createAccount({
        fromPubkey: taker.publicKey,
        newAccountPubkey: mintB.publicKey,
        space: MINT_SIZE,
        lamports: await getMinimumBalanceForRentExemptMint(provider.connection),
        programId: TOKEN_PROGRAM_ID
      }),
      createInitializeMintInstruction(mintB.publicKey, 9, taker.publicKey, taker.publicKey),
      createAssociatedTokenAccountInstruction(taker.publicKey, takerAtaB, taker.publicKey, mintB.publicKey),
      createMintToInstruction(mintB.publicKey, takerAtaB, taker.publicKey, 100),

      // Create cross ATA for receiving Mint A
      createAssociatedTokenAccountInstruction(taker.publicKey, takerAtaA, taker.publicKey, mintA.publicKey)
    );

    // Execute in parallel
    await Promise.all([
      sendAndConfirmTransaction(provider.connection, makerTx, [maker, mintA]),
      sendAndConfirmTransaction(provider.connection, takerTx, [taker, mintB])
    ]);

    console.log("Setup complete with cross ATAs ready for escrow!");
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
