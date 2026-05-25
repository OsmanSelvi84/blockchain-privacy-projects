# Reference implementation

| Item | Value |
|------|--------|
| Repository | [decentralized-energy-trading](https://github.com/cp-ss2019/decentralized-energy-trading) |
| Local path (read-only) | `/Users/yusra/Desktop/refolabilecekler/decentralized-energy-trading` |
| Pin commit | `476ddd07a50cb901b8bd0a7d4bab95fa466cf3b9` |

## Design intent (ödev)

Bu repo **sizin** `15smart-city` ödevinizdir. [decentralized-energy-trading](https://github.com/cp-ss2019/decentralized-energy-trading) yalnızca **davranış referansı**dır: aynı netting kuralları, aynı test vektörleri (300/250/400 kWh), aynı UI metrikleri — **kaynak kod kopyası değil** (farklı dosya adları, sınıflar ve React bileşenleri).

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

- NED netting every **60 s** (`yarn run-netting`)
- `PUT /sensor-stats` only forwards to NED — **no instant UI transfer**
- Transfers accumulate in **Mongo**; UI polls every **10 s**
- Dashboard **Network Overview**: meter reading, community balance, meter change (referans `household-ui` ile aynı alanlar)
- Ledger yönü: bu projede **fiziksel akış** (üretici → tüketici); referans defter etiketini ters kaydedebilir — **Ws miktarları aynı**
- Between full demos: `yarn clear-demo` (Mongo + NED sıfır) — eski yanlış yönlü transferler kalmasın
- **Aynı anda iki NED çalıştırmayın** (referans ve 15smart-city ikisi de :3005 ister); karşılaştırma için biri, ödev demo için `15smart-city` NED + gateway
