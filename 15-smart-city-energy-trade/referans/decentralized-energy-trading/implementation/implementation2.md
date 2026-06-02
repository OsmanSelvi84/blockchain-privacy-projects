# Implementation 2 — Çalıştırma ve demo

Kurulum tamamlandıktan sonra: NED + H1 + H2 + curl testi (+ isteğe bağlı UI).

Kurulum için → [implementation1.md](./implementation1.md)

---

## 1) Ön kontrol

```bash
curl -s http://127.0.0.1:4005/          # NED (henüz yoksa başlat)
curl -s http://127.0.0.1:8545/          # Parity HTTP değil; RPC aşağıda
```

Parity:

```bash
curl -s -X POST http://127.0.0.1:8545 -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

Eski süreçleri kapat (gerekirse):

```bash
sudo lsof -ti:4002,4003,4005 | xargs -r kill -9
```

---

## 2) Servisleri başlat (3 terminal)

Proje kökü:

```bash
cd ~/blockchain-privacy-projects/15-smart-city-energy-trade/referans/decentralized-energy-trading
nvm use 10
```

### Terminal 1 — NED (4005)

```bash
yarn run-netting-entity -i 60000
```

Beklenen:

```text
NED chain: authority_ws (ws://127.0.0.1:8546)
Netting Entity running at http://127.0.0.1:4005/
```

ZoKrates uyarısı (`zokrates not found`) → **yok say**; off-chain netting çalışır.

### Terminal 2 — H1 (4002)

```bash
yarn run-server -p 4002 \
  -a 0x00aa39d30f0d20ff03a22ccfc30b7efbfca597c2 \
  -P node1 \
  -n authority_1 \
  -d mongodb://127.0.0.1:27011 \
  -N http://127.0.0.1:4005
```

Beklenen: `Household Server running at http://127.0.0.1:4002/`

### Terminal 3 — H2 (4003)

```bash
yarn run-server -p 4003 \
  -a 0x002e28950558fbede1a9675cb113f0bd20912019 \
  -P node2 \
  -n authority_2 \
  -d mongodb://127.0.0.1:27012 \
  -N http://127.0.0.1:4005
```

Beklenen: `Household Server running at http://127.0.0.1:4003/`

**Sıra:** NED → H1 → H2 (NED kapalıyken H1/H2 başlarsan `ECONNREFUSED 4005` olur).

---

## 3) Demo — Terminal 4 (curl)

### Senaryo 1 (referans, ~200 kWh transfer)

```bash
curl -X PUT http://127.0.0.1:4002/sensor-stats \
  -H "Content-Type: application/json" \
  -d '{"produce":1800000000,"consume":1080000000,"meterDelta":720000000}'

curl -X PUT http://127.0.0.1:4003/sensor-stats \
  -H "Content-Type: application/json" \
  -d '{"produce":720000000,"consume":2160000000,"meterDelta":-1440000000}'
```

NED logunda:

```text
Incoming meter delta 720000000 ...
Incoming meter delta -1440000000 ...
```

```bash
sleep 65

curl -s "http://127.0.0.1:4005/transfers/0x00Aa39d30F0D20FF03a22cCfc30B7EfbFca597C2?from=0" | python3 -m json.tool
```

Beklenen:

```json
"amount": 720000000
```

`720000000 Ws ÷ 3600000 = 200 kWh`

### Senaryo 2 (~1500 kWh transfer)

Yeni tur için **H1 + H2 yeniden başlat** (aşağıdaki bölüm), sonra:

```bash
curl -X PUT http://127.0.0.1:4002/sensor-stats \
  -H "Content-Type: application/json" \
  -d '{"produce":2500000000,"consume":1000000000,"meterDelta":1500000000}'

curl -X PUT http://127.0.0.1:4003/sensor-stats \
  -H "Content-Type: application/json" \
  -d '{"produce":500000000,"consume":2000000000,"meterDelta":-1500000000}'
```

Beklenen yeni transfer: `"amount": 1500000000`

---

## 4) Yeni test turu kuralı

Household sunucuları NED’e veriyi **sadece ilk PUT**’te gönderir.

```bash
sudo lsof -ti:4002,4003 | xargs -r kill -9
```

Terminal 2 ve 3’te `yarn run-server` komutlarını tekrar çalıştır, sonra yeni curl.

---

## 5) UI (opsiyonel)

```bash
nvm use 10
yarn run-ui-h1    # http://127.0.0.1:4000
```

Yeni terminal:

```bash
yarn run-ui-h2    # http://127.0.0.1:4010
```

Arka planda NED + H1 + H2 ayakta olmalı.

---

## 6) Sunum günü (hocanın PC’si) — kısa checklist

1. `git clone` + `nvm use 10` + `yarn install`
2. `sudo docker compose` (mongo + parity)
3. `bash scripts/reset-parity-and-migrate.sh` (hata → atla)
4. NED → H1 → H2
5. İki `curl` PUT → NED’de `Incoming meter delta`
6. `sleep 65` → `transfers` → `amount: 720000000`

Hocaya: “İki hane veri gönderir, NED off-chain netting yapar, transfer miktarı API’de görünür.”

---

## 7) Sık hatalar

| Belirti | Çözüm |
|--------|--------|
| `EADDRINUSE 4005/4002` | `sudo lsof -ti:PORT \| xargs -r kill -9` |
| `Failed to connect 4002` | H1 kapalı — Terminal 2’yi başlat |
| `ECONNREFUSED 4005` | NED kapalı — Terminal 1 |
| `transfers: []` | NED’e veri gitmedi; H1/H2 restart + curl tekrar |
| `0x002e... is invalid` | Adresi kısaltma; **tam adres** kullan |
| `sync transfers from NED: 400` | Geçersiz adres veya NED kapalı |

---

## 8) Durdurma

```bash
sudo lsof -ti:4002,4003,4005,4000,4010 | xargs -r kill -9
cd parity-authority && sudo docker compose down
cd .. && sudo docker compose -f mongo/docker-compose.yml down
```
