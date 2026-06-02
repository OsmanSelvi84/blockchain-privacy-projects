# Implementation 1 — Kurulum (Linux / VS Code)

İlk kurulum: klonlama, Node 10, bağımlılıklar, Docker, migrate.

Repo: [decentralized-energy-trading](https://github.com/OsmanSelvi84/blockchain-privacy-projects/tree/main/15-smart-city-energy-trade/referans/decentralized-energy-trading)

Çalıştırma adımları için → [implementation2.md](./implementation2.md)

---

## 1) Klonla ve klasöre gir

```bash
cd ~
git clone https://github.com/OsmanSelvi84/blockchain-privacy-projects.git
cd blockchain-privacy-projects/15-smart-city-energy-trade/referans/decentralized-energy-trading
```

VS Code / Cursor:

```bash
code .
```

---

## 2) Gereksinimler

| Bileşen | Sürüm |
|---------|--------|
| Node.js | **10.24.1** (`nvm`) |
| Yarn | 1.22.x |
| Docker + Compose | güncel |
| Python (node-gyp) | **3.10** (Ubuntu; 3.11+ hata verir) |

```bash
nvm install 10.24.1
nvm use 10
node -v    # v10.24.x
npm i -g yarn@1.22.22
yarn -v
```

---

## 3) Bağımlılıkları kur

```bash
cd ~/blockchain-privacy-projects/15-smart-city-energy-trade/referans/decentralized-energy-trading
nvm use 10

bash scripts/install-python-for-nodegyp.sh
rm -rf node_modules
yarn install
```

UI (opsiyonel, sonra da kurulabilir):

```bash
yarn --cwd household-ui install
```

---

## 4) Docker — Mongo + Parity

Linux’ta çoğu VM’de `sudo` gerekir:

```bash
cd ~/blockchain-privacy-projects/15-smart-city-energy-trade/referans/decentralized-energy-trading

sudo docker compose -f mongo/docker-compose.yml up -d --remove-orphans

cd parity-authority
sudo docker compose up -d authority0 authority1 authority2
cd ..

sleep 15
```

Kontrol:

```bash
sudo docker ps | grep -E 'mongo|parity'
curl -s -X POST http://127.0.0.1:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

### Docker izni (kalıcı, isteğe bağlı)

```bash
sudo usermod -aG docker $USER
newgrp docker
# veya oturumu kapatıp tekrar aç
docker ps
```

---

## 5) Migrate (ilk kurulum)

```bash
nvm use 10
bash scripts/reset-parity-and-migrate.sh
```

Başarılı çıktı örneği:

```text
Connected to Parity (block ...) ... ok
Set verifier contract address ... done
```

### Migrate sorunları

| Hata | Çözüm |
|------|--------|
| `SyntaxError: Unexpected token .` (`this?.hexFormat`) | `yarn add -D truffle@5.1.0` sonra `yarn install` |
| `setVerifier` revert | Zincir zaten yapılandırılmış → demo için migrate **atla** veya `reset-parity-and-migrate.sh` (chain sıfırlar) |
| Sadece terminal demo | Parity ayaktaysa migrate **şart değil** |

Truffle repo’da **5.1.0** sabitlenmiş olmalı (`package.json`).

---

## 6) Sabit adresler (komutta tam yaz)

Dokümandaki `0x00aa...` kısaltmadır. Komutlarda **tam adres** kullan:

| Hane | Adres |
|------|--------|
| H1 | `0x00aa39d30f0d20ff03a22ccfc30b7efbfca597c2` |
| H2 | `0x002e28950558fbede1a9675cb113f0bd20912019` |

---

## 7) Portlar

| Servis | Port |
|--------|------|
| Parity RPC | 8545 |
| Parity WS (NED) | 8546 |
| Mongo H1 | 27011 |
| Mongo H2 | 27012 |
| NED | 4005 |
| H1 API | 4002 |
| H2 API | 4003 |
| H1 UI | 4000 |
| H2 UI | 4010 |

---

Kurulum bitti → [implementation2.md](./implementation2.md) ile servisleri başlat ve demo yap.
