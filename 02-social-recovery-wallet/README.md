# Social Recovery Wallet

## Overview

Social Recovery Wallet is a blockchain-based wallet recovery system developed using Solidity and Hardhat. The project aims to provide a secure recovery mechanism for cryptocurrency wallets without relying solely on a single private key.

Traditional wallets are vulnerable to permanent asset loss if the private key is forgotten, lost, or compromised. This project addresses that problem by introducing a guardian-based recovery model where trusted parties can collectively approve the transfer of wallet ownership.


## Objectives

The primary objectives of this project are:

- Eliminate dependence on a single private key.
- Provide a secure wallet recovery mechanism.
- Prevent permanent loss of wallet ownership.
- Improve security through distributed trust.
- Demonstrate a practical blockchain privacy solution.


## System Architecture

The system consists of the following components:

### Owner
The wallet owner who controls the wallet under normal circumstances.

### Guardians
Trusted addresses selected by the owner. Guardians participate in the recovery process.

### Recovery Process
A guardian can initiate a recovery request when the owner loses access to the wallet. Other guardians review and approve the request.

### Threshold Mechanism
Ownership is transferred only when the predefined approval threshold is reached.


## Features

- Guardian-based recovery system
- Multi-signature approval mechanism
- Ownership transfer functionality
- Configurable recovery threshold
- Secure recovery workflow
- Decentralized trust model
- Smart contract implementation in Solidity


## Technologies Used

| Technology | Purpose |
|------------|----------|
| Solidity 0.8.28 | Smart Contract Development |
| Hardhat 3 | Development Environment |
| TypeScript | Testing and Scripts |
| Ethers.js | Blockchain Interaction |
| Git & GitHub | Version Control |


## Project Structure

text 02-social-recovery-wallet │ ├── contracts │   └── SocialRecoveryWallet.sol │ ├── scripts │   └── demo.ts │ ├── test │   └── SocialRecoveryWallet.test.ts │ ├── hardhat.config.ts ├── package.json └── README.md 


## Recovery Workflow

1. The owner deploys the smart contract.
2. Trusted guardian addresses are registered.
3. A guardian initiates a recovery request.
4. Additional guardians approve the request.
5. Once the threshold is reached, ownership is transferred.
6. The new owner gains control of the wallet.


## Demonstration Results

The implemented demo successfully demonstrates:

- Smart contract deployment
- Guardian registration
- Recovery request creation
- Approval collection
- Threshold validation
- Ownership recovery

Example execution result:

text Guardian 1 starts recovery... Approval count: 1  Guardian 2 approves recovery...  Threshold reached. Recovered owner: 0x... 


## Privacy and Security Considerations

Conventional cryptocurrency wallets rely entirely on a single private key. If the key is lost, access to funds may become permanently unavailable.

The Social Recovery Wallet improves security and privacy by distributing recovery authority among trusted guardians. No private keys are shared during the recovery process, reducing the risk of unauthorized access while maintaining decentralization principles.


## Conclusion

This project demonstrates how blockchain technology can be used to implement a secure and privacy-preserving wallet recovery system. Through the use of trusted guardians and threshold approvals, the risk associated with private key loss is significantly reduced while maintaining user control and decentralization.


## Author

Zeynep Kızıltekin



