# Attribute-Based Encryption (CP-ABE)

**Course:** COMP4052 — Introduction to Blockchain and DLT
**Student:** Aminata Kone | **ID:** 220304144
**Branch:** students/220304144-aminata-kone
**Instructor:** Osman SELVİ

## Project Description

Implements Ciphertext-Policy ABE (CP-ABE): the access policy is embedded in the ciphertext, user attributes are in the private key. Decryption succeeds only if attributes satisfy the policy.

**Privacy Concept:** Fine-grained, cryptographic, decentralized access control.

**Requirements met:**
- Attribute validation system
- Encrypt/decrypt based on policy
- Multi-attribute access control (AND / OR)

## Clone and Switch to Branch

git clone https://github.com/OsmanSelvi84/blockchain-privacy-projects.git
cd blockchain-privacy-projects
git checkout students/220304144-aminata-kone
cd 08-attribute-based-encryption

## Project Structure

08-attribute-based-encryption/
├── abe.py                  Your original CP-ABE implementation
├── test_abe.py             5 evaluation test cases
├── requirements.txt        Dependencies
├── README.md               This file
└── reference/
    └── reference_abe.py    Runnable reference for comparison

## Install Dependencies

pip3 install cryptography

## Run Original Implementation

python3 abe.py

## Run 5 Test Cases

python3 test_abe.py

Expected: 5/5 tests passed

## Test Inputs and Outputs

Test 1: policy="doctor AND hospital-A"  attrs=[doctor, hospital-A]  → DECRYPTS
Test 2: policy="doctor AND hospital-A"  attrs=[doctor]              → DENIED
Test 3: policy="(doctor AND hospital-A) OR admin"  attrs=[admin]    → DECRYPTS
Test 4: policy="(researcher AND university) AND clearance-L2"  attrs=[researcher,university,clearance-L2] → DECRYPTS
Test 5: policy="(researcher AND university) AND clearance-L2"  attrs=[researcher,university] → DENIED

## External Reference Implementation

Project: Charm-Crypto Framework
Repository: https://github.com/JHUISI/charm
Scheme: charm/schemes/abenc/abenc_bsw07.py (Waters CP-ABE)
Language: Python

Install Charm-Crypto:
git clone https://github.com/JHUISI/charm.git
cd charm
pip3 install -r requirements.txt
python3 setup.py install

Run Charm-Crypto ABE:
cd charm/schemes/abenc
python3 abenc_bsw07.py

## Run Standalone Reference (No complex install needed)

pip3 install cryptography
python3 reference/reference_abe.py

Expected: 5/5 tests passed

## Difference Between Reference and Original

Reference uses HMAC-SHA3-256 key derivation and inline token parser.
Original uses SHA-256 + MSK and recursive PolicyNode tree.
Both produce identical access control behavior on all 5 test cases.