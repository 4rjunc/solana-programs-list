# Contributing to Solana Programs Collection

## Welcome Contributors!

We appreciate your interest in contributing to our Solana programs repository. This document provides guidelines to help you contribute effectively.

## Contribution Process

1. **Fork the Repository**

   - Create a personal fork of the repository
   - Clone your forked repository locally

2. **Branch Strategy**

   - Create a new branch for each program or feature or bugfix
   - Use a clear, descriptive branch name
   - Example: `program/anchor-counter-program` or `feature/add-counter-program` or `fix/anchor-deployment-script`

3. **Program Submission Guidelines**

### Program Structure Requirements

- Each program must be in its own directory
- For Anchor framework programs:
  - **Folder Naming**: Must be prefixed with `anchor-`
  - Example: `anchor-counterapp`, `anchor-escrow`
- For native Solana programs:
  - Use descriptive, lowercase names
  - Example: `native-token-vesting`, `native-nft-marketplace`
- For other framework use similar patterns:
  - `[frameworkname]-counterapp`
  - `steel-counterapp` or `poseidon-counterapp`

4. No need to update the table in `README.md`.

### Code Quality

- Include comprehensive README in each program directory
- Provide clear installation and usage instructions
- Write unit tests for your programs
- Follow Rust and Solana best practices
- Use appropriate error handling
- Include comments explaining complex logic

### Documentation

- Update the main README.md if adding a new program
- Provide a brief description of your program's purpose
- Include any blogs or documentations or videos you refered.

## Submission Checklist

### Before Submitting a Pull Request

- [ ] Program builds successfully
- [ ] All tests pass
- [ ] Code is well-documented
- [ ] Followed naming conventions
- [ ] Updated main README.md
- [ ] Added program-specific README

## Pull Request Process

1. Ensure your code follows the contribution guidelines
2. Update documentation accordingly
3. Include a clear description of changes
4. Link any related issues

## Code of Conduct

- Be respectful and constructive
- Help maintain a welcoming community
- Provide helpful and kind feedback

## Questions?

If you have questions about contributing, please open an issue or contact the repository maintainers.

**Happy Coding! 🚀**
