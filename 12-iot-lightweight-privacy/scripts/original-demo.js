const { ethers } = require("hardhat");
const { jsonReplacer, runAllOriginalCases } = require("./lib/flows");

async function main() {
  const outputs = await runAllOriginalCases(ethers);
  console.log(JSON.stringify(outputs, jsonReplacer, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
