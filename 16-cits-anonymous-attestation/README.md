📄 README.md
C-ITS Anonymous Attestation on Blockchain
This project is a Solidity-based implementation of a privacy-preserving anonymous attestation system for Cooperative Intelligent Transport Systems (C-ITS).
It models a simplified PKI-based trust architecture using Ethereum smart contracts, enabling anonymous vehicle communication through pseudonyms, certificates, and authority-based verification.

👤 Author
Name: Feridun Tavşanlı
Student ID: 210304006

🎯 Goal
The goal of this project is to implement a blockchain-based anonymous attestation mechanism for C-ITS environments.
The system provides:
Anonymous vehicle identity using pseudonyms
Certificate-based authority validation
Trust-based V2X message attestation
Revocation and expiry-based security control

📥 Clone and Switch to Branch
git clone https://github.com/OsmanSelvi84/blockchain-privacy-projects.git
cd blockchain-privacy-projects
git checkout students/210304006-feridun-tavsanli
cd 16-cits-anonymous-attestation

⚙️ Requirements
Remix IDE (https://remix.ethereum.org)
Solidity ^0.5.16

🚀 How to Run
1. Open Remix IDE
https://remix.ethereum.org
2. Create Smart Contracts
CertificationAuthority.sol
AnonymousAttestation.sol
3. Compile
Solidity version: 0.5.16
4. Deploy Order
1. Deploy CertificationAuthority
2. Deploy AnonymousAttestation (pass CA address)

🧠 System Architecture
1. Certification Authority (CA) Contract
Responsible for:
Registering RSU/authority nodes
Issuing certificates
Validating authority permissions
2. Anonymous Attestation Contract
Responsible for:
Vehicle pseudonym management
Attestation creation
Trust record storage
Verification and revocation

🔐 How It Works
Step 1: Authority Registration
Admin registers RSU authorities in the system.
Step 2: Certificate Issuance
Authorities issue valid certificates for authentication.
Step 3: Anonymous Attestation Creation
Vehicles submit V2X messages using:
pseudonymVehicleId
certificateId
signature
messageType
messageData
Step 4: Verification
Any user can verify:
authenticity
validity
expiry status
revocation state
Step 5: Revocation
Authorities can revoke invalid or malicious attestations.

📊 Example Workflow
registerRSU(...)
issueCertificate("CERT001")

createAttestation(
 "T1",
 "PSEUDO1",
 "CERT001",
 "SIG1",
 "CAM",
 "Vehicle speed message",
 "2026-05-30"
)

verifyAttestation("T1")

🧪 Test Scenarios
Test Case	Description
Authority registration	RSU registered successfully
Certificate issuance	Certificate becomes valid
Attestation creation	Anonymous record stored on-chain
Pseudonym uniqueness	Duplicate pseudonyms rejected
Verification	Valid attestation returns correct data
Revocation	Attestation marked as revoked

🔒 Security Features
Pseudonym-based anonymity
Certificate-based authentication
Replay protection (unique pseudonyms)
Expiry time validation
Revocation mechanism

⚖️ Limitations
ECDSA-based signature verification is left for future enhancement
Evaluation conducted in a simplified V2X environment
Prototype developed to validate the proposed approach
Practical C-ITS security model adopted for implementation efficiency

📚 Reference Implementation
🔗 Certoshi – Blockchain Certificate System
https://github.com/thawalk/Certoshi
🧠 Description
Certoshi is a blockchain-based certificate issuance and verification system built on Ethereum smart contracts.
It provides:
Decentralized certificate issuance by authorities
On-chain verification of certificates
Institution-based identity management
Transparent and tamper-resistant validation

⚖️ Relation to This Project
Certoshi focuses on institutional certificate systems, while this project extends the concept into vehicular networks (C-ITS) with privacy preservation.
Feature	Certoshi	This Project
Domain	Certificates	C-ITS vehicular systems
Identity	Institutional	Pseudonym-based vehicles
Privacy	Low	High (anonymous attestation)
Blockchain role	Certificate registry	Trust + attestation layer

🎓 Conclusion
This project demonstrates a blockchain-based anonymous attestation system for C-ITS, focusing on privacy, trust, and decentralized verification.
It serves as an academic prototype showing how blockchain can enhance security in intelligent transportation systems.