
import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  createTransferInstruction,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";
import bs58 from 'bs58';

// Configure these values
const TOKEN_MINT = new PublicKey("<YOUR_TOKEN_MINT_ADDRESS>");
const recipients = [
  { address: "<RECIPIENT_WALLET_ADDRESS>", amount: 0.05 }, // amount in tokens (not lamports)
  // Add more recipients as needed
];

async function airdropTokens(connection: Connection, senderKeypair: Keypair) {
  // First, get or create sender's token account
  const senderATA = await getOrCreateAssociatedTokenAccount(
    connection,
    senderKeypair, // payer
    TOKEN_MINT,
    senderKeypair.publicKey
  );

  for (const recipient of recipients) {
    try {
      const recipientPubkey = new PublicKey(recipient.address);

      // Get or create recipient's token account
      const recipientATA = await getOrCreateAssociatedTokenAccount(
        connection,
        senderKeypair, // payer for account creation
        TOKEN_MINT,
        recipientPubkey
      );

      // Create transfer instruction
      const transferIx = createTransferInstruction(
        senderATA.address,
        recipientATA.address,
        senderKeypair.publicKey,
        recipient.amount * 10 ** 9 // Assuming 9 decimals, adjust if different
      );

      // Send and confirm transaction
      const tx = new Transaction().add(transferIx);
      const signature = await sendAndConfirmTransaction(connection, tx, [
        senderKeypair,
      ]);

      console.log(`Sent ${recipient.amount} tokens to ${recipient.address}`);
      console.log(`Token Account: ${recipientATA.address.toString()}`);
      console.log(`Transaction: https://explorer.solana.com/tx/${signature}`);
    } catch (err) {
      console.error(`Failed to send to ${recipient.address}:`, err);
    }
  }
}

// Usage example
const connection = new Connection("<YOUR_HELIUS_ENDPOINT>");

// NEVER HARDCODE PRIVATE KEYS IN PRODUCTION!
// This is just for demonstration purposes
const secretKey = bs58.decode("<YOUR_BASE58_ENCODED_PRIVATE_KEY>");
const senderKeypair = Keypair.fromSecretKey(secretKey);

airdropTokens(connection, senderKeypair)
  .then(() => console.log("Airdrop complete!"))
  .catch(console.error);
