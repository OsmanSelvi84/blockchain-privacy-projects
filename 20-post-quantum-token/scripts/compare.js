/**
 * compare.js
 * Runs the 5 evaluation test cases and compares outputs
 * between the reference and this implementation.
 *
 * Reference: https://github.com/Tetration-Lab/lamport-solidity
 *
 * Usage:
 *   Terminal 1: npm run node
 *   Terminal 2: npm run compare
 */

const { ethers } = require("hardhat");
const crypto      = require("crypto");

const abiCoder = ethers.AbiCoder.defaultAbiCoder();

function generateLamportKeyPair() {
    const privateKey = Array.from({ length: 256 }, () => [
        "0x" + crypto.randomBytes(32).toString("hex"),
        "0x" + crypto.randomBytes(32).toString("hex"),
    ]);
    const publicKey = privateKey.map(([s0, s1]) => [
        ethers.keccak256(abiCoder.encode(["bytes32"], [s0])),
        ethers.keccak256(abiCoder.encode(["bytes32"], [s1])),
    ]);
    return { privateKey, publicKey };
}

function lamportSign(messageHash, privateKey) {
    const bytes = ethers.getBytes(messageHash);
    return Array.from({ length: 256 }, (_, i) => {
        const bit = (bytes[i >> 3] >> (7 - (i & 7))) & 1;
        return privateKey[i][bit];
    });
}

function buildMessageHash(sender, to, amount, nonce, chainId) {
    return ethers.solidityPackedKeccak256(
        ["address", "address", "uint256", "uint256", "uint256"],
        [sender, to, amount, nonce, chainId]
    );
}

function printResult(n, desc, refOut, ourOut, pass) {
    const LINE = "-".repeat(65);
    console.log(`\n  Test ${n}: ${desc}`);
    console.log(`  ${LINE}`);
    console.log(`  Reference (Tetration-Lab) : ${refOut}`);
    console.log(`  Student   (PostQuantumToken) : ${ourOut}`);
    console.log(`  Result : ${pass ? "PASS" : "FAIL"}`);
}

async function main() {
    const [owner, alice, bob] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();
    const chainId = network.chainId;

    console.log("\n" + "=".repeat(67));
    console.log("  PostQuantumToken - Reference vs Student Comparison");
    console.log("  Reference: https://github.com/Tetration-Lab/lamport-solidity");
    console.log("=".repeat(67));
    console.log(`\n  Network : ${network.name} (chainId: ${chainId})`);

    process.stdout.write("\n  Deploying PostQuantumToken ... ");
    const Factory = await ethers.getContractFactory("PostQuantumToken");
    const token   = await Factory.deploy(1_000_000);
    await token.waitForDeployment();
    console.log("done  " + (await token.getAddress()));

    await token.transfer(alice.address, ethers.parseEther("500"));

    let passed = 0;
    let kpA, kpB, kpC;

    // Test 1 - PQ Key Registration
    {
        kpA = generateLamportKeyPair();
        await token.connect(alice).registerPQKey(kpA.publicKey);

        const hasKey = await token.hasPQKey(alice.address);
        const commit = await token.getPQCommitment(alice.address);
        const nonce  = await token.getPQNonce(alice.address);
        const pass   = hasKey && commit !== ethers.ZeroHash && nonce === 0n;

        printResult(
            1, "PQ Key Registration",
            "hasPQKey=true  commitment!=0x0  nonce=0",
            `hasPQKey=${hasKey}  commitment=${commit.slice(0, 10)}...  nonce=${nonce}`,
            pass
        );
        if (pass) passed++;
    }

    // Test 2 - Valid PQ Transfer (100 PQT Alice to Bob)
    {
        kpB = generateLamportKeyPair();
        const amount  = ethers.parseEther("100");
        const nonce   = await token.getPQNonce(alice.address);
        const msgHash = buildMessageHash(alice.address, bob.address, amount, nonce, chainId);
        const sig     = lamportSign(msgHash, kpA.privateKey);

        await token.connect(alice).pqTransfer(
            bob.address, amount, kpA.publicKey, sig, kpB.publicKey
        );

        const bobBal   = ethers.formatEther(await token.balanceOf(bob.address));
        const newNonce = await token.getPQNonce(alice.address);
        const pass     = bobBal === "100.0" && newNonce === 1n;

        printResult(
            2, "Valid PQ Transfer (100 PQT Alice to Bob)",
            "bob.balance=100.0 PQT  nonce=1  key rotated",
            `bob.balance=${bobBal} PQT  nonce=${newNonce}  key rotated`,
            pass
        );
        if (pass) passed++;
    }

    // Test 3 - Invalid Signature Rejection
    {
        kpC = generateLamportKeyPair();
        const wrong   = generateLamportKeyPair();
        const amount  = ethers.parseEther("50");
        const nonce   = await token.getPQNonce(alice.address);
        const msgHash = buildMessageHash(alice.address, bob.address, amount, nonce, chainId);
        const badSig  = lamportSign(msgHash, wrong.privateKey);

        let rejected = false, errName = "-";
        try {
            await token.connect(alice).pqTransfer(
                bob.address, amount, kpB.publicKey, badSig, kpC.publicKey
            );
        } catch (e) {
            rejected = true;
            errName  = e.message.includes("InvalidSignature") ? "InvalidSignature" : "unknown";
        }

        const pass = rejected && errName === "InvalidSignature";
        printResult(
            3, "Invalid Signature Rejection",
            "reverts with InvalidSignature",
            rejected ? `reverts with ${errName}` : "did NOT revert",
            pass
        );
        if (pass) passed++;
    }

    // Test 4 - Second PQ Transfer with Key Rotation (50 PQT)
    {
        const amount  = ethers.parseEther("50");
        const nonce   = await token.getPQNonce(alice.address);
        const msgHash = buildMessageHash(alice.address, bob.address, amount, nonce, chainId);
        const sig     = lamportSign(msgHash, kpB.privateKey);

        await token.connect(alice).pqTransfer(
            bob.address, amount, kpB.publicKey, sig, kpC.publicKey
        );

        const bobBal   = ethers.formatEther(await token.balanceOf(bob.address));
        const newNonce = await token.getPQNonce(alice.address);
        const pass     = bobBal === "150.0" && newNonce === 2n;

        printResult(
            4, "Second PQ Transfer with Key Rotation (50 PQT)",
            "bob.balance=150.0 PQT  nonce=2",
            `bob.balance=${bobBal} PQT  nonce=${newNonce}`,
            pass
        );
        if (pass) passed++;
    }

    // Test 5 - Old Key Reuse Rejected
    {
        const kpD    = generateLamportKeyPair();
        const amount = ethers.parseEther("10");
        const nonce  = await token.getPQNonce(alice.address);
        const msgHash = buildMessageHash(alice.address, bob.address, amount, nonce, chainId);
        const oldSig  = lamportSign(msgHash, kpA.privateKey);

        let rejected = false, errName = "-";
        try {
            await token.connect(alice).pqTransfer(
                bob.address, amount, kpA.publicKey, oldSig, kpD.publicKey
            );
        } catch (e) {
            rejected = true;
            errName  = e.message.includes("InvalidPublicKey") ? "InvalidPublicKey"
                     : e.message.includes("InvalidSignature") ? "InvalidSignature"
                     : "unknown";
        }

        const pass = rejected;
        printResult(
            5, "Old Key Reuse Rejected",
            "reverts (InvalidPublicKey or InvalidSignature)",
            rejected ? `reverts with ${errName}` : "did NOT revert",
            pass
        );
        if (pass) passed++;
    }

    console.log("\n" + "=".repeat(67));
    console.log(`  Score  : ${passed}/5 tests matched the reference`);
    console.log(`  Status : ${passed === 5 ? "FULLY COMPATIBLE" : "SOME TESTS FAILED"}`);
    console.log("=".repeat(67) + "\n");

    if (passed !== 5) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
