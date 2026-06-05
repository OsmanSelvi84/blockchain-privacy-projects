# eHealth Dynamic Consent — Smart Contract-Based Patient Consent Management

> Blockchain Privacy course — Topic **14: eHealth Dynamic Consent**
> Branch: `students/210304011-serif-mert-ceker`

## 1. Project Description

This project implements a **dynamic patient consent** system on Ethereum smart contracts, going beyond the limitations of traditional **static consent** models. Patients can update their access rights over their health data at any time:

- grant consent to a specific researcher/institution,
- grant consent for a specific **data type** (blood test, X-ray, genetic, MRI, prescription),
- grant consent for a specific **purpose** (treatment, research, insurance, statistical),
- limit consent by **duration** (1–3650 days or unlimited),
- **revoke** consent at any time (GDPR "right to withdraw").

All consent changes are emitted as events on the blockchain, providing a **complete audit trail**.

## 2. Architecture

### 2.1. Roles
- **Patient:** Owner of the health data; grants and revokes consent.
- **Researcher:** Registers with name and institution; calls `checkConsent` before accessing data to verify authorization.

### 2.2. Data Types (enum DataType)
| Value | Meaning |
|------:|:--------|
| 0 | BloodTest |
| 1 | Xray |
| 2 | Genetic |
| 3 | MRI |
| 4 | Prescription |

### 2.3. Purposes (enum Purpose)
| Value | Meaning |
|------:|:--------|
| 0 | Treatment |
| 1 | Research |
| 2 | Insurance |
| 3 | Statistical |

### 2.4. Main Functions
| Function | Caller | Description |
|----------|--------|-------------|
| `registerPatient()` | Patient | Patient registers themselves |
| `registerResearcher(name, institution)` | Researcher | Registration with name and institution |
| `grantConsent(researcher, dataType, purpose, durationInDays)` | Registered patient | Grants time-bound consent |
| `revokeConsent(researcher, dataType, purpose)` | Registered patient | Revokes consent |
| `checkConsent(patient, researcher, dataType, purpose) -> bool` | Anyone (view) | Is there a currently valid consent |
| `getConsent(...)` | Anyone (view) | Full details of a consent record (for audit) |

### 2.5. Events (GDPR Audit Trail)
- `PatientRegistered(patient, timestamp)`
- `ResearcherRegistered(researcher, name, institution, timestamp)`
- `ConsentGranted(patient, researcher, dataType, purpose, expiry, timestamp)`
- `ConsentRevoked(patient, researcher, dataType, purpose, timestamp)`

## 3. Technologies Used

| Layer | Technology |
|-------|------------|
| Smart contract | Solidity 0.8.20 |
| Development & deployment | Remix IDE (browser-based) |
| Testing | Remix Script Runner (JavaScript) |
| Blockchain runtime | Remix VM (in-memory EVM) |

No installation required. The entire project runs in any modern browser through Remix IDE.

## 4. Reference Implementation

This project is benchmarked against an existing open-source reference:

- **Repository:** [eddex/healthchain](https://github.com/eddex/healthchain)
- **Stack:** Solidity 0.5 + Truffle + Ganache + React + Node.js backend
- **Scope:** Basic medical record sharing — patient uploads document hashes, grants/revokes access to a doctor.

### Why this reference?

`eddex/healthchain` is a well-documented academic blockchain healthcare prototype. It implements the *core idea* of permissioned data sharing on Ethereum, which makes it a natural baseline for measuring what a more privacy-aware system should add.

### What it does

The reference contract `Healthchain.sol` exposes 5 functions:
- `addDocument(string)` — patient adds an IPFS hash
- `getDocuments(address)` — returns all documents of a user
- `giveAccessToDoctor(address)` — grants access
- `revokeAccessFromDoctor(address, uint)` — removes access by index
- `getDoctorsPermissions(address)` — list patients of a doctor

### Where it falls short

While functional, it does not address the core requirements of **dynamic consent** as defined by GDPR Articles 7(3), 17, and 30:

| Missing Requirement | Why it matters |
|--------------------|----------------|
| No expiry on consent | A patient cannot grant time-limited access (e.g. 30 days for a study) |
| No data type separation | A patient consents to "all documents" or "none" — no granularity |
| No purpose binding | The same data can be used for treatment, research, insurance interchangeably — patient cannot restrict |
| No audit log (no events) | GDPR Article 30 requires verifiable record of all consent changes |
| No registration system | Anyone can be a "doctor" — no identity layer |
| No access control on `getDocuments` | Documents are publicly readable to all addresses |
| Revoke leaves zero-address gaps in array | Storage pollution + auditability degradation |

## 5. Comparison: Reference vs. This Project

| Feature | Reference (Healthchain) | This Project (ConsentManager) |
|---------|-------------------------|-------------------------------|
| Solidity version | 0.5.0 | 0.8.20 |
| Data type separation | None (all documents same) | 5 different types |
| Purpose-based consent | None | 4 purposes |
| Time-bound consent | None (infinite) | 1–3650 days or unlimited |
| Audit log (events) | None | 4 indexed events |
| Patient registration | None | Yes (timestamped) |
| Researcher registration | None | Yes (name + institution, with validation) |
| Empty string check | None | Yes |
| Access control | Incomplete (public reads) | `checkConsent` enforces it |
| Duplicate registration check | None | Yes (custom error) |
| Automatic expiry verification | None | On-chain via `block.timestamp` |
| Custom errors | None | Yes (gas-efficient) |

## 6. Requirements

- A modern web browser (Brave, Chrome, Firefox, Edge)
- Internet connection (only to load Remix IDE the first time)
- **No local installation** required

## 7. Running the Project

### 7.1. Open Remix IDE

Visit [https://remix.ethereum.org](https://remix.ethereum.org) in your browser. Remix loads in seconds and runs entirely in-browser.

### 7.2. Load the contract

1. In the left sidebar **File Explorer**, create a new file under `contracts/` named `ConsentManager.sol`.
2. Paste the contents of `ConsentManager.sol` from this repository into the editor.
3. Open the **Solidity Compiler** tab (left sidebar, "S" icon).
4. Select compiler version `0.8.20` (or `0.8.20+commit...`).
5. Enable optimization (recommended: 200 runs).
6. Click **Compile ConsentManager.sol**. A green check confirms success.

### 7.3. Deploy the contract

1. Open the **Deploy & Run Transactions** tab (Ethereum-logo icon).
2. **ENVIRONMENT**: select `Remix VM (Cancun)` or `Remix VM (Shanghai)` — Remix's in-memory blockchain with 15 test accounts, each pre-funded with 100 ETH.
3. **CONTRACT**: ensure `ConsentManager` is selected.
4. Click the orange **Deploy** button.
5. The deployed contract appears under **Deployed Contracts** at the bottom of the panel, with all functions exposed as clickable buttons.

### 7.4. Interact manually (button-based)

Once deployed, each function appears as a button:
- **Orange** = state-changing transactions (e.g. `registerPatient`, `grantConsent`)
- **Blue** = read-only view calls (e.g. `checkConsent`, `getConsent`)

Click any button to call the function. For functions with parameters, expand the `▼` arrow to see input fields.

### 7.5. Run the automated test script (recommended for demo)

A full end-to-end test scenario is provided in `scripts/test_consent_manager.js`. It runs 13 sequential test cases covering the entire consent lifecycle.

1. In Remix's File Explorer, navigate to the `scripts/` folder.
2. Create a new file named `test_consent_manager.js` and paste the contents from this repository.
3. With the script open in the editor, click the **▶ Run** button in the top-right corner (or press `Ctrl+Shift+S`).
4. Watch the Remix Console (bottom panel) print each test step:
   - Contract deployment
   - Patient and researcher registration
   - Granting consent (BloodTest + Research, 30 days)
   - Verifying data type isolation (Genetic returns false)
   - Verifying purpose isolation (Insurance returns false)
   - Verifying researcher isolation (other researcher returns false)
   - Audit detail retrieval
   - Revoking consent
   - Post-revoke audit (revokedAt timestamp captured)
   - Custom error testing (double revoke, unregistered patient)
   - Consent counter verification

The script is fully self-contained — no manual input required. Total runtime: ~10 seconds.

## 8. Demo Walkthrough

For a live demo, the recommended sequence is:

1. **Open the reference** (`eddex/healthchain`) in a separate tab and show its limitations (no expiry, no data type, no events).
2. **Open this project in Remix**, compile and deploy `ConsentManager.sol`.
3. **Run the test script** (`▶ Run` on `test_consent_manager.js`) to demonstrate all 13 scenarios.
4. **Walk through the contract code**, explaining key design decisions:
   - 3-level mapping for O(1) lookup
   - `bytes32` keccak encoding to combine `(DataType, Purpose)` into a single key
   - Custom errors instead of `require` strings for gas efficiency
   - Event emission on every state change for GDPR-compliant audit trail

## 9. Project Structure

```
.
├── contracts/
│   └── ConsentManager.sol              # Main contract (Solidity 0.8.20)
├── scripts/
│   └── test_consent_manager.js         # Automated 13-scenario test runner for Remix
└── README.md
```

## 10. License

MIT
