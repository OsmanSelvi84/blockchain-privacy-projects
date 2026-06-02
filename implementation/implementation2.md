# Linux — deneme günlüğü ve çalışan yol (implementation2)

**Benimki için 2.**  
Bu dosya, VM’de adım adım denediğin sırayı ve **sonunda işe yarayan** komutları toplar.  
**Önce dene:** [implementation1.md](./implementation1.md) (daha kısa, temiz akış).  
Bu dosya: Node 10 denemeleri, Docker izni, Node 18’e geçiş dahil.

Kurs yolu: `~/blockchain-privacy-projects/15-smart-city-energy-trade/smart-city-energy-trade`

---

## A) Sistem + Docker

```bash
sudo apt update
sudo apt install -y git curl build-essential docker.io docker-compose lsof
sudo usermod -aG docker "$USER"
```

```bash
sudo apt install -y util-linux-extra
sudo usermod -aG docker $USER
newgrp docker
```

Kontrol:

```bash
docker ps
```

`permission denied` olursa: `sudo docker ...` veya logout/login.

---

## B) Node — önce 10 denendi, sonra 18 (çalışan: 18)

### Deneme: Node 10

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.nvm/nvm.sh
nvm install 10.24.1
nvm use 10
npm i -g yarn@1.22.22
```

`yarn install` Node 10’da engine hataları verebilir (`secp256k1`, `@truffle/*`, `@noble/hashes`).

### Çalışan: Node 18

```bash
source ~/.nvm/nvm.sh
nvm install 18
nvm use 18
node -v
npm i -g yarn@1.22.22
yarn -v
```

---

## C) Repo

```bash
cd ~
git clone https://github.com/OsmanSelvi84/blockchain-privacy-projects.git
cd blockchain-privacy-projects/15-smart-city-energy-trade/smart-city-energy-trade
```

Zaten varsa:

```bash
cd ~/blockchain-privacy-projects
git pull
cd 15-smart-city-energy-trade/smart-city-energy-trade
```

VS Code (isteğe bağlı):

```bash
code .
```

Terminal: **Terminal → New Terminal**

---

## D) Parity

İlk deneme (`docker-compose`, izin hatası olabilir):

```bash
cd ~/blockchain-privacy-projects/15-smart-city-energy-trade/referans/decentralized-energy-trading/parity-authority
docker-compose up -d
sleep 30
curl -s -X POST http://127.0.0.1:8545 -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"net_version","params":[],"id":1}'
```

Çalışan:

```bash
cd ~/blockchain-privacy-projects/15-smart-city-energy-trade/referans/decentralized-energy-trading/parity-authority
sudo docker compose up -d
sudo docker ps
curl -s -X POST http://127.0.0.1:8545 -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"net_version","params":[],"id":1}'
```

Beklenen: **8995**

---

## E) Proje kurulum + compile

```bash
cd ~/blockchain-privacy-projects/15-smart-city-energy-trade/smart-city-energy-trade
source ~/.nvm/nvm.sh && nvm use 18
git pull
rm -rf node_modules
yarn cache clean
yarn install
ls node_modules/express
```

```bash
sudo docker pull ethereum/solc:0.5.2
yarn compile-contracts
ls build/contracts/dUtility.json
```

`permission denied` compile sırasında → `newgrp docker` sonra tekrar `yarn compile-contracts`, veya:

```bash
sudo docker pull ethereum/solc:0.5.2
```

(`sudo yarn compile-contracts` çalışmaz; `yarn` sudo PATH’te yok.)

---

## F) Mongo

```bash
cd ~/blockchain-privacy-projects/15-smart-city-energy-trade/smart-city-energy-trade
sudo docker compose -f docker/mongo/docker-compose.yml up -d
```

---

## G) Migrate + validator

```bash
cd ~/blockchain-privacy-projects/15-smart-city-energy-trade/smart-city-energy-trade
source ~/.nvm/nvm.sh && nvm use 18
yarn migrate-contracts-authority-fast
yarn check-validators
```

`migrate` kırmızı olup **H1/H2 true** ise migrate atlanabilir (zincir zaten kurulu).

---

## H) 3 servis (3 terminal)

Her terminalde:

```bash
source ~/.nvm/nvm.sh && nvm use 18
cd ~/blockchain-privacy-projects/15-smart-city-energy-trade/smart-city-energy-trade
```

Terminal 1:

```bash
yarn run-netting
```

Terminal 2:

```bash
yarn run-gateway-h1
```

Terminal 3:

```bash
yarn run-gateway-h2
```

`Mongo kapalı` → Mongo’yu başlat, gateway’i Ctrl+C ile yeniden aç.

---

## I) Test 1

```bash
curl -X POST http://127.0.0.1:3005/reset

curl -X PUT http://127.0.0.1:3002/sensor-stats -H "Content-Type: application/json" \
  -d '{"produce":1800000000,"consume":720000000,"meterDelta":1080000000}'

curl -X PUT http://127.0.0.1:3003/sensor-stats -H "Content-Type: application/json" \
  -d '{"produce":720000000,"consume":2160000000,"meterDelta":-1440000000}'

sleep 65
curl -s http://127.0.0.1:3005/ledger
```

Beklenen: `amount` yaklaşık **1080000000**.

---

## Notlar

- `ubuntu.sources.curtin.orig` apt uyarısı → yok say, sorun değil.
- `docker compose` / `docker-compose` ikisinden biri yeterli.
- **Kullanma:** `truffle migrate --reset` (Ganache).
- Sorun: `yarn check-validators` + NED log son 10 satır.
