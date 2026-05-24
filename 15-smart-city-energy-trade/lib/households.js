const web3Utils = require("web3-utils");
const { HOUSEHOLD_ONE, HOUSEHOLD_TWO } = require("./chain-constants");

const H1 = web3Utils.toChecksumAddress(HOUSEHOLD_ONE);
const H2 = web3Utils.toChecksumAddress(HOUSEHOLD_TWO);

const BY_PORT = {
  3002: { label: "H1", address: H1, gateway: 3002, ui: 3000 },
  3003: { label: "H2", address: H2, gateway: 3003, ui: 3010 }
};

function checksum(addr) {
  if (!addr) return "";
  try {
    return web3Utils.toChecksumAddress(addr);
  } catch {
    return String(addr);
  }
}

function labelForAddress(addr) {
  const c = checksum(addr).toLowerCase();
  if (c === H1.toLowerCase()) return "H1";
  if (c === H2.toLowerCase()) return "H2";
  return null;
}

function expectedForGatewayPort(port) {
  return BY_PORT[Number(port)] || null;
}

module.exports = {
  H1,
  H2,
  BY_PORT,
  checksum,
  labelForAddress,
  expectedForGatewayPort
};
