const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying original ABE contract with authority account:", deployer.address);

  const AgencyABEControl = await ethers.getContractFactory("AgencyABEControl");
  const contract = await AgencyABEControl.deploy();

  await contract.waitForDeployment();
  console.log("Original Implementation successfully deployed to:", await contract.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});