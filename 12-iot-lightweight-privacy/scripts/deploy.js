const { ethers } = require("hardhat");

async function main() {
  const Original = await ethers.getContractFactory("OriginalIoTPrivacyAggregation");
  const original = await Original.deploy();
  await original.waitForDeployment();

  console.log("OriginalIoTPrivacyAggregation deployed to:", await original.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
