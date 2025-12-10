use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Unauthorized: Only authority can perform this action")]
    Unauthorized,
    #[msg("Invalid BPS value: must be between 0 and 10000")]
    InvalidBps,
    #[msg("Max LTV must be less than liquidation LTV")]
    MaxLtvMustBeLessThanLiquidationLtv,
    #[msg("Liquidation LTV must be greater than max LTV")]
    LiquidationLtvMustBeGreaterThanMaxLtv,
    #[msg("Liquidation bonus too high: max 20%")]
    LiquidationBonusTooHigh,
    #[msg("Min health factor too low: must be at least 100%")]
    MinHealthFactorTooLow,
    #[msg("Min health factor too high: max 200%")]
    MinHealthFactorTooHigh,
    #[msg("Borrow rate too high: max 50% APR")]
    BorrowRateTooHigh,
    #[msg("Invalid supply cap: must be greater than 0")]
    InvalidSupplyCap,
    #[msg("System is paused")]
    SystemPaused,
    #[msg("Invalid amount: must be greater than 0")]
    InvalidAmount,
    #[msg("Math overflow occurred")]
    MathOverflow,
    #[msg("Exceeds maximum LTV ratio")]
    ExceedsMaxLtv,
    #[msg("Supply cap exceeded")]
    SupplyCapExceeded,
    #[msg("Health factor too low")]
    HealthFactorTooLow,
    #[msg("Invalid price from oracle")]
    InvalidPrice,
    #[msg("Invalid timestamp")]
    InvalidTimestamp,
    #[msg("Position not active")]
    PositionNotActive,
    #[msg("Insufficient balance")]
    InsufficientBalance,
    #[msg("Insufficient collateral")]
    InsufficientCollateral,
    #[msg("Position not liquidatable - health factor above threshold")]
    PositionNotLiquidatable,
}
