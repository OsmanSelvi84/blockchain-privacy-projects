/**
 * generateKeys.js — Lamport Key Pair Generator
 *
 * Generates Lamport one-time signature key pairs for use with PostQuantumToken.
 * Run BEFORE each pqTransfer: you need the current key pair and the NEXT one.
 *
 * Usage:
 * node scripts/generateKeys.js        → 1 pair
 * node scripts/generateKeys.js 5      → 5 pairs (a chain)
 *
 * Output: lamport-keys-<timestamp>.json  — KEEP SECURE, NEVER COMMIT TO GIT.
 *
 * ⚠  WARNING: Lamport keys are ONE-TIME USE. Reusing a key leaks your private
 * key and allows anyone to forge signatures. Always generate ahead of time.
 */

const crypto = require("crypto");
const fs     = require("fs");
const path   = require("path");

// ── Hash helper ────────────────────────────────────────────────────────────
// Uses the same hashing approach as the on-chain contract (keccak256 via ABI encoding).
let hashFn;
try {
    const { ethers } = require("ethers");
    const coder      = ethers.AbiCoder.defaultAbiCoder();
    hashFn = (buf32) => {
        const hex = "0x" + buf32.toString("hex");
        return Buffer.from(ethers.keccak256(coder.encode(["bytes32"], [hex])).slice(2), "hex");
    };
} catch {
    // Node.js native keccak256 (Node ≥ 21.3)
    hashFn = (buf32) => {
        try {
            return crypto.createHash("keccak256").update(buf32).digest();
        } catch {
            console.error("Node version does not support keccak256. Run: npm install ethers");
            process.exit(1);
        }
    };
}

// ── Core generation ────────────────────────────────────────────────────────

function generateLamportKeyPair() {
    const privateKey = [];
    const publicKey  = [];
    for (let i = 0; i < 256; i++) {
        const sk0 = crypto.randomBytes(32);
        const sk1 = crypto.randomBytes(32);
        privateKey.push(["0x" + sk0.toString("hex"), "0x" + sk1.toString("hex")]);
        publicKey.push([
            "0x" + hashFn(sk0).toString("hex"),
            "0x" + hashFn(sk1).toString("hex"),
        ]);
    }
    return { privateKey, publicKey };
}

function lamportSign(messageHashHex, privateKey) {
    const msgBytes = Buffer.from(messageHashHex.replace(/^0x/, ""), "hex");
    if (msgBytes.length !== 32) throw new Error("messageHash must be 32 bytes");
    const signature = [];
    for (let i = 0; i < 256; i++) {
        const byteIndex = Math.floor(i / 8);
        const bitIndex  = 7 - (i % 8);
        const bit       = (msgBytes[byteIndex] >> bitIndex) & 1;
        signature.push(privateKey[i][bit]);
    }
    return signature;
}

// ── CLI ────────────────────────────────────────────────────────────────────

function main() {
    const count = parseInt(process.argv[2] ?? "1", 10);
    if (isNaN(count) || count < 1 || count > 50) {
        console.error("Usage: node generateKeys.js [1-50]");
        process.exit(1);
    }

    console.log("\n════════════════════════════════════════════════════════");
    console.log("  Lamport Key Generator — PostQuantumToken");
    console.log("════════════════════════════════════════════════════════\n");
    console.log(`  Generating ${count} key pair(s) ...\n`);

    const keyChain = [];
    for (let i = 0; i < count; i++) {
        process.stdout.write(`    Pair ${i + 1}/${count} ... `);
        keyChain.push(generateLamportKeyPair());
        process.stdout.write("✓\n");
    }

    const ts       = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `lamport-keys-${ts}.json`;
    const outPath  = path.join(process.cwd(), filename);

    fs.writeFileSync(outPath, JSON.stringify({
        generatedAt: new Date().toISOString(),
        keyCount:    count,
        usage: [
            "keyChain[0].publicKey → registerPQKey()",
            "keyChain[N].privateKey → sign message off-chain",
            "keyChain[N].publicKey  → currentPublicKey in pqTransfer()",
            "keyChain[N+1].publicKey → newPublicKey in pqTransfer()",
            "EACH PAIR IS ONE-TIME USE — never reuse.",
        ],
        warning:  "KEEP SECRET. Never commit this file to git.",
        keyChain,
    }, null, 2));

    console.log(`\n  ✅  Done!`);
    console.log(`  File    : ${filename}`);
    console.log(`  Pairs   : ${count}`);
    console.log("\n  ⚠  SECURITY WARNINGS:");
    console.log("    • Keep the output file offline and never share it.");
    console.log("    • Each key pair is one-time use — generate a new one before each transfer.");
    console.log("    • Back up securely; losing the next key means losing access to pqTransfer.");
    console.log("\n════════════════════════════════════════════════════════\n");
}

main();
module.exports = { generateLamportKeyPair, lamportSign };
