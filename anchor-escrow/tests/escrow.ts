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
      // 1. CREATE: Allocate space on-chain for the new mint account
      //    - Pays rent to make account rent-exempt
      //    - Assigns ownership to Token Program
      //    - Creates empty account with MINT_SIZE bytes
      SystemProgram.createAccount({
        fromPubkey: maker.publicKey,        // Who pays for the account creation
        newAccountPubkey: mintA.publicKey,  // Address of the new mint account
        space: MINT_SIZE,                   // Size needed for mint data (82 bytes)
        lamports: await getMinimumBalanceForRentExemptMint(provider.connection), // Rent deposit
        programId: TOKEN_PROGRAM_ID         // Token Program will own this account
      }),

      // 2. INITIALIZE: Configure the mint with decimals and authorities
      //    - Sets decimal precision (9 = can have 0.000000001 tokens)
      //    - mint_authority: who can create new tokens
      //    - freeze_authority: who can freeze token accounts (same as mint_authority here)
      createInitializeMintInstruction(
        mintA.publicKey,    // The mint account to initialize
        9,                  // Decimal places (9 = standard SPL token precision)
        maker.publicKey,    // Mint authority (can create new tokens)
        maker.publicKey     // Freeze authority (can freeze accounts)
      ),

      // 3. CREATE ATA: Create Associated Token Account for the maker to hold tokens
      //    - Deterministic address based on (owner + mint)
      //    - Standard way to hold SPL tokens
      createAssociatedTokenAccountInstruction(
        maker.publicKey,    // Payer for ATA creation
        makerAtaA,         // The ATA address (computed earlier)
        maker.publicKey,    // Owner of the token account
        mintA.publicKey     // Which mint this ATA is for
      ),

      // 4. MINT TOKENS: Create 100 tokens and deposit them into maker's ATA
      //    - Only mint_authority can do this
      //    - Increases total supply of the token
      createMintToInstruction(
        mintA.publicKey,    // Which mint to create tokens from
        makerAtaA,         // Destination token account
        maker.publicKey,    // Mint authority (must sign transaction)
        100                 // Amount to mint (in smallest unit, so 100 tokens)
      )
    );

    const mintCreationTxB = new Transaction().add(
      // 1. CREATE: Allocate space on-chain for the new mint account
      //    - Pays rent to make account rent-exempt
      //    - Assigns ownership to Token Program
      //    - Creates empty account with MINT_SIZE bytes
      SystemProgram.createAccount({
        fromPubkey: taker.publicKey,        // Who pays for the account creation
        newAccountPubkey: mintB.publicKey,  // Address of the new mint account
        space: MINT_SIZE,                   // Size needed for mint data (82 bytes)
        lamports: await getMinimumBalanceForRentExemptMint(provider.connection), // Rent deposit
        programId: TOKEN_PROGRAM_ID         // Token Program will own this account
      }),

      // 2. INITIALIZE: Configure the mint with decimals and authorities
      //    - Sets decimal precision (9 = can have 0.000000001 tokens)
      //    - mint_authority: who can create new tokens
      //    - freeze_authority: who can freeze token accounts (same as mint_authority here)
      createInitializeMintInstruction(
        mintB.publicKey,    // The mint account to initialize
        9,                  // Decimal places (9 = standard SPL token precision)
        taker.publicKey,    // Mint authority (can create new tokens)
        taker.publicKey     // Freeze authority (can freeze accounts)
      ),

      // 3. CREATE ATA: Create Associated Token Account for the taker to hold tokens
      //    - Deterministic address based on (owner + mint)
      //    - Standard way to hold SPL tokens
      createAssociatedTokenAccountInstruction(
        taker.publicKey,    // Payer for ATA creation
        takerAtaB,         // The ATA address (computed earlier)
        taker.publicKey,    // Owner of the token account
        mintB.publicKey     // Which mint this ATA is for
      ),

      // 4. MINT TOKENS: Create 100 tokens and deposit them into taker's ATA
      //    - Only mint_authority can do this
      //    - Increases total supply of the token
      createMintToInstruction(
        mintB.publicKey,    // Which mint to create tokens from
        takerAtaB,         // Destination token account
        taker.publicKey,    // Mint authority (must sign transaction)
        100                 // Amount to mint (in smallest unit, so 100 tokens)
      )
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
