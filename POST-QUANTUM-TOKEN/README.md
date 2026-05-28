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
``
contracts/
test/
scripts/
frontend/
reference/
comparison/
README.md
```

*Branch:20-post-quantum-token

# Installation
Clone repository:
git clone <repository-link>

project folder:
cd post-quantum-token

Install dependencies:
npm install

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

Compile smart contract
Run tests
Start local blockchain
Deploy smart contract
Open frontend demo
Generate commitment hash

Notes

This project is a simplified educational privacy token implementation.
The project was developed for learning blockchain privacy concepts and demonstrating privacy-preserving transaction logic.
This implementation is not intended for production use.
