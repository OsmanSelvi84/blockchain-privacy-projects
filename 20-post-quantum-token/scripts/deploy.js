const { ethers } = require("hardhat");
const fs         = require("fs");
const path       = require("path");

async function main() {
    console.log("\n=======================================================");
    console.log("  PostQuantumToken - Deployment");
    console.log("=======================================================\n");

    const [deployer] = await ethers.getSigners();
    const network    = await ethers.provider.getNetwork();
    const balance    = await ethers.provider.getBalance(deployer.address);

    console.log("  Network  :", network.name, `(chainId: ${network.chainId})`);
    console.log("  Deployer :", deployer.address);
    console.log("  Balance  :", ethers.formatEther(balance), "ETH\n");

    const INITIAL_SUPPLY = 1_000_000;

    const Factory = await ethers.getContractFactory("PostQuantumToken");
    const token   = await Factory.deploy(INITIAL_SUPPLY);
    await token.waitForDeployment();

    const address = await token.getAddress();
    const txHash  = token.deploymentTransaction()?.hash ?? "n/a";

    console.log("  Deployed successfully!");
    console.log("  Address  :", address);
    console.log("  Tx hash  :", txHash);
    console.log("  Name     :", await token.name());
    console.log("  Symbol   :", await token.symbol());
    console.log("  Supply   :", ethers.formatEther(await token.totalSupply()), "PQT\n");

    const info = {
        network:         network.name,
        chainId:         network.chainId.toString(),
        contractAddress: address,
        deployer:        deployer.address,
        txHash,
        initialSupply:   INITIAL_SUPPLY,
        deployedAt:      new Date().toISOString(),
    };

    fs.writeFileSync(
        path.join(__dirname, "..", "deployment.json"),
        JSON.stringify(info, null, 2)
    );
    console.log("  Saved to deployment.json\n");
}

main()
    .then(() => process.exit(0))
    .catch((err) => { console.error(err); process.exit(1); });
