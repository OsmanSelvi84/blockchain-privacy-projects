const SettlementEngine = require("./settlement-engine");

function cloneEngine(src) {
  const copy = JSON.parse(JSON.stringify(src));
  Object.setPrototypeOf(copy, SettlementEngine.prototype);
  return copy;
}

/**
 * Run settlement once per demo round when both a producer and consumer exist.
 */
function tryInstantSettle(engine) {
  if (engine.roundSettled) {
    return { engine, settled: false, reason: "round_already_settled" };
  }

  const producers = engine.listProducerAddresses();
  const consumers = engine.listConsumerAddresses();
  if (!producers.length || !consumers.length) {
    return { engine, settled: false, reason: "waiting_for_other_household" };
  }

  const settledEngine = cloneEngine(engine);
  const transfersBefore = settledEngine.transfers.length;
  settledEngine.runSettlement();
  settledEngine.roundSettled = true;

  return {
    engine: settledEngine,
    settled: true,
    newTransfers: settledEngine.transfers.length - transfersBefore
  };
}

module.exports = { cloneEngine, tryInstantSettle };
