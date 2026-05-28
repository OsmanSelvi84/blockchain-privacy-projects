# Test vectors (5 × 10 points)

**Units:** API uses **Ws**. Display kWh = `amount / 3_600_000`.  
**Rule:** `meterDelta = produce - consume`, and `kWh × 3_600_000 = Ws`.

Before each test: restart household gateways on ports **3002** and **3003**.

## Procedure (examiner checklist)

1. Two household gateways + NED + (optional) Parity running.
2. Restart both gateways (`nettingActive` must reset).
3. `PUT /sensor-stats` on **3002** and **3003** with JSON below.
4. Wait **~60 s** (NED interval ~30 s + Mongo sync ~25 s).
5. Compare `GET /transfers/{H1}?from=0` amounts with reference.

## Vectors

| Test | H1 (produce/consume kWh) | H2 | PUT :3002 | PUT :3003 | Expected kWh | Expected `amount` (Ws) |
|------|--------------------------|-----|-----------|-----------|--------------|------------------------|
| 1 | 500 / 200 | 200 / 600 | `{"produce":1800000000,"consume":720000000,"meterDelta":1080000000}` | `{"produce":720000000,"consume":2160000000,"meterDelta":-1440000000}` | ~300 | `1080000000` |
| 2 | 400 / 150 | 150 / 500 | `{"produce":1440000000,"consume":540000000,"meterDelta":900000000}` | `{"produce":540000000,"consume":1800000000,"meterDelta":-1260000000}` | ~250 | `900000000` |
| 3 | 600 / 200 | 100 / 700 | `{"produce":2160000000,"consume":720000000,"meterDelta":1440000000}` | `{"produce":360000000,"consume":2520000000,"meterDelta":-2160000000}` | ~400 | `1440000000` |

Tests 4–5: use the same pattern with instructor-provided kWh values; compute Ws before `curl`.

## Transfer direction

**This project (15smart-city):** physical flow — Test 1 shows **H1 (`0x00aa…`) → H2 (`0x002e…`)** (producer sends to consumer).

**Reference repo:** ledger may show the **opposite** `from`/`to` (`_addTransfer` with `mode: false` swaps labels). **Amounts (Ws) still match.**

## Must match

- NED / gateway — same `amount` (Ws) per test; `from`/`to` follow physical flow here
- Household `GET /transfers` — same amounts
- `meterDelta` at NED after first PUT per restart

## May differ

- Mongo `_id`, timestamps
- Transaction hash, block number
- UI styling
