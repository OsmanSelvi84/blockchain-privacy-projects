const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const THRESHOLD = 2;

  console.log("Deploying SocialRecoveryWallet...");
  console.log("  Deployer:", deployer.address);
  console.log("  Threshold:", THRESHOLD);

  const Factory = await hre.ethers.getContractFactory("SocialRecoveryWallet");
  const wallet  = await Factory.deploy(THRESHOLD);
  await wallet.waitForDeployment();

  const address = await wallet.getAddress();
  console.log("\n✓ SocialRecoveryWallet deployed to:", address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});