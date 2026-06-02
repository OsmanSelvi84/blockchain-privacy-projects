# Reference Implementation

## Repository

- Reference repository: https://github.com/Floukil/E2EAggregation
- Reference commit checked during development: `4b9fffe4d6dc6891dfe3e28b14cd6d6e0a232f18`
- Original reference file: `IoTDataAgg`
- Reference contract name: `IoTDataAggregation`
- Original author noted in source: Faiza LOUKIL
- Topic fit: privacy-preserving IoT data aggregation using blockchain smart contracts.

## Why this reference fits the assignment

The assigned topic is `12-iot-lightweight-privacy`, with smart contract implementation, testing, deployment, and documentation. This reference fits because it is a Solidity smart contract for privacy-preserving IoT data aggregation.

The reference includes functions for:

- creating an IoT data aggregation group,
- setting terms of service,
- matching producer privacy policy,
- adding participants,
- submitting hashed/encrypted participation data,
- verifying participation hashes,
- verifying signatures,
- updating aggregation results.

## Runnable reference version

The upstream GitHub repository provides the Solidity contract file but does not provide a complete Hardhat/Truffle test runner. To make the reference executable for evaluation, this project includes the reference contract under:

```text
contracts/reference/IoTDataAggregation.sol
```

The contract logic is used for comparison only. The student original implementation is separate:

```text
contracts/OriginalIoTPrivacyAggregation.sol
```

The reference runner scripts call the real reference contract functions. They do not fake reference outputs.

## Dependencies

Use the root project dependencies:

- Node.js 18 or newer
- npm
- Hardhat
- Solidity `0.6.12` for the reference contract
- Solidity `0.8.24` for the original contract

Install with:

```bash
npm install
```

## Reference execution steps

From the project root:

```bash
npm run build
npm run reference:demo
```

Expected behavior:

- deploys the reference `IoTDataAggregation` contract,
- runs 5 IoT privacy inputs,
- prints group ID, policy status, participation hash, stored participation hash, signature status, result hash, and privacy status.

To compare it with the original implementation:

```bash
npm run compare
```

## Optional upstream clone

The original upstream repository can be cloned separately:

```bash
git clone https://github.com/Floukil/E2EAggregation.git
cd E2EAggregation
```

The upstream repository contains the reference contract source. The runnable comparison environment is provided in this submission because the upstream repository does not include a complete test/demo project.

## Functional equivalence mapping

| Reference behavior | Reference function | Original behavior | Original function |
| --- | --- | --- | --- |
| Consumer defines requested data/purpose/operation | `updateToS` | Consumer creates private request hash | `createRequest` |
| Producer privacy policy matches request | `updatePPolicy("matched", ...)` | Device owner marks request/device policy match | `setPolicyMatch` |
| Aggregation group is created | `createGroup` | Private request is created/opened | `createRequest`, `openRequest` |
| Public key is recorded for aggregation | `updatePK` | Public key commitment is recorded | `createRequest` |
| Matched producers become participants | `addParticipants` | Matched device may submit reading | `submitPrivateReading` |
| IoT participation hash is verified | `verifyHashVal` | Payload hash is verified | `verifyPayloadHash` |
| Hashed participation is stored | `addParticipation`, `getParticipation` | Payload hash + salted commitment are stored | `submitPrivateReading`, `getReading` |
| Aggregation result is updated | `updateRequestResult` | Result hash is finalized | `finalizeRequest` |

## Academic integrity note

The reference implementation is clearly separated and attributed. It is included only to make the reference executable for comparison. The original implementation does not copy the reference contract structure or source code.
