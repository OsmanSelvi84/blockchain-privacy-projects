const { expect }      = require("chai");
const { ethers }      = require("hardhat");
const { time }        = require("@nomicfoundation/hardhat-network-helpers");

 
function randomBytes32() {
  return ethers.randomBytes(32);
}

function deriveCommitment(secret, nullifier) {
  return ethers.keccak256(
    ethers.concat([secret, nullifier])
  );
}

function toHex(b) {
  return ethers.hexlify(b);
}


describe("SocialRecoveryWallet", function () {
  let wallet, owner, addr1, addr2, addr3;
  const THRESHOLD = 2;
  const RECOVERY_DELAY = 48 * 3600; // 48 hours

  beforeEach(async function () {
    [owner, addr1, addr2, addr3] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SocialRecoveryWallet");
    wallet = await Factory.deploy(THRESHOLD);
    await wallet.waitForDeployment();
  });

  // ── Deployment ─────────────────────────────────────────────
  describe("Deployment", function () {
    it("sets correct owner and threshold", async function () {
      expect(await wallet.owner()).to.equal(owner.address);
      expect(await wallet.threshold()).to.equal(THRESHOLD);
    });

    it("starts with zero guardians", async function () {
      expect(await wallet.guardianCount()).to.equal(0);
    });
  });

  // ── Guardian Management ────────────────────────────────────
  describe("Guardian Management", function () {
    it("owner can add a guardian commitment", async function () {
      const secret   = randomBytes32();
      const nul      = randomBytes32();
      const commitment = deriveCommitment(secret, nul);

      await expect(wallet.addGuardian(commitment))
        .to.emit(wallet, "GuardianAdded")
        .withArgs(commitment);

      expect(await wallet.isGuardian(commitment)).to.be.true;
      expect(await wallet.guardianCount()).to.equal(1);
    });

    it("non-owner cannot add guardian", async function () {
      const commitment = deriveCommitment(randomBytes32(), randomBytes32());
      await expect(
        wallet.connect(addr1).addGuardian(commitment)
      ).to.be.revertedWith("SRW: caller is not owner");
    });

    it("cannot add same commitment twice", async function () {
      const commitment = deriveCommitment(randomBytes32(), randomBytes32());
      await wallet.addGuardian(commitment);
      await expect(wallet.addGuardian(commitment)).to.be.revertedWith("SRW: already registered");
    });

    it("owner can remove guardian if count > threshold", async function () {
      // Add 3 guardians (threshold=2, so removing one is safe)
      const commitments = [];
      for (let i = 0; i < 3; i++) {
        const c = deriveCommitment(randomBytes32(), randomBytes32());
        await wallet.addGuardian(c);
        commitments.push(c);
      }
      await expect(wallet.removeGuardian(commitments[0]))
        .to.emit(wallet, "GuardianRemoved");
      expect(await wallet.guardianCount()).to.equal(2);
    });

    it("cannot remove guardian if count would drop below threshold", async function () {
      // Add exactly threshold guardians
      for (let i = 0; i < THRESHOLD; i++) {
        await wallet.addGuardian(deriveCommitment(randomBytes32(), randomBytes32()));
      }
      const all = [];
      // We need to track the commitments we added — add one more to know which to remove
      const c = deriveCommitment(randomBytes32(), randomBytes32());
      await wallet.addGuardian(c);
      await wallet.removeGuardian(c); // This should work (count=3 after adds, goes to 2=threshold OK)
      // Now at threshold, next remove should fail
      // Re-read count
      const count = await wallet.guardianCount();
      // Since count == threshold now, removing any should fail
      // But we don't have easy access to stored commitments, so test differently:
      const c2 = deriveCommitment(randomBytes32(), randomBytes32());
      await wallet.addGuardian(c2);
      // now count > threshold, remove works
      await wallet.removeGuardian(c2);
      // now count == threshold, remove should fail
      const commitmentList = [];
      for (let i = 0; i < THRESHOLD; i++) {
        commitmentList.push(deriveCommitment(randomBytes32(), randomBytes32()));
      }
      // Reset: deploy new wallet
      const Factory = await ethers.getContractFactory("SocialRecoveryWallet");
      const w2 = await Factory.deploy(THRESHOLD);
      for (let i = 0; i < THRESHOLD; i++) {
        await w2.addGuardian(commitmentList[i]);
      }
      await expect(w2.removeGuardian(commitmentList[0]))
        .to.be.revertedWith("SRW: would drop below threshold");
    });
  });

  // ── Commitment / ZK Helpers ────────────────────────────────
  describe("ZK Commitment helpers", function () {
    it("deriveCommitment matches JS implementation", async function () {
      const secret   = randomBytes32();
      const nul      = randomBytes32();
      const onChain  = await wallet.deriveCommitment(toHex(secret), toHex(nul));
      const offChain = deriveCommitment(secret, nul);
      expect(onChain).to.equal(offChain);
    });

    it("verifyGuardianProof returns true for registered guardian", async function () {
      const secret = randomBytes32();
      const nul    = randomBytes32();
      const commitment = deriveCommitment(secret, nul);
      await wallet.addGuardian(commitment);

      const [valid, c] = await wallet.verifyGuardianProof(toHex(secret), toHex(nul));
      expect(valid).to.be.true;
      expect(c).to.equal(commitment);
    });

    it("verifyGuardianProof returns false for unregistered", async function () {
      const [valid] = await wallet.verifyGuardianProof(
        toHex(randomBytes32()), toHex(randomBytes32())
      );
      expect(valid).to.be.false;
    });
  });

  // ── Recovery Flow ──────────────────────────────────────────
  describe("Recovery Flow", function () {
    let secrets, nullifiers, commitments;

    beforeEach(async function () {
      secrets    = [randomBytes32(), randomBytes32(), randomBytes32()];
      nullifiers = [randomBytes32(), randomBytes32(), randomBytes32()];
      commitments = secrets.map((s, i) => deriveCommitment(s, nullifiers[i]));
      for (const c of commitments) await wallet.addGuardian(c);
    });

    it("guardian can initiate recovery", async function () {
      await expect(
        wallet.connect(addr1).initiateRecovery(
          toHex(secrets[0]), toHex(nullifiers[0]), addr2.address
        )
      ).to.emit(wallet, "RecoveryInitiated");

      const [active, proposed, approvals] = await wallet.getRecoveryStatus();
      expect(active).to.be.true;
      expect(proposed).to.equal(addr2.address);
      expect(approvals).to.equal(1n);
    });

    it("unregistered guardian cannot initiate recovery", async function () {
      await expect(
        wallet.initiateRecovery(
          toHex(randomBytes32()), toHex(randomBytes32()), addr2.address
        )
      ).to.be.revertedWith("SRW: not a registered guardian");
    });

    it("second guardian can approve", async function () {
      await wallet.initiateRecovery(
        toHex(secrets[0]), toHex(nullifiers[0]), addr2.address
      );
      await expect(
        wallet.approveRecovery(toHex(secrets[1]), toHex(nullifiers[1]))
      ).to.emit(wallet, "RecoveryApproved");

      const [,, approvals] = await wallet.getRecoveryStatus();
      expect(approvals).to.equal(2n);
    });

    it("double-spend nullifier is rejected", async function () {
      await wallet.initiateRecovery(
        toHex(secrets[0]), toHex(nullifiers[0]), addr2.address
      );
      await expect(
        wallet.approveRecovery(toHex(secrets[0]), toHex(nullifiers[0]))
      ).to.be.revertedWith("SRW: nullifier already used");
    });

    it("recovery executes after threshold + timelock", async function () {
      await wallet.initiateRecovery(
        toHex(secrets[0]), toHex(nullifiers[0]), addr2.address
      );
      await wallet.approveRecovery(toHex(secrets[1]), toHex(nullifiers[1]));

      // Advance time past the 48h timelock
      await time.increase(RECOVERY_DELAY + 1);

      await expect(wallet.executeRecovery())
        .to.emit(wallet, "RecoveryExecuted")
        .withArgs(owner.address, addr2.address);

      expect(await wallet.owner()).to.equal(addr2.address);
    });

    it("execution blocked before timelock expires", async function () {
      await wallet.initiateRecovery(
        toHex(secrets[0]), toHex(nullifiers[0]), addr2.address
      );
      await wallet.approveRecovery(toHex(secrets[1]), toHex(nullifiers[1]));

      await expect(wallet.executeRecovery())
        .to.be.revertedWith("SRW: timelock not expired");
    });

    it("execution blocked below threshold", async function () {
      await wallet.initiateRecovery(
        toHex(secrets[0]), toHex(nullifiers[0]), addr2.address
      );
      await time.increase(RECOVERY_DELAY + 1);

      await expect(wallet.executeRecovery())
        .to.be.revertedWith("SRW: threshold not reached");
    });

    it("owner can cancel recovery", async function () {
      await wallet.initiateRecovery(
        toHex(secrets[0]), toHex(nullifiers[0]), addr2.address
      );
      await expect(wallet.cancelRecovery())
        .to.emit(wallet, "RecoveryCancelled");

      const [active] = await wallet.getRecoveryStatus();
      expect(active).to.be.false;
    });
  });

  // ── Wallet Operations ──────────────────────────────────────
  describe("Wallet Operations", function () {
    it("receives ETH", async function () {
      await expect(
        owner.sendTransaction({ to: await wallet.getAddress(), value: ethers.parseEther("1") })
      ).to.emit(wallet, "EtherReceived");
      expect(await wallet.getBalance()).to.equal(ethers.parseEther("1"));
    });

    it("owner can send ETH", async function () {
      await owner.sendTransaction({
        to: await wallet.getAddress(),
        value: ethers.parseEther("2"),
      });
      await expect(wallet.sendEther(addr1.address, ethers.parseEther("1")))
        .to.emit(wallet, "EtherSent");
    });

    it("non-owner cannot send ETH", async function () {
      await owner.sendTransaction({
        to: await wallet.getAddress(),
        value: ethers.parseEther("1"),
      });
      await expect(
        wallet.connect(addr1).sendEther(addr2.address, ethers.parseEther("0.5"))
      ).to.be.revertedWith("SRW: caller is not owner");
    });
  });
});

