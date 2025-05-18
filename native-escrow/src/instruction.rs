// instruction.rs defines the "API" of a program

pub enum EscrowInstruction {
    InitEscrow { amount: u64 },
}
