const { WS_PER_KWH } = require("./chain-constants");

module.exports = {
  wsToKWh(ws) {
    return Number(ws) / WS_PER_KWH;
  },

  kWhToWs(kwh) {
    return Math.round(Number(kwh) * WS_PER_KWH);
  }
};
