# 16-cits-anonymous-attestation

## Goal

Implement a blockchain privacy mechanism using anonymous attestation principles.

## Project Overview

This project implements a simple anonymous attestation smart contract on Ethereum.

Instead of storing a secret directly on the blockchain, the contract stores only the cryptographic hash of the secret. Users can prove that they know the secret without revealing sensitive information on-chain.

## Smart Contract

The `AnonymousAttestation` contract:

* Stores a secret hash during deployment
* Verifies user-provided secrets
* Uses `keccak256` hashing
* Emits an event when a valid attestation is performed

## How It Works

1. A secret is selected.
2. The secret is hashed using `keccak256`.
3. The hash is stored in the smart contract.
4. A user submits a secret.
5. The contract hashes the submitted value and compares it with the stored hash.
6. If the hashes match, the attestation succeeds.

## Compilation

```bash
npx hardhat compile
```

## Deployment

```bash
npx hardhat run scripts/deploy.ts
```

## Privacy Mechanism

The original secret is never stored on-chain.

Only the cryptographic hash is stored, providing a basic privacy-preserving attestation mechanism while allowing verification of knowledge of the secret.

## Technologies Used

* Solidity 0.8.28
* Hardhat 3
* TypeScript

## Author

Furkan Alkin Selim
