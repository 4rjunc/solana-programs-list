import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { Keypair } from "@solana/web3.js";
import { AnchorCounterapp } from "../target/types/anchor_counterapp";
import { before } from "node:test";

describe("AnchorCounterapp", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  // const user1: anchor.web3.Signer = provider.wallet as anchor.Wallet;
  const user1: anchor.web3.Signer = anchor.web3.Keypair.generate();
  const user2: anchor.web3.Signer = anchor.web3.Keypair.generate();

  const program = anchor.workspace
    .AnchorCounterapp as Program<AnchorCounterapp>;

  const ssfDemoDayProjectKeypair = Keypair.generate();

  before(async () => {
    await provider.connection.requestAirdrop(user1.publicKey, 1000000000);
    await provider.connection.requestAirdrop(user2.publicKey, 1000000000);
  });

  it("Initialize Program", async () => {
    await program.methods.initialize().rpc();
  });

  it("Initializing User 1 Account ", async () => {
    const [userAccountPDA, seeds] =
      await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from("counterprogram"), user1.publicKey.toBuffer()],
        program.programId
      );

    await program.methods
      .createUserAccount()
      .accounts({
        userAccount: userAccountPDA,
        user: user1.publicKey,
      })
      .signers([user1])
      .rpc();

    const userAccount = await program.account.userAccount.fetch(userAccountPDA);

    const count =
      userAccount.count instanceof BN
        ? userAccount.count.toNumber()
        : userAccount.count;
    expect(count).toEqual(0);
    expect(userAccount.user.toString()).toEqual(user1.publicKey.toString());
  });

  //user2 ;
  it("Initializing User 2 Account ", async () => {
    const [userAccountPDA, seeds] =
      await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from("counterprogram"), user2.publicKey.toBuffer()],
        program.programId
      );

    await program.methods
      .createUserAccount()
      .accounts({
        userAccount: userAccountPDA,
        user: user2.publicKey,
      })
      .signers([user2])
      .rpc();

    const userAccount = await program.account.userAccount.fetch(userAccountPDA);

    const count =
      userAccount.count instanceof BN
        ? userAccount.count.toNumber()
        : userAccount.count;
    expect(count).toEqual(0);
    expect(userAccount.user.toString()).toEqual(user2.publicKey.toString());
  });

  //user2 increment X 2
  it("User 2 Increment Twice ", async () => {
    const [userAccountPDA, seeds] =
      await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from("counterprogram"), user2.publicKey.toBuffer()],
        program.programId
      );

    await program.methods
      .increment()
      .accounts({
        userAccount: userAccountPDA,
        user: user2.publicKey,
      })
      .signers([user2])
      .rpc();

    await program.methods
      .increment()
      .accounts({
        userAccount: userAccountPDA,
        user: user2.publicKey,
      })
      .signers([user2])
      .rpc();

    const userAccount = await program.account.userAccount.fetch(userAccountPDA);

    const count =
      userAccount.count instanceof BN
        ? userAccount.count.toNumber()
        : userAccount.count;
    expect(count).toEqual(2);
  });

  // user1 2 increment 1 decrement
  it("User 1 2 increment 1 decrement", async () => {
    let [userAccountPDA, bump] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("counterprogram"), user1.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .increment()
      .accounts({
        userAccount: userAccountPDA,
        user: user1.publicKey,
      })
      .signers([user1])
      .rpc();

    await program.methods
      .increment()
      .accounts({
        userAccount: userAccountPDA,
        user: user1.publicKey,
      })
      .signers([user1])
      .rpc();

    await program.methods
      .decrement()
      .accounts({
        userAccount: userAccountPDA,
        user: user1.publicKey,
      })
      .signers([user1])
      .rpc();

    const userAccount = await program.account.userAccount.fetch(userAccountPDA);
    const count =
      userAccount.count instanceof BN
        ? userAccount.count.toNumber()
        : userAccount.count;
    expect(count).toEqual(1);
  });
});
