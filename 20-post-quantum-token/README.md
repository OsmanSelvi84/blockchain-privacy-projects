# Post-Quantum Token

A quantum-resistant, ERC-20-style token in which every transfer is authorized by
a Lamport one-time signature instead of ECDSA. Lamport signatures rely only on a
hash function, so they stay secure against quantum attacks: Shor's algorithm can
break ECDSA, but hash-based signatures are not affected. Because each Lamport key
can be used only once, every transfer rotates the sender to a fresh key.

- Course: COMP4052 - Introduction to Blockchain / DLT
- Topic: 20 - Post-Quantum Token
- Original implementation: Solidity (Foundry)
- Reference implementation: jondubois/simple-lamport (JavaScript)

## Repository and branch

- Repository: OsmanSelvi84/blockchain-privacy-projects
- Branch: students/220304038-ahmet-murat-sencay
- Project folder: 20-post-quantum-token

## How it works

1. Key generation (off-chain): the sender generates 256 pairs of random secret
   values (the private key). The public key is the SHA-256 hash of each secret.
   On-chain we store only keccak256(pk0 || pk1) - a 32-byte commitment.
2. Message: each transfer is bound to sha256(from, to, amount, nonce, nextCommit).
3. Signing (off-chain): for every bit of the message hash the sender reveals the
   matching secret (bit 0 -> sk0[i], bit 1 -> sk1[i]).
4. Verification (on-chain): the contract hashes each revealed secret and compares
   it with the stored public key for that bit. All 256 positions must match.
5. Key rotation: after a successful transfer the contract replaces the sender's
   commitment with nextCommit, so a used key can never sign again.

## Project structure

    20-post-quantum-token/
    |- src/PostQuantumToken.sol      # token + Lamport verifier (original implementation)
    |- test/PostQuantumToken.t.sol   # 6 Foundry tests
    |- reference/
    |  |- compare.js                 # harness that runs the reference implementation
    |  |- simple-lamport/            # reference implementation (cloned during setup)
    |- foundry.toml
    |- README.md

## Required tools

- Foundry (forge) - to build and test the contract: https://book.getfoundry.sh
- Node.js + npm - to run the reference implementation: https://nodejs.org

Install Foundry (if not already installed):

    curl -L https://foundry.paradigm.xyz | bash
    foundryup

## Installation

Clone the repository and switch to the project branch:

    git clone https://github.com/OsmanSelvi84/blockchain-privacy-projects.git
    cd blockchain-privacy-projects
    git checkout students/220304038-ahmet-murat-sencay
    cd 20-post-quantum-token

Install the Solidity test dependency:

    forge install foundry-rs/forge-std

Install the reference implementation:

    cd reference
    git clone https://github.com/jondubois/simple-lamport.git
    cd simple-lamport
    npm install
    cd ../..

## Build

    forge build

## Run and test

Run the full test suite (6 scenarios):

    forge test

Run a single scenario with your own inputs:

    AMOUNT=250 TAMPER=0 forge test --match-test test_Custom -vvv

Inputs for test_Custom (set as environment variables):

- SENDER_BALANCE - sender's starting balance (default 1000)
- AMOUNT - amount sent from ahmet to murat (default 100)
- TAMPER - 1 = corrupt the signature, 0 = valid (default 0)

Run the reference implementation:

    node reference/compare.js

## Sample inputs and outputs

The six tests in test/PostQuantumToken.t.sol are the project's sample inputs.
Each row is an input scenario and its expected output:

| # | Input scenario | Expected output |
|---|----------------|-----------------|
| 1 | Register ahmet with a key commitment and balance 1000 | balance = 1000, commitment stored, nonce = 0 |
| 2 | ahmet sends 100 to murat with a valid signature (nonce 0), rotating to a new key | ahmet = 900, murat = 100, key rotated, nonce = 1 |
| 3 | ahmet sends 100 to murat with a tampered signature | reverts: Invalid Lamport signature |
| 4 | ahmet (balance 50) sends 100 to murat | reverts: Insufficient balance |
| 5 | ahmet replays the same transfer with the old (rotated) key | reverts: Public key mismatch |
| 6 | Custom scenario driven by AMOUNT / TAMPER / SENDER_BALANCE | accepts or reverts depending on the inputs |

forge test output:

    Ran 6 tests for test/PostQuantumToken.t.sol:PostQuantumTokenTest
    [PASS] test_Custom() (gas: 4644370)
    [PASS] test_Register() (gas: 1913661)
    [PASS] test_ReplayAfterRotationFails() (gas: 4839943)
    [PASS] test_TransferInsufficientBalance() (gas: 4583029)
    [PASS] test_TransferInvalidSignature() (gas: 4198167)
    [PASS] test_TransferValid() (gas: 4635244)
    Suite result: ok. 6 passed; 0 failed; 0 skipped

Reference output (node reference/compare.js):

    === Reference (simple-lamport): Lamport signature behavior ===

      [PASS] Valid signature verifies  (got true, expected true)
      [PASS] Signature for another message rejected  (got false, expected false)
      [PASS] Modified message rejected  (got false, expected false)
      [PASS] Wrong public key rejected  (got false, expected false)

    Result: 4 passed, 0 failed.

## Reference vs. original comparison (Part A)

simple-lamport and this contract are two independent implementations of the same
Lamport scheme. Because Lamport uses random key generation, their raw outputs
(keys, signatures) are not byte-identical. The comparison is therefore at the
level of behavior / functional equivalence: for the same logical input, both
must make the same accept/reject decision.

Reference behavior (node reference/compare.js): a valid signature is accepted; a
signature for another message, a modified message, and a wrong public key are all
rejected.

Original behavior (forge test, and test_Custom for specific inputs):

    AMOUNT=250 TAMPER=0 forge test --match-test test_Custom -vvv   # valid -> transfer SUCCEEDED
    TAMPER=1 forge test --match-test test_Custom -vvv              # invalid -> reverts

| Input | Reference | This contract | Match |
|-------|-----------|---------------|-------|
| valid signature | accepted | transfer succeeds | yes |
| invalid signature | rejected | reverts "Invalid Lamport signature" | yes |

Both implementations accept valid signatures and reject invalid ones - i.e. they
are functionally equivalent.

## Limitations

- Lamport signatures are large (~8 KB per signature, ~16 KB per public key), so
  on-chain verification is gas-intensive. A production system would use a more
  compact scheme (e.g. Winternitz / WOTS+) or a Merkle-tree construction.
- Each key is one-time use; transfers require off-chain key generation and a
  fresh commitment every time.
- register is simplified for demonstration; a real token would control issuance.

## License

MIT
