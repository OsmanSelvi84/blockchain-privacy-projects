# Originality vs course reference

This project follows the **same netting rules and test vectors** as `decentralized-energy-trading` (course reference). The following are **Smart City Energy Trade implementations** (not verbatim copies):

| Area | Location |
|------|----------|
| Off-chain netting | `netting-service/settlement-engine.js` |
| NED HTTP service | `netting-service/index.js` |
| Household gateways | `household-gateway/` |
| Dashboard | `dashboard/` |
| Privacy hashing | `lib/privacy-hash.js` |
| On-chain registry | `contracts/dUtility.sol`, `contracts/interfaces/IdUtility.sol` |
| Contract tests | `test/contracts/dUtility.onchain.test.js` |
| ZoKrates circuit builder | `zk/generate-zk-stack.js`, `zk/lib/circuit-builder.js` |
| Unit tests (Ws vectors) | `test/netting/settlement-engine.test.js` |

**Toolchain-aligned artifacts** (same role as reference, different source files):

- `contracts/verifier.sol` — ZoKrates 0.5.x verifier (compiler output style)
- `zk/settlement-check.zok` — regenerate with `yarn generate-zok-circuit`

**Removed from repo** (were byte-identical to reference):

- `zk/zoKratesCodeGenerator.js`
- `test/contracts/dutility.test.js`

When comparing behaviour, use `yarn parity-reference` and [TEST_VECTORS.md](./TEST_VECTORS.md).
