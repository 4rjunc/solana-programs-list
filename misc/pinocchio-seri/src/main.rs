use solana_program::{
    account_info::AccountInfo,
    instruction::{AccountMeta, Instruction},
    program::{invoke, invoke_signed},
    program_error::ProgramResult,
    pubkey::Pubkey,
};

// The trait definitions
pub trait InstructionData<const N: usize> {
    fn serialize(&self) -> [u8; N];
    fn discriminator() -> u8;
}

pub trait InstructionAccounts {
    fn account_metas(&self) -> Vec<AccountMeta>;
    fn account_infos(&self) -> Vec<&AccountInfo>;
}

// Example: Token Transfer instruction
pub struct Transfer<'a> {
    pub from: &'a AccountInfo<'a>,
    pub to: &'a AccountInfo<'a>,
    pub authority: &'a AccountInfo<'a>,
    pub amount: u64,
}

// Implementation for Transfer - const generic N=9 because:
// - 1 byte for discriminator
// - 8 bytes for u64 amount
impl InstructionData<9> for Transfer<'_> {
    fn serialize(&self) -> [u8; 9] {
        let mut data = [0u8; 9];
        data[0] = Self::discriminator(); // First byte: discriminator
        data[1..9].copy_from_slice(&self.amount.to_le_bytes()); // Next 8 bytes: amount
        data
    }

    fn discriminator() -> u8 {
        3 // SPL Token Transfer instruction discriminator
    }
}

impl InstructionAccounts for Transfer<'_> {
    fn account_metas(&self) -> Vec<AccountMeta> {
        vec![
            AccountMeta::writable(self.from.key()), // Source account (writable)
            AccountMeta::writable(self.to.key()),   // Destination account (writable)
            AccountMeta::readonly_signer(self.authority.key()), // Authority (signer)
        ]
    }

    fn account_infos(&self) -> Vec<&AccountInfo> {
        vec![self.from, self.to, self.authority]
    }
}

// Main implementation with both old and new approaches
impl Transfer<'_> {
    // Original approach - direct CPI call
    pub fn invoke(&self) -> ProgramResult {
        self.invoke_signed(&[])
    }

    pub fn invoke_signed(&self, signers: &[&[&[u8]]]) -> ProgramResult {
        // Build instruction using the new traits
        let instruction_data = self.serialize();
        let account_metas = self.account_metas();
        let account_infos = self.account_infos();

        let instruction = Instruction {
            program_id: spl_token::ID,
            accounts: account_metas,
            data: instruction_data.to_vec(),
        };

        invoke_signed(&instruction, &account_infos, signers)
    }

    // New approach - for testing and flexibility
    pub fn as_instruction(&self) -> (Vec<AccountMeta>, [u8; 9]) {
        (self.account_metas(), self.serialize())
    }

    // Helper method to build complete Instruction
    pub fn to_instruction(&self) -> Instruction {
        let (accounts, data) = self.as_instruction();
        Instruction {
            program_id: spl_token::ID,
            accounts,
            data: data.to_vec(),
        }
    }
}

// Example: More complex instruction - Transfer with memo
pub struct TransferWithMemo<'a> {
    pub from: &'a AccountInfo<'a>,
    pub to: &'a AccountInfo<'a>,
    pub authority: &'a AccountInfo<'a>,
    pub amount: u64,
    pub memo: &'a str,
}

// For variable-length data, we can use a different approach
impl InstructionData<256> for TransferWithMemo<'_> {
    // Max 256 bytes
    fn serialize(&self) -> [u8; 256] {
        let mut data = [0u8; 256];
        data[0] = Self::discriminator();
        data[1..9].copy_from_slice(&self.amount.to_le_bytes());

        // Add memo length and content
        let memo_bytes = self.memo.as_bytes();
        let memo_len = memo_bytes.len().min(246); // Max 246 bytes for memo
        data[9] = memo_len as u8;
        data[10..10 + memo_len].copy_from_slice(&memo_bytes[..memo_len]);

        data
    }

    fn discriminator() -> u8 {
        4
    } // Different discriminator
}

impl InstructionAccounts for TransferWithMemo<'_> {
    fn account_metas(&self) -> Vec<AccountMeta> {
        vec![
            AccountMeta::writable(self.from.key()),
            AccountMeta::writable(self.to.key()),
            AccountMeta::readonly_signer(self.authority.key()),
        ]
    }

    fn account_infos(&self) -> Vec<&AccountInfo> {
        vec![self.from, self.to, self.authority]
    }
}

// Testing utilities
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_transfer_serialization() {
        // Mock account infos for testing
        let from_key = Pubkey::new_unique();
        let to_key = Pubkey::new_unique();
        let authority_key = Pubkey::new_unique();

        // Create mock AccountInfo structs (simplified for example)
        let from_account = create_mock_account_info(&from_key);
        let to_account = create_mock_account_info(&to_key);
        let authority_account = create_mock_account_info(&authority_key);

        let transfer = Transfer {
            from: &from_account,
            to: &to_account,
            authority: &authority_account,
            amount: 1000000, // 1 token (6 decimals)
        };

        // Test serialization
        let data = transfer.serialize();
        assert_eq!(data.len(), 9);
        assert_eq!(data[0], 3); // Discriminator
        assert_eq!(u64::from_le_bytes(data[1..9].try_into().unwrap()), 1000000);

        // Test account metas
        let account_metas = transfer.account_metas();
        assert_eq!(account_metas.len(), 3);
        assert_eq!(account_metas[0].pubkey, from_key);
        assert!(account_metas[0].is_writable);
        assert_eq!(account_metas[1].pubkey, to_key);
        assert!(account_metas[1].is_writable);
        assert_eq!(account_metas[2].pubkey, authority_key);
        assert!(account_metas[2].is_signer);

        // Test complete instruction building
        let instruction = transfer.to_instruction();
        assert_eq!(instruction.program_id, spl_token::ID);
        assert_eq!(instruction.accounts, account_metas);
        assert_eq!(instruction.data, data.to_vec());
    }

    fn create_mock_account_info(key: &Pubkey) -> AccountInfo {
        // Simplified mock - in real tests you'd use proper mocking
        AccountInfo::new(
            key,
            false,
            false,
            &mut 0,
            &mut [],
            &Pubkey::default(),
            false,
            0,
        )
    }
}

// Example usage in a program
pub fn process_transfer(accounts: &[AccountInfo], amount: u64) -> ProgramResult {
    let transfer = Transfer {
        from: &accounts[0],
        to: &accounts[1],
        authority: &accounts[2],
        amount,
    };

    // Option 1: Direct invoke
    transfer.invoke()?;

    // Option 2: Get instruction parts for custom handling
    let (account_metas, data) = transfer.as_instruction();
    // ... custom logic with account_metas and data

    Ok(())
}

// Cross-library compatibility example
pub fn compare_with_anchor(transfer: &Transfer) -> bool {
    // Get Pinocchio instruction data
    let (pinocchio_accounts, pinocchio_data) = transfer.as_instruction();

    // Build equivalent Anchor instruction
    let anchor_instruction = anchor_spl::token::Transfer {
        from: transfer.from.key(),
        to: transfer.to.key(),
        authority: transfer.authority.key(),
    };

    // Compare serialized data (pseudo-code)
    // let anchor_data = anchor_instruction.data();
    // pinocchio_data.to_vec() == anchor_data

    true // Placeholder
}

