# Locked versions (do not upgrade casually)

| Component | Version | Why |
|-----------|---------|-----|
| Node.js | **10.24.1** | `web3@1.2.1`, native addons, Truffle 5 |
| Yarn | 1.22.x | lockfile |
| Truffle | 5.1.x | migrations API |
| Solidity (dUtility) | **0.5.2** | Parity genesis bytecode |
| ZoKrates | **0.6.4** | `settlement-check.zok` |
| Verifier.sol | **0.6.1** | ZoKrates export — **not** compiled with Truffle 0.5.2 |
| MongoDB image | **4.4** | driver `mongodb@3.3.2` |
| Parity | Docker image in `parity-authority` | PoA network id 8995 |

## Common mistakes

1. **Node 18/20** — `yarn install` or runtime crashes.
2. **`contracts/verifier.sol` + `yarn compile-contracts`** — Solidity 0.6 breaks 0.5.2 compile. Authority migrate does **not** need it (verifier is in genesis at `0x...0045`).
3. **`yarn prepare-verifier` before migrate** — only needed for ZoKrates bytecode refresh (`yarn setup-zokrates`), not normal Ubuntu demo.
4. **Python 3.11+** on Ubuntu — breaks `node-gyp`; use `python3.10`.

## Ubuntu quick path

```bash
nvm use 10
npm config set python /usr/bin/python3.10   # if needed
yarn install
bash scripts/ubuntu-setup.sh
```
