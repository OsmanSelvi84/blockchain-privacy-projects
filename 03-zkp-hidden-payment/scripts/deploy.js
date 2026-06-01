import fs from "fs";
import path from "path";
import hre from "hardhat";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { createInterface } from "node:readline/promises";
import { ethers as ethersLib } from "ethers";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ETH_DECIMALS = 18;

const formatEth = (value) => {
    return ethersLib.formatUnits(value, ETH_DECIMALS);
}

const formatGwei = (value) => {
    return ethersLib.formatUnits(value, "gwei");
}

const printSectionHeader = (title) => {
    console.log(title);
    console.log("=".repeat(title.length));
    console.log();
}

const printDeployStats = (stats) => {
    console.log(`   > transaction hash:    ${stats.txHash}`);
    console.log("   > Blocks: 0            Seconds: 0");
    console.log(`   > contract address:    ${stats.address}`);
    console.log(`   > block number:        ${stats.blockNumber}`);
    console.log(`   > block timestamp:     ${stats.blockTimestamp}`);
    console.log(`   > account:             ${stats.account}`);
    console.log(`   > balance:             ${stats.balanceEth}`);
    console.log(`   > gas used:            ${stats.gasUsed} (0x${stats.gasUsed.toString(16)})`);
    console.log(`   > gas price:           ${stats.gasPriceGwei} gwei`);
    console.log(`   > value sent:          0 ETH`);
    console.log(`   > total cost:          ${stats.totalCostEth} ETH`);
}

const deployContractDetailed = async ({ name, args = [], libraries = {}, signer, provider }) => {
    const { ethers } = hre;
    const factoryOptions = Object.keys(libraries).length > 0 ? { libraries } : undefined;
    const Factory = await ethers.getContractFactory(name, factoryOptions);
    const contract = await Factory.connect(signer).deploy(...args);
    const deployTx = contract.deploymentTransaction();

    if (!deployTx) {
        throw new Error(`Missing deployment transaction for ${name}.`);
    }

    const receipt = await deployTx.wait();
    if (!receipt) {
        throw new Error(`No receipt returned for ${name} deployment.`);
    }

    const block = await provider.getBlock(receipt.blockNumber);
    const gasPrice = receipt.gasPrice ?? deployTx.gasPrice ?? 0n;
    const gasUsed = receipt.gasUsed;
    const totalCost = gasUsed * gasPrice;
    const balance = await provider.getBalance(signer.address);
    const address = await contract.getAddress();

    return {
        contract,
        address,
        txHash: deployTx.hash,
        blockNumber: receipt.blockNumber,
        blockTimestamp: block ? block.timestamp : 0,
        account: signer.address,
        balanceEth: formatEth(balance),
        gasUsed,
        gasPrice,
        gasPriceGwei: formatGwei(gasPrice),
        totalCost,
        totalCostEth: formatEth(totalCost),
    };
}

const promptWithDefault = async (question, defaultValue, { showDefault = true } = {}) => {
    if (!process.stdin.isTTY) {
        return defaultValue;
    }

    const rl = createInterface({ input: process.stdin, output: process.stdout });

    try {
        const suffix = showDefault ? ` [${defaultValue}]` : "";
        const answer = await rl.question(`${question}${suffix}: `);

        return answer.trim() || defaultValue;
    } finally {
        rl.close();
    }
}

const normalizePrivateKey = (raw) => {
    return raw.startsWith("0x") ? raw : `0x${raw}`;
};

const promptValidPrivateKey = async (defaultPrivateKey) => {
    const isTty = process.stdin.isTTY;
    const invalidKeyMessage = "Invalid private key. Use 64 hex characters (32 bytes), with or without 0x prefix.";
    const question = "Deployer private key [.env PRIVATE_KEY default]";

    while (true) {
        const input = await promptWithDefault(question, defaultPrivateKey || "", { showDefault: false });
        const candidate = normalizePrivateKey(String(input || ""));

        if (ethersLib.isHexString(candidate, 32)) {
            return candidate;
        }

        console.log(`\x1b[31m[INPUT ERROR]\x1b[0m ${invalidKeyMessage}`);

        if (!isTty) {
            throw new Error(invalidKeyMessage);
        }
    }
}
const resolveVerifierContractName = async () => {
    const candidates = ["Groth16Verifier", "Verifier"];

    for (const candidate of candidates) {
        try {
            await hre.artifacts.readArtifact(candidate);
            return candidate;
        } catch (error) {
            if (error?.message?.includes('not found')) {
                continue;
            }
            throw error;
        }
    }

    throw new Error(
        'Could not find a compiled verifier artifact. Run bash scripts/setup.sh first so contracts/Verifier.sol is generated and compiled.'
    );
}
const buildDeploymentRecord = async ({
    poseidonT3Address,
    verifierAddress,
    paymentAddress,
    denomination,
}) => {
    const { ethers } = hre;
    const network = await ethers.provider.getNetwork();

    return {
        network: hre.network.name,
        chainId: Number(network.chainId),
        poseidonT3: poseidonT3Address,
        verifier: verifierAddress,
        zkpPayment: paymentAddress,
        denomination: denomination.toString(),
        deployedAt: new Date().toISOString(),
    };
}
const persistDeploymentRecord = (record) => {
    const outPath = path.join(__dirname, "..", "deployedAddresses.json");
    fs.writeFileSync(outPath, JSON.stringify(record, null, 2));
    console.log("   > Saving artifacts");
    console.log("   -------------------------------------");
    console.log(`   > Saved ${outPath}`);
    
    return outPath;
}


// service
async function main() {
    const { ethers } = hre;
    const defaultPrivateKey = process.env.PRIVATE_KEY || "";

    printSectionHeader("Compiling your contracts...");
    const artifactDir = path.join(__dirname, "..", "artifacts", "contracts");
    console.log(`> Artifacts written to ${artifactDir}`);
    console.log("> Compiled successfully using:");
    console.log("   - external: undefined");
    console.log();

    printSectionHeader("Starting migrations...");
    const validated = await promptValidPrivateKey(defaultPrivateKey);
    const deployer = new hre.ethers.Wallet(validated, hre.ethers.provider);
    const provider = hre.ethers.provider;
    const network = await provider.getNetwork();
    const latestBlock = await provider.getBlock("latest");

    console.log(`> Network name:    '${hre.network.name}'`);
    console.log(`> Network id:      ${network.chainId}`);
    console.log(`> Block gas limit: ${latestBlock ? latestBlock.gasLimit : 0n} (0x${(latestBlock ? latestBlock.gasLimit : 0n).toString(16)})`);
    console.log();

    let totalDeployments = 0;
    let finalCost = 0n;

    printSectionHeader("1_deploy_poseidon_t3.js");
    console.log("   Deploying 'PoseidonT3'");
    console.log("   -----------------------");
    const poseidon = await deployContractDetailed({
        name: "PoseidonT3",
        signer: deployer,
        provider,
    });
    printDeployStats(poseidon);
    console.log();
    console.log("   > Saving artifacts");
    console.log("   -------------------------------------");
    console.log(`   > Total cost:          ${poseidon.totalCostEth} ETH`);
    console.log();
    totalDeployments += 1;
    finalCost += poseidon.totalCost;

    const verifierContractName = await resolveVerifierContractName();
    printSectionHeader("2_deploy_verifier.js");
    console.log(`   Deploying '${verifierContractName}'`);
    console.log("   ----------------------");
    const verifier = await deployContractDetailed({
        name: verifierContractName,
        signer: deployer,
        provider,
    });
    printDeployStats(verifier);
    console.log();
    console.log("   > Saving artifacts");
    console.log("   -------------------------------------");
    console.log(`   > Total cost:          ${verifier.totalCostEth} ETH`);
    console.log();
    totalDeployments += 1;
    finalCost += verifier.totalCost;

    const denomination = ethers.parseEther("0.1");
    printSectionHeader("3_deploy_zkp_payment.js");
    console.log("   Deploying 'ZKPPayment'");
    console.log("   ----------------------");
    const payment = await deployContractDetailed({
        name: "ZKPPayment",
        libraries: { PoseidonT3: poseidon.address },
        args: [verifier.address, denomination],
        signer: deployer,
        provider,
    });
    printDeployStats(payment);
    console.log(`\nZKPPayment address ${payment.address}`);
    console.log("   > Saving artifacts");
    console.log("   -------------------------------------");
    console.log(`   > Total cost:          ${payment.totalCostEth} ETH`);
    console.log();
    totalDeployments += 1;
    finalCost += payment.totalCost;

    const record = await buildDeploymentRecord({
        poseidonT3Address: poseidon.address,
        verifierAddress: verifier.address,
        paymentAddress: payment.address,
        denomination,
    });

    persistDeploymentRecord(record);
    console.log();
    printSectionHeader("Summary");
    console.log(`> Total deployments:   ${totalDeployments}`);
    console.log(`> Final cost:          ${formatEth(finalCost)} ETH`);
    console.log();
}

main().catch((err) => {
    const message = err?.message || String(err);
    console.error(`\x1b[31m[ERROR]\x1b[0m ${message}`);
    process.exit(1);
});