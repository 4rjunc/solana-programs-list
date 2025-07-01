import { Keypair, PublicKey, sendAndConfirmTransaction, SystemProgram, SYSVAR_RENT_PUBKEY, Transaction, TransactionInstruction, SYSVAR_INSTRUCTIONS_PUBKEY } from "@solana/web3.js";
import { MPL_TOKEN_METADATA_PROGRAM_ID } from '@metaplex-foundation/mpl-token-metadata';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { start } from 'solana-bankrun';
import { describe, test } from "bun:test";
import * as borsh from 'borsh';

class Assignable {
  constructor(properties: any) {
    for (const [key, value] of Object.entries(properties)) {
      this[key] = value;
    }
  }
}

class CreateTokenArgs extends Assignable {
  toBuffer() {
    return Buffer.from(borsh.serialize(CreateTokenArgsSchema, this));
  }
}
const CreateTokenArgsSchema = new Map([
  [
    CreateTokenArgs,
    {
      kind: 'struct',
      fields: [
        ['title', 'string'],
        ['symbol', 'string'],
        ['uri', 'string'],
        ['decimals', 'u8'],
      ],
    },
  ],
]);

describe(("Tokens!"), async () => {

  const PROGRAM_ID = new PublicKey("5ECVZ7mxvdftWR9SEVZKGNWdG5Sqdn7qF2wxenxkDLJo");
  const context = await start([{ name: 'create_token', programId: PROGRAM_ID }, {
    name: 'mpl_token_metadata',
    programId: new PublicKey(MPL_TOKEN_METADATA_PROGRAM_ID),
  },], [])
  const client = context.banksClient;
  const payer = context.payer;

  test("Create Mint Account", async () => {
    const mint_account = new Keypair();

    const data = new CreateTokenArgs({
      title: 'Solana Gold',
      symbol: 'GOLDSOL',
      uri: 'https://raw.githubusercontent.com/solana-developers/program-examples/new-examples/tokens/tokens/.assets/spl-token.json',
      decimals: 9,
    });

    const [metadataAddress, bump] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        new PublicKey(MPL_TOKEN_METADATA_PROGRAM_ID).toBuffer(),
        mint_account.publicKey.toBuffer()
      ],
      new PublicKey(MPL_TOKEN_METADATA_PROGRAM_ID)
    );

    const ix = new TransactionInstruction({
      keys: [
        { pubkey: mint_account.publicKey, isSigner: true, isWritable: true },
        { pubkey: payer.publicKey, isSigner: false, isWritable: true },
        { pubkey: metadataAddress, isSigner: false, isWritable: true },
        { pubkey: payer.publicKey, isSigner: true, isWritable: true },
        { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: new PublicKey(MPL_TOKEN_METADATA_PROGRAM_ID), isSigner: false, isWritable: false },
        { pubkey: new PublicKey(SYSVAR_INSTRUCTIONS_PUBKEY), isSigner: false, isWritable: false }
      ],
      programId: PROGRAM_ID,
      data: data.toBuffer()
    })

    const tx = new Transaction();
    tx.recentBlockhash = context.lastBlockhash;
    tx.add(ix).sign(payer, mint_account);

    await client.processTransaction(tx);
  });

})
