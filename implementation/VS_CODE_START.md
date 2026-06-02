# VS Code (Visual Studio Code) — Çalıştırma Kılavuzu (Smart City)

Bu dosya **README yerine** hızlı başlatma için. Akış: **Parity → migrate → Mongo → NED → Gateway’ler → UI**.

> Önemli: Bu proje **Node 10** ile çalışır. `truffle migrate --reset` **kullanma** (Ganache’a deploy eder).

---

## 0) Kurs reposunu klonla (başlangıç)

Bu proje kurs monorepo içinde şu dizinde:
`15-smart-city-energy-trade/smart-city-energy-trade`

```bash
cd ~
git clone https://github.com/OsmanSelvi84/blockchain-privacy-projects.git
cd blockchain-privacy-projects/15-smart-city-energy-trade/smart-city-energy-trade
```

VS Code ile aç:

```bash
code .
```

VS Code’da Terminal aç:
- Menü: **Terminal → New Terminal**
- Kısayol: **Ctrl + `**

---

## 1) Gerekenler (kısa)

- Docker + Compose (`docker compose` veya `docker-compose`)
- `nvm` + Node **10.24.1**
- Yarn 1.x

Node 10:

```bash
source ~/.nvm/nvm.sh
nvm install 10.24.1
nvm use 10
```

---

## 2) Parity authority chain’i başlat (8995)

Bu proje Parity chain’i **monorepo içindeki referans parity-authority** ile çalıştırır:

```bash
cd ~/blockchain-privacy-projects/15-smart-city-energy-trade/referans/decentralized-energy-trading/parity-authority
docker compose up -d
# yoksa:
# docker-compose up -d
sleep 30
```

Kontrol (sonuç `8995` olmalı):

```bash
curl -s -X POST http://127.0.0.1:8545 -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"net_version","params":[],"id":1}'
```

---

## 3) Proje bağımlılıkları + contract compile

VS Code terminalinde proje kökünde:

```bash
cd ~/blockchain-privacy-projects/15-smart-city-energy-trade/smart-city-energy-trade
source ~/.nvm/nvm.sh && nvm use 10
yarn install
docker pull ethereum/solc:0.5.2
yarn compile-contracts
```

---

## 4) Authority migrate (zincir sıfırlandıysa gerekli)

Parity `docker compose down -v` ile sıfırlandıysa veya ilk kez kuruyorsan çalıştır:

```bash
cd ~/blockchain-privacy-projects/15-smart-city-energy-trade/smart-city-energy-trade
source ~/.nvm/nvm.sh && nvm use 10
yarn migrate-contracts-authority-fast
yarn check-validators
```

`H1 registered: true` ve `H2 registered: true` görmelisin.

---

## 5) Mongo (27017) başlat

```bash
cd ~/blockchain-privacy-projects/15-smart-city-energy-trade/smart-city-energy-trade
docker compose -f docker/mongo/docker-compose.yml up -d
# yoksa:
# docker-compose -f docker/mongo/docker-compose.yml up -d
```

Gateway’de `Mongo kapalı (mongodb://127.0.0.1:27017)` görürsen:
- Mongo’yu başlat
- Gateway’i **Ctrl+C** ile durdurup tekrar aç

---

## 6) Servisleri başlat (VS Code’da 4 terminal)

Her terminalde önce:

```bash
cd ~/blockchain-privacy-projects/15-smart-city-energy-trade/smart-city-energy-trade
source ~/.nvm/nvm.sh && nvm use 10
```

### Terminal 1 — NED (:3005)

```bash
yarn run-netting
```

### Terminal 2 — Gateway H1 (:3002)

```bash
yarn run-gateway-h1
```

### Terminal 3 — Gateway H2 (:3003)

```bash
yarn run-gateway-h2
```

### Terminal 4 — UI (opsiyonel)

H1 UI:

```bash
cd dashboard
yarn install
yarn start:h1
```

H2 UI (ayrı terminal aç):

```bash
cd dashboard
yarn start:h2
```

Açılacak adresler:
- H1 UI: `http://127.0.0.1:3000`
- H2 UI: `http://127.0.0.1:3010`

---

## 7) Demo (Test 1)

Yeni bir terminalde:

```bash
curl -X POST http://127.0.0.1:3005/reset

curl -X PUT http://127.0.0.1:3002/sensor-stats -H "Content-Type: application/json" \
  -d '{"produce":1800000000,"consume":720000000,"meterDelta":1080000000}'

curl -X PUT http://127.0.0.1:3003/sensor-stats -H "Content-Type: application/json" \
  -d '{"produce":720000000,"consume":2160000000,"meterDelta":-1440000000}'

sleep 65
curl -s http://127.0.0.1:3005/ledger
```

Beklenen `amount`: **1080000000** (Ws).

---

## Hızlı hata ayıklama

```bash
cd ~/blockchain-privacy-projects/15-smart-city-energy-trade/smart-city-energy-trade
source ~/.nvm/nvm.sh && nvm use 10
yarn check-ned
yarn check-validators
```

