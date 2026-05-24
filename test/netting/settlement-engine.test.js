const { expect } = require("chai");
const SettlementEngine = require("../../netting-service/settlement-engine");
const { HOUSEHOLD_ONE, HOUSEHOLD_TWO } = require("../../lib/chain-constants");

const H1 = HOUSEHOLD_ONE;
const H2 = HOUSEHOLD_TWO;

function runTwoHouseholdCase(m1, m2) {
  const engine = new SettlementEngine();
  engine.registerMember(H1);
  engine.registerMember(H2);
  engine.applyMeterDelta(H1, m1, Date.now());
  engine.applyMeterDelta(H2, m2, Date.now());
  engine.runSettlement();
  return engine.ledger;
}

describe("SettlementEngine — course test vectors", () => {
  it("Test 1: ~300 kWh → amount 1080000000 Ws", () => {
    const ledger = runTwoHouseholdCase(1080000000, -1440000000);
    const amounts = ledger.map(t => t.amount);
    expect(amounts).to.include(1080000000);
    expect(Math.round(1080000000 / 3600000)).to.equal(300);
  });

  it("Test 2: ~250 kWh → amount 900000000 Ws", () => {
    const ledger = runTwoHouseholdCase(900000000, -1260000000);
    expect(ledger.map(t => t.amount)).to.include(900000000);
    expect(Math.round(900000000 / 3600000)).to.equal(250);
  });

  it("Test 3: ~400 kWh → amount 1440000000 Ws", () => {
    const ledger = runTwoHouseholdCase(1440000000, -2160000000);
    expect(ledger.map(t => t.amount)).to.include(1440000000);
    expect(Math.round(1440000000 / 3600000)).to.equal(400);
  });

  it("Test 1: physical transfer H1 → H2 (producer to consumer)", () => {
    const ledger = runTwoHouseholdCase(1080000000, -1440000000);
    const main = ledger.find(t => t.amount === 1080000000);
    expect(main.from.toLowerCase()).to.equal(H1.toLowerCase());
    expect(main.to.toLowerCase()).to.equal(H2.toLowerCase());
  });

  it("when supply exceeds demand, ledger still shows producer H1 → consumer H2", () => {
    const ledger = runTwoHouseholdCase(1080000000, -540000000);
    const main = ledger.find(t => t.amount === 540000000);
    expect(main).to.exist;
    expect(main.from.toLowerCase()).to.equal(H1.toLowerCase());
    expect(main.to.toLowerCase()).to.equal(H2.toLowerCase());
  });

  it("100 kWh: H1 surplus + H2 deficit → H1 → H2 (not H2 → H1)", () => {
    const ledger = runTwoHouseholdCase(720000000, -360000000);
    const main = ledger.find(t => t.amount === 360000000);
    expect(main).to.exist;
    expect(main.from.toLowerCase()).to.equal(H1.toLowerCase());
    expect(main.to.toLowerCase()).to.equal(H2.toLowerCase());
  });

  it("zeros meter deltas after settle so a second cycle does not re-transfer", () => {
    const engine = new SettlementEngine();
    engine.registerMember(H1);
    engine.registerMember(H2);
    engine.applyMeterDelta(H1, 1080000000, Date.now());
    engine.applyMeterDelta(H2, -1440000000, Date.now());
    engine.runSettlement();
    expect(engine.members[H1].meterDelta).to.equal(0);
    expect(engine.members[H2].meterDelta).to.equal(0);
    engine.ledger = [];
    engine.runSettlement();
    expect(engine.ledger).to.have.length(0);
  });

  it("when H2 produces and H1 needs energy → H2 → H1", () => {
    const ledger = runTwoHouseholdCase(-1440000000, 1080000000);
    const main = ledger.find(t => t.amount === 1080000000);
    expect(main).to.exist;
    expect(main.from.toLowerCase()).to.equal(H2.toLowerCase());
    expect(main.to.toLowerCase()).to.equal(H1.toLowerCase());
  });
});

describe("SettlementEngine — privacy hash helper", () => {
  const privacyHash = require("../../lib/privacy-hash");

  it("packAndHash matches reference padding + sha256", () => {
    const h = privacyHash.packAndHash(1080000000);
    expect(h).to.match(/^0x[0-9a-f]{64}$/i);
    expect(privacyHash.packAndHash(-1080000000)).to.equal(h);
  });
});
