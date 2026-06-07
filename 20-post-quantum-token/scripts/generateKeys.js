/**
 * generateKeys.js
 * Generates Lamport one-time key pairs for PostQuantumToken.
 *
 * Usage:
 *   node scripts/generateKeys.js       -> 1 key pair
 *   node scripts/generateKeys.js 5     -> 5 key pairs
 *
 * Output: lamport-keys-<timestamp>.json
 * WARNING: Never commit this file - it contains your private keys.
 */

const crypto = require("crypto");
const fs     = require("fs");
const path   = require("path");

let hashPreimage;
try {
    const { ethers } = require("ethers");
    const coder      = ethers.AbiCoder.defaultAbiCoder();
    hashPreimage = (hex) => ethers.keccak256(coder.encode(["bytes32"], [hex]));
} catch {
    hashPreimage = (hex) => {
        const buf = Buffer.from(hex.replace(/^0x/, ""), "hex");
        return "0x" + crypto.createHash("keccak256").update(buf).digest("hex");
    };
}

function generateLamportKeyPair() {
    const privateKey = [];
    const publicKey  = [];
    for (let i = 0; i < 256; i++) {
        const sk0 = "0x" + crypto.randomBytes(32).toString("hex");
        const sk1 = "0x" + crypto.randomBytes(32).toString("hex");
        privateKey.push([sk0, sk1]);
        publicKey.push([hashPreimage(sk0), hashPreimage(sk1)]);
    }
    return { privateKey, publicKey };
}

function main() {
    const count = parseInt(process.argv[2] ?? "1", 10);
    if (isNaN(count) || count < 1 || count > 50) {
        console.error("Usage: node generateKeys.js [1-50]");
        process.exit(1);
    }

    console.log(`\nGenerating ${count} Lamport key pair(s)...\n`);

    const keyChain = [];
    for (let i = 0; i < count; i++) {
        process.stdout.write(`  Pair ${i + 1}/${count} ... `);
        keyChain.push(generateLamportKeyPair());
        process.stdout.write("done\n");
    }

    const ts       = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `lamport-keys-${ts}.json`;

    fs.writeFileSync(path.join(process.cwd(), filename), JSON.stringify({
        generatedAt: new Date().toISOString(),
        keyCount:    count,
        warning:     "KEEP SECRET. Never commit this file to git.",
        instructions: [
            "Step 1: registerPQKey(keyChain[0].publicKey)",
            "Step 2: sign with keyChain[N].privateKey",
            "Step 3: pass keyChain[N+1].publicKey as newPublicKey",
            "Each key pair is ONE-TIME USE.",
        ],
        keyChain,
    }, null, 2));

    console.log(`\n  Saved: ${filename}`);
    console.log("  WARNING: Never share or commit this file.\n");
}

main();
module.exports = { generateLamportKeyPair };
