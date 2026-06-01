import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { ethers } from "ethers";
import { buildPoseidon } from "circomlibjs";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const NOTE_PREFIX = "zkp-hidden-payment:marouan";
const NOTE_VERSION = 1;

// cnfig
const HARDHAT_KEY_0 = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

const CONFIG = {
    rpcUrl:process.env.RPC_URL || "http://127.0.0.1:8545",
    privateKey: process.env.PRIVATE_KEY || HARDHAT_KEY_0,
};

const FIX_DEPOSIT_AMOUNT = ethers.parseEther("0.1");

// filesystem helper
const loadAddresses = () => {
    const p = path.join(__dirname, "..", "deployedAddresses.json");
    if (!fs.existsSync(p)) {
        throw new Error("deployedAddresses.json not found. Run scripts/deploy.js first.");
    }

    return JSON.parse(fs.readFileSync(p, "utf8"));
}
const loadArtifactAbi = (contractName) => {
    const artifactPath = path.join(
        __dirname, "..", "artifacts", "contracts",
        `${contractName}.sol`, `${contractName}.json`,
    );

    return JSON.parse(fs.readFileSync(artifactPath, "utf8")).abi;
}

// input helpers
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
const normalizeAndValidatePrivateKey = (rawPrivateKey) => {
    const candidate = rawPrivateKey.startsWith("0x") ? rawPrivateKey : `0x${rawPrivateKey}`;
    return candidate;
}
const promptValidPrivateKey = async (defaultPrivateKey) => {
    const isTty = process.stdin.isTTY;
    const invalidKeyMessage = "Invalid private key. Use 64 hex characters (32 bytes), with or without 0x prefix.";
    const question = "Depositor private key [.env PRIVATE_KEY default]";

    while (true) {
        const privateKeyInput = await promptWithDefault(
            question,
            defaultPrivateKey,
            { showDefault: false },
        );
        const candidate = normalizeAndValidatePrivateKey(privateKeyInput);

        if (ethers.isHexString(candidate, 32)) {
            return candidate;
        }

        console.log(`\x1b[31m[INPUT ERROR]\x1b[0m ${invalidKeyMessage}`);

        if (!isTty) {
            throw new Error(invalidKeyMessage);
        }
    }
}
const promptNotePassphrase = async () => {
    const isTty = process.stdin.isTTY;
    const defaultPassphrase = process.env.NOTE_PASSPHRASE || "";

    while (true) {
        const passphrase = await promptWithDefault(
            `Encryption passphrase (${NOTE_PREFIX}) Optional`,
            defaultPassphrase,
            { showDefault: false },
        );

        if (passphrase.trim()) {
            return passphrase.trim();
        }

        console.log("\x1b[31m[INPUT ERROR]\x1b[0m Passphrase cannot be empty.");

        if (!isTty) {
            throw new Error("Passphrase cannot be empty.");
        }
    }
}

// cryptography hlpers
const randomFieldBigInt = () => BigInt("0x" + crypto.randomBytes(31).toString("hex"));
const toBytes32 = (big) => "0x" + big.toString(16).padStart(64, "0");
const buildCommitment = (poseidon, secret, randomness) => {
    const commitmentBig = BigInt(
        poseidon.F.toString(
            poseidon([secret, randomness])
        )
    );

    return { commitmentBig, commitmentHex: toBytes32(commitmentBig) };
}
const encryptDepositNote = (note, passphrase) => {
    const iv = crypto.randomBytes(12);
    const salt = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
        "aes-256-gcm",
        crypto.scryptSync(passphrase, `${NOTE_PREFIX}:salt:${salt.toString("hex")}`, 32),
        iv,
    );
    cipher.setAAD(Buffer.from(NOTE_PREFIX, "utf8"));

    const plaintext = JSON.stringify({
        version: NOTE_VERSION,
        prefix: NOTE_PREFIX,
        ...note,
    });
    const ciphertext = Buffer.concat([
        cipher.update(Buffer.from(plaintext, "utf8")),
        cipher.final(),
    ]);

    const payload = JSON.stringify({
        version: NOTE_VERSION,
        prefix: NOTE_PREFIX,
        algorithm: "aes-256-gcm",
        salt: salt.toString("hex"),
        iv: iv.toString("hex"),
        authTag: cipher.getAuthTag().toString("hex"),
        ciphertext: ciphertext.toString("base64"),
    });

    return `${NOTE_PREFIX}.${Buffer.from(payload, "utf8").toString("base64url")}`;
}

//blockchain helpers
const parseLeafIndex = (contract, receipt) => {
    for (const log of receipt.logs) {
        try {
            const parsed = contract.interface.parseLog(log);
            if (parsed?.name === "Deposit") return Number(parsed.args.leafIndex);
        } catch (_) {}
    }
    return null;
}

// service
async function main() {
    const addresses = loadAddresses();
    console.log("INPUTS:");
    console.log("---------");
    const validatedPrivateKey = await promptValidPrivateKey(CONFIG.privateKey);

    const provider = new ethers.JsonRpcProvider(CONFIG.rpcUrl);
    const signer = new ethers.Wallet(validatedPrivateKey, provider);
    const balanceBefore = await provider.getBalance(signer.address);
    const contractBalanceBefore = await provider.getBalance(addresses.zkpPayment);

    const payment = new ethers.Contract(
        addresses.zkpPayment,
        loadArtifactAbi("ZKPPayment"),
        signer,
    );

    const poseidon = await buildPoseidon();
    const secret = randomFieldBigInt();
    const randomness = randomFieldBigInt();
    const { commitmentHex } = buildCommitment(poseidon, secret, randomness);
    const passphrase = await promptNotePassphrase();

    const tx = await payment.deposit(commitmentHex, { value: FIX_DEPOSIT_AMOUNT });
    const receipt = await tx.wait();
    console.log();

    const note = {
        secret: secret.toString(),
        randomness: randomness.toString(),
        commitment: commitmentHex,
        leafIndex: parseLeafIndex(payment, receipt),
        txHash: tx.hash,
        contract: addresses.zkpPayment,
    };

    const encryptedNote = encryptDepositNote(note, passphrase);
    console.log("OUTPUTS:");
    console.log("-------");
    console.log(`Your note: ${encryptedNote}`);
    console.log(`ZKPPayment ETH balance is ${ethers.formatEther(contractBalanceBefore)}`);
    console.log(`Sender account ETH balance is ${ethers.formatEther(balanceBefore)}`);
    console.log("Submitting deposit transaction");
    console.log(`ZKPPayment ETH balance is ${ethers.formatEther(await provider.getBalance(addresses.zkpPayment))}`);
    console.log(`Sender account ETH balance is ${ethers.formatEther(await provider.getBalance(signer.address))}\n`);
}

main().catch((err) => {
    const message = err?.message || String(err);
    console.error(`\x1b[31m[ERROR]\x1b[0m ${message}`);
    process.exit(1);
});