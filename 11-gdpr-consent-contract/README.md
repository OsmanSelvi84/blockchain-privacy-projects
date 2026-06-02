# GDPR Privacy-Preserving Consent Contract on Ethereum

This project implements a decentralized, GDPR/KVKK-compliant consent management system using Ethereum smart contracts. It provides data subjects (users) full control over their personal data, supporting clear consent granting, purpose restriction, and the "Right to be Forgotten" (data erasure) on-chain.

## 👥 Branch Information
* **Assigned Student Branch:** `students/210304014-meryem-burkut`
* **Project Folder:** `11-gdpr-consent-contract/`

## 🏛️ Project Architecture
The implementation follows a secure, two-layer smart contract structure:
1. **CollectionConsent.sol (Original Implementation):** Developed from scratch using modern **Solidity 0.8.20**. Manages the explicit initial consent between the Data Subject and the Data Controller.
2. **ProcessingConsent.sol (Original Implementation):** Handles sub-consent workflows with external third-party Data Processors.

---

## 📚 Academic Reference Implementation

As required by the evaluation guidelines, a runnable reference implementation has been studied and integrated for independent verification and functional equivalence testing.

* **Reference Repository Link:** [BC_GDPR-Compliant_PDManagement_System](https://github.com/toful/BC_GDPR-Compliant_PDManagement_System)
* **Reference Files in this Branch:** `CollectionConsent_Ref.sol` and `ProcessingConsent_Ref.sol`
* **Reference Compiler Target:** Solidity `>=0.4.22 <0.7.0` (Tested successfully on `0.6.12`)

---

## ⚙️ Environment & Required Software
To run and evaluate both implementations, the instructor only needs an internet browser:
* **IDE:** [Remix Online IDE](https://remix.ethereum.org/)
* **Compiler Sürümü (Original):** `0.8.20+commit.a1b79de6`
* **Compiler Sürümü (Reference):** `0.6.12+commit.27d51765`
* **Environment:** Remix VM (Osaka) or any active Remix Virtual Local Environment.

---

## 🚀 Deployment & Build Instructions

1. Clone the repository and switch to the student branch.
2. Open **Remix IDE** and load the workspace.
3. **To Run Original Implementation:**
   * Select `CollectionConsent.sol`.
   * Set compiler to `0.8.20`.
   * Deploy with parameters.
4. **To Run Reference Implementation:**
   * Select `CollectionConsent_Ref.sol`.
   * Set compiler to `0.6.12`.
   * Deploy with parameters.

---

## 🧪 Comprehensive Evaluation & Testing
To see the step-by-step 5-state validation scenario, test inputs/outputs, and how to verify both implementations independently without errors, please check our dedicated test documentation:

👉 **[Go to Detailed Test Guide (test/README.md)](./test/README.md)**
