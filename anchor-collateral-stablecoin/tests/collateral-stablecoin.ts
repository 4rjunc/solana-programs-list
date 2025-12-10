import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PythSolanaReceiver } from "@pythnetwork/pyth-solana-receiver";
import * as spl from "@solana/spl-token";
import { Keypair, PublicKey } from "@solana/web3.js";
import { CollateralStablecoin } from "../target/types/collateral_stablecoin";

describe("collateral_stablecoin", () => {
  anchor.setProvider(anchor.AnchorProvider.env());

  const provider = anchor.getProvider();
  const connection = provider.connection;
  const wallet = provider.wallet as anchor.Wallet;
  const program = anchor.workspace.CollateralStablecoin as Program<CollateralStablecoin>;
  const programId = program.programId;
  const tokenProgram = spl.TOKEN_2022_PROGRAM_ID;

  const pythSolanaReceiver = new PythSolanaReceiver({ connection, wallet });
  const SOL_PRICE_FEED_ID = "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d";
  const solUsdPriceFeedAccount = pythSolanaReceiver.getPriceFeedAccountAddress(0, SOL_PRICE_FEED_ID);

  const log = async (signature: string): Promise<string> => {
    console.log(`TX: https://explorer.solana.com/tx/${signature}?cluster=custom&customUrl=${connection.rpcEndpoint}`);
    return signature;
  };

  const transferSol = async (to: PublicKey, sol: number) => {
    const tx = new anchor.web3.Transaction().add(
      anchor.web3.SystemProgram.transfer({
        fromPubkey: wallet.publicKey,
        toPubkey: to,
        lamports: sol * anchor.web3.LAMPORTS_PER_SOL,
      })
    );
    await provider.sendAndConfirm(tx, []);
  };

  const authority = wallet;
  const user1 = Keypair.generate();
  const user2 = Keypair.generate();
  const liquidator = Keypair.generate();

  const [configPda] = PublicKey.findProgramAddressSync([Buffer.from("config")], programId);
  const [mintPda] = PublicKey.findProgramAddressSync([Buffer.from("mint")], programId);
  const [mintAuthorityPda] = PublicKey.findProgramAddressSync([Buffer.from("mint_authority"), configPda.toBuffer()], programId);
  const [treasuryPda] = PublicKey.findProgramAddressSync([Buffer.from("treasury"), configPda.toBuffer()], programId);

  const [authorityPositionPda] = PublicKey.findProgramAddressSync([Buffer.from("position"), authority.publicKey.toBuffer()], programId);
  const [authorityCollateralVaultPda] = PublicKey.findProgramAddressSync([Buffer.from("collateral"), authority.publicKey.toBuffer()], programId);
  const authorityStablecoinAta = spl.getAssociatedTokenAddressSync(mintPda, authority.publicKey, false, tokenProgram);

  const [user1PositionPda] = PublicKey.findProgramAddressSync([Buffer.from("position"), user1.publicKey.toBuffer()], programId);
  const [user1CollateralVaultPda] = PublicKey.findProgramAddressSync([Buffer.from("collateral"), user1.publicKey.toBuffer()], programId);
  const user1StablecoinAta = spl.getAssociatedTokenAddressSync(mintPda, user1.publicKey, false, tokenProgram);

  const liquidatorStablecoinAta = spl.getAssociatedTokenAddressSync(mintPda, liquidator.publicKey, false, tokenProgram);

  const maxLtvBps = 7500;
  const liquidationLtvBps = 8500;
  const liquidationBonusBps = 500;
  const minHealthFactorBps = 10000;
  const borrowRateBps = 500;
  const supplyCap = new anchor.BN(1_000_000_000_000_000);

  before(async () => {
    await transferSol(user1.publicKey, 0.2);
    await transferSol(user2.publicKey, 0.2);
    await transferSol(liquidator.publicKey, 0.2);
  });

  describe("Initialization", () => {
    it("Should initialize config", async () => {
      await program.methods
        .initializeConfig(maxLtvBps, liquidationLtvBps, liquidationBonusBps, minHealthFactorBps, borrowRateBps, supplyCap)
        .accounts({
          authority: authority.publicKey,
          // @ts-ignore
          config: configPda,
          mintAccount: mintPda,
          mintAuthority: mintAuthorityPda,
        })
        .rpc()
        .then(log);

      const config = await program.account.config.fetch(configPda);
      console.log("Config initialized - Max LTV:", config.maxLtvBps, "| Liquidation LTV:", config.liquidationLtvBps);
    });
  });

  describe("Core Operations", () => {
    it("Should deposit collateral and mint stablecoins", async () => {
      const collateralAmount = new anchor.BN(50_000_000);
      const stablecoinToMint = new anchor.BN(1_000_000);

      await program.methods
        .depositCollateral(collateralAmount, stablecoinToMint)
        .accounts({
          owner: authority.publicKey,
          // @ts-ignore
          config: configPda,
          position: authorityPositionPda,
          collateralVault: authorityCollateralVaultPda,
          mintAccount: mintPda,
          mintAuthority: mintAuthorityPda,
          userStablecoinAta: authorityStablecoinAta,
          treasury: treasuryPda,
          priceUpdate: solUsdPriceFeedAccount,
          associatedTokenProgram: spl.ASSOCIATED_TOKEN_PROGRAM_ID,
          tokenProgram: tokenProgram,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc()
        .then(log);

      const position = await program.account.position.fetch(authorityPositionPda);
      console.log("Collateral:", position.depositedCollateral.toString(), "| Debt:", position.debtShares.toString());
    });

    it("Should deposit more", async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const collateralAmount = new anchor.BN(60_000_000);
      const stablecoinToMint = new anchor.BN(1_500_000);

      await program.methods
        .depositCollateral(collateralAmount, stablecoinToMint)
        .accounts({
          owner: authority.publicKey,
          // @ts-ignore
          config: configPda,
          position: authorityPositionPda,
          collateralVault: authorityCollateralVaultPda,
          mintAccount: mintPda,
          mintAuthority: mintAuthorityPda,
          userStablecoinAta: authorityStablecoinAta,
          treasury: treasuryPda,
          priceUpdate: solUsdPriceFeedAccount,
          associatedTokenProgram: spl.ASSOCIATED_TOKEN_PROGRAM_ID,
          tokenProgram: tokenProgram,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc()
        .then(log);

      const position = await program.account.position.fetch(authorityPositionPda);
      console.log("Total Collateral:", position.depositedCollateral.toString(), "| Total Debt:", position.debtShares.toString());
    });

    it("Should withdraw collateral and burn stablecoins", async () => {
      const stablecoinToBurn = new anchor.BN(500_000);
      const collateralToWithdraw = new anchor.BN(10_000_000);

      await program.methods
        .withdrawCollateral(stablecoinToBurn, collateralToWithdraw)
        .accounts({
          owner: authority.publicKey,
          // @ts-ignore
          config: configPda,
          position: authorityPositionPda,
          collateralVault: authorityCollateralVaultPda,
          mintAccount: mintPda,
          mintAuthority: mintAuthorityPda,
          userStablecoinAta: authorityStablecoinAta,
          treasury: treasuryPda,
          priceUpdate: solUsdPriceFeedAccount,
          associatedTokenProgram: spl.ASSOCIATED_TOKEN_PROGRAM_ID,
          tokenProgram: tokenProgram,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc()
        .then(log);

      const position = await program.account.position.fetch(authorityPositionPda);
      console.log("After Withdraw - Collateral:", position.depositedCollateral.toString(), "| Debt:", position.debtShares.toString());
    });
  });

  describe.skip("Liquidation", () => {
    // NOTE: This test demonstrates the liquidation flow but won't actually liquidate
    // because we're using real-time Pyth oracle data. A position becomes liquidatable when
    // LTV > 85%, but max borrowable is 75%. To cross the liquidation threshold requires:
    // 1. SOL price to drop ~13% after position creation, OR
    // 2. Significant time to pass for interest accrual (5% APR)
    // In production with mock oracles or time manipulation, full liquidation can be tested.

    it("Should create position at max LTV and attempt liquidation", async () => {
      const collateralAmount = new anchor.BN(20_000_000);
      const stablecoinToMint = new anchor.BN(3_600_000_000);

      await program.methods
        .depositCollateral(collateralAmount, stablecoinToMint)
        .accounts({
          owner: user1.publicKey,
          // @ts-ignore
          config: configPda,
          position: user1PositionPda,
          collateralVault: user1CollateralVaultPda,
          mintAccount: mintPda,
          mintAuthority: mintAuthorityPda,
          userStablecoinAta: user1StablecoinAta,
          treasury: treasuryPda,
          priceUpdate: solUsdPriceFeedAccount,
          associatedTokenProgram: spl.ASSOCIATED_TOKEN_PROGRAM_ID,
          tokenProgram: tokenProgram,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([user1])
        .rpc({ skipPreflight: true })
        .then(log);

      let position = await program.account.position.fetch(user1PositionPda);
      console.log("Position created - Collateral:", position.depositedCollateral.toString(), "| Debt:", position.debtShares.toString());

      await program.methods
        .depositCollateral(new anchor.BN(100_000_000), new anchor.BN(5_000_000_000))
        .accounts({
          owner: authority.publicKey,
          // @ts-ignore
          config: configPda,
          position: authorityPositionPda,
          collateralVault: authorityCollateralVaultPda,
          mintAccount: mintPda,
          mintAuthority: mintAuthorityPda,
          userStablecoinAta: authorityStablecoinAta,
          treasury: treasuryPda,
          priceUpdate: solUsdPriceFeedAccount,
          associatedTokenProgram: spl.ASSOCIATED_TOKEN_PROGRAM_ID,
          tokenProgram: tokenProgram,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      const tx = new anchor.web3.Transaction().add(
        spl.createTransferCheckedInstruction(
          authorityStablecoinAta,
          mintPda,
          liquidatorStablecoinAta,
          authority.publicKey,
          4_000_000_000,
          9,
          [],
          spl.TOKEN_2022_PROGRAM_ID
        )
      );
      await provider.sendAndConfirm(tx, []);
      console.log("Liquidator funded with stablecoins");

      try {
        await program.methods
          .liquidate()
          .accounts({
            liquidator: liquidator.publicKey,
            // @ts-ignore
            config: configPda,
            position: user1PositionPda,
            positionOwner: user1.publicKey,
            collateralVault: user1CollateralVaultPda,
            mintAccount: mintPda,
            mintAuthority: mintAuthorityPda,
            liquidatorStablecoinAta: liquidatorStablecoinAta,
            treasury: treasuryPda,
            priceUpdate: solUsdPriceFeedAccount,
            associatedTokenProgram: spl.ASSOCIATED_TOKEN_PROGRAM_ID,
            tokenProgram: tokenProgram,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([liquidator])
          .rpc({ skipPreflight: true })
          .then(log);

        console.log("Liquidation successful!");
      } catch (err) {
        console.log("Expected: Position not liquidatable (LTV: 75%, threshold: 85%)");
      }
    });
  });

  describe("Admin Operations", () => {
    it("Should update config", async () => {
      await program.methods
        .updateConfig(null, null, { some: 100 }, null, null, null, null)
        .accounts({})
        .rpc({ skipPreflight: true })
        .then(log);

      const config = await program.account.config.fetch(configPda);
      console.log("Liquidation Bonus updated to:", config.liquidationBonusBps, "bps");
    });

    it("Should pause system", async () => {
      await program.methods
        .updateConfig(null, null, null, null, null, null, true)
        .accounts({})
        .rpc({ skipPreflight: true })
        .then(log);

      const config = await program.account.config.fetch(configPda);
      console.log("System paused:", config.paused);
    });

    it("Should unpause system", async () => {
      await program.methods
        .updateConfig(null, null, null, null, null, null, false)
        .accounts({})
        .rpc({ skipPreflight: true })
        .then(log);

      const config = await program.account.config.fetch(configPda);
      console.log("System unpaused:", config.paused);
    });
  });

  describe("Account Queries", () => {
    it("Should fetch program state", async () => {
      const config = await program.account.config.fetch(configPda);
      console.log("\nConfig:", configPda.toString());
      console.log("Max LTV:", config.maxLtvBps, "| Liquidation LTV:", config.liquidationLtvBps);

      const positions = await program.account.position.all();
      console.log("\nPositions:", positions.length);
      positions.forEach((pos, idx) => {
        console.log(`Position ${idx + 1}: ${pos.publicKey.toString()}`);
        console.log(`  Owner: ${pos.account.owner.toString()}`);
        console.log(`  Collateral: ${pos.account.depositedCollateral.toString()} | Debt: ${pos.account.debtShares.toString()}`);
      });
    });
  });
});