# IoT Lightweight Privacy

Topic: `12-iot-lightweight-privacy`

This repository contains a blockchain-based privacy mechanism for IoT data aggregation. It includes:

- a runnable reference implementation for comparison,
- an original smart contract implementation developed from scratch,
- 5 demo/test inputs,
- terminal scripts for reference output, original output, and side-by-side comparison,
- Hardhat tests proving functional equivalence for the 5 inputs.

## Branch information

Recommended branch name:

```bash
12-iot-lightweight-privacy
```

If the instructor assigned a different branch, replace the branch name in the commands below:

```bash
git clone <repository-url>
cd <repository-folder>
git checkout 12-iot-lightweight-privacy
```

## Project structure

```text
contracts/
  OriginalIoTPrivacyAggregation.sol      Original student implementation
  reference/IoTDataAggregation.sol       Runnable reference contract
demo/
  test-vectors.json                      Five IoT privacy inputs
  expected-output.json                   Expected comparison criteria
scripts/
  reference-demo.js                      Runs only the reference implementation
  original-demo.js                       Runs only the original implementation
  compare.js                             Runs both and compares outputs
  deploy.js                              Deploys the original contract locally
  lib/flows.js                           Shared demo/comparison logic
test/
  reference-vs-original.test.js          Automated equivalence tests
reference/
  REFERENCE.md                           Reference repo, setup, and mapping
```

## Required software

- Git
- Node.js 18 or newer
- npm

The project uses:

- Hardhat
- Solidity `0.6.12` for the reference contract
- Solidity `0.8.24` for the original contract
- ethers.js through Hardhat Toolbox

## Installation

From the project root:

```bash
npm install
```

## Build

```bash
npm run build
```

This compiles both:

- `contracts/reference/IoTDataAggregation.sol`
- `contracts/OriginalIoTPrivacyAggregation.sol`

## Run tests

```bash
npm test
```

The test suite runs all 5 IoT privacy inputs. For each input:

1. The reference implementation is deployed and executed.
2. The original implementation is deployed and executed.
3. Outputs and behavior are compared.

The tested equivalence criteria are:

- policy match result is equal,
- input hash is equal,
- hash validation result is equal,
- participation/reading acceptance behavior is equal,
- result hash is equal,
- raw plaintext IoT data is not exposed,
- the original implementation additionally stores a salted commitment and nullifier.

## Run the reference implementation

```bash
npm run reference:demo
```

This prints the reference outputs for all 5 inputs, including:

- `groupId`
- `policyMatched`
- `producerAccepted`
- `inputHash`
- `hashValid`
- `storedParticipationHash`
- `signatureValid`
- `resultHash`
- `rawPlaintextStored`

## Run the original implementation

```bash
npm run original:demo
```

This prints the original outputs for the same 5 inputs, including:

- `requestId`
- `policyMatched`
- `readingAccepted`
- `inputHash`
- `hashValid`
- `storedPayloadHash`
- `storedCommitment`
- `nullifierHash`
- `nullifierUsed`
- `signatureValid`
- `resultHash`
- `rawPlaintextStored`

## Compare reference vs original

```bash
npm run compare
```

This prints both outputs side by side and adds a `comparison` object:

```json
{
  "policyMatchedEqual": true,
  "inputHashEqual": true,
  "hashValidationEqual": true,
  "acceptedBehaviorEqual": true,
  "resultHashEqual": true,
  "rawPlaintextStoredEqual": true,
  "originalAddsCommitmentAndNullifier": true,
  "functionalEquivalent": true
}
```

This command is the clearest command to show during evaluation.

## Enter custom inputs from CMD

If the instructor wants to type inputs directly in the terminal instead of editing `demo/test-vectors.json`, run:

```bash
npm run compare:input
```

The script asks for:

- number of inputs,
- input name,
- requested data,
- requested purpose,
- requested operation,
- requested disclosure,
- retention time,
- aggregation function,
- explicit consent settings,
- temperature,
- humidity,
- timestamp.

After the values are entered, the script runs both implementations and prints the same side-by-side comparison output as `npm run compare`.

Example flow:

```text
How many inputs? [1]: 1
name [custom-case-1]: teacher-case-1
requestedData [temperature]: temperature
requestedPurpose [monitoring]: monitoring
requestedOperation [aggregate-average]: aggregate-average
requestedDisclosure [aggregator-only]: aggregator-only
requestedRetention seconds [3600]: 3600
aggregationFunction [average]: average
needExplicitConsent true/false [false]: false
consentResponse true/false [true]: true
temperatureMilliC [25000]: 24000
humidityBps [6000]: 5500
timestamp [1717200001]: 1717209999
```

The output includes reference hash values, original hash/commitment/nullifier values, and `functionalEquivalent`.

## Local deployment

```bash
npm run deploy:local
```

This deploys only the original contract to Hardhat's local in-memory network and prints the address.

## Sample input

The five input cases are in:

```text
demo/test-vectors.json
```

Example:

```json
{
  "name": "greenhouse-sensor-01",
  "requestedData": "temperature-humidity",
  "requestedPurpose": "greenhouse-monitoring",
  "requestedOperation": "aggregate-average",
  "requestedDisclosure": "aggregator-only",
  "requestedRetention": 3600,
  "aggregationFunction": "average",
  "needExplicitConsent": false,
  "consentResponse": true,
  "reading": {
    "temperatureMilliC": 22450,
    "humidityBps": 6150,
    "timestamp": 1717200001
  }
}
```

The demo scripts encode the IoT reading as encrypted participation bytes before sending it to the contracts. The raw plaintext reading is not stored by the original contract.

## Sample output fields

Reference output:

```json
{
  "implementation": "reference",
  "inputName": "greenhouse-sensor-01",
  "policyMatched": true,
  "producerAccepted": true,
  "inputHash": "0x...",
  "storedParticipationHash": "0x...",
  "signatureValid": true,
  "resultHash": "0x...",
  "rawPlaintextStored": false
}
```

Original output:

```json
{
  "implementation": "original",
  "inputName": "greenhouse-sensor-01",
  "policyMatched": true,
  "readingAccepted": true,
  "inputHash": "0x...",
  "storedPayloadHash": "0x...",
  "storedCommitment": "0x...",
  "nullifierHash": "0x...",
  "nullifierUsed": true,
  "resultHash": "0x...",
  "rawPlaintextStored": false
}
```

## Reference implementation

Reference repository:

```text
https://github.com/Floukil/E2EAggregation
```

The reference contract is `IoTDataAggregation`. It is included under `contracts/reference/` only to make the reference executable for comparison. Full reference details, setup notes, dependency information, and equivalence mapping are in:

```text
reference/REFERENCE.md
```

## Original implementation

The original implementation is:

```text
contracts/OriginalIoTPrivacyAggregation.sol
```

It was written from scratch and implements:

- private IoT aggregation request creation,
- device registration,
- privacy policy matching,
- payload hash verification,
- signed private reading submission,
- salted reading commitment storage,
- nullifier-based replay protection,
- aggregation result hash finalization.

## Functional equivalence explanation

The reference and original contracts do not use identical function names, but they implement equivalent privacy behavior for the evaluation inputs:

| Evaluation behavior | Reference output | Original output |
| --- | --- | --- |
| Policy/request match | `policyMatched` | `policyMatched` |
| IoT data hash | `storedParticipationHash` | `storedPayloadHash` |
| Hash verification | `hashValid` | `hashValid` |
| Accepted IoT contribution | `producerAccepted` | `readingAccepted` |
| Aggregation result | `resultHash` | `resultHash` |
| Privacy status | `rawPlaintextStored: false` | `rawPlaintextStored: false` |

The original implementation also adds stronger lightweight privacy controls:

- `storedCommitment`
- `nullifierHash`
- `nullifierUsed`

## GitHub submission commands

```bash
git checkout -b 12-iot-lightweight-privacy
git add .
git commit -m "Implement IoT lightweight privacy comparison project"
git push origin 12-iot-lightweight-privacy
```

If your branch already exists:

```bash
git checkout 12-iot-lightweight-privacy
git add .
git commit -m "Implement IoT lightweight privacy comparison project"
git push
```

## Academic integrity

The reference contract is clearly attributed and separated under `contracts/reference/`. It is used only for runnable comparison. The original implementation is separate and does not copy the reference source code.
