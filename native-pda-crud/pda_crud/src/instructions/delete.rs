use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    pubkey::Pubkey,
    rent::Rent,
    sysvar::Sysvar,
};

pub fn delete(_program_id: &Pubkey, accounts: &[AccountInfo]) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();
    let message_account = next_account_info(accounts_iter)?;
    let payer = next_account_info(accounts_iter)?;
    let system_program = next_account_info(accounts_iter)?;

    let account_span = 0usize;
    let lamports_required = (Rent::get()?).minimum_balance(account_span);

    let diff = message_account.lamports() - lamports_required;

    // sent lamports back to payer
    // The code uses direct lamport manipulation instead of system_instruction::transfer for several important reasons:
    // Performance & Efficiency
    // Direct manipulation is cheaper (fewer compute units)
    // No need to invoke another program (System Program)
    // Avoids Cross-Program Invocation (CPI) overhead
    // The account being closed is owned by your program, so you can directly modify its lamports
    **message_account.lamports.borrow_mut() -= diff;
    **payer.lamports.borrow_mut() += diff;

    //Realloc the account to zero
    message_account.resize(account_span)?;

    //assign program to system account
    message_account.assign(system_program.key);

    Ok(())
}
