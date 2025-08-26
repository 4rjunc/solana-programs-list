import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { TOKEN_PROGRAM_ID, MINT_SIZE, getMinimumBalanceForRentExemptMint, createInitializeMintInstruction, getAssociatedTokenAddressSync, createAssociatedTokenAccountInstruction, createMintToInstruction, getAccount, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { PublicKey, Keypair, LAMPORTS_PER_SOL, SystemProgram, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { Escrow } from "../target/types/escrow";
import { randomBytes } from "crypto";
import { assert } from "chai";

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
    const [signatureMaker, signatureTaker] = await Promise.all([
      sendAndConfirmTransaction(provider.connection, mintCreationTxA, [maker, mintA]),
      sendAndConfirmTransaction(provider.connection, mintCreationTxB, [taker, mintB])
    ]);

    console.log(
      `Your transaction signature Maker: https://explorer.solana.com/transaction/${signatureMaker}?cluster=custom&customUrl=${provider.connection.rpcEndpoint}`
    );
    console.log(
      `Your transaction signature Taker: https://explorer.solana.com/transaction/${signatureTaker}?cluster=custom&customUrl=${provider.connection.rpcEndpoint}`
    );

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

    // escrow pda 

    const seed = new BN(randomBytes(8));
    const escrow = PublicKey.findProgramAddressSync(
      [
        Buffer.from("escrow"),
        maker.publicKey.toBuffer(),
        seed.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    )[0];
    const vault = getAssociatedTokenAddressSync(
      mintA.publicKey,
      escrow,
      true,
      TOKEN_PROGRAM_ID
    );

    // Store for escrow tests
    global.escrowSetup = {
      maker,
      taker,
      mintA,
      mintB,
      makerAtaA,
      makerAtaB,
      takerAtaA,
      takerAtaB,
      escrow,
      vault,
      seed
    };
  });

  it("Make", async () => {
    try {
      // Test parameters
      //const seed = new anchor.BN(12345);        // Random seed for escrow PDA
      const depositAmount = new anchor.BN(50);   // Amount of Token A to deposit
      const receiveAmount = new anchor.BN(75);   // Amount of Token B maker wants to receive

      // Get the test setup data (assumes previous setup test ran)
      const { maker, mintA, mintB, makerAtaA, seed } = global.escrowSetup;

      // Calculate PDA addresses
      const [escrowPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("escrow"),
          maker.publicKey.toBuffer(),
          seed.toArrayLike(Buffer, "le", 8)  // Convert BN to 8-byte little-endian buffer
        ],
        program.programId
      );

      const [vaultPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          escrowPda.toBuffer(),
          TOKEN_PROGRAM_ID.toBuffer(),
          mintA.publicKey.toBuffer()
        ],
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      console.log("=== MAKE INSTRUCTION TEST ===");
      console.log("Seed:", seed.toString());
      console.log("Deposit Amount:", depositAmount.toString());
      console.log("Receive Amount:", receiveAmount.toString());
      console.log("Escrow PDA:", escrowPda.toBase58());
      console.log("Vault PDA:", vaultPda.toBase58());

      // Get maker's initial Token A balance
      const makerAtaABefore = await getAccount(provider.connection, makerAtaA, "confirmed");
      console.log("Maker's Token A balance before:", Number(makerAtaABefore.amount));

      // Execute the Make instruction
      const signature = await program.methods
        .make(seed, depositAmount, receiveAmount)
        .accounts({
          maker: maker.publicKey,
          mintA: mintA.publicKey,
          mintB: mintB.publicKey,
          makerAtaA: makerAtaA,
          escrow: escrowPda,
          vault: vaultPda,
          systemProgram: anchor.web3.SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([maker])
        .rpc();

      console.log(`\nMake transaction signature: https://explorer.solana.com/transaction/${signature}?cluster=custom&customUrl=${provider.connection.rpcEndpoint}`);

      // ===== VERIFICATION =====

      // 1. Check that escrow account was created with correct data
      const escrowAccount = await program.account.escrowState.fetch(escrowPda);
      console.log("\n=== ESCROW STATE VERIFICATION ===");
      console.log("Escrow Seed:", escrowAccount.seed.toString());
      console.log("Escrow Maker:", escrowAccount.maker.toBase58());
      console.log("Escrow Mint A:", escrowAccount.mintA.toBase58());
      console.log("Escrow Mint B:", escrowAccount.mintB.toBase58());
      console.log("Escrow Receive Amount:", escrowAccount.receiveAmount.toString());

      // Verify escrow state
      assert.equal(escrowAccount.seed.toString(), seed.toString(), "Seed mismatch");
      assert.equal(escrowAccount.maker.toBase58(), maker.publicKey.toBase58(), "Maker mismatch");
      assert.equal(escrowAccount.mintA.toBase58(), mintA.publicKey.toBase58(), "Mint A mismatch");
      assert.equal(escrowAccount.mintB.toBase58(), mintB.publicKey.toBase58(), "Mint B mismatch");
      assert.equal(escrowAccount.receiveAmount.toString(), receiveAmount.toString(), "Receive amount mismatch");

      // 2. Check that vault was created and received the deposited tokens
      const vaultAccount = await getAccount(provider.connection, vaultPda, "confirmed");
      console.log("\n=== VAULT VERIFICATION ===");
      console.log("Vault Token A balance:", Number(vaultAccount.amount));
      console.log("Vault Mint:", vaultAccount.mint.toBase58());
      console.log("Vault Owner:", vaultAccount.owner.toBase58());

      // Verify vault state
      assert.equal(Number(vaultAccount.amount), depositAmount.toNumber(), "Vault balance mismatch");
      assert.equal(vaultAccount.mint.toBase58(), mintA.publicKey.toBase58(), "Vault mint mismatch");
      assert.equal(vaultAccount.owner.toBase58(), escrowPda.toBase58(), "Vault owner should be escrow PDA");

      // 3. Check that maker's Token A balance decreased by deposit amount
      const makerAtaAAfter = await getAccount(provider.connection, makerAtaA, "confirmed");
      console.log("\n=== MAKER BALANCE VERIFICATION ===");
      console.log("Maker's Token A balance after:", Number(makerAtaAAfter.amount));

      const expectedMakerBalance = Number(makerAtaABefore.amount) - depositAmount.toNumber();
      assert.equal(Number(makerAtaAAfter.amount), expectedMakerBalance, "Maker balance didn't decrease correctly");

      console.log("\n✅ Make instruction executed successfully!");
      console.log(`✅ Escrow created with ${depositAmount} Token A deposited`);
      console.log(`✅ Maker wants ${receiveAmount} Token B in return`);

      console.log("\n============================================================\n")

      // Store escrow info for subsequent tests
      global.escrowTest = {
        escrowPda,
        vaultPda,
        seed,
        depositAmount,
        receiveAmount
      };

    } catch (error) {
      console.error(`❌ Something went wrong in Make: ${error}`);
      console.error("Full error:", error);
      throw error;
    }
  });

  it("Take", async () => {
    try {
      // Get the test setup data from previous tests
      const { maker, taker, mintA, mintB, makerAtaB, takerAtaA, takerAtaB } = global.escrowSetup;
      const { escrowPda, vaultPda, seed, depositAmount, receiveAmount } = global.escrowTest;

      console.log("=== TAKE INSTRUCTION ===");
      console.log("Escrow PDA:", escrowPda.toBase58());
      console.log("Vault PDA:", vaultPda.toBase58());
      console.log("Expected to transfer:", receiveAmount.toString(), "Token B to maker");
      console.log("Expected to receive:", depositAmount.toString(), "Token A from vault");

      // Get escrow state to verify amounts
      const escrowStateBefore = await program.account.escrowState.fetch(escrowPda);
      console.log("Escrow receive_amount:", escrowStateBefore.receiveAmount.toString());

      // Get initial balances
      const [takerAtaBBefore, makerAtaBBefore, vaultBefore, takerAtaABefore] = await Promise.all([
        getAccount(provider.connection, takerAtaB, "confirmed"),
        getAccount(provider.connection, makerAtaB, "confirmed"),
        getAccount(provider.connection, vaultPda, "confirmed"),
        getAccount(provider.connection, takerAtaA, "confirmed")
      ]);

      console.log("\n=== INITIAL BALANCES ===");
      console.log("Taker's Token B balance:", Number(takerAtaBBefore.amount));
      console.log("Maker's Token B balance:", Number(makerAtaBBefore.amount));
      console.log("Vault Token A balance:", Number(vaultBefore.amount));
      console.log("Taker's Token A balance:", Number(takerAtaABefore.amount));

      // Verify taker has enough Token B
      if (Number(takerAtaBBefore.amount) < receiveAmount.toNumber()) {
        console.log("❌ PROBLEM: Taker doesn't have enough Token B!");
        console.log(`Needs: ${receiveAmount.toString()}, Has: ${Number(takerAtaBBefore.amount)}`);
        return;
      }

      // Execute the Take instruction with more detailed error handling
      let signature = await program.methods
        .take()
        .accounts({
          taker: taker.publicKey,
          maker: maker.publicKey,
          mintA: mintA.publicKey,
          mintB: mintB.publicKey,
          takerAtaA: takerAtaA,
          takerAtaB: takerAtaB,
          makerAtaB: makerAtaB,
          escrow: escrowPda,
          vault: vaultPda,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([taker])
        .rpc();

      console.log(`\nTake transaction signature: https://explorer.solana.com/transaction/${signature}?cluster=custom&customUrl=${provider.connection.rpcEndpoint}`);

      // Get final balances
      const [takerAtaBAfter, makerAtaBAfter, takerAtaAAfter] = await Promise.all([
        getAccount(provider.connection, takerAtaB, "confirmed"),
        getAccount(provider.connection, makerAtaB, "confirmed"),
        getAccount(provider.connection, takerAtaA, "confirmed")
      ]);

      console.log("\n=== FINAL BALANCES ===");
      console.log("Taker's Token B balance:", Number(takerAtaBAfter.amount));
      console.log("Maker's Token B balance:", Number(makerAtaBAfter.amount));
      console.log("Taker's Token A balance:", Number(takerAtaAAfter.amount));

      console.log("\n=== Take VERIFICATION ===");

      // 3. MAKER AND TAKER 
      console.log("\n=== MAKER BALANCE VERIFICATION ===");
      console.log("Maker's Token B balance after:", Number(makerAtaBAfter.amount));
      assert.equal(Number(makerAtaBAfter.amount), receiveAmount, "Maker didn't receive requested amount of token B");

      console.log("\n=== TAKER BALANCE VERIFICATION ===");
      console.log("Taker's Token A balance after:", Number(takerAtaAAfter.amount));
      console.log("Taker's Token B balance after:", Number(takerAtaBAfter.amount));
      assert.equal(Number(takerAtaAAfter.amount), depositAmount, "Taker didn't receive deposit amount of token A");

      console.log("\n✅ Take instruction executed successfully!");
      console.log(`✅ Escrow created with ${depositAmount} Token A deposited`);
      console.log(`✅ Taker received ${Number(takerAtaAAfter.amount)} Token A`);
      console.log(`✅ Maker received ${Number(makerAtaBAfter.amount)} Token B`);



      console.log("\n============================================================\n")

    } catch (error) {
      console.error(`❌ Something went wrong in Take: ${error}`);
      console.error("Full error:", error);
      throw error;
    }
  });

});

