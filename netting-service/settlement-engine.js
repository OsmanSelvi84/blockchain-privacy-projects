const { PLACEHOLDER_ADDR } = require("../lib/chain-constants");

/**
 * Off-chain peer-to-peer energy netting for a smart-city microgrid.
 * Tracks signed meter deltas per household and produces transfer records.
 */
class SettlementEngine {
  constructor() {
    this.gridRenewableTotal = 0;
    this.gridImportTotal = 0;
    this.members = {
      [PLACEHOLDER_ADDR]: { meterDelta: 0, lastUpdate: Date.now() }
    };
    this.ledger = [];
    this.roundSettled = false;
  }

  registerMember(address) {
    if (this._hasMember(address)) return false;
    this.members[address] = { meterDelta: 0, lastUpdate: Date.now() };
    return true;
  }

  applyMeterDelta(address, deltaWs, updatedAt) {
    if (!this._hasMember(address)) return false;
    this.members[address].meterDelta = Number(deltaWs);
    this.members[address].lastUpdate = updatedAt;
    return true;
  }

  /** Yeni demo turu — transfer geçmişi kalır, yeni netting yapılabilir. */
  beginNewRound() {
    this.roundSettled = false;
    for (const [addr, state] of Object.entries(this.members)) {
      if (addr !== PLACEHOLDER_ADDR) {
        state.meterDelta = 0;
      }
    }
  }

  getMember(address) {
    return this._hasMember(address) ? this.members[address] : {};
  }

  listTransfersFor(address, sinceMs = 0) {
    const me = String(address || "").toLowerCase();
    return this.ledger.filter(row => {
      const when = row.date || row.timestamp || 0;
      if (when < sinceMs) return false;
      const from = String(row.from || "").toLowerCase();
      const to = String(row.to || "").toLowerCase();
      return from === me || to === me;
    });
  }

  listProducerAddresses() {
    delete this.members[PLACEHOLDER_ADDR];
    return Object.entries(this.members)
      .filter(([, m]) => m.meterDelta >= 0)
      .map(([addr]) => addr);
  }

  listConsumerAddresses() {
    return Object.entries(this.members)
      .filter(([, m]) => m.meterDelta < 0)
      .map(([addr]) => addr);
  }

  /**
   * Run renewable-only netting (same invariants as course reference settle()).
   */
  runSettlement() {
    delete this.members[PLACEHOLDER_ADDR];
    this._roundRoles = this._snapshotProducerConsumerRoles();

    let sides = this._classifySupplyDemand();
    this._accumulateGridTotals(sides);

    this._allocateProportionally(
      sides.sources,
      sides.sourceSum,
      sides.sinks,
      sides.sinkSum
    );

    sides = this._classifySupplyDemand();
    this._clearResidualDeltas(
      sides.sources,
      sides.sinks,
      sides.surplusOnSupplySide
    );

    // Sadece bir transfer gerçekten yapıldıysa delta'ları sıfırla; aksi
    // halde tek-hane PUT sonrası eşleşmeyi beklerken delta kaybolur.
    if (this.ledger.length > 0) {
      this._clearMeterDeltasForNextRound();
    }

    return this.members;
  }

  _clearMeterDeltasForNextRound() {
    for (const [addr, state] of Object.entries(this.members)) {
      if (addr === PLACEHOLDER_ADDR) continue;
      state.meterDelta = 0;
    }
  }

  _hasMember(address) {
    return Object.prototype.hasOwnProperty.call(this.members, address);
  }

  _snapshotProducerConsumerRoles() {
    const roles = {};
    for (const [addr, state] of Object.entries(this.members)) {
      const d = Number(state.meterDelta);
      if (d > 0) roles[addr] = "producer";
      else if (d < 0) roles[addr] = "consumer";
    }
    return roles;
  }

  _classifySupplyDemand() {
    const producers = [];
    const consumers = [];
    let producerSum = 0;
    let consumerSum = 0;

    for (const [addr, state] of Object.entries(this.members)) {
      const d = Number(state.meterDelta);
      if (d > 0) {
        producers.push(addr);
        producerSum += d;
      } else if (d < 0) {
        consumers.push(addr);
        consumerSum += d;
      }
    }

    const surplusOnSupplySide =
      producerSum > Math.abs(consumerSum);

    if (surplusOnSupplySide) {
      return {
        sources: consumers,
        sourceSum: consumerSum,
        sinks: producers,
        sinkSum: producerSum,
        surplusOnSupplySide: true
      };
    }

    return {
      sources: producers,
      sourceSum: producerSum,
      sinks: consumers,
      sinkSum: consumerSum,
      surplusOnSupplySide: false
    };
  }

  _accumulateGridTotals(sides) {
    if (sides.surplusOnSupplySide) {
      this._bumpTotals(sides.sinkSum, 0);
    } else {
      const importWs = Math.abs(sides.sourceSum + sides.sinkSum);
      this._bumpTotals(sides.sourceSum, importWs);
    }
  }

  _bumpTotals(renewableWs, importWs) {
    this.gridRenewableTotal += renewableWs;
    this.gridImportTotal += importWs;
  }

  _allocateProportionally(sources, sourceSum, sinks, sinkSum) {
    for (let si = 0; si < sinks.length; si++) {
      const sinkAddr = sinks[si];
      const sinkNeed = this.members[sinkAddr].meterDelta;
      let remaining = Math.round(sourceSum * (sinkNeed / sinkSum));

      for (let fi = 0; fi < sources.length; fi++) {
        if (remaining === 0) break;

        const fromAddr = sources[fi];
        const available = this.members[fromAddr].meterDelta;

        if (Math.abs(remaining) <= Math.abs(available)) {
          this._moveEnergy(fromAddr, sinkAddr, remaining);
          this._recordLedger(fromAddr, sinkAddr, remaining);
          remaining = 0;
        } else if (available !== 0) {
          this._moveEnergy(fromAddr, sinkAddr, available);
          this._recordLedger(fromAddr, sinkAddr, available);
          remaining -= available;
        }
      }
    }
  }

  _clearResidualDeltas(sources, sinks, surplusOnSupplySide) {
    const openSinkIndices = sinks.map((_, i) => i);

    for (let fi = 0; fi < sources.length; fi++) {
      const fromAddr = sources[fi];
      while (this.members[fromAddr].meterDelta !== 0) {
        const pick = Math.floor(Math.random() * openSinkIndices.length);
        const sinkIdx = openSinkIndices[pick];
        const step = surplusOnSupplySide ? -1 : 1;
        this._moveEnergy(fromAddr, sinks[sinkIdx], step);
        openSinkIndices.splice(pick, 1);
      }
    }
  }

  _moveEnergy(fromAddr, toAddr, amountWs) {
    if (!this._hasMember(fromAddr) || !this._hasMember(toAddr)) return false;
    this.members[fromAddr].meterDelta -= amountWs;
    this.members[toAddr].meterDelta += amountWs;
    return true;
  }

  /**
   * Ledger always shows producer → consumer for this round (even when internal
   * settle() routes through consumers first because supply > demand).
   */
  _recordLedger(fromAddr, toAddr, amountWs) {
    if (!this._hasMember(fromAddr) || !this._hasMember(toAddr)) return false;

    const roles = this._roundRoles || {};
    let displayFrom = fromAddr;
    let displayTo = toAddr;
    if (roles[fromAddr] === "consumer" && roles[toAddr] === "producer") {
      displayFrom = toAddr;
      displayTo = fromAddr;
    }

    this.ledger.push({
      from: displayFrom,
      to: displayTo,
      amount: Math.abs(amountWs),
      date: Date.now()
    });
    return true;
  }

  /** Compatibility aliases for netting-service */
  get renewableEnergy() {
    return this.gridRenewableTotal;
  }
  get nonRenewableEnergy() {
    return this.gridImportTotal;
  }
  get households() {
    return this.members;
  }
  get transfers() {
    return this.ledger;
  }

  getTransfers(addr, from) {
    return this.listTransfersFor(addr, from);
  }
  getHouseholdAddressesProducers() {
    return this.listProducerAddresses();
  }
  getHouseholdAddressesConsumers() {
    return this.listConsumerAddresses();
  }
}

function cloneEngine(src) {
  const copy = JSON.parse(JSON.stringify(src));
  Object.setPrototypeOf(copy, SettlementEngine.prototype);
  return copy;
}

module.exports = SettlementEngine;
module.exports.cloneEngine = cloneEngine;
