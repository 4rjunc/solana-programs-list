import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { AnchorSolVault } from "../target/types/anchor_sol_vault";
import { PublicKey, LAMPORTS_PER_SOL, SystemProgram } from "@solana/web3.js";
import { expect } from "chai";

describe("sol-vault", () => {
  // Configure the client to use the local cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.AnchorSolVault as Program<AnchorSolVault>;

  // Test accounts
  const user = anchor.web3.Keypair.generate();
  let vaultPDA: PublicKey;
  let vaultStatePDA: PublicKey;
  let vaultBump: number;
  let vaultStateBump: number;

  before(async () => {
    // Airdrop SOL to user for testing
    const signature = await provider.connection.requestAirdrop(
      user.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(signature);

    // Derive PDAs
    [vaultPDA, vaultBump] = await PublicKey.findProgramAddress(
      [Buffer.from("vault")],
      program.programId
    );

    [vaultStatePDA, vaultStateBump] = await PublicKey.findProgramAddress(
      [Buffer.from("vault_state"), user.publicKey.toBuffer()],
      program.programId
    );
  });

  describe("deposit", () => {
    it("should successfully deposit SOL", async () => {
      // Amount to deposit (0.5 SOL)
      const amount = LAMPORTS_PER_SOL / 2;

      // Get initial balances
      const userInitialBalance = await provider.connection.getBalance(
        user.publicKey
      );
      const vaultInitialBalance = await provider.connection.getBalance(
        vaultPDA
      );

      // Perform deposit
      await program.methods
        .deposit(new anchor.BN(amount))
        .accounts({
          user: user.publicKey,
          vault: vaultPDA,
          vaultState: vaultStatePDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([user])
        .rpc();

      // Get final balances
      const userFinalBalance = await provider.connection.getBalance(
        user.publicKey
      );
      const vaultFinalBalance = await provider.connection.getBalance(vaultPDA);

      // Fetch vault state account
      const vaultState = await program.account.vaultState.fetch(vaultStatePDA);

      // Verify balances
      expect(userInitialBalance - userFinalBalance).to.be.approximately(
        amount,
        1000000 // Allow for transaction fees
      );
      expect(vaultFinalBalance - vaultInitialBalance).to.equal(amount);
      expect(vaultState.balance.toNumber()).to.equal(amount);
      expect(vaultState.owner.toString()).to.equal(user.publicKey.toString());
    });

    it("should fail when depositing 0 SOL", async () => {
      try {
        await program.methods
          .deposit(new anchor.BN(0))
          .accounts({
            user: user.publicKey,
            vault: vaultPDA,
            vaultState: vaultStatePDA,
            systemProgram: SystemProgram.programId,
          })
          .signers([user])
          .rpc();

        expect.fail("Expected transaction to fail");
      } catch (error) {
        expect(error.toString()).to.include("InvalidAmount");
      }
    });
  });

  describe("withdraw", () => {
    it("should successfully withdraw SOL", async () => {
      // Amount to withdraw (0.2 SOL)
      const amount = LAMPORTS_PER_SOL / 5;

      // Get initial balances
      const userInitialBalance = await provider.connection.getBalance(
        user.publicKey
      );
      const vaultInitialBalance = await provider.connection.getBalance(
        vaultPDA
      );
      const vaultState = await program.account.vaultState.fetch(vaultStatePDA);
      const initialStateBalance = vaultState.balance.toNumber();

      // Perform withdrawal
      await program.methods
        .withdraw(new anchor.BN(amount))
        .accounts({
          user: user.publicKey,
          vault: vaultPDA,
          vaultState: vaultStatePDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([user])
        .rpc();

      // Get final balances
      const userFinalBalance = await provider.connection.getBalance(
        user.publicKey
      );
      const vaultFinalBalance = await provider.connection.getBalance(vaultPDA);
      const finalVaultState = await program.account.vaultState.fetch(
        vaultStatePDA
      );

      // Verify balances
      expect(userFinalBalance - userInitialBalance).to.be.approximately(
        amount,
        1000000 // Allow for transaction fees
      );
      expect(vaultInitialBalance - vaultFinalBalance).to.equal(amount);
      expect(finalVaultState.balance.toNumber()).to.equal(
        initialStateBalance - amount
      );
    });

    it("should fail when withdrawing more than available balance", async () => {
      // Try to withdraw more SOL than available
      const largeAmount = LAMPORTS_PER_SOL * 10;

      try {
        await program.methods
          .withdraw(new anchor.BN(largeAmount))
          .accounts({
            user: user.publicKey,
            vault: vaultPDA,
            vaultState: vaultStatePDA,
            systemProgram: SystemProgram.programId,
          })
          .signers([user])
          .rpc();

        expect.fail("Expected transaction to fail");
      } catch (error) {
        expect(error.toString()).to.include("InsufficientBalance");
      }
    });

    it("should fail when withdrawing 0 SOL", async () => {
      try {
        await program.methods
          .withdraw(new anchor.BN(0))
          .accounts({
            user: user.publicKey,
            vault: vaultPDA,
            vaultState: vaultStatePDA,
            systemProgram: SystemProgram.programId,
          })
          .signers([user])
          .rpc();

        expect.fail("Expected transaction to fail");
      } catch (error) {
        expect(error.toString()).to.include("InvalidAmount");
      }
    });

    it("should fail when unauthorized user tries to withdraw", async () => {
      const unauthorizedUser = anchor.web3.Keypair.generate();
      const amount = LAMPORTS_PER_SOL / 10;

      // Airdrop some SOL to unauthorized user for transaction fee
      const signature = await provider.connection.requestAirdrop(
        unauthorizedUser.publicKey,
        LAMPORTS_PER_SOL / 10
      );
      await provider.connection.confirmTransaction(signature);

      try {
        await program.methods
          .withdraw(new anchor.BN(amount))
          .accounts({
            user: unauthorizedUser.publicKey,
            vault: vaultPDA,
            vaultState: vaultStatePDA,
            systemProgram: SystemProgram.programId,
          })
          .signers([unauthorizedUser])
          .rpc();

        expect.fail("Expected transaction to fail");
      } catch (error) {
        expect(error.toString()).to.include("Constraint was violated");
      }
    });
  });
});
