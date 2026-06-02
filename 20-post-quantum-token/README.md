# PostQuantumToken (PQT)

An educational implementation of a post-quantum resistant ERC-20 token on Ethereum, utilizing Lamport one-time signatures to protect against attacks from future quantum computers running Shor's algorithm.

## 📌 Overview

Traditional Ethereum transactions rely on ECDSA (secp256k1) signatures, which are theoretically vulnerable to quantum computing attacks. This project implements a hybrid architecture that supports:
1. **Standard Transfers (`transfer`)**: Fast, cheap, and uses native ECDSA. Vulnerable to quantum attacks.
2. **Quantum-Safe Transfers (`pqTransfer`)**: Gas-heavy, hash-based, and quantum-resistant. Uses Lamport one-time signatures.

**Note:** This project implements a *security* mechanism, not a *privacy* mechanism. All transaction details (sender, recipient, amount) remain publicly visible on the blockchain.

## 🏗 Architecture & Security Features

* **Lamport Signatures:** A hash-based cryptographic scheme relying on the one-wayness of `keccak256`, avoiding discrete logarithm vulnerabilities.
* **Gas-Optimized Commitments:** Instead of storing the full 16KB Lamport public key on-chain, the contract stores a 32-byte `keccak256` commitment of the user's current key.
* **Replay Protection:** The signed message payload includes `(sender, to, amount, nonce, chainId)`, preventing cross-chain and same-chain replay attacks.
* **Mandatory Key Rotation:** Lamport keys are **strictly one-time use**. The `pqTransfer` function enforces atomic key rotation by requiring a new public key commitment alongside the signature.
* **Signature Deduplication:** As a fail-safe alongside nonces, used signature hashes are permanently recorded to prevent reuse.

## ⚖️ Reference Implementation
* **Repository:** [Tetration-Lab/lamport-solidity](https://github.com/Tetration-Lab/lamport-solidity)
* **Comparison:** This project builds upon the reference's raw signature verification by adding a full ERC20 layer, gas-efficient state commitments, and cross-chain replay protection.

## 🚀 Prerequisites & Installation

1. **Node.js**: Ensure Node.js (>= 18.0.0) is installed.
2. **Clone the repository**:
   ```bash
   git clone <https://github.com/OsmanSelvi84/blockchain-privacy-projects/tree/students/220304142-waren-moudoumi-moustafa-konate/20-post-quantum-token>
   cd 20-post-quantum-token
