# Sunum script (1 page) / Presentation script

## TR

1. **Problem:** Mahallede güneş üreten ve tüketen evler var; fazla enerji komşuya gitmeli, tüketim verisi herkese açık olmamalı.
2. **Çözüm:** `PUT /sensor-stats` ile Ws cinsinden üretim/tüketim; zincirde sadece **hash** (`updateRenewableEnergy`).
3. **NED:** İmzalı `meterDelta` toplanır; `settlement-engine` off-chain netting → `transfers[]`.
4. **Gizlilik:** ZoKrates `settlement-check` kanıtı → `checkNetting` → `NettingSuccess`.
5. **Demo:** İki `curl`, 60 sn bekle, Transfer Ticker’da ~300 kWh; NED’de `amount: 1080000000` Ws.
6. **Kapanış:** Para yok — trade = kWh paylaşımı; tasarruf göstergesi sabit ct/kWh modeli.

## EN

1. Neighbourhood prosumers share surplus kWh; raw readings stay off-chain.
2. Household gateway hashes readings and signs deltas for the netting service.
3. Off-chain settlement produces transfers; zk-SNARK proves conservation + fairness.
4. `dUtility.checkNetting` verifies proof and updates after-netting hashes.
5. Live demo: dual curl → wait → ticker + NED GET transfers.
6. No EUR market — display savings are illustrative only.
