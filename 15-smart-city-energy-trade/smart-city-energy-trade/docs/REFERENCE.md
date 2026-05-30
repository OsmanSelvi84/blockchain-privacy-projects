# Reference implementation

| Item | Value |
|------|--------|
| Repository | (https://github.com/JacobEberhardt/decentralized-energy-trading) |
| Local path (read-only) | `/Users/yusra/Desktop/refolabilecekler/decentralized-energy-trading` |
| Pin commit | `476ddd07a50cb901b8bd0a7d4bab95fa466cf3b9` |

Offline doğrulama (referans `Utility` vs bizim `SettlementEngine`):

```bash
yarn parity-reference
```

## Functional comparison

This project (`smart-city-energy-trade`) keeps **compatible REST endpoints** and **the same transfer `amount` values (Ws)** for the course test vectors, while using its own module layout:

| Reference | This project |
|-----------|----------------|
| `netting-entity/utility.js` | `netting-service/settlement-engine.js` |
| `household-server/` | `household-gateway/` |
| `helpers/zokrates.js` | `lib/privacy-hash.js` |
| `household-ui/` | `dashboard/` |
| `zokrates-code/` | `zk/` |

## Compare transfer amounts

With both NED instances running on port 3005 (only one at a time):

```bash
H1=0x00aa39d30f0d20ff03a22ccfc30b7efbfca597c2
diff <(curl -s "http://127.0.0.1:3005/transfers/${H1}?from=0" | jq -S '[.[].amount] | sort') \
     <(curl -s "http://127.0.0.1:3005/transfers/${H1}?from=0" | jq -S '[.[].amount] | sort')
```
## Runtime mode (aligned with reference)

- NED netting every **60 seconds** (`yarn run-netting`)
- `PUT /sensor-stats` only forwards to NED — **no instant UI transfer**
- Transfers accumulate in **Mongo**; UI polls every **10 seconds**
- Dashboard **Network Overview**: meter reading, community balance, meter change (same fields as reference `household-ui`)
- Ledger direction: **physical flow** in this project (producer → consumer); can record the reference ledger tag in reverse — **WS amounts are the same**
- Between full demos: `yarn clear-demo` (Mongo + NED zero) — prevent old, incorrectly oriented transfers from remaining
- **Two NEDs side-by-side:** assignment `:3005`, reference `:4005` — see [UBUNTU_DUAL_STACK.md](./UBUNTU_DUAL_STACK.md)
- Shared **single Parity**; migrate **once** per chain (`smart-city-energy-trade`)
