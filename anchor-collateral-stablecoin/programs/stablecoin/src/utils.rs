use crate::error::ErrorCode;
use anchor_lang::prelude::*;

pub fn calculate_collateral_value(
    collateral_amount: u64,
    price: i64,
    exponent: i32,
) -> Result<u64> {
    require!(price > 0, ErrorCode::InvalidPrice);

    let price_u64 = price as u64;
    let raw_value = (collateral_amount as u128)
        .checked_mul(price_u64 as u128)
        .ok_or(ErrorCode::MathOverflow)?;

    let adjusted_value = if exponent < 0 {
        let divisor = 10u128.pow(exponent.abs() as u32);
        raw_value
            .checked_div(divisor)
            .ok_or(ErrorCode::MathOverflow)?
    } else {
        let multiplier = 10u128.pow(exponent as u32);
        raw_value
            .checked_mul(multiplier)
            .ok_or(ErrorCode::MathOverflow)?
    };

    u64::try_from(adjusted_value).map_err(|_| ErrorCode::MathOverflow.into())
}

pub fn calculate_max_borrowable_amount(collateral_value_usd: u64, max_ltv_bps: u16) -> Result<u64> {
    let max_borrowable = (collateral_value_usd as u128)
        .checked_mul(max_ltv_bps as u128)
        .ok_or(ErrorCode::MathOverflow)?
        .checked_div(10000)
        .ok_or(ErrorCode::MathOverflow)?;

    u64::try_from(max_borrowable).map_err(|_| ErrorCode::MathOverflow.into())
}

pub fn accrue_interest(
    current_debt: u64,
    borrow_rate_bps: u16,
    last_update_timestamp: i64,
    current_timestamp: i64,
) -> Result<u64> {
    if current_debt == 0 {
        return Ok(0);
    }

    let time_elapsed = current_timestamp
        .checked_sub(last_update_timestamp)
        .ok_or(ErrorCode::InvalidTimestamp)? as u64;

    if time_elapsed == 0 {
        return Ok(current_debt);
    }

    const SECONDS_PER_YEAR: u64 = 31_557_600;

    let interest = (current_debt as u128)
        .checked_mul(borrow_rate_bps as u128)
        .ok_or(ErrorCode::MathOverflow)?
        .checked_mul(time_elapsed as u128)
        .ok_or(ErrorCode::MathOverflow)?
        .checked_div(10000)
        .ok_or(ErrorCode::MathOverflow)?
        .checked_div(SECONDS_PER_YEAR as u128)
        .ok_or(ErrorCode::MathOverflow)?;

    let interest_u64 = u64::try_from(interest).map_err(|_| ErrorCode::MathOverflow)?;

    current_debt
        .checked_add(interest_u64)
        .ok_or(ErrorCode::MathOverflow.into())
}

pub fn calculate_health_factor(
    collateral_value_usd: u64,
    debt: u64,
    liquidation_ltv_bps: u16,
) -> Result<u16> {
    if debt == 0 {
        return Ok(u16::MAX);
    }

    let numerator = (collateral_value_usd as u128)
        .checked_mul(liquidation_ltv_bps as u128)
        .ok_or(ErrorCode::MathOverflow)?;

    let health_factor = numerator
        .checked_div(debt as u128)
        .ok_or(ErrorCode::MathOverflow)?;

    let health_factor_u16: u16 = if health_factor > u16::MAX as u128 {
        u16::MAX
    } else {
        health_factor as u16
    };

    Ok(health_factor_u16)
}

pub fn calculate_liquidation_amounts(
    debt: u64,
    collateral_amount: u64,
    liquidation_bonus_bps: u16,
    collateral_price: i64,
    price_exponent: i32,
) -> Result<(u64, u64)> {
    let collateral_value =
        calculate_collateral_value(collateral_amount, collateral_price, price_exponent)?;

    let debt_with_bonus = (debt as u128)
        .checked_mul((10000u16.checked_add(liquidation_bonus_bps).ok_or(ErrorCode::MathOverflow)?) as u128)
        .ok_or(ErrorCode::MathOverflow)?
        .checked_div(10000)
        .ok_or(ErrorCode::MathOverflow)?;

    let collateral_to_seize = debt_with_bonus
        .checked_mul(collateral_amount as u128)
        .ok_or(ErrorCode::MathOverflow)?
        .checked_div(collateral_value as u128)
        .ok_or(ErrorCode::MathOverflow)?;

    let collateral_to_seize_u64 =
        u64::try_from(collateral_to_seize).map_err(|_| ErrorCode::MathOverflow)?;

    let collateral_to_seize_final = collateral_to_seize_u64.min(collateral_amount);
    let remaining_collateral = collateral_amount
        .checked_sub(collateral_to_seize_final)
        .ok_or(ErrorCode::MathOverflow)?;

    Ok((collateral_to_seize_final, remaining_collateral))
}
