#!/usr/bin/env node
/**
 * Why `yarn run-netting` fails on a fresh VM — run this first.
 * Usage: nvm use 10 && node scripts/check-ned-prereqs.js
 */
const fs = require("fs");
const path = require("path");
const net = require("net");
const Web3 = require("web3");
const truffleConfig = require("../truffle-config");

const ROOT = path.join(__dirname, "..");
const ARTIFACTS = [
  "build/contracts/dUtility.json",
  "build/contracts/OwnedSet.json"
];
const { host, port } = truffleConfig.networks.authority;
const WS_URL = `ws://${host}:${port}`;
const NED_PORT = 3005;

let failed = 0;

function ok(msg) {
  console.log("OK:", msg);
}
function fail(msg) {
  console.log("FAIL:", msg);
  failed++;
}

console.log("=== NED prerequisites (yarn run-netting) ===\n");

console.log("Node:", process.version);
if (!/^v10\./.test(process.version)) {
  fail(`Use Node 10 (nvm use 10), not ${process.version}`);
} else {
  ok("Node 10.x");
}

for (const rel of ARTIFACTS) {
  const p = path.join(ROOT, rel);
  if (fs.existsSync(p)) ok(`Found ${rel}`);
  else {
    fail(`Missing ${rel} — run: nvm use 10 && yarn compile-contracts`);
  }
}

function portFree(p) {
  return new Promise(resolve => {
    const s = net
      .createServer()
      .once("error", () => resolve(false))
      .once("listening", () => {
        s.close(() => resolve(true));
      })
      .listen(p, "127.0.0.1");
  });
}

(async () => {
  if (await portFree(NED_PORT)) ok(`Port ${NED_PORT} is free`);
  else {
    fail(
      `Port ${NED_PORT} in use — run: lsof -ti:${NED_PORT} | xargs kill`
    );
  }

  console.log("\nParity WebSocket:", WS_URL);
  const web3 = new Web3(WS_URL, null, {});
  const timeout = new Promise((_, rej) =>
    setTimeout(() => rej(new Error("timeout 8s")), 8000)
  );

  try {
    const block = await Promise.race([web3.eth.getBlockNumber(), timeout]);
    ok(`Parity reachable, block ${block}`);
    const netId = await web3.eth.net.getId();
    if (String(netId) === "8995") ok(`network id ${netId}`);
    else fail(`Expected network id 8995, got ${netId}`);
  } catch (e) {
    fail(
      `Cannot connect to Parity (${e.message}). Start parity-authority (ports 8546/8556/8566).`
    );
    console.log(
      "  Typical: cd ~/refolabilecekler/decentralized-energy-trading/parity-authority && docker-compose up -d"
    );
  }

  console.log("");
  if (failed) {
    console.log(`${failed} check(s) failed. Fix above, then:`);
    console.log("  yarn migrate-contracts-authority-fast");
    console.log("  yarn run-netting");
    process.exit(1);
  }
  console.log("All checks passed. Run: yarn run-netting");
})();
