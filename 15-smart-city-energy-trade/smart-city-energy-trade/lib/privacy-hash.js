const web3Utils = require("web3").utils;
const sha256 = require("js-sha256");

module.exports = {
  padMeterReading(meterDeltaWs) {
    const hex = web3Utils.numberToHex(meterDeltaWs);
    return web3Utils.padLeft(hex, 128);
  },

  hashMeterReading(meterDeltaWs) {
    const hex = web3Utils.numberToHex(Math.abs(meterDeltaWs));
    const padded = web3Utils.padLeft(hex, 128);
    return `0x${sha256(web3Utils.hexToBytes(padded))}`;
  },

  packAndHash(meterDeltaWs) {
    return module.exports.hashMeterReading(meterDeltaWs);
  },

  padPackParams256(meterDeltaWs) {
    return module.exports.padMeterReading(meterDeltaWs);
  }
};
