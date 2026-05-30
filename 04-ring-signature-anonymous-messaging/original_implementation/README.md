# Original Implementation

This folder contains my original implementation of the Ring Signature Anonymous Messaging project.

## Overview

The purpose of this application is to demonstrate how ring signatures can be used for anonymous message signing and verification.

While working on the project, I used the pyring reference implementation to better understand how one time ring signatures work in practice. After testing the reference project, I created a separate menu-based application that makes it easier to sign and verify messages.

The application also demonstrates message integrity. If a message is changed after it has been signed, verification fails because the generated hash value is different from the original one.

## Features

* Anonymous message signing
* One-time ring signature generation using `pyring`
* Ring signature verification using `pyring`
* SHA-256 message hashing
* Message integrity verification
* Ring member information display
* Signature metadata generation
* Terminal menu interface
* Signer anonymity preservation
* Blockchain integration through a Solidity smart contract

## How to Run

Run the application:

```bash
python3 main.py
```

## Menu

```text
1. Send anonymous message
2. Verify signature
3. Show ring information
4. Exit
```

## Example

Example message:

```text
Blockchain privacy is important
```

Example verification result:

```text
Valid ring signature.
The message was signed by one of the ring members.
Exact signer identity remains anonymous.
```

If the message is modified after signing, verification will fail.

## Implementation Details

The implementation uses the same `pyring` one-time ring signature algorithm as the reference implementation.

During signing:

* the message is converted into bytes,
* ring member public keys are loaded,
* the signer private key is converted into a scalar,
* the `ring_sign()` function generates the ring signature,
* the signature is saved as `signature.pem`.

During verification:

* the signature is loaded from `signature.pem`,
* the `ring_verify()` function checks the signature,
* the verifier can confirm that the signature belongs to a member of the ring,
* the exact signer cannot be identified.

The application also creates a metadata file named `signature_metadata.json`.

The metadata contains:

* message hash,
* ring size,
* verification result,
* timestamp.

The signer identity is not stored in any output file.

## Solidity Integration

The project includes a simple Solidity smart contract:

```text
contracts/AnonymousMessageRegistry.sol
```

The contract can store verification-related information such as:

* message hash,
* verification status,
* timestamp.

The signer identity is intentionally not stored on-chain.

## Note

This implementation was developed as part of the Blockchain Privacy Projects course and is intended for educational purposes.

