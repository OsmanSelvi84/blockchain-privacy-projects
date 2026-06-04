# Post Quantum Privacy Token

This project was developed for the Blockchain Privacy Projects course.

The goal of the project is to demonstrate a simple privacy-preserving token mechanism using commitment hashes generated with Solidity and Hardhat.

---

# Project Topic

**20 - Post Quantum Token**

---

# Project Description

The project generates commitment hashes instead of storing transaction details directly.

Each commitment is generated using:

- receiver address
- transfer amount
- secret value

The commitment is calculated using:

```solidity
keccak256(abi.encodePacked(receiver, amount, secret))
```

This allows transaction information to be represented through a cryptographic hash.

---

# Project Features

- Token transfer functionality
- Commitment hash generation
- Privacy transfer mechanism
- Smart contract testing
- Frontend demonstration
- Reference implementation comparison

---

# Folder Structure

```text
contracts/
test/
scripts/
frontend/
reference/
comparison/
README.md
```

---

# Branch Information

```text
students/210304037-efe-ozturk
```

Project directory:

```text
POST-QUANTUM-TOKEN
```

---

# Required Software

- Node.js
- npm
- Hardhat

Check installation:

```bash
node -v
npm -v
```

---

# Installation

Clone repository:

```bash
git clone https://github.com/OsmanSelvi84/blockchain-privacy-projects.git
```

Enter repository:

```bash
cd blockchain-privacy-projects
```

Checkout student branch:

```bash
git checkout students/210304037-efe-ozturk
```

Enter project directory:

```bash
cd POST-QUANTUM-TOKEN
```

Install dependencies:

```bash
npm install
```

---

# Compile Smart Contract

```bash
npx hardhat compile
```

Expected output:

```text
Compiled successfully
```

---

# Run Tests

```bash
npx hardhat test
```

Expected output:

```text
3 passing
```

---

# Start Local Blockchain

```bash
npx hardhat node
```

---

# Deploy Smart Contract

Open a new terminal:

```bash
npx hardhat run scripts/deploy.js --network localhost
```

Expected output:

```text
Contract deployed to: 0x...
```

---

# Frontend Demo

Frontend file:

```text
frontend/index.html
```

The frontend allows users to:

- enter receiver address
- enter transfer amount
- enter secret value
- generate commitment hashes

---

# Smart Contract Functions

## transfer()

Transfers tokens between users.

## createCommitment()

Creates a commitment hash using:

```text
receiver
amount
secret
```

Returns:

```text
bytes32 commitment
```

## privateTransfer()

Stores and validates commitment-based transfers.

---

# Reference Implementation

Reference file:

```text
reference/reference_demo.js
```

Technology:

- Node.js
- Ethers.js

Run reference implementation:

```bash
node reference/reference_demo.js
```

The reference implementation generates commitment hashes using:

```javascript
ethers.solidityPackedKeccak256(
  ["address", "uint256", "string"],
  [receiver, amount, secret]
)
```

This is equivalent to:

```solidity
keccak256(
    abi.encodePacked(
        receiver,
        amount,
        secret
    )
)
```

used in the original implementation.

---

# Original Implementation Demo

Run original implementation:

```bash
npx hardhat run scripts/scripts/demo.js
```

The original Solidity implementation executes the same five test cases and generates commitment hashes.

---


# Comparison

Files:

```text
comparison/comparison.md
comparison/test-inputs.json
```

Comparison Method:

1. Run reference implementation
2. Run original implementation
3. Compare outputs
4. Verify matching commitment hashes

Result:

```text
All five test cases generate identical commitment hashes.
```

---

# Demo Flow

1. Install dependencies
2. Compile smart contract
3. Run tests
4. Run reference implementation
5. Run original implementation
6. Compare outputs
7. Open frontend demo

---

# Commands Used During Evaluation

Reference implementation:

```bash
node reference/reference_demo.js
```

Original implementation:

```bash
npx hardhat run scripts/scrpits/demo.js
```

Tests:

```bash
npx hardhat test
```

---

# Notes

This project was developed for educational purposes.

The implementation demonstrates:

- commitment hashes
- privacy-preserving transaction representation
- Solidity smart contract development
- Hardhat testing
- reference implementation comparison

This project is not intended for production use.
