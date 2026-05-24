#!/usr/bin/env node
/**
 * Offline verification of the three published course vectors (no servers required).
 */
const SettlementEngine = require("../netting-service/settlement-engine");
const { HOUSEHOLD_ONE, HOUSEHOLD_TWO } = require("../lib/chain-constants");

const VECTORS = [
  { name: "Test 1", h1: 1080000000, h2: -1440000000, expect: 1080000000, kwh: 300 },
  { name: "Test 2", h1: 900000000, h2: -1260000000, expect: 900000000, kwh: 250 },
  { name: "Test 3", h1: 1440000000, h2: -2160000000, expect: 1440000000, kwh: 400 }
];

let failed = 0;

for (const v of VECTORS) {
  const e = new SettlementEngine();
  e.registerMember(HOUSEHOLD_ONE);
  e.registerMember(HOUSEHOLD_TWO);
  e.applyMeterDelta(HOUSEHOLD_ONE, v.h1, Date.now());
  e.applyMeterDelta(HOUSEHOLD_TWO, v.h2, Date.now());
  e.runSettlement();
  const amounts = e.ledger.map(t => t.amount);
  const ok = amounts.includes(v.expect);
  const kwh = Math.round(v.expect / 3600000);
  console.log(
    `${v.name}: amount ${amounts.join(",")} — expected ${v.expect} (${v.kwh} kWh) — ${ok ? "OK" : "FAIL"}`
  );
  if (!ok) failed++;
  if (kwh !== v.kwh) {
    console.log(`  kWh integer check failed: got ${kwh}`);
    failed++;
  }
}

process.exit(failed ? 1 : 0);
