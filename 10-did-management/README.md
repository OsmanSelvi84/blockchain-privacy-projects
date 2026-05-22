# DID Management System

# Student Information
- **Name:** Angelica Mwinkeu Bankumuna
- **Student ID:** 220304129
- **Branch:** students/220304129-angelica-mwinkeu-bankumuna

# Project Description
A Decentralized Identifier DID Management System  using smart contracts. This project implements self-sovereign identity by allowing users to create, update, revoke, and resolve DIDs on the blockchain.

# Privacy Concept
Self-sovereign identity: the users own and control their identities without depending on a central authority.

# Reference Implementation
**Repository:** https://github.com/decentralized-identity/ethr-did-registry
**Description:** The Ethereum DID Registry by the Decentralized Identity Foundation — the industry standard DID registry smart contract.
**Setup:** I have checked their README for installation and execution steps.

# My Project Structure
10-did-management/
├── contracts/
│   └── DIDRegistry.sol       # Main smart contract
├── scripts/
│   └── deploy.js             # Deployment script
├── test/
│   └── DIDRegistry.test.ts   # Test file
├── hardhat.config.ts         # Hardhat configuration
├── package.json              # Dependencies
└── README.md                 

# Required Software
- Node.js v22+
- npm v10+
- Git

# Installation

## 1. Clone the repository
```bash
git clone https://github.com/OsmanSelvi84/blockchain-privacy-projects.git
cd blockchain-privacy-projects
git checkout students/220304129-angelica-mwinkeu-bankumuna
cd 10-did-management
```

### 2. Install dependencies
```bash
npm install
```

## Build / Compile
```bash
npx hardhat compile
```

## Run the Project

### Start local blockchain node
```bash
npx hardhat node
```

### Deploy the contract (in a new terminal)
```bash
npx hardhat run scripts/deploy.js
```

## Test
```bash
node --test test/DIDRegistry.test.ts
```

Expected output:
* create and resolve a DID
* update a DID
* revoke a DID
pass 3 / fail 0

## Smart Contract Features
- **createDID** — Register a new DID with a document
- **updateDID** — Update an existing DID document
- **revokeDID** — Revoke a DID permanently
- **resolveDID** — Look up a DID and retrieve its document
- **getDIDsByOwner** — List all DIDs owned by an address

## Sample Input/Output

### Create a DID
Input:  createDID("did:example:123", '{"name":"Angelica"}')
Output: DIDCreated event emitted

### Resolve a DID
Input:  resolveDID("did:example:123")
Output: (owner, document, created, updated, active)
