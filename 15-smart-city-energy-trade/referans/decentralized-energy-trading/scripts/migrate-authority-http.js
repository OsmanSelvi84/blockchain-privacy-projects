#!/usr/bin/env node
/**
 * Authority-chain setup over HTTP RPC (port 8545).
 * Avoids Truffle migrate, which can fail with "connection not open" when WS is misconfigured.
 */
const chalk = require("chalk");
const fs = require("fs");
const path = require("path");
const Web3 = require("web3");
const request = require("request-promise");
const asyncUtils = require("../helpers/async-utils");
const { password } = require("../household-server-config");
const {
  UTILITY_ADDRESS,
  AUTHORITY_ADDRESS,
  OTHER_AUTHORITY_ADDRESSES,
  OWNED_SET_ADDRESS,
  TESTS_FAKE_ADDRESS,
  VERIFIER_ADDRESS
} = require("../helpers/constants");

const AUTHORITY_RPC = "http://127.0.0.1:8545";
const BUILD = path.join(__dirname, "..", "build", "contracts");
const GAS = 6000000;

function loadArtifact(name) {
  const file = path.join(BUILD, `${name}.json`);
  if (!fs.existsSync(file)) {
    console.error(
      `Missing ${file}. Run: yarn compile-contracts (or truffle compile)`
    );
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

async function unlockAuthority(web3) {
  await web3.eth.personal.unlockAccount(AUTHORITY_ADDRESS, password, 3600);
}

async function callRPC(methodSignature, port, params = []) {
  const { body } = await request(`http://localhost:${port}`, {
    method: "POST",
    json: {
      jsonrpc: "2.0",
      method: methodSignature,
      params,
      id: 0
    },
    resolveWithFullResponse: true
  });
  return body;
}

async function addValidator(validator, ownedSet, web3) {
  process.stdout.write(`  Adding ${validator} to OwnedSet contract ... `);
  await unlockAuthority(web3);
  await ownedSet.methods.addValidator(validator).send({
    from: AUTHORITY_ADDRESS,
    gas: GAS
  });
  process.stdout.write(chalk.green("done\n"));
}

async function finalizeChange(ownedSet, web3) {
  process.stdout.write("  Finalizing changes to OwnedSet contract ... ");
  await unlockAuthority(web3);
  await ownedSet.methods.finalizeChange().send({
    from: AUTHORITY_ADDRESS,
    gas: GAS
  });
  process.stdout.write(chalk.green("done\n"));
}

async function main() {
  const networkId = await new Web3(AUTHORITY_RPC).eth.net.getId();
  if (String(networkId) !== "8995") {
    console.error(
      `Expected network id 8995 on ${AUTHORITY_RPC}, got ${networkId}. Is Parity running?`
    );
    process.exit(1);
  }

  const utilityArtifact = loadArtifact("dUtility");
  const ownedSetArtifact = loadArtifact("OwnedSet");
  const web3 = new Web3(AUTHORITY_RPC);
  const block = await web3.eth.getBlockNumber();
  process.stdout.write(`  Connected to Parity (block ${block}) ... `);
  process.stdout.write(chalk.green("ok\n"));

  const utility = new web3.eth.Contract(utilityArtifact.abi, UTILITY_ADDRESS);
  const ownedSet = new web3.eth.Contract(
    ownedSetArtifact.abi,
    OWNED_SET_ADDRESS
  );

  process.stdout.write("  Set verifier contract address ... ");
  await unlockAuthority(web3);
  await utility.methods.setVerifier(VERIFIER_ADDRESS).send({
    from: AUTHORITY_ADDRESS,
    gas: GAS
  });
  process.stdout.write(chalk.green("done\n"));

  process.stdout.write("  Adding admin node to Utility contract ... ");
  await unlockAuthority(web3);
  await utility.methods.addHousehold(AUTHORITY_ADDRESS).send({
    from: AUTHORITY_ADDRESS,
    gas: GAS
  });
  process.stdout.write(chalk.green("done\n"));

  process.stdout.write("  Transfer ownership of Utility contract ... ");
  await unlockAuthority(web3);
  await utility.methods.transferOwnership(OWNED_SET_ADDRESS).send({
    from: AUTHORITY_ADDRESS,
    gas: GAS
  });
  process.stdout.write(chalk.green("done\n"));

  process.stdout.write("  Adding authority addresses ...\n");
  await asyncUtils.asyncForEach(OTHER_AUTHORITY_ADDRESSES, async a => {
    await addValidator(a, ownedSet, web3);
    process.stdout.write(
      `Sending ether from ${AUTHORITY_ADDRESS} to ${a} ... `
    );
    await callRPC("personal_sendTransaction", 8545, [
      {
        from: AUTHORITY_ADDRESS,
        to: "0x" + a,
        value: "0xde0b6b3a7640000"
      },
      "node0"
    ]);
    process.stdout.write(chalk.green("done\n"));
  });

  await addValidator(TESTS_FAKE_ADDRESS, ownedSet, web3);
  await finalizeChange(ownedSet, web3);

  process.stdout.write("  Removing 'fake' authority addresses ... ");
  await unlockAuthority(web3);
  await ownedSet.methods.removeValidator(TESTS_FAKE_ADDRESS).send({
    from: AUTHORITY_ADDRESS,
    gas: GAS
  });
  process.stdout.write(chalk.green("done\n"));
  await finalizeChange(ownedSet, web3);

  console.log(chalk.green("\nAuthority migration finished."));
}

main().catch(err => {
  console.error(chalk.red("\nMigration failed:"), err.message || err);
  process.exit(1);
});
