import { network } from "hardhat";

async function main() {
  const { ethers } = await network.create();

  const [owner, guardian1, guardian2, guardian3, newOwner] =
    await ethers.getSigners();

  console.log("Social Recovery Wallet Demo");
  console.log("---------------------------");
  console.log("Original owner:", owner.address);
  console.log("Guardian 1:", guardian1.address);
  console.log("Guardian 2:", guardian2.address);
  console.log("Guardian 3:", guardian3.address);
  console.log("New owner:", newOwner.address);

  const wallet = await ethers.deployContract("SocialRecoveryWallet", [
    [guardian1.address, guardian2.address, guardian3.address],
    2,
  ]);

  await wallet.waitForDeployment();

  console.log("\nContract deployed.");
  console.log("Current owner:", await wallet.owner());

  console.log("\nGuardian 1 starts recovery...");
  await wallet.connect(guardian1).startRecovery(newOwner.address);

  console.log("Approval count:", (await wallet.approvalCount()).toString());
  console.log("Pending new owner:", await wallet.pendingNewOwner());

  console.log("\nGuardian 2 approves recovery...");
  await wallet.connect(guardian2).approveRecovery();

  console.log("\nThreshold reached.");
  console.log("Recovered owner:", await wallet.owner());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});