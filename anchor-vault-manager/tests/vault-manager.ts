import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { VaultManager } from "../target/types/vault_manager";
import { PublicKey } from "@solana/web3.js";
import { expect } from "chai";
import {
  Account,
  createMint,
  getAccount,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  setAuthority,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

async function createAccount(amount: number) {
  let accounts: any[] = [];
  let account = anchor.web3.Keypair.generate();
  await airdropSol(account.publicKey, amount);
  console.log("☘️  Account Created => " + account.publicKey.toString());
  accounts.push(account);
  return accounts;
}

// airdrops sol to the account
async function airdropSol(publicKey, amount) {
  let airdropTx = await anchor
    .getProvider()
    .connection.requestAirdrop(
      publicKey,
      amount * anchor.web3.LAMPORTS_PER_SOL
    );
  await confirmTransaction(airdropTx);
}

// confirms transaction
async function confirmTransaction(tx) {
  const latestBlockHash = await anchor
    .getProvider()
    .connection.getLatestBlockhash();
  await anchor.getProvider().connection.confirmTransaction({
    blockhash: latestBlockHash.blockhash,
    lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
    signature: tx,
  });
}

describe("Vault Manager 💰 🕴️", () => {
  // Configure the client to use the local cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  let accounts: any[];
  let walletAlice: anchor.web3.Signer;
  let mintAlice: anchor.web3.PublicKey;
  let ataAlice: Account;
  const amountAlice = 6;

  const decimals = 0;
  let connection: anchor.web3.Connection;
  const program = anchor.workspace.VaultManager as Program<VaultManager>;
  connection = provider.connection;

  it("VAULT MANAGER Is initialized!", async () => {
    //create account
    //  let walletAlice = anchor.web3.Keypair.generate();
    // await airdropSol(walletAlice.publicKey, 10);
    accounts = await createAccount(10);
    walletAlice = accounts[0];

    // mint account
    try {
      mintAlice = await createMint(
        connection,
        walletAlice,
        walletAlice.publicKey,
        null,
        decimals
      );
    } catch (err) {
      console.log(err);
    }

    console.log(
      "----------------------------------------------------------------"
    );
    console.log("Mint Alice => ", mintAlice.toBase58());
    console.log(
      "----------------------------------------------------------------"
    );

    try {
      // ATA
      ataAlice = await getOrCreateAssociatedTokenAccount(
        connection,
        walletAlice,
        mintAlice,
        walletAlice.publicKey
      );
    } catch (err) {
      console.log(err);
    }
    console.log(
      "----------------------------------------------------------------"
    );
    console.log("ATA Alice => ", ataAlice.address.toBase58());
    console.log(
      "----------------------------------------------------------------"
    );

    try {
      let mintTx = await mintTo(
        connection,
        walletAlice,
        mintAlice,
        ataAlice.address,
        walletAlice.publicKey,
        amountAlice
      );
      console.log(
        "----------------------------------------------------------------"
      );
      console.log("Mint Transaction => ", mintTx);
      console.log(
        "----------------------------------------------------------------"
      );

      await setAuthority(
        connection,
        walletAlice,
        mintAlice,
        walletAlice.publicKey,
        0,
        null
      );
      console.log(
        "----------------------------------------------------------------"
      );
      console.log("****Authority is set for Alice****");
      console.log(
        "----------------------------------------------------------------"
      );

      const tokenAccountInfo = await getAccount(connection, ataAlice.address);

      const balanceToken =
        tokenAccountInfo.amount / BigInt(Math.pow(10, decimals));
      console.log(
        "----------------------------------------------------------------"
      );
      console.log("⚖️  Initial Balance Token => " + balanceToken);
      console.log(
        "----------------------------------------------------------------"
      );
    } catch (err) {
      console.log(err);
    }

    let [tokenAccountOwnerPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("VAULT_MANAGER")],
      program.programId
    );
    console.log(
      "----------------------------------------------------------------"
    );
    console.log("TokenAccountOwnerPda => " + tokenAccountOwnerPda);
    console.log(
      "----------------------------------------------------------------"
    );

    let confirmOptions = {
      skipPreflight: true,
    };

    try {
      let initVaultTx = await program.methods
        .initialize()
        .accounts({
          tokenAccountOwnerPda: tokenAccountOwnerPda,
          signer: program.provider.publicKey,
        })
        .rpc(confirmOptions);

      await logTransaction(connection, initVaultTx);
    } catch (err) {
      console.log(err);
    }
  });

  it("🚀 Depositing Tokens", async () => {
    const pda = await getVaultPda(
      program,
      "VAULT_MANAGER_PDA_VAULT",
      mintAlice
    );

    let [tokenAccountOwnerPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("VAULT_MANAGER")],
      program.programId
    );

    let tx = await program.methods
      .deposit(new anchor.BN(3))
      .accounts({
        tokenAccountOwnerPda: tokenAccountOwnerPda,
        vault: pda.pubkey,
        signer: walletAlice.publicKey,
        mintAccount: mintAlice,
        senderTokenAccount: ataAlice.address,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([walletAlice])
      .rpc();
    console.log(
      "----------------------------------------------------------------"
    );
    console.log("🪙 Deposit +3 Tokens => https://solana.fm/tx/" + tx);
    console.log(
      "----------------------------------------------------------------"
    );
    console.log("");

    tx = await program.methods
      .deposit(new anchor.BN(2))
      .accounts({
        tokenAccountOwnerPda: tokenAccountOwnerPda,
        vault: pda.pubkey,
        signer: walletAlice.publicKey,
        mintAccount: mintAlice,
        senderTokenAccount: ataAlice.address,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([walletAlice])
      .rpc();
    console.log(
      "----------------------------------------------------------------"
    );
    console.log("🪙 Deposit 2 Tokens => https://solana.fm/tx/" + tx);
    console.log(
      "----------------------------------------------------------------"
    );
    console.log("");

    try {
      const tokenAccountInfo = await getAccount(connection, ataAlice.address);

      const balanceToken =
        tokenAccountInfo.amount / BigInt(Math.pow(10, decimals));
      console.log(
        "----------------------------------------------------------------"
      );
      console.log("⚖️  After Deposit Token Balance => " + balanceToken);
      console.log(
        "----------------------------------------------------------------"
      );
    } catch (err) {
      console.log(err);
    }
  });

  it("Withdrawing", async () => {
    const pda = await getVaultPda(
      program,
      "VAULT_MANAGER_PDA_VAULT",
      mintAlice
    );

    let [tokenAccountOwnerPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("VAULT_MANAGER")],
      program.programId
    );

    let tx = await program.methods
      .withdraw(new anchor.BN(2))
      .accounts({
        tokenAccountOwnerPda: tokenAccountOwnerPda,
        vault: pda.pubkey,
        receiverTokenAccount: ataAlice.address,
        signer: walletAlice.publicKey,
        mintAccount: mintAlice,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([walletAlice])
      .rpc();
    console.log(
      "----------------------------------------------------------------"
    );
    console.log("🪙 Withdrawing 2 Tokens => https://solana.fm/tx/" + tx);
    console.log(
      "----------------------------------------------------------------"
    );
    console.log("");

    try {
      const tokenAccountInfo = await getAccount(connection, ataAlice.address);

      const balanceToken =
        tokenAccountInfo.amount / BigInt(Math.pow(10, decimals));
      console.log(
        "----------------------------------------------------------------"
      );
      console.log("⚖️  After withdraw Token Balance => " + balanceToken);
      console.log(
        "----------------------------------------------------------------"
      );
    } catch (err) {
      console.log(err);
    }
  });
});

async function logTransaction(connection, txHash) {
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash();

  await connection.confirmTransaction({
    blockhash,
    lastValidBlockHeight,
    signature: txHash,
  });

  console.log(
    "----------------------------------------------------------------"
  );
  console.log(`https://explorer.solana.com/tx/${txHash}`);
  console.log(
    "----------------------------------------------------------------"
  );
}

async function getVaultPda(
  program: anchor.Program<VaultManager>,
  tag: String,
  mintAccount: { toBuffer: () => Uint8Array | Buffer }
) {
  const [pubKey, bump] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from(tag), mintAccount.toBuffer()],
    program.programId
  );

  let pda = {
    pubkey: pubKey,
    bump: bump,
  };

  return pda;
}
