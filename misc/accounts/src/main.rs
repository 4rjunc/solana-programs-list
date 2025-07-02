use solana_sdk::signer::{Signer, keypair::Keypair};

#[tokio::main]
async fn main() {
    let keypair = Keypair::new();
    println!("Public Key: {}", keypair.pubkey());
    println!("Secret Key: {:?}", keypair.to_bytes());
}

