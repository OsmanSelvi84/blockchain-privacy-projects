# Smart City Energy Trading (P2P Energy Exchange Simulation)

Privacy-preserving P2P energy netting in local grids (reference implementation). Based on [decentralized-energy-trading](https://github.com/cp-ss2019/decentralized-energy-trading).

## Project Overview

This project is a simulation of a **peer-to-peer (P2P) energy trading system** designed for smart city environments. It enables energy production and consumption data exchange between two households and performs **off-chain netting + on-chain settlement**.

The system integrates:

- Parity Proof-of-Authority (PoA) blockchain
- Netting Engine (NED — off-chain computation)
- Household servers (H1 and H2)
- MongoDB databases
- Smart contracts (Truffle + Solidity)
- Optional UI dashboard (not required for testing)

---

## System Architecture

```
H1 (4002) ----\
                ---> NED (4005) ---> Parity PoA Blockchain
H2 (4003) ----/

MongoDB:
- H1 database: 27011
- H2 database: 27012

Parity nodes:
- authority0 (RPC 8545)
- authority1 (WS 8556)
- authority2 (WS 8566)
```

**Energy units:** API values use **watt-seconds (Ws)**. Convert: `kWh × 3_600_000 = Ws`.

---

## Requirements

### System

- Ubuntu 20+ recommended (macOS also works)
- Node.js **v10.24.1** (mandatory — use nvm)
- Yarn v1.22+
- Docker and Docker Compose
- Python 3.10 (for `node-gyp` when running `yarn install` on Ubuntu)

### Node setup

```bash
nvm install 10.24.1
nvm use 10
npm install -g yarn@1.22.22
```

On Ubuntu, if `yarn install` fails on native modules:

```bash
sudo apt install -y build-essential python3.10 python3.10-dev
npm config set python /usr/bin/python3.10
```

### Dependencies

```bash
cd <project-root>
yarn install
yarn --cwd household-ui install   # optional, only if using UI
```

### ZoKrates (optional — full on-chain zk verification)

```bash
chmod +x scripts/*.sh
yarn setup-zokrates
yarn update-contract-bytecodes
```

If `contracts/verifier.sol` is missing before migrate, copy from backup:

```bash
cp zokrates-code/verifier.sol.backup contracts/verifier.sol
```

---

## Full Project Setup

### 1. Enter project directory

From the course monorepo ([blockchain-privacy-projects](https://github.com/OsmanSelvi84/blockchain-privacy-projects)):

```bash
git clone https://github.com/OsmanSelvi84/blockchain-privacy-projects.git
cd blockchain-privacy-projects/15-smart-city-energy-trade/referans/decentralized-energy-trading
```

Local development copy (this machine):

```bash
cd ~/refolabilecekler/decentralized-energy-trading
```

Adjust the path if you cloned elsewhere.

---

### 2. Start MongoDB

```bash
docker compose -f mongo/docker-compose.yml up -d
docker ps | grep mongo
```

Mongo ports:

- H1 → `27011`
- H2 → `27012`

Verify:

```bash
ss -tlnp | grep 27011
```

---

### 3. Start Parity blockchain

```bash
cd parity-authority
docker compose up -d authority0 authority1 authority2
cd ..
```

Check status:

```bash
docker ps
curl -s -X POST http://127.0.0.1:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

---

### 4. Deploy smart contracts (migration)

First-time or after a clean chain reset:

```bash
cd parity-authority
docker compose down -v
docker compose up -d authority0 authority1 authority2
cd ..
sleep 15

nvm use 10
yarn migrate-contracts-authority
```

If successful:

```
Set verifier contract address ... done
```

If migrate fails on `setVerifier`, the chain was partially configured — run `docker compose down -v` in `parity-authority` and migrate again.

---

## Running the System (terminal only)

### Terminal 1 — NED (netting engine)

```bash
nvm use 10
yarn run-netting-entity -i 60000
```

Runs netting every 60 seconds.

---

### Terminal 2 — Household 1

```bash
nvm use 10
yarn run-server -p 4002 \
  -a 0x00aa39d30f0d20ff03a22ccfc30b7efbfca597c2 \
  -P node1 -n authority_1 \
  -d mongodb://127.0.0.1:27011 \
  -h 127.0.0.1
```

Expected log: `Household Server running at http://127.0.0.1:4002/`

---

### Terminal 3 — Household 2

```bash
nvm use 10
yarn run-server -p 4003 \
  -a 0x002e28950558fbede1a9675cb113f0bd20912019 \
  -P node2 -n authority_2 \
  -d mongodb://127.0.0.1:27012 \
  -h 127.0.0.1 \
  -N http://127.0.0.1:4005
```

---

### Optional — UI dashboard

```bash
yarn run-ui-h1    # http://localhost:4000
yarn run-ui-h2    # http://localhost:4010
```

---

## Test Scenario

### Before each new test round

Netting sends meter data to NED only on the **first** `PUT` after each household server start. Restart H1 and H2 servers between rounds:

```bash
kill $(lsof -ti:4002,4003) 2>/dev/null
# then start Terminal 2 and 3 again
```

---

### 1. Send household energy data

Example: H1 produces 500 kWh and consumes 300 kWh; H2 produces 200 kWh and consumes 600 kWh.

```bash
# Household 1 (surplus +200 kWh)
curl -X PUT http://127.0.0.1:4002/sensor-stats \
  -H "Content-Type: application/json" \
  -d '{"produce":1800000000,"consume":1080000000,"meterDelta":720000000}'
```

```bash
# Household 2 (deficit -400 kWh)
curl -X PUT http://127.0.0.1:4003/sensor-stats \
  -H "Content-Type: application/json" \
  -d '{"produce":720000000,"consume":2160000000,"meterDelta":-1440000000}'
```

---

### 2. Wait for netting cycle

```bash
sleep 65
```

Watch NED logs for `Incoming meter delta` / `Off-chain netting recorded`.

---

### 3. Check settlement results

```bash
curl -s "http://127.0.0.1:4005/transfers/0x00aa39d30f0d20ff03a22ccfc30b7efbfca597c2?from=0" | python3 -m json.tool
```

```bash
curl -s "http://127.0.0.1:4002/transfers?from=0" | python3 -m json.tool
```

---

## Expected Result

- Household 1 has excess production
- Household 2 consumes more than it produces
- NED computes netting off-chain
- Transfer from H2 → H1 (typical direction)

For the scenario above:

```
amount: 720000000   (≈ 200 kWh in Ws)
```

Convert Ws to kWh: `amount / 3600000`

---

## Additional test vectors

| Test | H1 (produce, consume, meterDelta) | H2 (produce, consume, meterDelta) | Expected amount (Ws) | kWh |
|------|-----------------------------------|-----------------------------------|----------------------|-----|
| 1 | 1800000000, 720000000, 1080000000 | 720000000, 2160000000, -1440000000 | 1080000000 | 300 |
| 2 | 1440000000, 540000000, 900000000 | 540000000, 1800000000, -1260000000 | 900000000 | 250 |
| 3 | 2160000000, 720000000, 1440000000 | 360000000, 2520000000, -2160000000 | 1440000000 | 400 |

---

## System Reset

### Reset Parity network

```bash
cd parity-authority
docker compose down -v
docker compose up -d authority0 authority1 authority2
cd ..
yarn migrate-contracts-authority
```

### Reset MongoDB (optional)

```bash
docker compose -f mongo/docker-compose.yml down -v
docker compose -f mongo/docker-compose.yml up -d
```

---

## Known Issues

### MongoDB connection failure (`reject is not defined` or ECONNREFUSED)

Mongo is not running on the expected port.

```bash
docker compose -f mongo/docker-compose.yml up -d
docker ps | grep mongo
ss -tlnp | grep 27011
```

### `node-gyp` build error on Ubuntu

Use Python 3.10:

```bash
npm config set python /usr/bin/python3.10
rm -rf node_modules
yarn install
```

### Missing `verifier.sol`

```bash
cp zokrates-code/verifier.sol.backup contracts/verifier.sol
# or: yarn setup-zokrates
```

### H2 Parity `connection not open`

Start authority1 and authority2:

```bash
cd parity-authority
docker compose up -d authority1 authority2
```

### Port already in use

```bash
kill $(lsof -ti:4002,4003,4005) 2>/dev/null
```

---

## Minimal Run Summary

```bash
nvm use 10
yarn install
docker compose -f mongo/docker-compose.yml up -d
cd parity-authority && docker compose up -d authority0 authority1 authority2 && cd ..
yarn migrate-contracts-authority

# 3 terminals:
yarn run-netting-entity -i 60000
yarn run-server -p 4002 -a 0x00aa39d30f0d20ff03a22ccfc30b7efbfca597c2 -P node1 -n authority_1 -d mongodb://127.0.0.1:27011 -h 127.0.0.1
yarn run-server -p 4003 -a 0x002e28950558fbede1a9675cb113f0bd20912019 -P node2 -n authority_2 -d mongodb://127.0.0.1:27012 -h 127.0.0.1 -N http://127.0.0.1:4005
```

---

## Academic Notes

This project demonstrates:

- Peer-to-peer energy trading logic
- Off-chain netting computation
- On-chain settlement via a PoA blockchain
- Hybrid architecture (off-chain computation + blockchain integration)

---

## Tests

- `yarn test-contracts` — smart contract tests
- `yarn test-parity-docker` — Docker Parity authority setup
- `yarn test-helpers` — helper functions
- `yarn test-utility-js` — off-chain utility (`settle`)

## Benchmarks

- `yarn utility-benchmark` — benchmark `settle` on the utility contract

## Development

- `yarn update-contract-bytecodes` — update contract bytecode in `chain.json`
- `yarn setup-zokrates` — regenerate `Verifier` contract
- `yarn format-all` — lint and format
- `yarn generate-prooving-files [# Prod] [# Cons]` — ZoKrates files for N producers / M consumers

## Legacy ports (3000 series)

If configs still use ports 3002 / 3003 / 3005 and UI 3000 / 3010, replace `4002` → `3002`, `4003` → `3003`, `4005` → `3005` in all commands above.
