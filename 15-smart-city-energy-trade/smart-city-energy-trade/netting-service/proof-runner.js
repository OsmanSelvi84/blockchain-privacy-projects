const shell = require("shelljs");
const chalk = require("chalk");
const fs = require("fs");
const { performance } = require("perf_hooks");

module.exports = {
  generateProof(beforeEngine, afterEngine, mode = "production_mode") {
    const producerAddrs = beforeEngine.getHouseholdAddressesProducers();
    const consumerAddrs = beforeEngine.getHouseholdAddressesConsumers();
    const hhAddresses = [...producerAddrs, ...consumerAddrs];

    const deltasProducersBeforeNet = producerAddrs
      .map(a => beforeEngine.households[a].meterDelta)
      .join(" ");
    const deltasConsumersBeforeNet = consumerAddrs
      .map(a => Math.abs(beforeEngine.households[a].meterDelta))
      .join(" ");

    const deltasProducersAfterNet = producerAddrs
      .map(a => afterEngine.households[a].meterDelta)
      .join(" ");
    const deltasConsumersAfterNet = consumerAddrs
      .map(a => Math.abs(afterEngine.households[a].meterDelta))
      .join(" ");

    process.stdout.write("Computing witness...");
    const witnessStart = performance.now();
    const witnessResult = shell.exec(
      `zokrates compute-witness -a ${deltasProducersBeforeNet} ${deltasConsumersBeforeNet} ${deltasProducersAfterNet} ${deltasConsumersAfterNet} > /dev/null`
    );

    if (witnessResult.code !== 0) {
      process.stdout.write(chalk.red("failed\n"));
      throw new Error("zokrates compute-witness failed");
    }
    process.stdout.write(chalk.green("done\n"));

    if (mode === "benchmark_mode") {
      console.log(
        "Witness ms:",
        performance.now() - witnessStart
      );
    }

    process.stdout.write("Generating proof...");
    const proofResult = shell.exec("zokrates generate-proof > /dev/null");
    if (proofResult.code !== 0) {
      process.stdout.write(chalk.red("failed\n"));
      throw new Error("zokrates generate-proof failed");
    }
    process.stdout.write(chalk.green("done\n"));

    return hhAddresses;
  },

  readProofJson() {
    const raw = fs.readFileSync(`${__dirname}/../zk/proof.json`);
    return JSON.parse(raw);
  }
};
