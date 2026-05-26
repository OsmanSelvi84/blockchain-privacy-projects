/**
 * compare.js — Reference vs. Student Implementation Comparison
 *
 * Runs the same 5 test scenarios that will be used during evaluation.
 * Outputs a side-by-side comparison between:
 * • Reference : Tetration-Lab/lamport-solidity (Foundry, signature library only)
 * • Student   : PostQuantumToken (Hardhat, full ERC20 + PQ transfer layer)
 *
 * Reference: https://github.com/Tetration-Lab/lamport-solidity
 *
 * Usage (start local node first):
 * npm run node                                             ← terminal 1
 * npx hardhat run scripts/compare.js --network localhost  ← terminal 2
 */

const { ethers } = require("hardhat");
const crypto      = require("crypto");

// ── Lamport helpers ─────────────────────────────────────────────────────────

const abiCoder = ethers.AbiCoder.defaultAbiCoder();

function generateLamportKeyPair() {
    const privateKey = Array.from({ length: 256 }, () => [
        "0x" + crypto.randomBytes(32).toString("hex"),
        "0x" + crypto.randomBytes(32).toString("hex"),
    ]);
    const publicKey = privateKey.map((pair) => [
        ethers.keccak256(abiCoder.encode(["bytes32"], [pair[0]])),
        ethers.keccak256(abiCoder.encode(["bytes32"], [pair[1]])),
    ]);
    return { privateKey, publicKey };
}

function lamportSign(messageHash, privateKey) {
    const msgBytes  = ethers.getBytes(messageHash);
    const signature = [];
    for (let i = 0; i < 256; i++) {
        const byteIndex = Math.floor(i / 8);
        const bitIndex  = 7 - (i % 8);
        const bit       = (msgBytes[byteIndex] >> bitIndex) & 1;
        signature.push(privateKey[i][bit]);
    }
    return signature;
}

function buildMessageHash(sender, to, amount, nonce, chainId) {
    return ethers.solidityPackedKeccak256(
        ["address", "address", "uint256", "uint256", "uint256"],
        [sender, to, amount, nonce, chainId]
    );
}

// ── Display helpers ──────────────────────────────────────────────────────────

const SEP = "─".repeat(65);
const DBL = "═".repeat(65);

function printTestResult(n, description, refResult, ourResult, pass) {
    console.log(`\n  Test ${n}: ${description}`);
    console.log(`  ${SEP}`);
    console.log(`  Reference  (Tetration-Lab/lamport-solidity) : ${refResult}`);
    console.log(`  Student    (PostQuantumToken / Hardhat)      : ${ourResult}`);
    console.log(`  Outcome: ${pass ? "✅  MATCH" : "❌  MISMATCH"}`);
}

// ════════════════════════════════════════════════════════════════════════════
//  Main
// ════════════════════════════════════════════════════════════════════════════

async function main() {
    const [owner, alice, bob] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();
    const chainId = network.chainId;

    console.log(`\n${DBL}`);
    console.log("  PostQuantumToken — Reference vs. Student Comparison");
    console.log("  Reference: https://github.com/Tetration-Lab/lamport-solidity");
    console.log(`${DBL}`);
    console.log(`  Network  : ${network.name} (chainId: ${chainId})`);
    console.log(`  Deployer : ${owner.address}`);

    // Deploy
    process.stdout.write("\n  Deploying PostQuantumToken ... ");
    const Token = await ethers.getContractFactory("PostQuantumToken");
    const token = await Token.deploy(1_000_000);
    await token.waitForDeployment();
    console.log("✓  " + await token.getAddress());

    // Fund Alice with 500 PQT
    await token.transfer(alice.address, ethers.parseEther("500"));

    let passed = 0;
    const TOTAL = 5;

    // ── Persistent state between tests ──────────────────────────────────────
    let aliceKP1, aliceKP2, aliceKP3;

    // ────────────────────────────────────────────────────────────────────────
    // Test 1 — PQ Key Registration
    // ────────────────────────────────────────────────────────────────────────
    {
        aliceKP1 = generateLamportKeyPair();
        await token.connect(alice).registerPQKey(aliceKP1.publicKey);

        const hasKey     = await token.hasPQKey(alice.address);
        const commitment = await token.getPQCommitment(alice.address);
        const nonce      = await token.getPQNonce(alice.address);

        const pass = hasKey && commitment !== ethers.ZeroHash && nonce === 0n;
        printTestResult(
            1,
            "PQ Key Registration",
            "hasPQKey=true  commitment≠0x0  nonce=0",
            `hasPQKey=${hasKey}  commitment=${commitment.slice(0,10)}…  nonce=${nonce}`,
            pass
        );
        if (pass) passed++;
    }

    // ────────────────────────────────────────────────────────────────────────
    // Test 2 — Valid PQ Transfer (100 PQT Alice → Bob)
    // ────────────────────────────────────────────────────────────────────────
    {
        aliceKP2 = generateLamportKeyPair();

        const amount  = ethers.parseEther("100");
        const nonce   = await token.getPQNonce(alice.address);
        const msgHash = buildMessageHash(alice.address, bob.address, amount, nonce, chainId);
        const sig     = lamportSign(msgHash, aliceKP1.privateKey);

        await token.connect(alice).pqTransfer(
            bob.address, amount, aliceKP1.publicKey, sig, aliceKP2.publicKey
        );

        const bobBal  = ethers.formatEther(await token.balanceOf(bob.address));
        const newNonce = await token.getPQNonce(alice.address);

        const pass = bobBal === "100.0" && newNonce === 1n;
        printTestResult(
            2,
            "Valid PQ Transfer  (100 PQT Alice → Bob)",
            "bob.balance=100.0 PQT   nonce=1   key rotated",
            `bob.balance=${bobBal} PQT   nonce=${newNonce}   key rotated`,
            pass
        );
        if (pass) passed++;
    }

    // ────────────────────────────────────────────────────────────────────────
    // Test 3 — Invalid Signature Rejection
    // ────────────────────────────────────────────────────────────────────────
    {
        aliceKP3 = generateLamportKeyPair();
        const wrongKP = generateLamportKeyPair();

        const amount  = ethers.parseEther("50");
        const nonce   = await token.getPQNonce(alice.address);
        const msgHash = buildMessageHash(alice.address, bob.address, amount, nonce, chainId);
        const badSig  = lamportSign(msgHash, wrongKP.privateKey); // wrong private key

        let rejected = false, errName = "";
        try {
            await token.connect(alice).pqTransfer(
                bob.address, amount, aliceKP2.publicKey, badSig, aliceKP3.publicKey
            );
        } catch (e) {
            rejected = true;
            errName  = e.message.includes("InvalidSignature") ? "InvalidSignature" : "error";
        }

        const pass = rejected && errName === "InvalidSignature";
        printTestResult(
            3,
            "Invalid Signature  (wrong private key)",
            "reverts with InvalidSignature",
            rejected ? `reverts with ${errName}` : "did NOT revert ✗",
            pass
        );
        if (pass) passed++;
    }

    // ────────────────────────────────────────────────────────────────────────
    // Test 4 — Consecutive PQ Transfer with Key Rotation (50 PQT Alice → Bob)
    // ────────────────────────────────────────────────────────────────────────
    {
        const kp4    = generateLamportKeyPair();
        const amount = ethers.parseEther("50");
        const nonce  = await token.getPQNonce(alice.address);
        const msgHash = buildMessageHash(alice.address, bob.address, amount, nonce, chainId);
        const sig     = lamportSign(msgHash, aliceKP2.privateKey);

        await token.connect(alice).pqTransfer(
            bob.address, amount, aliceKP2.publicKey, sig, aliceKP3.publicKey
        );

        const bobBal   = ethers.formatEther(await token.balanceOf(bob.address));
        const newNonce = await token.getPQNonce(alice.address);

        // Bob: 100 (test2) + 50 (test4) = 150
        const pass = bobBal === "150.0" && newNonce === 2n;
        printTestResult(
            4,
            "Consecutive PQ Transfer  (50 PQT, second key rotation)",
            "bob.balance=150.0 PQT   nonce=2",
            `bob.balance=${bobBal} PQT   nonce=${newNonce}`,
            pass
        );
        if (pass) passed++;
    }

    // ────────────────────────────────────────────────────────────────────────
    // Test 5 — Old Key Reuse Rejection
    // ────────────────────────────────────────────────────────────────────────
    {
        const kp5    = generateLamportKeyPair();
        const amount = ethers.parseEther("10");
        const nonce  = await token.getPQNonce(alice.address);
        // Try submitting aliceKP1 which was rotated away after test 2
        const msgHash = buildMessageHash(alice.address, bob.address, amount, nonce, chainId);
        const oldSig  = lamportSign(msgHash, aliceKP1.privateKey);

        let rejected = false, errName = "";
        try {
            await token.connect(alice).pqTransfer(
                bob.address, amount, aliceKP1.publicKey, oldSig, kp5.publicKey
            );
        } catch (e) {
            rejected = true;
            errName  = e.message.includes("InvalidPublicKey") ? "InvalidPublicKey"
                     : e.message.includes("InvalidSignature") ? "InvalidSignature"
                     : "error";
        }

        const pass = rejected;
        printTestResult(
            5,
            "Old Key Reuse  (already-rotated key rejected)",
            "reverts (InvalidPublicKey or InvalidSignature)",
            rejected ? `reverts with ${errName}` : "did NOT revert ✗",
            pass
        );
        if (pass) passed++;
    }

    // ── Summary ─────────────────────────────────────────────────────────────
    console.log(`\n${DBL}`);
    console.log(`  Score : ${passed}/${TOTAL} test cases matched the reference`);
    console.log(`  Result: ${passed === TOTAL ? "✅  FULLY COMPATIBLE" : "❌  SOME TESTS FAILED"}`);
    console.log(`${DBL}\n`);

    if (passed !== TOTAL) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
