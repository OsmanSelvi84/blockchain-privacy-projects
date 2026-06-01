# Post-Quantum Token

A blockchain token transfer system using post-quantum cryptography (ML-DSA-65).
Original implementation is in Solidity, reference implementation is in Python.

## What is this?

This project implements a privacy-preserving token transfer mechanism
that is resistant to quantum computer attacks. Instead of classical
ECDSA signatures, it uses ML-DSA-65 (formerly Dilithium3), a
NIST-standardized post-quantum signature algorithm (FIPS 204).

Each token transfer is signed with ML-DSA-65 off-chain (Python),
and the signature validity is passed to the Solidity smart contract
which stores transfers in a hash chain.

## Reference Implementation

- Repository: https://github.com/GiacomoPope/dilithium-py
- Library: dilithium-py v1.4.0
- Description: Pure Python implementation of ML-DSA (FIPS 204)
- Run with: python3 reference_demo.py

## Requirements

- Ubuntu 20.04 or later
- Python 3.10 or later
- Node.js 18 or later
- pip, npm

## Installation

### Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/blockchain-privacy-projects.git
cd blockchain-privacy-projects
git checkout YOUR_BRANCH
cd 20-post-quantum-token
```

### Python setup (reference implementation)

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Solidity setup (original implementation)

```bash
npm install
npx hardhat compile
```

## Usage

### Run original implementation (Solidity)

```bash
npx hardhat run scripts/demo.js
```

### Generate key pairs (Python)

```bash
source venv/bin/activate
python3 keygen.py
```

### Run reference implementation (Python)

```bash
source venv/bin/activate
python3 reference_demo.py
```

## Test Scenarios

| Test | Description | Expected Result |
|------|-------------|-----------------|
| TEST 1 | Normal transfer | Alice 80, Bob 70 token |
| TEST 2 | Insufficient balance | Transfer rejected |
| TEST 3 | Chain transfer | Alice 95, Bob 50, Charlie 35 |
| TEST 4 | Fake signature | Rejected, system secure |
| TEST 5 | Multi-user transfer | Alice 60, Bob 55, Charlie 65 |

## Algorithm

- Signature: ML-DSA-65 (NIST FIPS 204, formerly Dilithium3)
- Original implementation: Solidity smart contract + Python off-chain signing
- Reference implementation: dilithium-py v1.4.0 (pure Python)
- Chain: keccak256 hash chain in Solidity, SHA-256 in Python

## Project Structure

```
20-post-quantum-token/
├── README.md                  # This file
├── requirements.txt           # Python dependencies
├── package.json               # Node.js dependencies
├── hardhat.config.js          # Hardhat configuration
├── contracts/
│   └── PQToken.sol            # Solidity smart contract
├── scripts/
│   └── demo.js                # 5 test scenarios (Solidity)
├── keygen.py                  # ML-DSA-65 key pair generation
├── pq_token.py                # Token transfer with hash chain
├── demo.py                    # 5 test scenarios (Python)
├── reference_demo.py          # 5 test scenarios (reference)
└── keys/                      # Generated key files
```
