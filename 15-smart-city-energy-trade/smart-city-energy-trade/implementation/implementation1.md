# Linux — sıfırdan çalıştırma (implementation1)

**Benimki için — önce bunu dene.**  
Kurs yolu: `~/blockchain-privacy-projects/15-smart-city-energy-trade/smart-city-energy-trade`  
Node **18** + Yarn 1.x. Sadece komut satırlarını kopyala (`#` ile başlayan satırları terminale yapıştırma).

---

## A) Bir kere kurulum (VM’de ilk gün)

```bash
sudo apt update
sudo apt install -y git curl build-essential docker.io docker-compose lsof util-linux-extra
sudo usermod -aG docker $USER
```

Oturumu kapat-aç (veya yeni terminalde):

```bash
newgrp docker
```

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm install 18
nvm use 18
npm i -g yarn@1.22.22
```

```bash
cd ~
git clone https://github.com/OsmanSelvi84/blockchain-privacy-projects.git
```

Repo zaten varsa:

```bash
cd ~/blockchain-privacy-projects
git pull
```

---

## B) Her açılışta — baştan sona (sunum dahil)

Tek terminalde sırayla (docker yetkisi yoksa her `docker` satırının başına `sudo` ekle):

```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use 18

cd ~/blockchain-privacy-projects/15-smart-city-energy-trade/referans/decentralized-energy-trading/parity-authority
docker compose up -d
sleep 30
curl -s -X POST http://127.0.0.1:8545 -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"net_version","params":[],"id":1}'
```

`8995` görmelisin.

```bash
cd ~/blockchain-privacy-projects/15-smart-city-energy-trade/smart-city-energy-trade
git pull
yarn install
docker pull ethereum/solc:0.5.2
yarn compile-contracts
ls build/contracts/dUtility.json
```

```bash
yarn check-validators
```

H1 ve H2 `true` ise migrate atla, doğrudan Mongo’ya geç.

İkisi `false` ise (veya zinciri sıfırladıysan):

```bash
yarn migrate-contracts-authority-fast
yarn check-validators
```

Zinciri tamamen sıfırlamak için (sadece gerekiyorsa):

```bash
cd ~/blockchain-privacy-projects/15-smart-city-energy-trade/referans/decentralized-energy-trading/parity-authority
docker compose down -v
docker compose up -d
sleep 30
cd ~/blockchain-privacy-projects/15-smart-city-energy-trade/smart-city-energy-trade
yarn migrate-contracts-authority-fast
yarn check-validators
```

```bash
cd ~/blockchain-privacy-projects/15-smart-city-energy-trade/smart-city-energy-trade
docker compose -f docker/mongo/docker-compose.yml up -d
```

Eski servisleri kapat:

```bash
lsof -ti:3005,3002,3003 | xargs -r kill
```

---

## C) 3 servis — 3 ayrı terminal

Her terminalde önce:

```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use 18
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

Gateway’de `Mongo kapalı` yazıyorsa Mongo’yu başlatıp gateway’i Ctrl+C ile yeniden aç.

---

## D) Demo (4. terminal)

```bash
curl -X POST http://127.0.0.1:3005/reset

curl -X PUT http://127.0.0.1:3002/sensor-stats -H "Content-Type: application/json" -d '{"produce":1800000000,"consume":720000000,"meterDelta":1080000000}'

curl -X PUT http://127.0.0.1:3003/sensor-stats -H "Content-Type: application/json" -d '{"produce":720000000,"consume":2160000000,"meterDelta":-1440000000}'

sleep 65
curl -s http://127.0.0.1:3005/ledger
```

Beklenen: transfer, `amount` yaklaşık **1080000000**.

---

## Docker “permission denied” olursa

O terminalde:

```bash
newgrp docker
```

veya tüm docker komutlarını `sudo` ile çalıştır:

```bash
sudo docker compose up -d
sudo docker compose -f docker/mongo/docker-compose.yml up -d
```

---

**Kullanma:** `truffle migrate --reset` (Ganache’a gider).

Takılırsan: `yarn check-validators` çıktısı + NED terminalinin son 10 satırı.
