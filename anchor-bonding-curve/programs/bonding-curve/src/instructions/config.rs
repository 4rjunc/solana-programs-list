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

    #[account(address = system_program::ID)]
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

        require!(
            !new_config.authority.eq(&Pubkey::default()),
            Error::UnauthorizedAddress
        );

        self.master_config.authority = new_config.authority;
        self.master_config.fee_recipient = new_config.fee_recipient;
        self.master_config.curve_limit = new_config.curve_limit;
        self.master_config.initial_real_token_reserve = new_config.initial_real_token_reserve;
        self.master_config.initial_virtual_sol_reserve = new_config.initial_virtual_sol_reserve;
        self.master_config.initial_virtual_token_reserve = new_config.initial_virtual_token_reserve;
        self.master_config.total_token_supply = new_config.total_token_supply;
        self.master_config.buy_fee_percentage = new_config.buy_fee_percentage;
        self.master_config.sell_fee_percentage = new_config.sell_fee_percentage;
        self.master_config.migration_fee_percentage = new_config.migration_fee_percentage;
        self.master_config.reserved = new_config.reserved;

        Ok(())
    }
}
