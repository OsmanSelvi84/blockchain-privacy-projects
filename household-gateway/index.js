const express = require("express");
const cors = require("cors");
const commander = require("commander");
const request = require("request-promise");
const defaultConfig = require("../gateway-config");
const households = require("../lib/households");
const store = require("./storage/mongo-store");
const meterSubmitter = require("./meter-submitter");
const transferSync = require("./transfer-sync");
const nedClient = require("./ned-client");
const web3Client = require("../lib/web3-client");
const privacyHash = require("../lib/privacy-hash");
const contractRegistry = require("../lib/contract-registry");
const withTimeout = require("../lib/with-timeout");

commander
  .option("-h, --host <type>", "bind host")
  .option("-p, --port <type>", "listen port")
  .option("-d, --dbUrl <type>", "mongodb url")
  .option("-N, --nedUrl <type>", "ned base url")
  .option("-a, --address <type>", "parity account")
  .option("-P, --password <type>", "account password")
  .option("-n, --network <type>", "truffle network");
commander.parse(process.argv);

const config = {
  host: commander.host || defaultConfig.host,
  port: Number(commander.port) || defaultConfig.port,
  dbUrl: commander.dbUrl || defaultConfig.dbUrl,
  nedUrl: commander.nedUrl || defaultConfig.nedUrl,
  network: commander.network || defaultConfig.network,
  address: commander.address || defaultConfig.address,
  password: commander.password || defaultConfig.password,
  dbName:
    commander.dbName ||
    (Number(commander.port) === 3003 ? "smart_city_h2" : "smart_city_h1"),
  sensorDataCollection: defaultConfig.sensorDataCollection,
  transferCollection: defaultConfig.transferCollection,
  meterReadingCollection: defaultConfig.meterReadingCollection
};

config.address = households.checksum(config.address);
const expectedHousehold = households.expectedForGatewayPort(config.port);
if (
  !expectedHousehold ||
  config.address.toLowerCase() !== expectedHousehold.address.toLowerCase()
) {
  console.error(
    `Wrong household address for gateway :${config.port}.\n` +
      `  Expected ${expectedHousehold && expectedHousehold.label}: ${expectedHousehold && expectedHousehold.address}\n` +
      `  Got: ${commander.address || defaultConfig.address}\n` +
      `  H1 → yarn run-gateway-h1   H2 → yarn run-gateway-h2`
  );
  process.exit(1);
}

store.ensureCollections(config.dbUrl, config.dbName, [
  config.sensorDataCollection,
  config.transferCollection,
  config.meterReadingCollection
]);

let web3;
let utilityContract;
let latestBlockNumber;
let chainReady = false;
let nettingActive = false;

async function initChain() {
  web3 = web3Client.connect(config.network);
  latestBlockNumber = await withTimeout(
    web3.eth.getBlockNumber(),
    5000,
    "Parity connection"
  );
  const networkId = await web3.eth.net.getId();
  utilityContract = new web3.eth.Contract(
    contractRegistry.abi("dUtility"),
    contractRegistry.deployedAddress("dUtility", networkId)
  );

  utilityContract.events.NettingSuccess(
    { fromBlock: latestBlockNumber },
    async (error, event) => {
      if (error) {
        console.error(error.message);
        return;
      }
      if (await validateNettingPreimage()) {
        console.log("Netting validated; syncing transfers.");
        latestBlockNumber = event.blockNumber;
        nettingActive = false;
        transferSync.pullFromNed(config).catch(console.error);
      } else {
        console.error("Netting preimage mismatch");
      }
    }
  );
  chainReady = true;
  console.log("Parity connected, chain ready.");
}

async function validateNettingPreimage() {
  const probe = privacyHash.hashMeterReading(
    Math.floor(Math.random() * 999999999)
  );
  const { signature } = await web3Client.signPayload(
    web3,
    config.address,
    config.password,
    probe
  );
  const res = await nedClient.getMeterDelta(config.nedUrl, probe, signature);
  const onChainHash = await utilityContract.methods
    .getHouseholdAfterNettingHash(config.address)
    .call();
  return privacyHash.hashMeterReading(res.meterDelta) !== onChainHash;
}

initChain().catch(err => {
  console.warn("Parity unavailable (UI still works; node required for netting):", err.message);
});

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:3010",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:3010"
    ],
    methods: ["GET", "PUT", "POST", "OPTIONS"]
  })
);
app.options("*", cors());

app.get("/sensor-stats", async (req, res) => {
  try {
    const { from, to } = req.query;
    const filter = {};
    if (from) filter.timestamp = { $gte: parseInt(from, 10) };
    if (to) {
      filter.timestamp = filter.timestamp || {};
      filter.timestamp.$lte = parseInt(to, 10);
    }
    const data = await store.readAll(
      config.dbUrl,
      config.dbName,
      config.sensorDataCollection,
      filter
    );
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/transfers", async (req, res) => {
  try {
    await transferSync.pullFromNed(config);
    const fromMs = parseInt(req.query.from || 0, 10);
    const filter = {};
    if (req.query.from) filter.timestamp = { $gte: fromMs };
    const data = await store.readAll(
      config.dbUrl,
      config.dbName,
      config.transferCollection,
      filter
    );
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/household-stats", async (req, res) => {
  try {
    const data = await store.getMeterReading(
      config.dbUrl,
      config.dbName,
      config.meterReadingCollection
    );
    data.address = config.address;
    data.householdLabel = expectedHousehold.label;
    res.json(data);
  } catch (err) {
    res.json({ address: config.address, value: 0 });
  }
});

app.get("/network-stats", async (req, res) => {
  try {
    const data = await nedClient.getNetwork(config.nedUrl);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/sensor-stats", async (req, res) => {
  const { meterDelta, produce, consume } = req.body;
  if (typeof meterDelta !== "number") {
    return res.status(400).json({ error: "meterDelta must be a number in Ws" });
  }

  try {
    if (!nettingActive) {
      nettingActive = true;
    }

    await meterSubmitter.submitReading(
      config,
      web3,
      utilityContract,
      meterDelta
    );

    const sensorRow = await store.insertSensor(
      config.dbUrl,
      config.dbName,
      config.sensorDataCollection,
      { produce, consume }
    );
    await store.bumpMeter(
      config.dbUrl,
      config.dbName,
      config.meterReadingCollection,
      produce,
      consume
    );

    res.status(200).json({
      ok: true,
      message:
        "Accepted. Netting runs in ~60s after both households submit. UI refreshes automatically."
    });
  } catch (err) {
    console.error("PUT /sensor-stats:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/** Tam sıfırlama (referans: testler arası gateway restart + NED reset). */
app.post("/demo/reset", async (req, res) => {
  try {
    await nedClient.resetNed(config.nedUrl);
    await store.resetMeter(
      config.dbUrl,
      config.dbName,
      config.meterReadingCollection
    );
    await store.clearTransfers(
      config.dbUrl,
      config.dbName,
      config.transferCollection
    );
    nettingActive = false;
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/", (req, res) => {
  res.json({
    service: "smart-city-household-gateway",
    household: config.address,
    householdLabel: expectedHousehold.label,
    dashboard:
      config.port === 3002
        ? "http://localhost:3000"
        : "http://localhost:3010"
  });
});

const server = app.listen(config.port, config.host, () => {
  console.log(
    `Household gateway http://${config.host}:${config.port}/ (${config.address})`
  );
  setInterval(() => {
    transferSync.pullFromNed(config).catch(() => {});
  }, 30000);
});

server.on("error", err => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `Port ${config.port} is already in use (gateway may already be running).\n` +
        `  Stop it: lsof -i :${config.port} -t | xargs kill\n` +
        `  Or: lsof -ti:3002,3003 | xargs kill`
    );
    process.exit(1);
  }
  throw err;
});
