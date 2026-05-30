/**
 * Netting (settle) demo — same fixed inputs as test/utility-js/utility.test.js
 *
 * Run: nvm use 10 && node scripts/demo-settle.js
 */
const Utility = require("../netting-entity/utility");
const zokratesHelper = require("../helpers/zokrates");

const hh1 = "0xEv1_producer_big";
const hh2 = "0xEv2_producer_small";
const hh3 = "0xEv3_consumer_a";
const hh4 = "0xEv4_consumer_b";

// README / test case: more production than demand
const INPUT = {
  [hh1]: 200,
  [hh2]: 100,
  [hh3]: -100,
  [hh4]: -100
};

const EXPECTED_AFTER = {
  [hh1]: 67,
  [hh2]: 33,
  [hh3]: 0,
  [hh4]: 0
};

function runSettleDemo() {
  const utility = new Utility();

  console.log("=== Netting demo (referans settle algoritması) ===\n");
  console.log("Girdi (meterDelta):");
  Object.entries(INPUT).forEach(([addr, delta]) => {
    console.log(`  ${addr}: ${delta}`);
  });

  Object.keys(INPUT).forEach(addr => {
    utility.addHousehold(addr);
    utility.updateMeterDelta(addr, INPUT[addr], Date.now());
  });

  console.log("\nHash (zincire giden — gerçek kWh değil):");
  Object.entries(INPUT).forEach(([addr, delta]) => {
    console.log(`  ${addr}: ${zokratesHelper.packAndHash(delta)}`);
  });

  utility.settle();

  console.log("\nNetting sonrası (settle çıktısı):");
  let ok = true;
  Object.keys(EXPECTED_AFTER).forEach(addr => {
    const got = utility.households[addr].meterDelta;
    const want = EXPECTED_AFTER[addr];
    const match = got === want ? "✓" : "✗";
    if (got !== want) ok = false;
    console.log(`  ${addr}: ${got}  (beklenen: ${want}) ${match}`);
  });

  console.log("\nTransferler (kimden kime ne kadar):");
  if (utility.transfers.length === 0) {
    console.log("  (bu örnekte transfers dizisi boş kalabilir; asıl sonuç meterDelta)");
  } else {
    utility.transfers.forEach((t, i) => {
      console.log(`  ${i + 1}. ${t.from} → ${t.to}: ${t.amount}`);
    });
  }

  console.log(`\nSonuç: ${ok ? "Test vektörü ile AYNI" : "FARKLI — algoritmayı kontrol et"}`);
  console.log(
    "\nKendi projen: aynı INPUT ile settle sonrası meterDelta bu EXPECTED_AFTER ile eşleşmeli."
  );
}

runSettleDemo();
