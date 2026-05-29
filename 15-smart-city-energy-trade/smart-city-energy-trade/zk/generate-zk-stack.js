#!/usr/bin/env node
/**
 * Smart City Energy Trade — ZoKrates circuit generator (project-owned layout).
 * Usage: node zk/generate-zk-stack.js <producers> <consumers>
 * Example: node zk/generate-zk-stack.js 1 1
 */
const fs = require("fs");
const path = require("path");
const { buildMainCircuit } = require("./lib/circuit-builder");

const ROOT = path.join(__dirname, "..");
const args = process.argv.slice(2);

function usage() {
  console.log("Usage: node zk/generate-zk-stack.js <producerCount> <consumerCount>");
  console.log("Writes: zk/settlement-check.zok");
  process.exit(1);
}

if (args.length < 2) usage();

const producers = Number(args[0]);
const consumers = Number(args[1]);

if (!Number.isInteger(producers) || producers < 1 || !Number.isInteger(consumers) || consumers < 1) {
  console.error("Producer and consumer counts must be integers >= 1");
  process.exit(1);
}

const header = `// Smart City Energy Trade — settlement-check circuit (${producers} producer(s), ${consumers} consumer(s))\n`;
const body = buildMainCircuit(producers, consumers);
const outPath = path.join(__dirname, "settlement-check.zok");

fs.writeFileSync(outPath, header + body, "utf8");
console.log("Wrote", outPath);
