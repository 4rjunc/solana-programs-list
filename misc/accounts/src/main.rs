use anyhow::{Ok, Result};
use solana_client::nonblocking::rpc_client::RpcClient;
use solana_sdk::{
    commitment_config::CommitmentConfig,
    native_token::LAMPORTS_PER_SOL,
    pubkey,
    pubkey::Pubkey,
    signer::{Signer, keypair::Keypair},
    sysvar,
};

#[tokio::main]
async fn main() -> Result<()> {
    // Most Solana accounts use an Ed25519 public key as their address.
    let keypair = Keypair::new();
    println!("Public Key: {}", keypair.pubkey());
    println!("Secret Key: {:?}", keypair.to_bytes());

    // PDAs
    let program_address = pubkey!("11111111111111111111111111111111");
    let seeds = [b"imseed".as_ref()];
    let (pda, bump) = Pubkey::find_program_address(&seeds, &program_address);
    println!("PDA: {}", pda);
    println!("Bump: {}", bump);

    // Account Struct / Account Type
    let connection = RpcClient::new_with_commitment(
        "https://localhost:8899".to_string(),
        CommitmentConfig::confirmed(),
    );

    let signature = connection
        .request_airdrop(&keypair.pubkey(), LAMPORTS_PER_SOL)
        .await?;
    connection.confirm_transaction(&signature).await?;

    let account_info = connection.get_account(&keypair.pubkey()).await?;
    println!("{:#?}", account_info);

    let connection = RpcClient::new_with_commitment(
        "https://api.mainnet-beta.solana.com".to_string(),
        CommitmentConfig::confirmed(),
    );

    let account_info = connection.get_account(&sysvar::clock::ID).await?;
    println!("{:#?}", account_info);

    let program_id = pubkey!("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");

    let account_info = connection.get_account(&program_id).await?;
    println!("{:#?}", account_info);

    Ok(())
}

