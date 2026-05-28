
const hre = require("hardhat");

async function main() {

    const PrivacyToken = await hre.ethers.getContractFactory("PrivacyToken");

    const token = await PrivacyToken.deploy(1000);

    await token.waitForDeployment();

    console.log("Contract deployed to:", await token.getAddress());
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
