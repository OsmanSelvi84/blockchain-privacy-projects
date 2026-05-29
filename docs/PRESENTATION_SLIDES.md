

## Slayt 1 — Başlık

**Smart City Energy Trade**  
Blockchain tabanlı mahalle enerji paylaşımı

- Öğrenci / grup adı  
- Ders: Blockchain Privacy Projects  
- Tarih  

*Konuşma:* “Fazla güneş enerjisini komşuya aktaran, veriyi gizli tutan bir mikro-şebeke simülasyonu.”

---

## Slayt 2 — Problem

**Mahallede ne oluyor?**

- Bazı evler **fazla üretiyor** (güneş)
- Bazı evler **eksik tüketiyor**
- Fazla enerji komşuya gitmeli
- **Sorun:** Ham sayaç verisi herkese açık olmamalı

*Konuşma:* “Para birimi değil — **kWh paylaşımı**; gizlilik ödevin ana konusu.”

---

## Slayt 3 — Çözüm (tek cümle)

**Ölçüm off-chain, zincirde hash + kanıt**

| Katmanda | Ne var |
|----------|--------|
| Ev | Üretim / tüketim (Ws) |
| Gateway | İmza + hash |
| NED | Netting (kim kime ne kadar) |
| Blockchain | Doğrulama, validator |
| Mongo | Geçmiş, UI |

---

## Slayt 4 — Mimari diyagram

```
Sensör / curl
      ↓
Gateway H1 (:3002)  Gateway H2 (:3003)
      ↓                    ↓
         NED (:3005) — settlement
                  ↓
         Parity Authority (8995)
                  ↓
              MongoDB
```

**İki hane:** H1 üretici, H2 tüketici (Test 1)

---

## Slayt 5 — Teknoloji yığını

| Katman | Araç |
|--------|------|
| UI | React dashboard (3000 / 3010) |
| API | Node.js + Express |
| Netting | `settlement-engine.js` |
| Chain | Parity 3 node, Truffle, Solidity 0.5 |
| DB | MongoDB |
| Privacy | SHA-256 hash, imza, ZoKrates (opsiyonel) |

---

## Slayt 6 — Gizlilik nasıl?

1. `meterDelta` gateway’de **hash**’lenir  
2. NED’e **imzalı** gönderilir (`PUT /energy`)  
3. Zincirde `updateRenewableEnergy` → **bytes32 hash**  
4. İsteğe bağlı: ZoKrates → `checkNetting` → `NettingSuccess`

*Konuşma:* “Sayaç değeri düz metin olarak chain’de yok.”

---

## Slayt 7 — Netting mantığı (Test 1)

**Test 1 — ~300 kWh transfer**

| | H1 (üretici) | H2 (tüketici) |
|---|-------------|---------------|
| meterDelta | +1 080 000 000 Ws | −1 440 000 000 Ws |
| Sonuç | Fiziksel akış **H1 → H2** | |
| Transfer `amount` | **1 080 000 000 Ws** | (= 300 kWh) |

Birim: **Ws** = kWh × 3 600 000

---

## Slayt 8 — Referansla ilişki

**`decentralized-energy-trading` = davranış referansı**

| | Referans | Bizim proje |
|---|----------|-------------|
| Netting sınıfı | `utility.js` | `settlement-engine.js` |
| Sunucu | household-server | household-gateway |
| **Ws miktarları** | Aynı (Test 1–3) | ✓ |
| Ledger yönü | Bazen ters etiket | Üretici → tüketici |

`yarn parity-reference` — offline karşılaştırma

---

## Slayt 9 — Kurulum (özet)

1. Parity `docker compose up -d`  
2. `yarn migrate-contracts-authority-fast`  
3. Mongo `docker compose -f docker/mongo/...`  
4. `yarn run-netting` → `yarn run-gateway-h1/h2`  
5. İki `curl` + **60 sn** bekle  

`yarn test` → **9 passing** (Parity gerekmez)

---

## Slayt 10 — Canlı demo (adımlar)

```bash
# H1
curl -X PUT http://127.0.0.1:3002/sensor-stats \
  -d '{"produce":1800000000,"consume":720000000,"meterDelta":1080000000}'

# H2
curl -X PUT http://127.0.0.1:3003/sensor-stats \
  -d '{"produce":720000000,"consume":2160000000,"meterDelta":-1440000000}'

sleep 60
curl -s "http://127.0.0.1:3002/transfers?from=0"
```

**Beklenen:** `"amount": 1080000000`

---

## Slayt 11 — Sonuçlar / kanıt

- Unit test: 300 / 250 / 400 kWh vektörleri  
- NED log: `Off-chain netting: 1 transfer(s)`  
- Gateway: `Sent to NED`  
- UI: Transfer ticker, network overview  

**Önemli:** EUR pazarı yok — gösterge **tasarruf modeli** (ct/kWh)

---

## Slayt 12 — Kapanış

**Özet**

- Mahalle P2P enerji netting  
- Gizlilik: hash + imza (+ zk)  
- Off-chain hesap + on-chain doğrulama  
- Referansla uyumlu miktarlar, kendi mimari  

**Sorular?**

Repo: `github.com/azraksk/smart-city-energy-trade`  
Branch: `15-smart-city-energy-trade`

---

## Ek slayt (isteğe bağlı) — Sorulara hazır

| Soru | Kısa cevap |
|------|------------|
| Neden Ubuntu? | Parity + Docker + ders ortamı tekrarlanabilir |
| ZoKrates şart mı? | Hayır; off-chain demo yeterli |
| İki proje aynı anda? | Evet: 300x vs 400x port, tek Parity |
| `down -v` ne yapar? | Zinciri sıfırlar → migrate tekrar |

---

## Sunum ipuçları

- **60 saniye** beklemeyi söyle (NED interval)  
- Ws / kWh karışıklığını vurgula (`500` değil `1800000000`)  
- Önce `yarn test`, sonra canlı demo (yedek kanıt)  
- Gateway’leri test öncesi yeniden başlat
