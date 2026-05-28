#!/usr/bin/env node
/**
 * Run reference Utility and smart-city SettlementEngine with the same inputs.
 * Exits 0 when ledger rows match (from, to, amount).
 */
const path = require("path");
const SettlementEngine = require("../netting-service/settlement-engine");
const { HOUSEHOLD_ONE, HOUSEHOLD_TWO } = require("../lib/chain-constants");

const Utility = require(path.join(
  __dirname,
  "../../refolabilecekler/decentralized-energy-trading/netting-entity/utility.js"
));

const H1 = HOUSEHOLD_ONE;
const H2 = HOUSEHOLD_TWO;

const SCENARIOS = [
  { name: "Test 1", h1: 1080000000, h2: -1440000000 },
  { name: "Test 2", h1: 900000000, h2: -1260000000 },
  { name: "Test 3", h1: 1440000000, h2: -2160000000 },
  { name: "Supply > demand", h1: 1080000000, h2: -540000000 }
];

function runReference(h1, h2) {
  const u = new Utility();
  u.addHousehold(H1);
  u.addHousehold(H2);
  u.updateMeterDelta(H1, h1, Date.now());
  u.updateMeterDelta(H2, h2, Date.now());
  u.settle();
  return u.transfers.map(t => ({
    from: t.from.toLowerCase(),
    to: t.to.toLowerCase(),
    amount: t.amount
  }));
}

function runOurs(h1, h2) {
  const e = new SettlementEngine();
  e.registerMember(H1);
  e.registerMember(H2);
  e.applyMeterDelta(H1, h1, Date.now());
  e.applyMeterDelta(H2, h2, Date.now());
  e.runSettlement();
  return e.ledger.map(t => ({
    from: t.from.toLowerCase(),
    to: t.to.toLowerCase(),
    amount: t.amount
  }));
}

let failed = 0;

for (const s of SCENARIOS) {
  const ref = runReference(s.h1, s.h2);
  const ours = runOurs(s.h1, s.h2);
  const refAmounts = ref.map(r => r.amount).sort((a, b) => a - b);
  const oursAmounts = ours.map(r => r.amount).sort((a, b) => a - b);
  const amountsOk =
    refAmounts.length === oursAmounts.length &&
    refAmounts.every((a, i) => a === oursAmounts[i]);
  const dirsMatch =
    ref.length === ours.length &&
    ref.every((r, i) => {
      const o = ours[i];
      return r.from === o.from && r.to === o.to && r.amount === o.amount;
    });
  console.log(
    `${s.name}: amounts ${amountsOk ? "OK" : "FAIL"} | ledger direction ${
      dirsMatch ? "same as reference" : "differs (we use physical H1↔H2 flow)"
    }`
  );
  if (!amountsOk) failed++;
}

process.exit(failed ? 1 : 0);
