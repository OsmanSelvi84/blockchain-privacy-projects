const { expect } = require("chai");
const { ethers } = require("hardhat");
const crypto     = require("crypto");

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
    const msgBytes = ethers.getBytes(messageHash);
    return Array.from({ length: 256 }, (_, i) => {
        const bit = (msgBytes[i >> 3] >> (7 - (i & 7))) & 1;
        return privateKey[i][bit];
    });
}

function buildMessageHash(sender, to, amount, nonce, chainId) {
    return ethers.solidityPackedKeccak256(
        ["address", "address", "uint256", "uint256", "uint256"],
        [sender, to, amount, nonce, chainId]
    );
}

describe("PostQuantumToken", function () {
    this.timeout(120_000);

    let token, owner, alice, bob, carol, chainId;

    beforeEach(async function () {
        [owner, alice, bob, carol] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("PostQuantumToken");
        token = await Factory.deploy(1_000_000);
        await token.waitForDeployment();
        chainId = (await ethers.provider.getNetwork()).chainId;
    });

    async function doPQTransfer(sender, to, amount, currentKP, nextKP) {
        const nonce   = await token.getPQNonce(sender.address);
        const msgHash = buildMessageHash(sender.address, to.address, amount, nonce, chainId);
        const sig     = lamportSign(msgHash, currentKP.privateKey);
        return token.connect(sender).pqTransfer(
            to.address, amount, currentKP.publicKey, sig, nextKP.publicKey
        );
    }

    // ── 1. Deployment ─────────────────────────────────────────────────────────

    describe("1 - Deployment", function () {
        it("sets correct name and symbol", async function () {
            expect(await token.name()).to.equal("Post Quantum Token");
            expect(await token.symbol()).to.equal("PQT");
            expect(await token.decimals()).to.equal(18);
        });

        it("mints 1000000 tokens to deployer", async function () {
            const expected = ethers.parseEther("1000000");
            expect(await token.totalSupply()).to.equal(expected);
            expect(await token.balanceOf(owner.address)).to.equal(expected);
        });

        it("records deployer as owner", async function () {
            expect(await token.owner()).to.equal(owner.address);
        });
    });

    // ── 2. Standard ERC-20 ───────────────────────────────────────────────────

    describe("2 - Standard ERC-20", function () {
        it("transfers tokens between accounts", async function () {
            const amount = ethers.parseEther("500");
            await token.transfer(alice.address, amount);
            expect(await token.balanceOf(alice.address)).to.equal(amount);
        });

        it("reduces sender balance", async function () {
            const amount = ethers.parseEther("200");
            const before = await token.balanceOf(owner.address);
            await token.transfer(alice.address, amount);
            expect(await token.balanceOf(owner.address)).to.equal(before - amount);
        });

        it("reverts on insufficient balance", async function () {
            await expect(
                token.connect(alice).transfer(bob.address, 1n)
            ).to.be.revertedWithCustomError(token, "InsufficientBalance");
        });

        it("reverts transfer to zero address", async function () {
            await expect(
                token.transfer(ethers.ZeroAddress, 1n)
            ).to.be.revertedWithCustomError(token, "ZeroAddress");
        });

        it("approve and transferFrom work correctly", async function () {
            const amount = ethers.parseEther("100");
            await token.approve(alice.address, amount);
            await token.connect(alice).transferFrom(owner.address, bob.address, amount);
            expect(await token.balanceOf(bob.address)).to.equal(amount);
        });

        it("reverts transferFrom with insufficient allowance", async function () {
            await expect(
                token.connect(alice).transferFrom(owner.address, bob.address, 1n)
            ).to.be.revertedWithCustomError(token, "InsufficientAllowance");
        });

        it("emits Transfer event", async function () {
            const amount = ethers.parseEther("10");
            await expect(token.transfer(alice.address, amount))
                .to.emit(token, "Transfer")
                .withArgs(owner.address, alice.address, amount);
        });

        it("emits Approval event", async function () {
            await expect(token.approve(alice.address, 50n))
                .to.emit(token, "Approval")
                .withArgs(owner.address, alice.address, 50n);
        });
    });

    // ── 3. Minting ───────────────────────────────────────────────────────────

    describe("3 - Minting", function () {
        it("owner can mint", async function () {
            const amount = ethers.parseEther("1000");
            await token.mint(alice.address, amount);
            expect(await token.balanceOf(alice.address)).to.equal(amount);
        });

        it("increases totalSupply", async function () {
            const before = await token.totalSupply();
            const amount = ethers.parseEther("500");
            await token.mint(alice.address, amount);
            expect(await token.totalSupply()).to.equal(before + amount);
        });

        it("non-owner cannot mint", async function () {
            await expect(
                token.connect(alice).mint(alice.address, 1n)
            ).to.be.revertedWithCustomError(token, "OnlyOwner");
        });

        it("reverts mint to zero address", async function () {
            await expect(
                token.mint(ethers.ZeroAddress, 1n)
            ).to.be.revertedWithCustomError(token, "ZeroAddress");
        });
    });

    // ── 4. PQ Key Registration ───────────────────────────────────────────────

    describe("4 - PQ Key Registration", function () {
        it("marks account as registered", async function () {
            const { publicKey } = generateLamportKeyPair();
            await token.connect(alice).registerPQKey(publicKey);
            expect(await token.hasPQKey(alice.address)).to.be.true;
        });

        it("stores a non-zero 32-byte commitment", async function () {
            const { publicKey } = generateLamportKeyPair();
            await token.connect(alice).registerPQKey(publicKey);
            const c = await token.getPQCommitment(alice.address);
            expect(c).to.not.equal(ethers.ZeroHash);
            expect(c.length).to.equal(66);
        });

        it("nonce starts at zero", async function () {
            expect(await token.getPQNonce(alice.address)).to.equal(0n);
        });

        it("different keys produce different commitments", async function () {
            const { publicKey: pk1 } = generateLamportKeyPair();
            const { publicKey: pk2 } = generateLamportKeyPair();
            await token.connect(alice).registerPQKey(pk1);
            const c1 = await token.getPQCommitment(alice.address);
            await token.connect(alice).registerPQKey(pk2);
            const c2 = await token.getPQCommitment(alice.address);
            expect(c1).to.not.equal(c2);
        });

        it("emits PQKeyRegistered event", async function () {
            const { publicKey } = generateLamportKeyPair();
            await expect(token.connect(alice).registerPQKey(publicKey))
                .to.emit(token, "PQKeyRegistered");
        });
    });

    // ── 5. PQ Transfer - Happy Path ──────────────────────────────────────────

    describe("5 - PQ Transfer - Happy Path", function () {
        let kp1, kp2;
        const AMT = ethers.parseEther("50");

        beforeEach(async function () {
            await token.transfer(alice.address, ethers.parseEther("200"));
            kp1 = generateLamportKeyPair();
            kp2 = generateLamportKeyPair();
            await token.connect(alice).registerPQKey(kp1.publicKey);
        });

        it("transfers correct amount to recipient", async function () {
            await doPQTransfer(alice, bob, AMT, kp1, kp2);
            expect(await token.balanceOf(bob.address)).to.equal(AMT);
        });

        it("deducts amount from sender", async function () {
            const before = await token.balanceOf(alice.address);
            await doPQTransfer(alice, bob, AMT, kp1, kp2);
            expect(await token.balanceOf(alice.address)).to.equal(before - AMT);
        });

        it("increments nonce after transfer", async function () {
            await doPQTransfer(alice, bob, AMT, kp1, kp2);
            expect(await token.getPQNonce(alice.address)).to.equal(1n);
        });

        it("rotates public key commitment", async function () {
            const before = await token.getPQCommitment(alice.address);
            await doPQTransfer(alice, bob, AMT, kp1, kp2);
            expect(await token.getPQCommitment(alice.address)).to.not.equal(before);
        });

        it("emits Transfer and PQKeyRotated events", async function () {
            const nonce   = await token.getPQNonce(alice.address);
            const msgHash = buildMessageHash(alice.address, bob.address, AMT, nonce, chainId);
            const sig     = lamportSign(msgHash, kp1.privateKey);
            const tx      = token.connect(alice).pqTransfer(
                bob.address, AMT, kp1.publicKey, sig, kp2.publicKey
            );
            await expect(tx).to.emit(token, "Transfer")
                .withArgs(alice.address, bob.address, AMT);
            await expect(tx).to.emit(token, "PQKeyRotated");
        });

        it("supports two consecutive pqTransfers", async function () {
            const kp3 = generateLamportKeyPair();
            await doPQTransfer(alice, bob,   ethers.parseEther("30"), kp1, kp2);
            await doPQTransfer(alice, carol, ethers.parseEther("20"), kp2, kp3);
            expect(await token.balanceOf(bob.address)).to.equal(ethers.parseEther("30"));
            expect(await token.balanceOf(carol.address)).to.equal(ethers.parseEther("20"));
            expect(await token.getPQNonce(alice.address)).to.equal(2n);
        });
    });

    // ── 6. PQ Transfer - Security Cases ─────────────────────────────────────

    describe("6 - PQ Transfer - Security Cases", function () {
        const AMT = ethers.parseEther("10");
        let kp1, kp2;

        beforeEach(async function () {
            await token.transfer(alice.address, ethers.parseEther("100"));
            kp1 = generateLamportKeyPair();
            kp2 = generateLamportKeyPair();
            await token.connect(alice).registerPQKey(kp1.publicKey);
        });

        it("reverts when PQ key not registered", async function () {
            const { publicKey, privateKey } = generateLamportKeyPair();
            const { publicKey: next }       = generateLamportKeyPair();
            const nonce   = await token.getPQNonce(bob.address);
            const msgHash = buildMessageHash(bob.address, alice.address, AMT, nonce, chainId);
            const sig     = lamportSign(msgHash, privateKey);
            await expect(
                token.connect(bob).pqTransfer(alice.address, AMT, publicKey, sig, next)
            ).to.be.revertedWithCustomError(token, "PQKeyNotRegistered");
        });

        it("reverts when public key does not match commitment", async function () {
            const wrong   = generateLamportKeyPair();
            const nonce   = await token.getPQNonce(alice.address);
            const msgHash = buildMessageHash(alice.address, bob.address, AMT, nonce, chainId);
            const sig     = lamportSign(msgHash, wrong.privateKey);
            await expect(
                token.connect(alice).pqTransfer(bob.address, AMT, wrong.publicKey, sig, kp2.publicKey)
            ).to.be.revertedWithCustomError(token, "InvalidPublicKey");
        });

        it("reverts when signature uses wrong private key", async function () {
            const wrong   = generateLamportKeyPair();
            const nonce   = await token.getPQNonce(alice.address);
            const msgHash = buildMessageHash(alice.address, bob.address, AMT, nonce, chainId);
            const badSig  = lamportSign(msgHash, wrong.privateKey);
            await expect(
                token.connect(alice).pqTransfer(bob.address, AMT, kp1.publicKey, badSig, kp2.publicKey)
            ).to.be.revertedWithCustomError(token, "InvalidSignature");
        });

        it("reverts on insufficient balance", async function () {
            const huge    = ethers.parseEther("9999");
            const nonce   = await token.getPQNonce(alice.address);
            const msgHash = buildMessageHash(alice.address, bob.address, huge, nonce, chainId);
            const sig     = lamportSign(msgHash, kp1.privateKey);
            await expect(
                token.connect(alice).pqTransfer(bob.address, huge, kp1.publicKey, sig, kp2.publicKey)
            ).to.be.revertedWithCustomError(token, "InsufficientBalance");
        });

        it("reverts when signed with stale nonce", async function () {
            const kp3  = generateLamportKeyPair();
            const msg0 = buildMessageHash(alice.address, bob.address, AMT, 0n, chainId);
            const sig0 = lamportSign(msg0, kp1.privateKey);
            await token.connect(alice).pqTransfer(bob.address, AMT, kp1.publicKey, sig0, kp2.publicKey);
            const stale    = buildMessageHash(alice.address, bob.address, AMT, 0n, chainId);
            const sigStale = lamportSign(stale, kp2.privateKey);
            await expect(
                token.connect(alice).pqTransfer(bob.address, AMT, kp2.publicKey, sigStale, kp3.publicKey)
            ).to.be.revertedWithCustomError(token, "InvalidSignature");
        });

        it("reverts when rotated-away key is reused", async function () {
            const kp3  = generateLamportKeyPair();
            const msg0 = buildMessageHash(alice.address, bob.address, AMT, 0n, chainId);
            const sig0 = lamportSign(msg0, kp1.privateKey);
            await token.connect(alice).pqTransfer(bob.address, AMT, kp1.publicKey, sig0, kp2.publicKey);
            const msg1 = buildMessageHash(alice.address, bob.address, AMT, 1n, chainId);
            const sig1 = lamportSign(msg1, kp1.privateKey);
            await expect(
                token.connect(alice).pqTransfer(bob.address, AMT, kp1.publicKey, sig1, kp3.publicKey)
            ).to.be.revertedWithCustomError(token, "InvalidPublicKey");
        });
    });

    // ── 7. Cryptographic Correctness ─────────────────────────────────────────

    describe("7 - Cryptographic Correctness", function () {
        beforeEach(async function () {
            await token.transfer(alice.address, ethers.parseEther("100"));
        });

        async function setup() {
            const kp1 = generateLamportKeyPair();
            const kp2 = generateLamportKeyPair();
            await token.connect(alice).registerPQKey(kp1.publicKey);
            return { kp1, kp2 };
        }

        it("rejects signature with one flipped bit", async function () {
            const { kp1, kp2 } = await setup();
            const amount  = ethers.parseEther("5");
            const nonce   = await token.getPQNonce(alice.address);
            const msgHash = buildMessageHash(alice.address, bob.address, amount, nonce, chainId);
            const sig     = lamportSign(msgHash, kp1.privateKey);
            const corrupt = [...sig];
            const bytes   = ethers.getBytes(corrupt[0]);
            bytes[31]    ^= 0x01;
            corrupt[0]    = ethers.hexlify(bytes);
            await expect(
                token.connect(alice).pqTransfer(bob.address, amount, kp1.publicKey, corrupt, kp2.publicKey)
            ).to.be.revertedWithCustomError(token, "InvalidSignature");
        });

        it("rejects signature made for wrong recipient", async function () {
            const { kp1, kp2 } = await setup();
            const amount  = ethers.parseEther("5");
            const nonce   = await token.getPQNonce(alice.address);
            const msgHash = buildMessageHash(alice.address, carol.address, amount, nonce, chainId);
            const sig     = lamportSign(msgHash, kp1.privateKey);
            await expect(
                token.connect(alice).pqTransfer(bob.address, amount, kp1.publicKey, sig, kp2.publicKey)
            ).to.be.revertedWithCustomError(token, "InvalidSignature");
        });

        it("rejects signature made for wrong amount", async function () {
            const { kp1, kp2 } = await setup();
            const nonce   = await token.getPQNonce(alice.address);
            const msgHash = buildMessageHash(
                alice.address, bob.address, ethers.parseEther("1"), nonce, chainId
            );
            const sig = lamportSign(msgHash, kp1.privateKey);
            await expect(
                token.connect(alice).pqTransfer(
                    bob.address, ethers.parseEther("2"), kp1.publicKey, sig, kp2.publicKey
                )
            ).to.be.revertedWithCustomError(token, "InvalidSignature");
        });
    });
});
