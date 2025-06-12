use borsh::{BorshDeserialize, BorshSerialize};

#[derive(BorshDeserialize, BorshSerialize, Debug)]
pub struct Student {
    pub name: String,
    pub reg_number: u8,
    pub sub: String,
}

impl Student {
    pub fn new(name: String, reg_number: u8, sub: String) -> Self {
        Student {
            name,
            reg_number,
            sub,
        }
    }
}
