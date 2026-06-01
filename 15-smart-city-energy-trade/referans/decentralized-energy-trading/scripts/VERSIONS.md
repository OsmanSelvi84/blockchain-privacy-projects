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
4. **Python 3.11+ / 3.12 / 3.14** — `ValueError: invalid mode: 'rU'` during `yarn install`. Use **Python 3.10 or 3.9** only.

### Install Python 3.10 on Ubuntu (when `python3.10` package not found)

```bash
sudo apt install -y software-properties-common
sudo add-apt-repository -y ppa:deadsnakes/ppa
sudo apt update
sudo apt install -y python3.10 python3.10-dev python3.10-venv
npm config set python /usr/bin/python3.10
```

Or run: `bash scripts/install-python-for-nodegyp.sh`

Then **always** clean and reinstall:

```bash
rm -rf node_modules
yarn install
```

## Ubuntu quick path

```bash
nvm use 10
bash scripts/install-python-for-nodegyp.sh
rm -rf node_modules && yarn install
bash scripts/ubuntu-setup.sh
```
