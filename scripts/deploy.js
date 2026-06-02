/**
 * ConsentManager deploy script
 *
 * Kullanim:
 *   - Hardhat'in default network'unde (gecici, her run'da yeni):
 *       npx hardhat run scripts/deploy.js
 *
 *   - Local Hardhat node'a (kalici, ayri terminalde 'npx hardhat node' calismali):
 *       npx hardhat run scripts/deploy.js --network localhost
 *
 * Deploy basarili olursa kontrat adresi konsola yazilir ve frontend icin
 * frontend/contract-info.json dosyasi olusturulur (ABI + adres).
 */

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("=========================================");
    console.log("  ConsentManager Deploy");
    console.log("=========================================");

    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploy eden hesap:", deployer.address);

    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("Hesap bakiyesi:   ", hre.ethers.formatEther(balance), "ETH");
    console.log("Network:          ", hre.network.name);
    console.log("-----------------------------------------");

    const ConsentManager = await hre.ethers.getContractFactory("ConsentManager");
    console.log("Kontrat deploy ediliyor...");

    const consentManager = await ConsentManager.deploy();
    await consentManager.waitForDeployment();

    const address = await consentManager.getAddress();
    console.log("");
    console.log(">>> ConsentManager deploy edildi:", address);
    console.log("");

    // Frontend icin ABI ve adresi disa yaz
    const artifact = await hre.artifacts.readArtifact("ConsentManager");
    const info = {
        address: address,
        abi: artifact.abi,
        network: hre.network.name,
        deployedAt: new Date().toISOString(),
    };

    const frontendDir = path.join(__dirname, "..", "frontend");
    if (!fs.existsSync(frontendDir)) {
        fs.mkdirSync(frontendDir, { recursive: true });
    }

    const outFile = path.join(frontendDir, "contract-info.json");
    fs.writeFileSync(outFile, JSON.stringify(info, null, 2));
    console.log("Frontend bilgisi yazildi:", outFile);
    console.log("=========================================");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
