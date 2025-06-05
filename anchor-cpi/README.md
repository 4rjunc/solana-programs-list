# Cross Program Invocation (CPI)

![cpi](./diagram.png)

refers to action of one program invokes/calls the instructions of another program. Its like an api call to instructions of another program.

## Key Points
- CPI enable solana program to invoke instructions on another program 
- From caller program to callee program signer privilages are extended
- When CPI, program can sign on behalf of PDAs derived from their own program ID.
- only 4 program can be called in CPI call chain


### References 
- [1](https://solana.com/docs/core/cpi)
- [2](https://www.rareskills.io/post/cross-program-invocation)
- [3](https://www.anchor-lang.com/docs/basics/cpi)
- [4](https://github.com/priyanshpatel18/anchor-cpi)
