const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying MimbleWimbleCT with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  const MimbleWimbleCT = await ethers.getContractFactory("MimbleWimbleCT");
  const contract = await MimbleWimbleCT.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("\nMimbleWimbleCT deployed to:", address);
  console.log("\n--- Demo: creating a coinbase commitment ---");

  const blindingFactor = ethers.randomBytes(32);
  const amount = 1000n;
  const blindingHex = ethers.hexlify(blindingFactor);

  const coinbaseTx = await contract.mintCoinbase(blindingHex, amount, deployer.address);
  const receipt = await coinbaseTx.wait();

  const event = receipt.logs
    .map(log => { try { return contract.interface.parseLog(log); } catch { return null; } })
    .find(e => e && e.name === "CoinbaseCommitment");

  if (event) {
    console.log("Coinbase commitment hash:", event.args.commitmentHash);
    console.log("Recipient:", event.args.recipient);
  }

  console.log("\nTotal commitments:", (await contract.totalCommitments()).toString());
  console.log("UTXO set size:", (await contract.getUtxoCount()).toString());
  console.log("\nDeployment complete.");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
