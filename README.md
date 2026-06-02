# eHealth Dynamic Consent — Smart Contract-Based Patient Consent Management
> Şerif Mert Çeker, 210304011 -
> Blockchain Privacy Projects - Topic **14: eHealth Dynamic Consent**

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
| Development framework | Hardhat 2.22 |
| Testing framework | Mocha + Chai |
| Blockchain interaction | Ethers.js v6 |
| Frontend | Plain HTML + JavaScript + ethers.js (browser bundle) |
| Wallet | MetaMask (Brave/Chrome extension) |
| Local network | Hardhat in-memory network / Hardhat node |

## 4. Comparison with Reference Implementation

Open-source reference project used: **eddex/healthchain**
(`https://github.com/eddex/healthchain`)

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
| Access control | Incomplete (getDocuments is public to all) | Yes (checkConsent) |
| Duplicate registration check | None | Yes (custom error) |
| Automatic expiry verification | None | On-chain via block.timestamp |
| Custom errors | None | Yes (gas-efficient) |

## 5. Requirements and Installation

### 5.1. Required Software
- Ubuntu 22.04 or 24.04 (tested environment)
- Node.js v20 (managed via nvm)
- npm v10+
- Git

### 5.2. Step-by-Step Installation

```bash
# Clone the repository
git clone <repo-url>
cd <repo-folder>

# Switch to the correct branch
git checkout 14-ehealth-dynamic-consent

# Use Node 20 (if nvm is installed)
nvm use 20

# Install dependencies
npm install
```

## 6. Running the Project

### 6.1. Compile the contract
```bash
npx hardhat compile
```

### 6.2. Run the tests
```bash
npx hardhat test
```

Expected outcome: all tests pass (green).

### 6.3. Test coverage report
```bash
npx hardhat coverage
```

### 6.4. Start local Hardhat node (in a separate terminal)
```bash
npx hardhat node
```
This command spins up a blockchain at 127.0.0.1:8545 with 20 pre-funded test accounts.

### 6.5. Deploy to local node
```bash
npx hardhat run scripts/deploy.js --network localhost
```
Outputs the deploy address and creates `frontend/contract-info.json`.

### 6.6. Interactive console
```bash
npx hardhat console --network localhost
```



## 7. Project Structure

```
my-consent-system/
├── contracts/
│   └── ConsentManager.sol          # Main contract
├── test/
│   └── ConsentManager.test.js      # 16 test scenarios
├── scripts/
│   └── deploy.js                   # Deploy + frontend info
├── frontend/
│   └── contract-info.json          # Created after deploy (abi + address)
├── hardhat.config.js               # Hardhat settings (Solidity 0.8.20, optimizer)
├── package.json
└── README.md
```

## 8. Test Coverage

A total of **16 tests** under three categories:

1. **Registration system (5 tests):** patient/researcher registration, duplicate checks, empty string validation.
2. **Consent granting and revocation (10 tests):** granting, revoking, expiry handling, data type separation, purpose separation, unlimited duration, unregistered patient/researcher, double revocation, max duration limit.
3. **Audit trail (2 tests):** event emissions, consent counter, getConsent after revoke.

## 9. License

MIT