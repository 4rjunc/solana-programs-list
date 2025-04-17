#![no_std]

#[cfg(not(feature = "no-entrypoint"))]
mod entrypoint;

#[cfg(feature = "std")]
extern crate std;

pub mod errors;
pub mod instructions;
pub mod states;

// build the program once while setting up pinocchio project and replace this address with the keypair's address in
// target/ folder
pinocchio_pubkey::declare_id!("5sZhoPJzVbvfik76odGeYmPLZy3veQJEPk8FnnhkeeUc");
