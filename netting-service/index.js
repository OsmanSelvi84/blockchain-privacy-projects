const express = require("express");
const cors = require("cors");
const commander = require("commander");
const web3Utils = require("web3-utils");
const fs = require("fs");
const SettlementEngine = require("./settlement-engine");
const cloneEngine = SettlementEngine.cloneEngine;
const memberValidator = require("./member-validator");
const proofRunner = require("./proof-runner");
const web3Client = require("../lib/web3-client");
const contractRegistry = require("../lib/contract-registry");
const nedConfig = require("../ned-config");
const shell = require("shelljs");

const zkAvailable = Boolean(shell.which("zokrates"));

commander
  .option("-h, --host <type>", "bind host")
  .option("-p, --port <type>", "listen port")
  .option("-i, --interval <type>", "netting interval ms")
  .option("-n, --network <type>", "truffle network name");
commander.parse(process.argv);

const config = {
  nettingInterval: Number(commander.interval) || nedConfig.nettingInterval,
  host: commander.host || nedConfig.host,
  port: Number(commander.port) || nedConfig.port,
  network: commander.network || nedConfig.network,
  address: nedConfig.address,
  password: nedConfig.password
};

let web3;
let engine;
let engineAfterNetting;
let ownedSetContract;
let utilityContract;
let latestBlockNumber;
let chainReady = false;

async function bootstrap() {
  web3 = web3Client.connect(config.network);
  await web3Client.waitUntilReady(web3);
  latestBlockNumber = await web3.eth.getBlockNumber();
  engine = new SettlementEngine();

  const networkId = await web3.eth.net.getId();
  utilityContract = new web3.eth.Contract(
    contractRegistry.abi("dUtility"),
    contractRegistry.deployedAddress("dUtility", networkId)
  );
  ownedSetContract = new web3.eth.Contract(
    contractRegistry.abi("ownedSet"),
    contractRegistry.deployedAddress("ownedSet", networkId)
  );

  utilityContract.events.NettingSuccess(
    { fromBlock: latestBlockNumber },
    (error, event) => {
      if (error) {
        console.error(error.message);
        return;
      }
      console.log("On-chain NettingSuccess confirmed");
      latestBlockNumber = event.blockNumber;
      engine = engineAfterNetting;
    }
  );

  console.log(
    `Netting cycle every ${config.nettingInterval}ms (referans modu — PUT sonrası bekleyin).`
  );
  if (!zkAvailable) {
    console.log(
      "ZoKrates yok — off-chain settle yine çalışır; zincir kanıtı için: yarn setup-zokrates"
    );
  }
  chainReady = true;
  scheduleNettingCycle();
}

function ensureChainReady(res) {
  if (chainReady && web3 && ownedSetContract && utilityContract && engine) {
    return true;
  }
  res.status(503).json({
    error:
      "NED not ready (Parity or contracts). Start parity-authority, then: nvm use 10 && yarn migrate-contracts-authority, restart NED."
  });
  return false;
}

function scheduleNettingCycle() {
  console.log(`Next netting cycle in ${config.nettingInterval}ms`);
  setTimeout(runNettingCycle, config.nettingInterval);
}

/**
 * Referans netting-entity runZokrates: settle on interval, then optional zk.
 */
async function runNettingCycle() {
  const snapshotBefore = cloneEngine(engine);
  const snapshotAfter = cloneEngine(engine);
  snapshotAfter.ledger = [];
  snapshotAfter.runSettlement();

  engine.members = snapshotAfter.members;
  engine.gridRenewableTotal = snapshotAfter.gridRenewableTotal;
  engine.gridImportTotal = snapshotAfter.gridImportTotal;
  engine.ledger = snapshotAfter.ledger;
  engine.roundSettled = true;
  engineAfterNetting = cloneEngine(engine);

  if (engine.ledger.length > 0) {
    console.log(
      `Off-chain netting: ${engine.ledger.length} transfer(s) this cycle.`
    );
  } else {
    console.log("No transfers this cycle (need producer + consumer meter deltas).");
  }

  if (!zkAvailable) {
    scheduleNettingCycle();
    return;
  }

  const prevDir = shell.pwd();
  shell.cd(`${__dirname}/../zk`);

  try {
    const hhAddresses = proofRunner.generateProof(
      snapshotBefore,
      snapshotAfter,
      "production_mode"
    );

    if (hhAddresses.length === 0) {
      scheduleNettingCycle();
      return;
    }

    const proofData = proofRunner.readProofJson();
    await web3.eth.personal.unlockAccount(
      config.address,
      config.password,
      null
    );

    utilityContract.methods
      .checkNetting(
        hhAddresses,
        proofData.proof.a,
        proofData.proof.b,
        proofData.proof.c,
        proofData.inputs
      )
      .send({ from: config.address, gas: 60000000 }, (error, txHash) => {
        if (error) {
          console.error("checkNetting failed:", error.message);
        } else {
          console.log("checkNetting tx:", txHash);
        }
        scheduleNettingCycle();
      });
  } catch (err) {
    console.error("ZoKrates step skipped:", err.message);
    scheduleNettingCycle();
  } finally {
    shell.cd(prevDir);
  }
}

bootstrap().catch(err => {
  console.error("NED bootstrap failed:", err.message);
  if (/Cannot find module.*build\/contracts/i.test(String(err))) {
    console.error(
      "Missing build/ — run: nvm use 10 && yarn compile-contracts && yarn migrate-contracts-authority-fast"
    );
  } else {
    console.error(
      "Fix: yarn check-ned  (Parity ws://127.0.0.1:8546 + compile + migrate, Node 10)"
    );
  }
});

const app = express();
app.use(express.json());
app.use(cors());

app.put("/energy/:householdAddress", async (req, res) => {
  if (!ensureChainReady(res)) return;
  try {
    const householdAddress = web3Utils.toChecksumAddress(
      req.params.householdAddress
    );
    const { signature, hash, timestamp, meterDelta } = req.body;

    if (typeof meterDelta !== "number") {
      throw new Error("meterDelta must be a number (Ws)");
    }

    const valid = await memberValidator.isValidatorAddress(
      ownedSetContract,
      householdAddress
    );
    if (!valid) throw new Error("Address is not a validator household");

    const recovered = await web3Client.recoverSigner(web3, hash, signature);
    if (recovered !== householdAddress) {
      throw new Error("Signature does not match household");
    }

    if (engine.registerMember(householdAddress)) {
      console.log(`Registered household ${householdAddress}`);
    }
    console.log(
      `Meter delta ${meterDelta} Ws @ ${timestamp} from ${householdAddress}`
    );
    engine.applyMeterDelta(householdAddress, meterDelta, timestamp);
    engine.roundSettled = false;

    res.status(200).end();
  } catch (err) {
    console.error("PUT /energy", err.message);
    res.status(400).json({ error: err.message });
  }
});

app.post("/reset", (req, res) => {
  engine = new SettlementEngine();
  engineAfterNetting = engine;
  res.json({ ok: true, message: "NED fully cleared" });
});

app.get("/network", (req, res) => {
  res.json({
    renewableEnergy: engine.renewableEnergy,
    nonRenewableEnergy: engine.nonRenewableEnergy
  });
});

app.get("/meterdelta", async (req, res) => {
  if (!ensureChainReady(res)) return;
  try {
    const { signature, hash } = req.query;
    const recovered = await web3Client.recoverSigner(web3, hash, signature);
    const valid = await memberValidator.isValidatorAddress(
      ownedSetContract,
      recovered
    );
    if (!valid) throw new Error("Not a validator");
    res.json({ meterDelta: engine.households[recovered].meterDelta });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/transfers/:householdAddress", (req, res) => {
  if (!ensureChainReady(res)) return;
  try {
    const { from = 0 } = req.query;
    const addr = web3Utils.toChecksumAddress(req.params.householdAddress);
    res.json(engine.getTransfers(addr, Number(from)) || []);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/ledger", (req, res) => {
  res.json(engine.transfers || []);
});

app.get("/", (req, res) => {
  res.json({
    service: "smart-city-netting-service",
    mode: "reference-like",
    intervalMs: config.nettingInterval,
    endpoints: {
      "PUT /energy/:address": "Signed meter reading only",
      "GET /network": "Grid totals (Ws)",
      "GET /transfers/:address?from=": "This cycle transfers",
      "POST /reset": "Full clear"
    }
  });
});

const server = app.listen(config.port, config.host, () => {
  console.log(
    `Netting service listening on http://${config.host}:${config.port}/`
  );
});

server.on("error", err => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `Port ${config.port} in use. Stop: lsof -i :${config.port} -t | xargs kill`
    );
    process.exit(1);
  }
  throw err;
});
