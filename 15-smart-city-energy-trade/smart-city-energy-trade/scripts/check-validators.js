#!/usr/bin/env node
/**
 * On-chain validator list (must include H1 + H2 after migrate).
 * Usage: nvm use 10 && node scripts/check-validators.js
 */
const web3Utils = require("web3-utils");
const web3Client = require("../lib/web3-client");
const contractRegistry = require("../lib/contract-registry");
const { H1, H2 } = require("../lib/households");

(async () => {
  const web3 = web3Client.connect("authority");
  await web3Client.waitUntilReady(web3);
  const networkId = await web3.eth.net.getId();
  const ownedSet = new web3.eth.Contract(
    contractRegistry.abi("ownedSet"),
    contractRegistry.deployedAddress("ownedSet", networkId)
  );
  const raw = await ownedSet.methods.getValidators().call();
  const validators = Array.isArray(raw) ? raw : Object.values(raw || {});

  console.log("network id:", networkId);
  console.log("validators on chain:", validators.length ? validators : "(empty)");
  console.log("H1 registered:", validators.some(v => web3Utils.toChecksumAddress(v) === H1));
  console.log("H2 registered:", validators.some(v => web3Utils.toChecksumAddress(v) === H2));

  if (!validators.length) {
    console.log("\nFIX: Parity was reset without migrate. Run:");
    console.log("  yarn migrate-contracts-authority-fast");
    console.log("Then restart NED + both gateways.");
    process.exit(1);
  }
})().catch(err => {
  console.error(err.message);
  process.exit(1);
});
