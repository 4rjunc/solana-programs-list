import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { BondingCurve } from "../target/types/bonding_curve";
import {
  PublicKey,
  Keypair,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccount,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import { assert, expect } from "chai";

const METADATA_PROGRAM_ID = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);

describe("bonding-curve", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.bondingCurve as Program<BondingCurve>;

  const creator = Keypair.generate();
  const user = Keypair.generate();

  const name = "TOKENS";
  const symbol = "TKN";
  const uri = "https://tokn.uri";
  const buyFeePercentage = 5;
  const sellFeePercentage = 5;
  const curveLimit = new anchor.BN(1000000000);

  let configPda: PublicKey;
  let tokenMint: PublicKey;
  let bondingCurvePda: PublicKey;
  let curveTokenAccount: PublicKey;
  let userTokenAccount: PublicKey;
  let metadataPda: PublicKey;


  before(async () => {
    await provider.connection.requestAirdrop(
      creator.publicKey,
      10 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.requestAirdrop(
      user.publicKey,
      10 * anchor.web3.LAMPORTS_PER_SOL
    );

    // Add delay to confirm airdrop
    await new Promise((resolve) => setTimeout(resolve, 1000));

    [configPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("master_config")],
      program.programId
    );

    // tokenMint = Keypair.generate().publicKey;
    //
    // [bondingCurvePda] = PublicKey.findProgramAddressSync(
    //   [Buffer.from("bonding_curve"), tokenMint.toBuffer()],
    //   program.programId
    // );
    //
    // [metadataPda] = PublicKey.findProgramAddressSync(
    //   [
    //     Buffer.from("metadata"),
    //     METADATA_PROGRAM_ID.toBuffer(),
    //     tokenMint.toBuffer(),
    //   ],
    //   program.programId
    // );
  });

  it("Init", async () => {
    const tx = await program.methods.initialize().rpc();
    console.log("Your transaction signature", tx);
  });


  it("Configure", async () => {
    const config = {
      admin: creator.publicKey,
      masterConfig: configPda,
      systemProgram: SystemProgram.programId
    }

    const reserved = Array(8).fill(null).map(() => Array(8).fill(0));

    const tx = await program.methods.config({
      authority: creator.publicKey,
      feeRecipient: creator.publicKey,
      curveLimit: new anchor.BN(1000000000),
      initialVirtualTokenReserve: new anchor.BN(1000000000),
      initialVirtualSolReserve: new anchor.BN(10000000000),
      initialRealTokenReserve: new anchor.BN(100000000000),
      totalTokenSupply: new anchor.BN(100000000),
      buyFeePercentage: 5,
      sellFeePercentage: 5,
      migrationFeePercentage: 0,
      reserved: reserved,
    })
      .accounts(config)
      .signers([creator])
      .rpc();

    const configData = await program.account.config.fetch(configPda);
    expect(configData.buyFeePercentage).to.equal(buyFeePercentage);
    expect(configData.sellFeePercentage).to.equal(sellFeePercentage);
    expect(configData.curveLimit.toString()).to.equal(curveLimit.toString());

    console.log("Configure transaction signature", tx);
  });

});
