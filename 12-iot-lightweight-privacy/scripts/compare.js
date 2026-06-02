const { ethers } = require("hardhat");
const { jsonReplacer, runAllComparisons } = require("./lib/flows");

async function main() {
  const outputs = await runAllComparisons(ethers);
  console.log(JSON.stringify(outputs, jsonReplacer, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
