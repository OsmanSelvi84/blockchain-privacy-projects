#!/usr/bin/env node
/**
 * Quick check: constants, member registration, and Test 1 netting.
 * Run: nvm use 10 && node scripts/debug-settlement.js
 */
const SettlementEngine = require("../netting-service/settlement-engine");
const {
  HOUSEHOLD_ONE,
  HOUSEHOLD_TWO,
  PLACEHOLDER_ADDR
} = require("../lib/chain-constants");

console.log("=== chain-constants ===");
console.log("HOUSEHOLD_ONE:", HOUSEHOLD_ONE);
console.log("HOUSEHOLD_TWO:", HOUSEHOLD_TWO);
console.log("PLACEHOLDER_ADDR:", PLACEHOLDER_ADDR);
console.log("H1 === PLACEHOLDER:", HOUSEHOLD_ONE === PLACEHOLDER_ADDR);
console.log("H2 === PLACEHOLDER:", HOUSEHOLD_TWO === PLACEHOLDER_ADDR);
console.log("H1 === H2:", HOUSEHOLD_ONE === HOUSEHOLD_TWO);

console.log("\n=== Test 1 flow ===");
const e = new SettlementEngine();
const reg1 = e.registerMember(HOUSEHOLD_ONE);
const reg2 = e.registerMember(HOUSEHOLD_TWO);
const app1 = e.applyMeterDelta(HOUSEHOLD_ONE, 1080000000, Date.now());
const app2 = e.applyMeterDelta(HOUSEHOLD_TWO, -1440000000, Date.now());
console.log("registerMember H1:", reg1);
console.log("registerMember H2:", reg2);
console.log("applyMeterDelta H1:", app1);
console.log("applyMeterDelta H2:", app2);
console.log("member keys before settle:", Object.keys(e.members));
console.log("members before settle:", JSON.stringify(e.members, null, 2));

e.runSettlement();
console.log("\nledger length:", e.ledger.length);
console.log("amounts:", e.ledger.map(t => t.amount));
if (e.ledger[0]) {
  console.log("transfer:", e.ledger[0]);
}

if (e.ledger.length === 0) {
  console.log("\nFAIL: expected amount 1080000000 in ledger.");
  console.log(
    "Fix: git pull origin 15-smart-city-energy-trade && git checkout -- netting-service/settlement-engine.js lib/chain-constants.js"
  );
  process.exit(1);
}
console.log("\nOK: settlement produced transfers.");
