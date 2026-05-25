# Smart City Energy Trade

Privacy-preserving peer-to-peer **energy netting** (kWh transfers, not EUR trading) for a neighbourhood microgrid. Meter readings are hashed and signed off-chain; settlement is proved with ZoKrates and verified on-chain via `dUtility.checkNetting`.

> **Presentation line:** “Mahalle içi enerji paylaşımı; gizlilik için ölçüm verisi zincirde düz metin değil, hash + zk kanıt ile doğrulanıyor.”

## Requirements

| Tool | Version |
|------|---------|
| Node.js | **10.x** (`nvm use 10`) |
| Yarn | 1.x |
| Docker | Mongo + Parity authority (3 nodes) |
| ZoKrates | **0.6.4** |
| Truffle | 5.x (solc **0.5.2**, docker compiler) |

## Project layout

```
contracts/           Solidity (dUtility, OwnedSet, verifier)
netting-service/     NED (port 3005) — off-chain netting + zk pipeline
household-gateway/   REST API (3002 / 3003)
dashboard/           React UI (3000 / 3010)
zk/                  settlement-check.zok
docs/                TEST_VECTORS.md, REFERENCE.md
```

## Startup order

1. **Mongo:** `docker-compose -f docker/mongo/docker-compose.yml up -d`
2. **Parity authorities** (ports 8546, 8556, 8566) — use your course `parity-authority` compose from the reference setup.
3. **Migrate:** `yarn migrate-contracts-authority`
4. **NED:** `yarn run-netting` (interval 30s default in `ned-config.js`)
5. **Household gateways** (restart between demo rounds):

```bash
# Kill stale processes
lsof -ti:3002,3003 | xargs kill 2>/dev/null || true

# H1 (Parity şifresi: node1 — authority1.pwd)
yarn run-gateway-h1

# H2 (Parity şifresi: node2 — authority2.pwd)
yarn run-gateway-h2
```

6. **Dashboards:**

```bash
cd dashboard && yarn install && PORT=3000 BROWSER=none yarn start
# second UI
cd dashboard && REACT_APP_HSS_PORT=3003 PORT=3010 BROWSER=none yarn start
```

## Demo (UI veya curl, mock-sensor OFF)

**UI:** Dashboard’da **Sensor girişi** kutusundan kWh girin (veya Test 1/2/3). H1 → http://localhost:3000, H2 → http://localhost:3010. Her turda önce gateway restart.

```bash
# Alternatif: curl — Test 1, gateway restart sonrası
curl -X PUT http://127.0.0.1:3002/sensor-stats -H 'Content-Type: application/json' \
  -d '{"produce":1800000000,"consume":720000000,"meterDelta":1080000000}'
curl -X PUT http://127.0.0.1:3003/sensor-stats -H 'Content-Type: application/json' \
  -d '{"produce":720000000,"consume":2160000000,"meterDelta":-1440000000}'
sleep 60
curl -s "http://127.0.0.1:3005/transfers/0x00aa39d30f0d20ff03a22ccfc30b7efbfca597c2?from=0" | jq '.[].amount'
# Expect: 1080000000  (~300 kWh)
```

**Important:** Values are in **Ws**, not kWh (`500` in curl is wrong — use `1800000000` for 500 kWh produce).

## Examiner checklist (5 tests)

1. Two gateways + NED (+ Parity optional for on-chain event).
2. **Restart both gateways** before each test.
3. `PUT /sensor-stats` on 3002 and 3003.
4. Wait **~60 s**.
5. Compare with reference — see [docs/TEST_VECTORS.md](docs/TEST_VECTORS.md).

| Test | Expected `amount` (Ws) | kWh |
|------|------------------------|-----|
| 1 | 1080000000 | 300 |
| 2 | 900000000 | 250 |
| 3 | 1440000000 | 400 |

## Tests

```bash
nvm use 10
yarn install --ignore-engines
yarn test                  # settlement math (3 course vectors)
yarn parity-reference      # compare amounts with reference Utility (offline)
yarn compile-contracts
yarn test-contracts        # dUtility + mock verifier
```

## ZoKrates / verifier

```bash
yarn setup-zokrates
yarn update-contract-bytecodes
yarn migrate-contracts-authority
```

If `checkNetting` reverts, off-chain transfers are still published (same as reference demo fallback).

## Reference comparison

See [docs/REFERENCE.md](docs/REFERENCE.md). Example:

```bash
H1=0x00aa39d30f0d20ff03a22ccfc30b7efbfca597c2
diff <(curl -s "http://127.0.0.1:3005/transfers/${H1}?from=0" | jq -S '[.[].amount] | sort') \
     <(curl -s "http://REF_HOST:3005/transfers/${H1}?from=0" | jq -S '[.[].amount] | sort')
```

## Common pitfalls

1. Curl with kWh instead of Ws → wrong netting.
2. Second PUT without gateway restart → NED ignores reading.
3. Only one household PUT → incomplete netting.
4. H2 gateway on Node 18 → web3 crash; use Node 10.
5. Parity authority1/2 exited → “connection not open”.
6. NED down → no `network-stats` / transfers.
7. Verifier mismatch → run `setup-zokrates` + migrate.
8. `EADDRINUSE` → `lsof -ti:PORT | xargs kill`.

## License

Course project — Blockchain Privacy Projects.
