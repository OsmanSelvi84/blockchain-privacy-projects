# Post Quantum Privacy Token

This project is a simple blockchain privacy project developed with Solidity and Hardhat.

The purpose of the project is to create a basic privacy-focused token system using hash commitments.

The project was developed for the Blockchain Privacy Projects course.

---

# Project Topic

20 - Post Quantum Token

---

# Project Features

- Basic token transfer
- Privacy transfer mechanism
- Commitment hash generation
- Local blockchain deployment
- Smart contract testing
- Simple frontend demo
- Reference implementation comparison

---

# Privacy Mechanism

In this project, transaction information is not stored directly on chain.

Instead, a commitment hash is created using:

- receiver address
- transfer amount
- secret string

The commitment is generated with `keccak256`.

Example:

```text
commitment = hash(receiver + amount + secret)
```

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
# Branch Information

20-post-quantum-token

# Installation

Clone repository:

```bash
git clone https://github.com/OsmanSelvi84/blockchain-privacy-projects.git
```

Checkout project branch:

```bash
git checkout students/210304037-efe-ozturk
```

project folder:
```bash
cd post-quantum-token
```

Install dependencies:
```bash
npm install
```

Compile Smart Contract
npx hardhat compile
Expected is Compiled succesfully

npx hardhat test
Expected is 3 passing 

Start Local Blockchain
npx hardhat node

Deploy Smart Contract
npx hardhat run scripts/deploy.js --network localhost
Expected output: Contract deployed to: 0x...

Frontend Demo
frontend/index.html

Smart Contract Functions
transfer()
createCommitment()
privateTransfer()


Reference Implementation
Reference project used for learning and comparison:

DDMixer

Repository:

https://github.com/alibertay/DDMixer

The reference implementation was:

* cloned locally
* dependency-installed
* executed successfully

Reference project technologies:

* Solidity
* Python
* Flask
* HTML
* JavaScript


Comparison
comparison/test-inputs.json
comparison/comparison.md

These files contain:
5 sample test inputs
implementation comparison
privacy mechanism explanations

Demo Flow

1.Compile smart contract
2.Run tests
3.Start local blockchain
4.Deploy smart contract
5.Open frontend demo
6.Generate commitment hash

Notes

This project is a simplified educational privacy token implementation.
The project was developed for learning blockchain privacy concepts and demonstrating privacy-preserving transaction logic.
This implementation is not intended for production use.
