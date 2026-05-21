import { network } from "hardhat";

const { ethers, networkName } = await network.create();

console.log("Deploying DIDRegistry to", networkName);

const didRegistry = await ethers.deployContract("DIDRegistry");

await didRegistry.waitForDeployment();

console.log("DIDRegistry deployed to:", await didRegistry.getAddress());