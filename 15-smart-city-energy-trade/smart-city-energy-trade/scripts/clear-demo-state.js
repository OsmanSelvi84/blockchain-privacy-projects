#!/usr/bin/env node
/**
 * Clears all transfer ticker data (NED + Mongo H1/H2).
 * Usage: node scripts/clear-demo-state.js
 */
const http = require("http");
const { MongoClient } = require("mongodb");

const MONGO = "mongodb://127.0.0.1:27017";
const DBS = ["smart_city_h1", "smart_city_h2", "smart_city_energy"];

function post(url) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = http.request(
      {
        hostname: u.hostname,
        port: u.port,
        path: u.pathname,
        method: "POST"
      },
      res => {
        let body = "";
        res.on("data", c => (body += c));
        res.on("end", () => resolve(body));
      }
    );
    req.on("error", reject);
    req.end();
  });
}

(async () => {
  const client = await MongoClient.connect(MONGO, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
  for (const name of DBS) {
    const db = client.db(name);
    const r = await db.collection("energy_transfers").deleteMany({});
    await db
      .collection("meter_reading")
      .updateOne({ _id: 1 }, { $set: { value: 0 } }, { upsert: true });
    console.log(`${name}: ${r.deletedCount} transfer(s) deleted`);
  }
  await client.close();

  try {
    console.log("NED reset:", await post("http://127.0.0.1:3005/reset"));
  } catch (e) {
    console.warn("NED not running:", e.message);
  }
  try {
    await post("http://127.0.0.1:3002/demo/reset");
    await post("http://127.0.0.1:3003/demo/reset");
    console.log("Gateways reset OK");
  } catch (e) {
    console.warn("Gateways:", e.message);
  }
  console.log("Done. Refresh UI (F5) on :3000 and :3010.");
})();
