use anchor_lang::prelude::*;

#[error_code]
pub enum Error {
    #[msg("Unauthorized address")]
    UnauthorizedAddress,
}
