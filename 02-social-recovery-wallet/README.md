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

## Reference Implementation

A simplified reference implementation is included in this repository for comparison purposes.

Run Reference Implementation:

bash node reference-implementation/input-output-reference.cjs 

Run Original Implementation:

bash node scripts/input-output.cjs 

### Test Scenario

Input:

text 2 

Expected Output:

text Output: Recovery successful Owner changed to new owner 

Both implementations produce the same result for the same input.

### Comparison With My Implementation

Similarities:

- Both projects focus on social recovery concepts.
- Both projects aim to solve the private key loss problem.
- Both implementations use trusted participants during the recovery process.
- Both projects are blockchain-based wallet recovery solutions.

Differences:

- My implementation uses a guardian-based threshold approval mechanism.
- My project demonstrates a 2-of-3 guardian recovery scenario.
- My implementation focuses on simplicity and educational demonstration.
- My project includes a dedicated Hardhat demo script that shows the complete recovery workflow.

## Requirements

Before running the project, make sure the following software is installed:

- Node.js
- npm
- Git
- Hardhat

## Build and Run

### Install Dependencies

```bash
npm install
```

### Compile Smart Contracts

```bash
npx hardhat compile
```

### Run Demo

```bash
npx hardhat run scripts/demo.ts
```

### Run Tests

```bash
npx hardhat test
```

## Expected Demo Flow

1. Contract is deployed.
2. Original owner is displayed.
3. Guardian 1 starts recovery.
4. Guardian 2 approves recovery.
5. Threshold is reached.
6. Ownership is transferred to the new owner.

Expected result:

- Recovery process succeeds.
- New owner becomes the wallet owner.
## Interactive Demo

This project includes a simple terminal-based demonstration of the Social Recovery Wallet concept.

Run the demo:

```bash
node scripts/input-output.cjs
```

Example Input:

```text
2
```

Example Output:

```text
Social Recovery Wallet Demo
Enter guardian approval count: 2

Input: 2
Output: Recovery successful
Owner changed to new owner
```

Explanation:

- Threshold = 2 guardian approvals
- If approval count is greater than or equal to 2, recovery succeeds.
- Ownership is transferred to the new owner.
- If approval count is less than 2, recovery fails and ownership remains unchanged.
## Reference Implementation Demo

Run the reference implementation:

```bash
node reference-implementation/input-output-reference.cjs
```

Example Input:

```text
2
```

Expected Output:

```text
Output: Recovery successful
Owner changed to new owner
```

## Original Implementation Demo

Run the original implementation:

```bash
node scripts/input-output.cjs
```

Example Input:

```text
2
```

Expected Output:

```text
Output: Recovery successful
Owner changed to new owner
```

Both implementations produce the same result for the same input.
### Reference Setup

```bash
git clone https://github.com/ldsanchez/smart-contract-wallet-se.git

## Author

Zeynep Kızıltekin



