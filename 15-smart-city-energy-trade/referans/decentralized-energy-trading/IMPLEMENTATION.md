# Implementation (VS Code / Cursor Startup Guide)

This document is a **separate, step-by-step “how to run” guide** for opening and demoing the reference project inside **Visual Studio Code / Cursor** using integrated terminals.

> Repo reference: `OsmanSelvi84/blockchain-privacy-projects` → `15-smart-city-energy-trade/referans/decentralized-energy-trading`

---

## 1) Clone the repo and open in VS Code

In a VS Code integrated terminal (or normal terminal):

```bash
cd ~
git clone https://github.com/OsmanSelvi84/blockchain-privacy-projects.git
cd blockchain-privacy-projects/15-smart-city-energy-trade/referans/decentralized-energy-trading
code .
```

If you already have the folder, just `cd` into it and run `code .`.

---

## 2) Requirements (quick)

- **Node.js**: **v10.24.1** (use `nvm`)
- **Yarn**: v1.x
- **Docker + Docker Compose**

### Node (recommended)

```bash
nvm install 10.24.1
nvm use 10
node -v
yarn -v
```

On Ubuntu VMs: if `yarn install` fails due to `node-gyp`, use Python 3.10 (see `README.md` / `scripts/ubuntu-setup.sh`).

---

## 3) Install dependencies

From the project root:

```bash
nvm use 10
yarn install
```

UI dependencies (optional):

```bash
yarn --cwd household-ui install
```

---

## 4) Start the system (terminal-only demo)

Open **4 terminals** in VS Code/Cursor:

- Terminal 1: NED (netting entity)
- Terminal 2: Household 1 (H1)
- Terminal 3: Household 2 (H2)
- Terminal 4: demo `curl` commands

### Terminal 0 (one-time): Mongo + Parity

```bash
cd ~/blockchain-privacy-projects/15-smart-city-energy-trade/referans/decentralized-energy-trading
nvm use 10

# Stop old node processes (optional)
sudo lsof -ti:4002,4003,4005 | xargs -r kill -9 2>/dev/null

# MongoDB (H1:27011, H2:27012)
docker compose -f mongo/docker-compose.yml up -d --remove-orphans

# Parity PoA nodes
cd parity-authority
docker compose up -d authority0 authority1 authority2
cd ..
sleep 15

# Sanity check (HTTP RPC)
curl -s -X POST http://127.0.0.1:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

### Terminal 1: NED (Netting Entity) — port 4005

```bash
cd ~/blockchain-privacy-projects/15-smart-city-energy-trade/referans/decentralized-energy-trading
nvm use 10
yarn run-netting-entity -i 60000
```

Check it responds:

```bash
curl -s http://127.0.0.1:4005/
```

> ZoKrates warning (`zokrates not found`) is OK for terminal demo; off-chain netting still works.

### Terminal 2: H1 Household Server — port 4002

```bash
cd ~/blockchain-privacy-projects/15-smart-city-energy-trade/referans/decentralized-energy-trading
nvm use 10
yarn run-server -p 4002 \
  -a 0x00aa39d30f0d20ff03a22ccfc30b7efbfca597c2 \
  -P node1 -n authority_1 \
  -d mongodb://127.0.0.1:27011 \
  -N http://127.0.0.1:4005
```

Expected:

- `Household Server running at http://127.0.0.1:4002/`

### Terminal 3: H2 Household Server — port 4003

```bash
cd ~/blockchain-privacy-projects/15-smart-city-energy-trade/referans/decentralized-energy-trading
nvm use 10
yarn run-server -p 4003 \
  -a 0x002e28950558fbede1a9675cb113f0bd20912019 \
  -P node2 -n authority_2 \
  -d mongodb://127.0.0.1:27012 \
  -N http://127.0.0.1:4005
```

Expected:

- `Household Server running at http://127.0.0.1:4003/`

---

## 5) Demo test (curl) + expected output

### Terminal 4: Send meter deltas

Scenario (reference):
- H1: +200 kWh surplus → `meterDelta: 720000000` Ws
- H2: -400 kWh deficit → `meterDelta: -1440000000` Ws

```bash
curl -X PUT http://127.0.0.1:4002/sensor-stats \
  -H "Content-Type: application/json" \
  -d '{"produce":1800000000,"consume":1080000000,"meterDelta":720000000}'

curl -X PUT http://127.0.0.1:4003/sensor-stats \
  -H "Content-Type: application/json" \
  -d '{"produce":720000000,"consume":2160000000,"meterDelta":-1440000000}'
```

Wait for the netting interval:

```bash
sleep 65
```

Check transfers on NED:

```bash
curl -s "http://127.0.0.1:4005/transfers/0x00Aa39d30F0D20FF03a22cCfc30B7EfbFca597C2?from=0" | python3 -m json.tool
```

Expected: at least one transfer with:

- `amount: 720000000` (Ws) \(= 200 kWh\)

Convert: `kWh = amount / 3600000`.

---

## 6) Important rule: restart H1 + H2 for a new test round

Household servers only send netting input to NED on the **first** `PUT` after they start (`nettingActive` flag).

Before a new round:

```bash
sudo lsof -ti:4002,4003 | xargs -r kill -9
```

Then re-run Terminal 2 and Terminal 3 commands, then run the next `curl` inputs.

---

## 7) UI startup (optional)

Open **2 more terminals**:

### UI for H1 (port 4000)

```bash
cd ~/blockchain-privacy-projects/15-smart-city-energy-trade/referans/decentralized-energy-trading
nvm use 10
yarn --cwd household-ui install
yarn run-ui-h1
```

Open: `http://127.0.0.1:4000`

### UI for H2 (port 4010)

```bash
cd ~/blockchain-privacy-projects/15-smart-city-energy-trade/referans/decentralized-energy-trading
nvm use 10
yarn run-ui-h2
```

Open: `http://127.0.0.1:4010`

---

## 8) Troubleshooting (fast)

### `EADDRINUSE` (port already in use)

```bash
sudo lsof -ti:4002,4003,4005,4000,4010 | xargs -r kill -9
```

### `ECONNREFUSED 127.0.0.1:4005`

NED is not running. Start Terminal 1 first, then restart H1/H2.

### Mongo `ECONNREFUSED 27011/27012`

```bash
docker compose -f mongo/docker-compose.yml up -d --remove-orphans
```

### Truffle `SyntaxError: Unexpected token .` (`this?.hexFormat`) on Node 10

Pin Truffle:

```bash
nvm use 10
yarn add -D truffle@5.1.0
```

### Migration `setVerifier` revert

Chain is already configured. For a clean migration:

```bash
bash scripts/reset-parity-and-migrate.sh
```

For demos, you can usually **skip migration** and just run NED + H1/H2 + curl.

---

## 9) Stop everything

```bash
sudo lsof -ti:4002,4003,4005,4000,4010 | xargs -r kill -9
cd parity-authority && docker compose down
cd .. && docker compose -f mongo/docker-compose.yml down
```

