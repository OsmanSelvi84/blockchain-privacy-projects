const express = require("express");
const cors = require("cors");
const commander = require("commander");
const web3Utils = require("web3-utils");
const shell = require("shelljs");
const fs = require("fs");
const Utility = require("./utility");
const hhHandler = require("./household-handler");
const zkHandler = require("./zk-handler");
const web3Helper = require("../helpers/web3");
const contractHelper = require("../helpers/contract");

const serverConfig = require("../ned-server-config");

// Specify cli options
commander
  .option("-h, --host <type>", "ip of ned server")
  .option("-p, --port <type>", "port of ned server")
  .option("-i, --interval <type>", "interval of the netting")
  .option(
    "-n, --network <type>",
    "network name specified in truffle-config.js"
  );
commander.parse(process.argv);

const config = {
  nettingInterval: commander.interval || serverConfig.nettingInterval,
  host: commander.host || serverConfig.host,
  port: commander.port || serverConfig.port,
  network: commander.network || serverConfig.network,
  address: serverConfig.address,
  password: serverConfig.password
};

let web3;
/** @type Utility */
let utility;
/** @type Utility */
let utilityAfterNetting;
let ownedSetContract;
let utilityContract;
let latestBlockNumber;

async function init() {
  web3 = web3Helper.initWeb3(config.network);
  latestBlockNumber = await web3.eth.getBlockNumber();
  // Off-chain utility instance
  utility = new Utility();
  utilityContract = new web3.eth.Contract(
    contractHelper.getAbi("dUtility"),
    contractHelper.getDeployedAddress("dUtility", await web3.eth.net.getId())
  );
  ownedSetContract = new web3.eth.Contract(
    contractHelper.getAbi("ownedSet"),
    contractHelper.getDeployedAddress("ownedSet", await web3.eth.net.getId())
  );
  shell.cd("zokrates-code");

  utilityContract.events.NettingSuccess(
    {
      fromBlock: latestBlockNumber
    },
    async (error, event) => {
      if (error) {
        console.error(error.msg);
        throw error;
      }
      console.log("Netting Successful!");
      latestBlockNumber = event.blockNumber;
      utility = utilityAfterNetting;
    }
  );

  const scheduleNextNetting = () => {
    console.log(`Sleep for ${config.nettingInterval}ms ...`);
    setTimeout(() => {
      runZokrates();
    }, config.nettingInterval);
  };

  async function runZokrates() {
    const transfersBefore = utility.transfers.length;
    let utilityBeforeNetting = JSON.parse(JSON.stringify(utility)); // dirty hack for obtaining deep copy of utility
    Object.setPrototypeOf(utilityBeforeNetting, Utility.prototype);
    utilityAfterNetting = JSON.parse(JSON.stringify(utility));
    Object.setPrototypeOf(utilityAfterNetting, Utility.prototype);
    utilityAfterNetting.settle();
    console.log("Utility before Netting: ", utilityBeforeNetting);
    console.log("Utility after Netting: ", utilityAfterNetting);

    // Publish off-chain transfers for dashboards (household-server sync).
    utility = utilityAfterNetting;
    Object.setPrototypeOf(utility, Utility.prototype);
    const newTransfers = utility.transfers.length - transfersBefore;
    if (newTransfers > 0) {
      console.log(`Off-chain netting recorded ${newTransfers} new transfer(s).`);
    }

    let hhAddresses = zkHandler.generateProof(
      utilityBeforeNetting,
      utilityAfterNetting,
      "production_mode"
    );

    let rawdata = fs.readFileSync("../zokrates-code/proof.json");
    let data = JSON.parse(rawdata);
    if (hhAddresses.length > 0) {
      await web3.eth.personal.unlockAccount(
        config.address,
        config.password,
        null
      );
      utilityContract.methods
        .checkNetting(
          hhAddresses,
          data.proof.a,
          data.proof.b,
          data.proof.c,
          data.inputs
        )
        .send({ from: config.address, gas: 60000000 }, (error, txHash) => {
          if (error) {
            console.error("checkNetting failed (off-chain transfers still saved):", error.message);
            scheduleNextNetting();
            return;
          }
          console.log("checkNetting txHash", txHash);
          scheduleNextNetting();
        });
    } else {
      console.log("No households to hash.");
      scheduleNextNetting();
    }
  }

  setTimeout(() => {
    runZokrates();
  }, config.nettingInterval);
}

init();

const app = express();

app.use(express.json());
app.use(cors());

/**
 * PUT /energy/:householdAddress
 */
app.put("/energy/:householdAddress", async (req, res) => {
  try {
    const householdAddress = web3Utils.toChecksumAddress(
      req.params.householdAddress
    );
    const { signature, hash, timestamp, meterDelta } = req.body;

    if (typeof meterDelta !== "number") {
      throw new Error("Invalid payload: meterDelta is not a number");
    }

    const validHouseholdAddress = await hhHandler.isValidatorAddress(
      ownedSetContract,
      householdAddress
    );
    if (!validHouseholdAddress) {
      throw new Error("Given address is not a validator");
    }

    const recoveredAddress = await web3Helper.verifySignature(
      web3,
      hash,
      signature
    );
    if (recoveredAddress != householdAddress) {
      throw new Error("Invalid signature");
    }

    if (utility.addHousehold(householdAddress)) {
      console.log(`New household ${householdAddress} added`);
    }
    console.log(
      `Incoming meter delta ${meterDelta} at ${timestamp} for ${householdAddress}`
    );
    utility.updateMeterDelta(householdAddress, meterDelta, timestamp);

    res.status(200);
    res.send();
  } catch (err) {
    console.error("PUT /energy/:householdAddress", err.message);
    res.status(400);
    res.send(err);
  }
});

/**
 * GET endpoint returning the current energy balance of renewableEnergy from Utility.js
 */
app.get("/network", (req, res) => {
  try {
    res.status(200);
    res.json({
      renewableEnergy: utility.renewableEnergy,
      nonRenewableEnergy: utility.nonRenewableEnergy
    });
  } catch (err) {
    console.error("GET /network", err.message);
    res.status(400);
    res.send(err);
  }
});

/**
 * GET endpoint returning the current meterDelta of a household that provides a valid signature for the account
 */
app.get("/meterdelta", async (req, res) => {
  try {
    const { signature, hash } = req.query;
    const recoveredAddress = await web3Helper.verifySignature(web3, hash, signature)
    const validHouseholdAddress = await hhHandler.isValidatorAddress(
      ownedSetContract,
      recoveredAddress
    );
    if (!validHouseholdAddress) {
      throw new Error("Given address is not a validator");
    }

    res.status(200);
    res.json({meterDelta: utility.households[recoveredAddress].meterDelta });
  } catch (err) {
    console.error("GET /meterdelta", err.message);
    res.status(400);
    res.send(err);
  }
});

/**
 * GET endpoint returning the transfers of a specific Household and a given day from Utility.js
 * Access this like: http://127.0.0.1:3005/transfers/123456789?from=1122465557 (= Date.now())
 */
app.get("/transfers/:householdAddress", (req, res) => {
  try {
    const { from = 0 } = req.query;
    const householdAddress = web3Utils.toChecksumAddress(
      req.params.householdAddress
    );
    const transfers = utility.getTransfers(householdAddress, from);
    res.status(200);
    res.json(transfers || []);
  } catch (err) {
    console.error("GET /transfers/:householdAddress", err.message);
    res.status(400);
    res.send(err);
  }
});

/**
 * GET / — API info (no web UI on this port)
 */
app.get("/", function(req, res) {
  res.status(200).json({
    service: "netting-entity",
    message: "REST API only. Household dashboards: http://localhost:3000 and http://localhost:3010",
    endpoints: {
      "GET /network": "Renewable / non-renewable energy totals",
      "GET /meterdelta?hash=&signature=": "Meter delta for signed household",
      "GET /transfers/:address?from=": "Transfers for a household",
      "PUT /energy/:householdAddress": "Submit signed meter reading"
    }
  });
});

/**
 * POST request not supported
 */
app.post("/", function(req, res, next) {
  res.status(400);
  res.end(req.method + " is not supported.\n");
});

/**
 * DELETE request not supported
 */
app.delete("/", function(req, res, next) {
  res.status(400);
  res.end(req.method + " is not supported.\n");
});

/**
 * Let the server listen to incoming requests on the given IP:Port
 */
app.listen(config.port, () => {
  console.log(`Netting Entity running at http://${config.host}:${config.port}/`);
});
