# Ring Signature Anonymous Messaging

## Project Overview

This project focuses on anonymous message signing using ring signatures.

Ring signatures are commonly used in privacy-focused blockchain systems such as Monero. The main idea is that a message can be signed by one member of a group while keeping the actual signer anonymous.

To better understand this concept, I first examined the open-source `pyring` project and then developed my own application using the same ring signature algorithm.

The project also demonstrates message integrity. If a signed message is modified, the original signature can no longer be verified successfully.

## Privacy Concept

The privacy feature used in this project is signer anonymity.

Unlike traditional digital signatures, ring signatures allow verification without revealing which member of the group created the signature.

The verifier can confirm that a valid member signed the message, but cannot determine the exact signer.

## Requirements

The project was tested on Ubuntu 24.04 with Python 3.

Required packages:

```bash
sudo apt update

sudo apt install -y \
python3 \
python3-pip \
python3-venv \
python3-dev \
python3-setuptools \
python3-wheel \
python3-pyasn1 \
build-essential \
git \
libsodium-dev \
libffi-dev
```

## Clone and Open the Project

```bash
git clone https://github.com/OsmanSelvi84/blockchain-privacy-projects.git

cd blockchain-privacy-projects

git checkout students/210304030-zeynep-ince

cd 04-ring-signature-anonymous-messaging
```

## Project Structure

```text
04-ring-signature-anonymous-messaging/
│
├── original_implementation/
│   ├── main.py
│   ├── ring_app.py
│   ├── requirements.txt
│   └── README.md
│
├── reference_implementation/
│   └── pyring/
│
├── contracts/
│   └── AnonymousMessageRegistry.sol
│
├── .gitignore
└── README.md
```

## Reference Implementation

Reference project:

https://github.com/bartvm/pyring

The reference implementation provides a working one-time ring signature system and was used to study the signing and verification process.

### Running the Reference Implementation

Navigate to the reference implementation folder:

```bash
cd reference_implementation/pyring
```

Build and install the project:

```bash
python3 setup.py build
sudo python3 setup.py develop
```

Generate the first ring member:

```bash
ring-keygen
```

Create:

```text
ringkey
ringkey.pub
```

Generate the second ring member:

```bash
ring-keygen
```

Create:

```text
bobkey
bobkey.pub
```

Create a sample message:

```bash
echo "This is a test message." > message.txt
```

Generate a ring signature:

```bash
ring-sign --password 1234 message.txt ringkey ringkey.pub bobkey.pub > ring.sig
```

Verify the signature:

```bash
ring-verify message.txt - < ring.sig
```

Expected output:

```text
Valid ring signature.
```

## Original Implementation

The original implementation is a Python-based anonymous messaging application.

To make testing easier, I created a simple menu-based interface for signing and verifying messages.

The application uses the same ring signature algorithm as the reference implementation and demonstrates:

* anonymous signing
* signature verification
* signer anonymity
* message integrity verification

### Features

* Anonymous message signing
* One-time ring signature generation using `pyring`
* Ring signature verification using `pyring`
* SHA-256 message hashing
* Message integrity verification
* Ring member information display
* Signature metadata generation
* Menu-based terminal interface
* Blockchain integration through a Solidity smart contract

### Running the Original Implementation

```bash
cd original_implementation

python3 main.py
```

Menu:

```text
1. Send anonymous message
2. Verify signature
3. Show ring information
4. Exit
```

Generated files:

```text
signature.pem
signature_metadata.json
```

Example verification output:

```text
Valid ring signature.
The message was signed by one of the ring members.
Exact signer identity remains anonymous.
```

## Solidity Integration

The project includes a simple Solidity smart contract:

```text
contracts/AnonymousMessageRegistry.sol
```

The contract stores:

* message hash
* verification status
* timestamp

The signer identity is not stored on-chain.

## Test Scenario

1. Create a signature for a message.
2. Verify the signature.
3. Modify the original message.
4. Verify the signature again.

Expected result:

```text
Invalid ring signature.
```

The modified message cannot be verified because its hash value differs from the original signed message.

## Original vs Reference Implementation

The `pyring` project was used as a reference and learning resource.

The original implementation was developed separately and provides a simpler interface for demonstrating the same ring signature functionality.

Both implementations support:

* anonymous signing
* signature verification
* signer anonymity
* message integrity verification

The reference implementation is a command-line application, while the original implementation provides a menu-based workflow and additional metadata generation for easier testing and demonstration.

## References

* https://github.com/bartvm/pyring
* https://cryptonote.org/whitepaper.pdf
* https://ed25519.cr.yp.to/
* https://docs.soliditylang.org/
* https://medium.com/@mehmethayirli0/monero-ve-ring-signature-halka-i%CC%87mza-18e19cc5fd5a
* https://www.gate.com/learn/articles/what-are-ring-signatures/7497
