import { expect } from "chai";
import hardhat from "hardhat";
import crypto from "crypto";
import { buildPoseidon } from "circomlibjs";

const { ethers } = hardhat;

describe("ZKPPayment", function () {
    const DENOMINATION = ethers.parseEther("0.1");
    let poseidon, F;
    let poseidonT3Address;

    before(async () => {
        poseidon = await buildPoseidon();
        F = poseidon.F;
        const PoseidonT3 = await ethers.getContractFactory("PoseidonT3");
        const lib = await PoseidonT3.deploy();
        await lib.waitForDeployment();
        poseidonT3Address = await lib.getAddress();
    });

    function randomFieldBigInt() {
        return BigInt("0x" + crypto.randomBytes(31).toString("hex"));
    }
    function makeCommitment() {
        const secret = randomFieldBigInt();
        const randomness = randomFieldBigInt();
        const c = BigInt(F.toString(poseidon([secret, randomness])));
        return {
            secret,
            randomness,
            commitmentHex: "0x" + c.toString(16).padStart(64, "0"),
        };
    }

    async function deployRealVerifier() {
        const verifierContractNames = ["Groth16Verifier", "Verifier"];
        let Verifier;

        for (const contractName of verifierContractNames) {
            try {
                Verifier = await ethers.getContractFactory(contractName);
                break;
            } catch (error) {
                if (contractName === verifierContractNames.at(-1)) {
                    throw error;
                }
            }
        }

        const v = await Verifier.deploy();
        await v.waitForDeployment();
        return v;
    }
    async function deployMockVerifier() {
        const M = await ethers.getContractFactory("MockVerifier");
        const m = await M.deploy();
        await m.waitForDeployment();
        return m;
    }
    async function deployPayment(verifier) {
        const ZKPPayment = await ethers.getContractFactory("ZKPPayment", {
            libraries: { PoseidonT3: poseidonT3Address },
        });
        const p = await ZKPPayment.deploy(await verifier.getAddress(), DENOMINATION);
        await p.waitForDeployment();
        return p;
    }


    it("should deposit successfully and emit Deposit event", async () => {
        const payment = await deployPayment(await deployRealVerifier());
        const { commitmentHex } = makeCommitment();

        await expect(payment.deposit(commitmentHex, { value: DENOMINATION }))
            .to.emit(payment, "Deposit");

        expect(await payment.commitments(commitmentHex)).to.equal(true);
    });
    it("should reject duplicate commitment", async () => {
        const payment = await deployPayment(await deployRealVerifier());
        const { commitmentHex } = makeCommitment();

        await payment.deposit(commitmentHex, { value: DENOMINATION });
        await expect(payment.deposit(commitmentHex, { value: DENOMINATION }))
            .to.be.revertedWith("Commitment already used");
    });
    it("should reject wrong denomination", async () => {
        const payment = await deployPayment(await deployRealVerifier());
        const { commitmentHex } = makeCommitment();

        await expect(payment.deposit(commitmentHex, { value: ethers.parseEther("0.2") }))
            .to.be.revertedWith("Wrong denomination");
    });
    it("should reject double-spend (nullifier reuse)", async () => {
        const payment = await deployPayment(await deployMockVerifier());
        const { commitmentHex } = makeCommitment();

        await payment.deposit(commitmentHex, { value: DENOMINATION });
        const root = await payment.getLastRoot();
        const proof = new Array(8).fill(0n);
        const nullifier = "0x" + "11".repeat(32);
        const [, recipient] = await ethers.getSigners();

        await expect(payment.withdraw(proof, root, nullifier, recipient.address))
            .to.emit(payment, "Withdrawal");
        await expect(payment.withdraw(proof, root, nullifier, recipient.address))
            .to.be.revertedWith("Nullifier already used");
    });
    it("should reject invalid Merkle root", async () => {
        const payment = await deployPayment(await deployMockVerifier());

        const proof = new Array(8).fill(0n);
        const fakeRoot = "0x" + "ff".repeat(32);
        const nullifier = "0x" + "22".repeat(32);
        const [, recipient] = await ethers.getSigners();

        await expect(payment.withdraw(proof, fakeRoot, nullifier, recipient.address))
            .to.be.revertedWith("Unknown Merkle root");
    });
});
