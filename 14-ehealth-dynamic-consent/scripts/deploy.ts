import hre from "hardhat";

async function main() {
  const DynamicConsent = await hre.ethers.getContractFactory("DynamicConsent");

  const dynamicConsent = await DynamicConsent.deploy();

  await dynamicConsent.waitForDeployment();

  console.log("DynamicConsent deployed to:", await dynamicConsent.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
