const readline = require("node:readline/promises");
const { stdin: input, stdout: output } = require("node:process");
const { ethers } = require("hardhat");
const { jsonReplacer, runBothCase } = require("./lib/flows");

function asBool(value, fallback) {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return fallback;
  return ["true", "t", "yes", "y", "1", "evet", "e"].includes(normalized);
}

function asInt(value, fallback) {
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

async function ask(rl, label, fallback) {
  const answer = await rl.question(`${label} [${fallback}]: `);
  return answer.trim() === "" ? fallback : answer.trim();
}

async function askVector(rl, index) {
  console.log(`\nInput ${index}`);
  const name = await ask(rl, "name", `custom-case-${index}`);
  const requestedData = await ask(rl, "requestedData", "temperature");
  const requestedPurpose = await ask(rl, "requestedPurpose", "monitoring");
  const requestedOperation = await ask(rl, "requestedOperation", "aggregate-average");
  const requestedDisclosure = await ask(rl, "requestedDisclosure", "aggregator-only");
  const requestedRetention = asInt(await ask(rl, "requestedRetention seconds", "3600"), 3600);
  const aggregationFunction = await ask(rl, "aggregationFunction", "average");
  const needExplicitConsent = asBool(await ask(rl, "needExplicitConsent true/false", "false"), false);
  const consentResponse = asBool(await ask(rl, "consentResponse true/false", "true"), true);
  const temperatureMilliC = asInt(await ask(rl, "temperatureMilliC", "25000"), 25000);
  const humidityBps = asInt(await ask(rl, "humidityBps", "6000"), 6000);
  const timestamp = asInt(await ask(rl, "timestamp", String(1717200000 + index)), 1717200000 + index);

  return {
    name,
    requestedData,
    requestedPurpose,
    requestedOperation,
    requestedDisclosure,
    requestedRetention,
    aggregationFunction,
    needExplicitConsent,
    consentResponse,
    deviceSalt: `${name}:device-salt`,
    deviceSecret: `${name}:device-secret`,
    commitmentSalt: `${name}:commitment-salt`,
    reading: {
      temperatureMilliC,
      humidityBps,
      timestamp
    }
  };
}

async function main() {
  if (!input.isTTY) {
    const vector = {
      name: "custom-case-1",
      requestedData: "temperature",
      requestedPurpose: "monitoring",
      requestedOperation: "aggregate-average",
      requestedDisclosure: "aggregator-only",
      requestedRetention: 3600,
      aggregationFunction: "average",
      needExplicitConsent: false,
      consentResponse: true,
      deviceSalt: "custom-case-1:device-salt",
      deviceSecret: "custom-case-1:device-secret",
      commitmentSalt: "custom-case-1:commitment-salt",
      reading: {
        temperatureMilliC: 25000,
        humidityBps: 6000,
        timestamp: 1717200001
      }
    };

    console.log(JSON.stringify([await runBothCase(ethers, vector)], jsonReplacer, 2));
    return;
  }

  const rl = readline.createInterface({ input, output });

  try {
    console.log("Interactive reference vs original comparison");
    console.log("Press Enter to accept the default shown in brackets.");
    const count = asInt(await ask(rl, "How many inputs?", "1"), 1);
    const outputs = [];

    for (let i = 1; i <= count; i++) {
      const vector = await askVector(rl, i);
      outputs.push(await runBothCase(ethers, vector));
    }

    console.log("\nComparison output");
    console.log(JSON.stringify(outputs, jsonReplacer, 2));
  } finally {
    rl.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
