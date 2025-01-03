use anchor_lang::prelude::*;

declare_id!("ADFXY6k9Gi5YHZaAnDWcJe17an4TepSqu1Ayoz12za3U");

#[program]
pub mod anchor_pda {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);

        let account_data = &mut ctx.accounts.pda_account;
        account_data.user = ctx.accounts.user.key();
        account_data.bump = ctx.bumps.pda_account;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(
    init,
    // seeds to derive pda
    seeds = [b"data", user.key().as_ref()],
    // use the canonical bump
    bump,
    payer = user,
    space = 8 + DataAccount::INIT_SPACE
)]
pub pda_account: Account<'info, DataAccount>,
    pub system_program: Program<'info, System>
}


#[account]
#[derive(InitSpace)]
pub struct DataAccount{
    pub user: Pubkey,
    pub bump: u8
}
