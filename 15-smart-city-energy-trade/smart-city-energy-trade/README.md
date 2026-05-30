# Smart City Energy Trade

A privacy-preserving peer-to-peer energy netting system for a smart-city microgrid. Households that generate excess renewable energy (such as solar) can share it with neighbors who have a deficit. Meter readings are hashed and signed off-chain, while optional ZoKrates proofs can be verified on-chain through 'dUtility.checkNetting'.

## Project overview

This project demonstrates a full **energy trading pipeline**:

- Smart meters (production / consumption in **Ws**)
- Household **gateway** APIs (H1 / H2)
- Off-chain **netting engine** (NED)
- **Parity authority** blockchain (course network id `8995`)
- **MongoDB** for sensor and transfer history

IoT simulation → Gateway → NED (settlement) → Blockchain validation → MongoDB persistence.

## Architecture

```
IoT / curl (sensor-stats)
        ↓
Gateway API (H1 :3002 / H2 :3003)
        ↓
Netting Engine — NED (off-chain, :3005)
        ↓
Parity Authority chain (validators, dUtility)
        ↓
MongoDB (:27017)
```

Optional: React **dashboard** on **3000** (H1) and **3010** (H2).

## Requirements

| Tool | Version / notes |
|------|-----------------|
| OS | **Ubuntu 20.04/22.04** (or Linux VM) recommended |
| Docker | Engine + **Compose** (`docker compose` or `docker-compose`) |
| Node.js | **10.x** for install, migrate, NED, gateways (`nvm use 10`) |
| Yarn | 1.x |
| Parity | Course `parity-authority` compose (reference repo) |
| solc | **0.5.2** via Truffle `docker: true` on Linux |
| ZoKrates | 0.6.4 optional (on-chain proof; off-chain demo works without) |

**Ports (this project):**

| Service | Port |
|---------|------|
| H1 UI (dashboard) | 3000 |
| H1 gateway API | 3002 |
| H2 gateway API | 3003 |
| NED | 3005 |
| H2 UI (dashboard) | 3010 |
| MongoDB | 27017 |
| Parity RPC (HTTP) | 8545 |
| Parity WS (Truffle/NED) | 8546 |

Running **reference** `decentralized-energy-trading` on the same machine: use **4000-series** ports — see [docs/UBUNTU_DUAL_STACK.md](docs/UBUNTU_DUAL_STACK.md).

## Project layout

```
contracts/           Solidity (dUtility, OwnedSet, verifier)
netting-service/     NED (port 3005)
household-gateway/   REST API (3002 / 3003)
dashboard/           React UI (3000 / 3010)
zk/                  settlement-check.zok
docs/                TEST_VECTORS.md, REFERENCE.md, UBUNTU_DUAL_STACK.md
scripts/             check-ned, check-validators, reference-4000-patch, …
```

---

# Installation & setup (instructor / first-time)

Follow these steps **in order** on a clean Ubuntu VM. Use **Node 10** for all commands below unless noted.

## 1. System packages

```bash
sudo apt update
sudo apt install -y git curl build-essential docker.io
# Compose plugin (Ubuntu package name may vary):
sudo apt install -y docker-compose-plugin || sudo apt install -y docker-compose
sudo usermod -aG docker $USER
```

Log out and back in (or `newgrp docker`), then:

```bash
docker --version
docker compose version   # or: docker-compose --version
```

## 2. Node 10 + Yarn

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc

nvm install 10.24.1
nvm use 10
node -v    # v10.24.1

npm install -g yarn@1.22.22
```

## 3. Clone this repository

```bash
cd ~
git clone -b 15-smart-city-energy-trade https://github.com/azraksk/smart-city-energy-trade.git
cd smart-city-energy-trade
yarn install
cd dashboard && yarn install && cd ..
```

## 4. Compile contracts (Linux: Docker solc)

```bash
cd ~/smart-city-energy-trade
nvm use 10
docker pull ethereum/solc:0.5.2
yarn compile-contracts
```

`truffle-config.js` must have `compilers.solc.docker: true`.

## 5. Parity authority network

This repo does **not** ship Parity; use the course reference:

```bash
# Example path — adjust if you cloned elsewhere:
cd ~/decentralized-energy-trading/parity-authority
# Or: cd ~/decentralized-energy-trading/parity-authority

docker compose down -v    # only on FIRST setup or after a broken migrate
docker compose up -d
sleep 20
```

Check RPC (HTTP on **8545**):

```bash
curl -s -X POST http://127.0.0.1:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

Expected: `"result":"0x..."` (not “WebSocket only” — that message is for port **8546**).

## 6. Deploy smart contracts (Node 10)

```bash
cd ~/smart-city-energy-trade
nvm use 10
yarn migrate-contracts-authority-fast
```

Expected end of migration:

```text
Adding 0x00Aa39... to OwnedSet contract ... done
Adding 0x002E28... to OwnedSet contract ... done
Finalizing changes to OwnedSet contract ... done
```

Verify validators:

```bash
yarn check-validators
```

Expected:

```text
H1 registered: true
H2 registered: true
```

If migrate fails halfway, reset chain and retry:

```bash
cd ~/decentralized-energy-trading/parity-authority
docker compose down -v && docker compose up -d && sleep 20
cd ~/smart-city-energy-trade && nvm use 10 && yarn migrate-contracts-authority-fast
```

## 7. MongoDB

From project root:

```bash
cd ~/smart-city-energy-trade
docker compose -f docker/mongo/docker-compose.yml up -d
docker ps | grep mongo
```

## 8. Start services (five terminals)

In **each** terminal:

```bash
cd ~/smart-city-energy-trade
nvm use 10
```

| Terminal | Command | URL |
|----------|---------|-----|
| **1 – NED** | `yarn run-netting` | http://127.0.0.1:3005/ |
| **2 – H1 gateway** | `yarn run-gateway-h1` | http://127.0.0.1:3002/ |
| **3 – H2 gateway** | `yarn run-gateway-h2` | http://127.0.0.1:3003/ |
| **4 – H1 UI** (optional) | `cd dashboard && yarn start:h1` | http://localhost:3000 |
| **5 – H2 UI** (optional) | `cd dashboard && yarn start:h2` | http://localhost:3010 |

**NED** expected log:

```text
Netting service listening on http://127.0.0.1:3005/
Netting cycle every 60000ms ...
Next netting cycle in 60000ms
```

**Gateway** expected log:

```text
Parity connected, chain ready.
Collection ready: sensor_readings
```

If `Port 3005 in use`, NED is already running — use it or run `lsof -ti:3005 | xargs kill` before restart.

Quick health checks:

```bash
yarn check-ned
curl -s http://127.0.0.1:3005/
```

---

# End-to-end test (Test 1 — ~300 kWh)

**Units:** API uses **Ws** (`kWh × 3_600_000 = Ws`). See [docs/TEST_VECTORS.md](docs/TEST_VECTORS.md).

Before each demo round, **restart both gateways** (keeps netting state clean).

## Step 1 — Send sensor data

```bash
curl -X PUT http://127.0.0.1:3002/sensor-stats \
  -H "Content-Type: application/json" \
  -d '{"produce":1800000000,"consume":720000000,"meterDelta":1080000000}'

curl -X PUT http://127.0.0.1:3003/sensor-stats \
  -H "Content-Type: application/json" \
  -d '{"produce":720000000,"consume":2160000000,"meterDelta":-1440000000}'
```

Gateway should log `Sent to NED: meterDelta=...`. NED should log `Meter delta ... from 0x00aa...` and `0x002e...`.

## Step 2 — Wait for netting cycle

```bash
sleep 60
```

NED interval is **60 s** (`yarn run-netting -i 60000`).

## Step 3 — Check transfers

```bash
curl -s "http://127.0.0.1:3002/transfers?from=0"
```

Or NED directly:

```bash
curl -s "http://127.0.0.1:3005/transfers/0x00aa39d30f0d20ff03a22ccfc30b7efbfca597c2?from=0"
```

## Expected output

```json
[
  {
    "from": "0x00aa39d30f0d20ff03a22ccfc30b7efbfca597c2",
    "to": "0x002e28950558fbede1a9675cb113f0bd20912019",
    "amount": 1080000000
  }
]
```

`1080000000` Ws ≈ **300 kWh**. Physical flow: **H1 (producer) → H2 (consumer)**.

## What happens internally

1. Gateways sign a privacy hash of `meterDelta` and `PUT` to NED `/energy/:address`.
2. NED checks the address is an **OwnedSet validator** (after migrate).
3. Every 60 s, NED runs off-chain **settlement** (same math as course reference).
4. Gateway may send `updateRenewableEnergy` to the chain; transfers are stored in **Mongo**.
5. Optional: ZoKrates + `checkNetting` on-chain (not required for amount demo).

---

# Tests (no Parity required)

```bash
cd ~/smart-city-energy-trade
nvm use 10
yarn test
yarn debug-settlement
```

Expected: **9 passing**.

Offline comparison with reference `Utility.js`:

```bash
yarn parity-reference
```

Contract tests (Parity + migrate):

```bash
yarn compile-contracts
yarn test-contracts
```

---

# Examiner checklist

| # | Step |
|---|------|
| 1 | Parity + Mongo + migrate + `yarn check-validators` |
| 2 | NED + both gateways running (`nvm use 10`) |
| 3 | Restart gateways before each test |
| 4 | `PUT /sensor-stats` on **3002** and **3003** |
| 5 | Wait **~60 s**; check `amount` (Ws) |

| Test | Expected `amount` (Ws) | kWh |
|------|------------------------|-----|
| 1 | 1080000000 | 300 |
| 2 | 900000000 | 250 |
| 3 | 1440000000 | 400 |

---

# Common issues

| Problem | Fix |
|---------|-----|
| `Port 3005 in use` | `lsof -ti:3005 \| xargs kill` — or keep existing NED |
| `NED bootstrap failed` / `connection not open` | Wait for Parity; `yarn check-ned`; retry `yarn run-netting` |
| `Address is not a validator household` | `yarn check-validators`; if false: `docker compose down -v` in parity-authority, `up -d`, `yarn migrate-contracts-authority-fast` |
| `ECONNREFUSED 127.0.0.1:27017` | `docker compose -f docker/mongo/docker-compose.yml up -d` |
| Migrate `asyncForEach` / `0x` address errors | `git pull` latest `15-smart-city-energy-trade` |
| Migrate nonce / gas price | `git pull`; reset chain `down -v`; migrate again |
| `docker-compose: command not found` | Use `docker compose` (space) |
| Wrong netting amounts | Use **Ws** in JSON, not kWh integers |
| Only one household PUT | Both H1 and H2 must send before cycle |
| Node 18 with gateway/web3 | Use **`nvm use 10`** |
| Compare with reference repo | [docs/UBUNTU_DUAL_STACK.md](docs/UBUNTU_DUAL_STACK.md) — ports **400x** vs **300x** |

Clear demo state:

```bash
yarn clear-demo
```

---

# ZoKrates (optional)

```bash
yarn setup-zokrates
yarn update-contract-bytecodes
yarn migrate-contracts-authority
```

If `checkNetting` reverts, off-chain transfers and Mongo history still work.

---

# Instructor demo — minimal order

```text
1. docker compose up -d          (parity-authority)
2. docker compose up -d          (mongo — project docker/mongo)
3. nvm use 10 && yarn migrate-contracts-authority-fast && yarn check-validators
4. yarn run-netting              (terminal 1)
5. yarn run-gateway-h1 / h2      (terminals 2–3)
6. curl Test 1 → sleep 60 → curl transfers
7. yarn test                     (optional quick proof)
```

---

# Reference project

See [docs/REFERENCE.md](docs/REFERENCE.md) and [docs/UBUNTU_DUAL_STACK.md](docs/UBUNTU_DUAL_STACK.md). Run reference on **4000-series** ports alongside this repo on **3000-series**; **one Parity**, **one migrate** per fresh chain.

---

## License

Course project — Blockchain Privacy Projects.
