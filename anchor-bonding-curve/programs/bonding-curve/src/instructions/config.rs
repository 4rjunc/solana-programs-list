use crate::{
    errors::Error,
    states::{Config, ConfigSettings},
};
use anchor_lang::{prelude::*, system_program};

#[derive(Accounts)]
pub struct Configure<'info> {
    #[account(mut)]
    admin: Signer<'info>,

    #[account(
        init_if_needed,
        payer = admin,
        seeds = [Config::SEED_PREFIX.as_bytes()],
        space = 8 + Config::INIT_SPACE,
        bump
    )]
    master_config: Account<'info, Config>,

    system_program: Program<'info, System>,
}

impl<'info> Configure<'info> {
    pub fn process(&mut self, new_config: ConfigSettings) -> Result<()> {
        if self.master_config.authority.eq(&Pubkey::default()) {
            self.master_config.authority = self.admin.key()
        } else {
            require!(
                self.master_config.authority == self.admin.key(),
                Error::UnauthorizedAddress
            )
        }

        Ok(())
    }
}
