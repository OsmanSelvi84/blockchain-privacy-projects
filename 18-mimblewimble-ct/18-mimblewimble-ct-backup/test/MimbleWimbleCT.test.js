const { ethers } = require("hardhat");
const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

// ─── Helpers ──────────────────────────────────────────────────────────────────

function randomBlinding() {
  return ethers.hexlify(ethers.randomBytes(32));
}

async function makeCommitment(contract, signer, blindingFactor, amount) {
  const hash = await contract.computeCommitmentHash(blindingFactor, amount, signer.address);
  await contract.connect(signer).createCommitment(blindingFactor, amount);
  return hash;
}

async function submitProof(contract, signer, hash, blindingFactor, amount) {
  const nonce = ethers.hexlify(ethers.randomBytes(32));
  await contract.connect(signer).submitRangeProof(hash, blindingFactor, amount, nonce);
  return nonce;
}

/**
 * Compute the kernelCommitment expected by _verifyBalance:
 *   kernel = XOR(all inputs) XOR XOR(all outputs)
 */
function computeKernel(inputs, outputs) {
  const xorAll = (arr) =>
    arr.reduce(
      (acc, h) => BigInt(acc) ^ BigInt(h),
      0n
    );
  const inputXor  = xorAll(inputs);
  const outputXor = xorAll(outputs);
  return ethers.toBeHex(inputXor ^ outputXor, 32);
}

// ─── Fixture ──────────────────────────────────────────────────────────────────

async function deployFixture() {
  const [owner, alice, bob, charlie] = await ethers.getSigners();
  const MimbleWimbleCT = await ethers.getContractFactory("MimbleWimbleCT");
  const contract = await MimbleWimbleCT.deploy();
  return { contract, owner, alice, bob, charlie };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("MimbleWimbleCT", function () {

  // ── Deployment ──────────────────────────────────────────────────────────────
  describe("Deployment", function () {
    it("deploys with zero commitments and transactions", async function () {
      const { contract } = await loadFixture(deployFixture);
      expect(await contract.totalCommitments()).to.equal(0n);
      expect(await contract.totalTransactions()).to.equal(0n);
      expect(await contract.getUtxoCount()).to.equal(0n);
    });
  });

  // ── Commitments ─────────────────────────────────────────────────────────────
  describe("Pedersen Commitments", function () {
    it("creates a commitment and records it in the UTXO set", async function () {
      const { contract, alice } = await loadFixture(deployFixture);
      const r = randomBlinding();
      const amount = 500n;

      await expect(contract.connect(alice).createCommitment(r, amount))
        .to.emit(contract, "CommitmentCreated");

      expect(await contract.totalCommitments()).to.equal(1n);
      expect(await contract.getUtxoCount()).to.equal(1n);
    });

    it("commitment hash is deterministic for same inputs", async function () {
      const { contract, alice } = await loadFixture(deployFixture);
      const r = randomBlinding();
      const h1 = await contract.computeCommitmentHash(r, 100n, alice.address);
      const h2 = await contract.computeCommitmentHash(r, 100n, alice.address);
      expect(h1).to.equal(h2);
    });

    it("different blinding factors produce different commitments (hiding)", async function () {
      const { contract, alice } = await loadFixture(deployFixture);
      const h1 = await contract.computeCommitmentHash(randomBlinding(), 100n, alice.address);
      const h2 = await contract.computeCommitmentHash(randomBlinding(), 100n, alice.address);
      expect(h1).to.not.equal(h2);
    });

    it("same amount but different blinding looks different (amount is hidden)", async function () {
      const { contract, alice } = await loadFixture(deployFixture);
      const r = randomBlinding();
      const h1 = await contract.computeCommitmentHash(r, 100n, alice.address);
      const h2 = await contract.computeCommitmentHash(r, 200n, alice.address);
      expect(h1).to.not.equal(h2);
    });

    it("reverts on duplicate commitment", async function () {
      const { contract, alice } = await loadFixture(deployFixture);
      const r = randomBlinding();
      await contract.connect(alice).createCommitment(r, 100n);
      await expect(contract.connect(alice).createCommitment(r, 100n))
        .to.be.revertedWithCustomError(contract, "CommitmentAlreadyExists");
    });

    it("isUnspent returns true for fresh commitment", async function () {
      const { contract, alice } = await loadFixture(deployFixture);
      const r = randomBlinding();
      const hash = await makeCommitment(contract, alice, r, 100n);
      expect(await contract.isUnspent(hash)).to.be.true;
    });
  });

  // ── Range Proofs ────────────────────────────────────────────────────────────
  describe("Range Proofs", function () {
    it("accepts a valid range proof", async function () {
      const { contract, alice } = await loadFixture(deployFixture);
      const r = randomBlinding();
      const amount = 999n;
      const hash = await makeCommitment(contract, alice, r, amount);

      const nonce = ethers.hexlify(ethers.randomBytes(32));
      await expect(contract.connect(alice).submitRangeProof(hash, r, amount, nonce))
        .to.not.be.reverted;

      const proof = await contract.rangeProofs(hash);
      expect(proof.valid).to.be.true;
    });

    it("rejects range proof with wrong blinding factor", async function () {
      const { contract, alice } = await loadFixture(deployFixture);
      const r = randomBlinding();
      const hash = await makeCommitment(contract, alice, r, 100n);

      const wrongR = randomBlinding();
      const nonce  = randomBlinding();
      await contract.connect(alice).submitRangeProof(hash, wrongR, 100n, nonce);

      const proof = await contract.rangeProofs(hash);
      expect(proof.valid).to.be.false;
    });

    it("reverts range proof for non-existent commitment", async function () {
      const { contract, alice } = await loadFixture(deployFixture);
      const fakeHash = ethers.hexlify(ethers.randomBytes(32));
      await expect(
        contract.connect(alice).submitRangeProof(fakeHash, randomBlinding(), 100n, randomBlinding())
      ).to.be.revertedWithCustomError(contract, "CommitmentDoesNotExist");
    });
  });

  // ── Coinbase ─────────────────────────────────────────────────────────────────
  describe("Coinbase / Mint", function () {
    it("mints a genesis commitment to a recipient", async function () {
      const { contract, owner, bob } = await loadFixture(deployFixture);
      const r = randomBlinding();
      await expect(contract.connect(owner).mintCoinbase(r, 1000n, bob.address))
        .to.emit(contract, "CoinbaseCommitment")
        .withArgs(
          await contract.computeCommitmentHash(r, 1000n, bob.address),
          bob.address
        );
      expect(await contract.totalCommitments()).to.equal(1n);
    });

    it("reverts on duplicate coinbase commitment", async function () {
      const { contract, owner, bob } = await loadFixture(deployFixture);
      const r = randomBlinding();
      await contract.connect(owner).mintCoinbase(r, 1000n, bob.address);
      await expect(contract.connect(owner).mintCoinbase(r, 1000n, bob.address))
        .to.be.revertedWithCustomError(contract, "CommitmentAlreadyExists");
    });
  });

  // ── Transactions ─────────────────────────────────────────────────────────────
  describe("Confidential Transactions", function () {

    /**
     * Helper: alice owns an input commitment; she sends to bob (output).
     * We compute the kernel so _verifyBalance passes, then compute the
     * kernelSignature as the contract expects: hash(kernel ‖ txId).
     * Because txId depends on block.timestamp we compute it off-chain identically.
     */
    async function buildTx(contract, alice, bob, inputAmount, outputAmount) {
      // Alice's input
      const rIn  = randomBlinding();
      const hIn  = await makeCommitment(contract, alice, rIn, inputAmount);
      await submitProof(contract, alice, hIn, rIn, inputAmount);

      // Bob's output (bob creates the output commitment in his name)
      const rOut = randomBlinding();
      const hOut = await contract.computeCommitmentHash(rOut, outputAmount, bob.address);
      await contract.connect(bob).createCommitment(rOut, outputAmount);
      await submitProof(contract, bob, hOut, rOut, outputAmount);

      const inputs  = [hIn];
      const outputs = [hOut];
      const kernel  = computeKernel(inputs, outputs);

      // kernelSig = keccak256(kernel || keccak256(abi.encode(inputs, outputs)))
      // Mirrors the contract's expectedSig computation exactly.
      const txContent = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(["bytes32[]", "bytes32[]"], [inputs, outputs])
      );
      const kernelSig = ethers.keccak256(
        ethers.solidityPacked(["bytes32", "bytes32"], [kernel, txContent])
      );

      return { inputs, outputs, kernel, kernelSig, hIn, hOut };
    }

    it("creates and finalizes a valid confidential transaction", async function () {
      const { contract, alice, bob } = await loadFixture(deployFixture);
      const { inputs, outputs, kernel, kernelSig, hIn, hOut } =
        await buildTx(contract, alice, bob, 500n, 500n);

      await expect(
        contract.connect(alice).createTransaction(inputs, outputs, kernel, kernelSig)
      ).to.emit(contract, "TransactionCreated");

      expect(await contract.totalTransactions()).to.equal(1n);

      // Retrieve txId from event
      const filter = contract.filters.TransactionCreated();
      const events = await contract.queryFilter(filter);
      const txId   = events[0].args.txId;

      await expect(contract.connect(alice).finalizeTransaction(txId))
        .to.emit(contract, "TransactionFinalized")
        .and.to.emit(contract, "CommitmentSpent");

      expect(await contract.isUnspent(hIn)).to.be.false;
    });

    it("reverts when kernel signature is wrong", async function () {
      const { contract, alice, bob } = await loadFixture(deployFixture);
      const { inputs, outputs, kernel } =
        await buildTx(contract, alice, bob, 300n, 300n);

      const badSig = randomBlinding();
      await expect(
        contract.connect(alice).createTransaction(inputs, outputs, kernel, badSig)
      ).to.be.revertedWithCustomError(contract, "KernelSignatureInvalid");
    });

    it("reverts when input/output commitments are unbalanced (wrong kernel)", async function () {
      const { contract, alice, bob } = await loadFixture(deployFixture);
      const { inputs, outputs, kernelSig } =
        await buildTx(contract, alice, bob, 400n, 400n);

      const badKernel = randomBlinding(); // does not satisfy XOR balance
      await expect(
        contract.connect(alice).createTransaction(inputs, outputs, badKernel, kernelSig)
      ).to.be.revertedWithCustomError(contract, "InputOutputImbalance");
    });

    it("reverts creating transaction with empty inputs", async function () {
      const { contract, alice, bob } = await loadFixture(deployFixture);
      const r = randomBlinding();
      const h = await makeCommitment(contract, bob, r, 100n);
      await submitProof(contract, bob, h, r, 100n);

      await expect(
        contract.connect(alice).createTransaction([], [h], randomBlinding(), randomBlinding())
      ).to.be.revertedWithCustomError(contract, "EmptyInputs");
    });

    it("reverts when non-owner tries to spend a commitment", async function () {
      const { contract, alice, bob } = await loadFixture(deployFixture);

      // Alice creates input
      const rIn  = randomBlinding();
      const hIn  = await makeCommitment(contract, alice, rIn, 200n);
      await submitProof(contract, alice, hIn, rIn, 200n);

      // Bob creates output
      const rOut = randomBlinding();
      const hOut = await makeCommitment(contract, bob, rOut, 200n);
      await submitProof(contract, bob, hOut, rOut, 200n);

      const kernel = computeKernel([hIn], [hOut]);

      // Bob tries to spend Alice's input
      await expect(
        contract.connect(bob).createTransaction([hIn], [hOut], kernel, randomBlinding())
      ).to.be.revertedWithCustomError(contract, "NotCommitmentOwner");
    });

    it("reverts spending an already-spent commitment", async function () {
      const { contract, alice, bob } = await loadFixture(deployFixture);
      const { inputs, outputs, kernel, kernelSig } =
        await buildTx(contract, alice, bob, 100n, 100n);

      const tx = await contract.connect(alice).createTransaction(inputs, outputs, kernel, kernelSig);
      const receipt = await tx.wait();
      const event = receipt.logs
        .map(l => { try { return contract.interface.parseLog(l); } catch { return null; } })
        .find(e => e && e.name === "TransactionCreated");
      const txId = event.args.txId;

      await contract.connect(alice).finalizeTransaction(txId);

      // Try to spend the same input again
      const rOut2 = randomBlinding();
      await contract.connect(bob).createCommitment(rOut2, 100n);
      const hOut2 = await contract.computeCommitmentHash(rOut2, 100n, bob.address);
      await submitProof(contract, bob, hOut2, rOut2, 100n);

      await expect(
        contract.connect(alice).createTransaction(inputs, [hOut2], randomBlinding(), randomBlinding())
      ).to.be.revertedWithCustomError(contract, "CommitmentAlreadySpent");
    });

    it("reverts finalizing the same transaction twice", async function () {
      const { contract, alice, bob } = await loadFixture(deployFixture);
      const { inputs, outputs, kernel, kernelSig } =
        await buildTx(contract, alice, bob, 150n, 150n);

      const tx = await contract.connect(alice).createTransaction(inputs, outputs, kernel, kernelSig);
      const receipt = await tx.wait();
      const event = receipt.logs
        .map(l => { try { return contract.interface.parseLog(l); } catch { return null; } })
        .find(e => e && e.name === "TransactionCreated");
      const txId = event.args.txId;

      await contract.connect(alice).finalizeTransaction(txId);
      await expect(contract.connect(alice).finalizeTransaction(txId))
        .to.be.revertedWithCustomError(contract, "TransactionAlreadyFinalized");
    });
  });

  // ── UTXO set integrity ───────────────────────────────────────────────────────
  describe("UTXO Set Integrity", function () {
    it("UTXO shrinks after a transaction is finalized", async function () {
      const { contract, alice, bob } = await loadFixture(deployFixture);

      const rIn  = randomBlinding();
      const hIn  = await makeCommitment(contract, alice, rIn, 250n);
      await submitProof(contract, alice, hIn, rIn, 250n);

      const rOut = randomBlinding();
      const hOut = await contract.computeCommitmentHash(rOut, 250n, bob.address);
      await contract.connect(bob).createCommitment(rOut, 250n);
      await submitProof(contract, bob, hOut, rOut, 250n);

      const utxoBefore = await contract.getUtxoCount();

      const inputs  = [hIn];
      const outputs = [hOut];
      const kernel  = computeKernel(inputs, outputs);

      const txContent = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(["bytes32[]", "bytes32[]"], [inputs, outputs])
      );
      const kernelSig = ethers.keccak256(
        ethers.solidityPacked(["bytes32", "bytes32"], [kernel, txContent])
      );

      await contract.connect(alice).createTransaction(inputs, outputs, kernel, kernelSig);

      const filter = contract.filters.TransactionCreated();
      const events = await contract.queryFilter(filter);
      const createdTxId = events[0].args.txId;

      await contract.connect(alice).finalizeTransaction(createdTxId);

      const utxoAfter = await contract.getUtxoCount();
      expect(utxoAfter).to.equal(utxoBefore - 1n);
    });

    it("multiple commitments tracked correctly", async function () {
      const { contract, alice, bob, charlie } = await loadFixture(deployFixture);

      for (const signer of [alice, bob, charlie]) {
        await contract.connect(signer).createCommitment(randomBlinding(), 100n);
      }
      expect(await contract.getUtxoCount()).to.equal(3n);
    });
  });
});
