import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { ethers } from "ethers";
import { buildPoseidon } from "circomlibjs";
import * as snarkjs from "snarkjs";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "url";
import { ZERO_VALUE, computeZeros } from "./computeZeros.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const NOTE_PREFIX = "zkp-hidden-payment:marouan";
const NOTE_VERSION = 1;

// config
const HARDHAT_KEY_0 = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const HARDHAT_ADDR_1 = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

const CONFIG = {
    rpcUrl: process.env.RPC_URL || "http://127.0.0.1:8545",
    privateKey: process.env.PRIVATE_KEY || HARDHAT_KEY_0,
    recipient: process.env.RECIPIENT || HARDHAT_ADDR_1,
    levels: 20,
    zeroValue: ZERO_VALUE,
};

// filesystem helpers
const loadJson = (file, hint) => {
    const p = path.join(__dirname, "..", file);
    if (!fs.existsSync(p)) throw new Error(`${file} not found. ${hint}`);

    return JSON.parse(fs.readFileSync(p, "utf8"));
}
const loadArtifactAbi = (contractName) => {
    const p = path.join(
        __dirname, "..", "artifacts", "contracts",
        `${contractName}.sol`, `${contractName}.json`,
    );

    return JSON.parse(fs.readFileSync(p, "utf8")).abi;
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
const normalizePrivateKey = (rawPrivateKey) => {
    return rawPrivateKey.startsWith("0x") ? rawPrivateKey : `0x${rawPrivateKey}`;
};
const promptValidPrivateKey = async (defaultPrivateKey) => {
    const isTty = process.stdin.isTTY;
    const invalidKeyMessage = "Invalid private key. Use 64 hex characters (32 bytes), with or without 0x prefix.";
    const question = "Relayer private key [.env PRIVATE_KEY default]";

    while (true) {
        const privateKeyInput = await promptWithDefault(
            question,
            defaultPrivateKey,
            { showDefault: false },
        );
        const candidate = normalizePrivateKey(privateKeyInput);

        if (ethers.isHexString(candidate, 32)) {
            return candidate;
        }

        console.log(`\x1b[31m[INPUT ERROR]\x1b[0m ${invalidKeyMessage}`);

        if (!isTty) {
            throw new Error(invalidKeyMessage);
        }
    }
}
const promptValidRecipient = async (defaultRecipient) => {
    const isTty = process.stdin.isTTY;
    const invalidRecipientMessage = "Invalid recipient address. Enter a valid Ethereum address (0x...).";

    while (true) {
        const recipientInput = await promptWithDefault("Recipient address", defaultRecipient);

        try {
            return ethers.getAddress(recipientInput);
        } catch (_) {
            console.log(`\x1b[31m[INPUT ERROR]\x1b[0m ${invalidRecipientMessage}`);

            if (!isTty) {
                throw new Error(invalidRecipientMessage);
            }
        }
    }
}
const promptEncryptedNote = async () => {
    const defaultNote = process.env.ENCRYPTED_NOTE || "";

    while (true) {
        const noteInput = await promptWithDefault(
            "Paste encrypted deposit note",
            defaultNote,
            { showDefault: false },
        );

        if (noteInput.trim()) {
            return noteInput.trim();
        }

        console.log("\x1b[31m[INPUT ERROR]\x1b[0m Encrypted note cannot be empty.");

        if (!process.stdin.isTTY) {
            throw new Error("Encrypted note cannot be empty.");
        }
    }
}
const parseEncryptedNoteInput = (noteInput) => {
    const trimmed = noteInput.trim();
    const prefix = `${NOTE_PREFIX}.`;

    if (!trimmed.startsWith(prefix)) {
        throw new Error(`Encrypted note must start with ${NOTE_PREFIX}.`);
    }

    const encodedPayload = trimmed.slice(prefix.length);
    const payloadJson = Buffer.from(encodedPayload, "base64url").toString("utf8");

    return JSON.parse(payloadJson);
}
const promptNotePassphrase = async () => {
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

        if (!process.stdin.isTTY) {
            throw new Error("Passphrase cannot be empty.");
        }
    }
}

// crytography helpers
const toBytes32 = (b) => "0x" + BigInt(b).toString(16).padStart(64, "0");
const hashPair = (left, right, poseidon, F) => BigInt(F.toString(
    poseidon([BigInt(left), BigInt(right)])
));
const decryptDepositNote = (payload, passphrase) => {
    if (payload?.prefix !== NOTE_PREFIX || payload?.version !== NOTE_VERSION) {
        throw new Error(`Unsupported encrypted note format for ${NOTE_PREFIX}.`);
    }

    const key = crypto.scryptSync(
        passphrase,
        `${NOTE_PREFIX}:salt:${payload.salt}`,
        32,
    );
    const decipher = crypto.createDecipheriv(
        "aes-256-gcm",
        key,
        Buffer.from(payload.iv, "hex"),
    );
    decipher.setAAD(Buffer.from(NOTE_PREFIX, "utf8"));
    decipher.setAuthTag(Buffer.from(payload.authTag, "hex"));

    const plaintext = Buffer.concat([
        decipher.update(Buffer.from(payload.ciphertext, "base64")),
        decipher.final(),
    ]).toString("utf8");

    return JSON.parse(plaintext);
};

// merkle tree helpers
const computeMerklePath = (leaves, leafIndex, depth, poseidon, F, zeros) => {
    const pathElements = [];
    const pathIndices  = [];

    let level = leaves.slice();
    let idx = leafIndex;

    for (let i = 0; i < depth; i++) {
        const sibIdx = idx ^ 1;
        const sibling = sibIdx < level.length ? level[sibIdx] : zeros[i];
        pathElements.push(sibling);
        pathIndices.push(idx & 1);

        const next = [];
        for (let j = 0; j < level.length; j += 2) {
            const l = level[j];
            const r = j + 1 < level.length ? level[j + 1] : zeros[i];
            next.push(hashPair(l, r, poseidon, F));
        }
        level = next.length > 0 ? next : [zeros[i + 1]];
        idx >>= 1;
    }

    return { pathElements, pathIndices, root: level[0] };
}

// ZK proof helpers
const buildProofInput = ({ 
    root, 
    nullifier, 
    secret, 
    randomness, 
    pathElements, 
    pathIndices,
    recipient
}) => {
    return {
        root: root.toString(),
        nullifier: nullifier.toString(),
        recipient: BigInt(recipient).toString(),
        secret: secret.toString(),
        randomness: randomness.toString(),
        pathElements: pathElements.map((x) => x.toString()),
        pathIndices: pathIndices.map((x)  => x.toString()),
    };
}
const generateProof = async (input) => {
    const wasm = path.join(__dirname, "..", "circuits", "withdraw.wasm");
    const zkey = path.join(__dirname, "..", "withdraw_final.zkey");
    const { proof } = await snarkjs.groth16.fullProve(input, wasm, zkey);

    return [
        proof.pi_a[0], proof.pi_a[1],
        proof.pi_b[0][1], proof.pi_b[0][0],
        proof.pi_b[1][1], proof.pi_b[1][0],
        proof.pi_c[0], proof.pi_c[1],
    ].map((x) => BigInt(x));
}

// blockchain helpers
const fetchDepositEvents = async (contract) => {
    const events = await contract.queryFilter(contract.filters.Deposit(), 0, "latest");
    return events.sort((a, b) => Number(a.args.leafIndex) - Number(b.args.leafIndex));
}

// service
async function main() {
    const addresses = loadJson("deployedAddresses.json", "Run scripts/deploy.js first.");
    console.log("INPUTS:");
    console.log("---------");
    const privateKey = await promptValidPrivateKey(CONFIG.privateKey);
    const recipient = await promptValidRecipient(CONFIG.recipient);
    const encryptedNoteInput = await promptEncryptedNote();
    const passphrase = await promptNotePassphrase();

    const encryptedNote = parseEncryptedNoteInput(encryptedNoteInput);
    const note = decryptDepositNote(encryptedNote, passphrase);

    const provider = new ethers.JsonRpcProvider(CONFIG.rpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);

    const payment = new ethers.Contract(
        addresses.zkpPayment,
        loadArtifactAbi("ZKPPayment"),
        signer,
    );

    console.log();
    console.log("OUTPUTS:");
    console.log("-------");
    console.log(`Relay address: ${signer.address}`);
    console.log("Getting current state from ZKPPayment contract");
    const events = await fetchDepositEvents(payment);
    const myIndex = events.findIndex((e) => e.args.commitment === note.commitment);
    if (myIndex === -1) throw new Error("Deposit commitment not found on chain.");

    const leaves = events.map((e) => BigInt(e.args.commitment));

    const poseidon = await buildPoseidon();
    const F = poseidon.F;
    const zeros = await computeZeros(poseidon, CONFIG.levels);
    const { pathElements, pathIndices, root } = computeMerklePath(
        leaves, myIndex, CONFIG.levels, poseidon, F, zeros,
    );

    const secret = BigInt(note.secret);
    const randomness = BigInt(note.randomness);
    const nullifier = BigInt(F.toString(poseidon([secret])));

    const proofInput = buildProofInput({ 
        root,
        nullifier,
        secret,
        randomness,
        pathElements,
        pathIndices,
        recipient,
    });

    console.log("Generating SNARK proof");
    const proofStart = Date.now();
    const proofArr = await generateProof(proofInput);
    const proofSeconds = ((Date.now() - proofStart) / 1000).toFixed(3);
    console.log(`Proof time: ${proofSeconds}s`);

    console.log("Submitting withdraw transaction");
    const tx = await payment.withdraw(
        proofArr, 
        toBytes32(root), 
        toBytes32(nullifier), 
        recipient
    );
    console.log(`The transaction hash is ${tx.hash}`);
    await tx.wait();
    console.log("Done\n");

    process.exit(0);
}

main().catch((err) => {
    const message = err?.message || String(err);
    console.error(`\x1b[31m[ERROR]\x1b[0m ${message}`);
    process.exit(1);
});