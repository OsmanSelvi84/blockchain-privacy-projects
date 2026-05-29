# Ubuntu: smart-city + referans yan yana (port çakışması yok)

İki proje **aynı Parity zincirini** paylaşır. **İkinci Parity veya ikinci migrate gerekmez** (smart-city migrate + `yarn check-validators` OK ise).

## Port tablosu

| Servis | smart-city-energy-trade | decentralized-energy-trading (referans) |
|--------|-------------------------|----------------------------------------|
| H1 UI | 3000 | **4000** |
| H1 API | 3002 | **4002** |
| H2 API | 3003 | **4003** |
| NED | 3005 | **4005** |
| H2 UI | 3010 | **4010** |
| Mongo | 27017 (tek DB) | **27011** (H1), **27012** (H2) |
| Parity | 8545/8546/8556/8566 | **aynı** (tek `parity-authority`) |

## Ne tekrar çalıştırılır?

| Bileşen | Tek mi? | Not |
|---------|---------|-----|
| `parity-authority` docker | **1×** | Zaten ayaktaysa `docker compose up -d` yeter |
| `yarn migrate-contracts-authority` | **1×** | Zincir sıfırlandıysa **bir** projede migrate; ikisinde arka arkaya `--reset` yapma |
| Mongo smart-city | `docker compose -f docker/mongo/docker-compose.yml` | 27017 |
| Mongo referans | `docker compose -f mongo/docker-compose.yml` | 27011/27012 |
| NED | **2×** | 3005 + 4005 (farklı off-chain state — karşılaştırma için doğru) |

---

## A) smart-city (ödev) — zaten kuruluysa

```bash
cd ~/smart-city-energy-trade
nvm use 10

# Parity (sadece kapalıysa)
cd ~/refolabilecekler/decentralized-energy-trading/parity-authority
docker compose up -d

# Mongo ödev
cd ~/smart-city-energy-trade
docker compose -f docker/mongo/docker-compose.yml up -d

# Validator (bir kez)
yarn check-validators   # H1/H2 true olmalı

# Servisler — ayrı terminaller
yarn run-netting        # :3005
yarn run-gateway-h1     # :3002
yarn run-gateway-h2     # :3003
cd dashboard && yarn start:h1   # :3000
cd dashboard && yarn start:h2   # :3010
```

Test 1 curl: `docs/TEST_VECTORS.md` (port **3002/3003**).

---

## B) Referans — klon + 4000 port yaması

```bash
cd ~
git clone https://github.com/cp-ss2019/decentralized-energy-trading.git
# veya kendi fork’un

cd decentralized-energy-trading
nvm use 10
yarn install
yarn --cwd household-ui install

# Portları 4000 serisine al (smart-city repo’daki script)
bash ~/smart-city-energy-trade/scripts/reference-4000-patch.sh "$(pwd)"
```

**Migrate atla** — smart-city ile aynı zincirde zaten migrate ettiysen:

```bash
yarn check-validators   # smart-city repo’dan; veya referansta curl NED
```

Zincir **sıfırlandıysa** (`docker compose down -v`) sadece **bir kez**:

```bash
cd ~/smart-city-energy-trade
yarn migrate-contracts-authority-fast
# referans migrate ÇALIŞTIRMA (aynı migration, aynı adresler)
```

Referans Mongo:

```bash
cd ~/decentralized-energy-trading
docker compose -f mongo/docker-compose.yml up -d
```

Referans servisler (ayrı terminaller, `nvm use 10`):

```bash
cd ~/decentralized-energy-trading
yarn run-netting-ref -i 60000      # :4005
yarn run-server-h1                 # :4002, mongo 27011
yarn run-server-h2                 # :4003, mongo 27012
yarn run-ui-h1                     # :4000
yarn run-ui-h2                     # :4010
```

Test 1 curl (referans):

```bash
curl -X PUT http://127.0.0.1:4002/sensor-stats -H "Content-Type: application/json" \
  -d '{"produce":1800000000,"consume":720000000,"meterDelta":1080000000}'
curl -X PUT http://127.0.0.1:4003/sensor-stats -H "Content-Type: application/json" \
  -d '{"produce":720000000,"consume":2160000000,"meterDelta":-1440000000}'
sleep 60
curl -s "http://127.0.0.1:4005/transfers/0x00aa39d30f0d20ff03a22ccfc30b7efbfca597c2?from=0"
```

---

## C) Miktarları karşılaştır (aynı anda iki NED)

```bash
H1=0x00aa39d30f0d20ff03a22ccfc30b7efbfca597c2
echo "=== smart-city :3005 ==="
curl -s "http://127.0.0.1:3005/transfers/${H1}?from=0" | jq '[.[].amount]'

echo "=== referans :4005 ==="
curl -s "http://127.0.0.1:4005/transfers/${H1}?from=0" | jq '[.[].amount]'
```

Offline (port kapmaz): `cd ~/smart-city-energy-trade && yarn parity-reference`

**Uyarı:** Aynı Test 1 verisini **her iki çifte gateway’e** aynı anda gönderirsen iki NED ayrı state tutar; karşılaştırma için önce birine curl, sonra diğerine (veya `POST /reset` ile NED sıfırla) daha net olur.

---

## Port meşgul

```bash
# Ödev
sudo lsof -ti:3000,3002,3003,3005,3010 | xargs -r kill -9
# Referans
sudo lsof -ti:4000,4002,4003,4005,4010 | xargs -r kill -9
```

---

## ZoKrates

Sunumda sadece **Ws miktarı** yeterliyse ZoKrates şart değil. Referans `checkNetting` için: `yarn setup-zokrates` (uzun, ilk kurulum).
