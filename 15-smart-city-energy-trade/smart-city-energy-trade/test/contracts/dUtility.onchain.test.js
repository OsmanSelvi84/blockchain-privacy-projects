const sha256 = require("js-sha256");
const dUtility = artifacts.require("dUtility");
const MockVerifier = artifacts.require("MockContract");
const { expectEvent, shouldFail } = require("openzeppelin-test-helpers");
const { expect } = require("chai");

const EMPTY_HASH =
  "0x0000000000000000000000000000000000000000000000000000000000000000";
const SAMPLE_HASH =
  "0xa5b9d60f32436310afebcfda832817a68921beb782fabf7915cc0460b443116a";

async function deployUtilityWithMockVerifier(owner) {
  const mockVerifier = await MockVerifier.new();
  const utility = await dUtility.new({ from: owner });
  await utility.setVerifier(mockVerifier.address, { from: owner });
  return { utility, mockVerifier };
}

async function registerHousehold(utility, owner, addr) {
  return utility.addHousehold(addr, { from: owner });
}

contract("dUtility on-chain registry", accounts => {
  const [admin, homeA, homeB, stranger] = accounts;

  beforeEach(async () => {
    const deployed = await deployUtilityWithMockVerifier(admin);
    this.utility = deployed.utility;
    this.verifier = deployed.mockVerifier;
  });

  describe("household registration", () => {
    it("registers a new household with zeroed hashes", async () => {
      await registerHousehold(this.utility, admin, homeA);
      const row = await this.utility.getHousehold(homeA, { from: homeA });
      expect(row[0]).to.equal(true);
      expect(row[1]).to.equal(EMPTY_HASH);
      expect(row[2]).to.equal(EMPTY_HASH);
    });

    it("rejects registration from non-owner", async () => {
      await shouldFail.reverting(
        registerHousehold(this.utility, stranger, homeA)
      );
    });

    it("emits NewHousehold and blocks duplicate registration", async () => {
      const { logs } = await registerHousehold(this.utility, admin, homeB);
      expectEvent.inLogs(logs, "NewHousehold", { household: homeB });
      await shouldFail.reverting(registerHousehold(this.utility, admin, homeB));
    });
  });

  describe("hashed meter updates", () => {
    beforeEach(async () => {
      await registerHousehold(this.utility, admin, homeA);
    });

    it("allows the household to set renewable hash", async () => {
      await this.utility.updateRenewableEnergy(homeA, SAMPLE_HASH, {
        from: homeA
      });
      const row = await this.utility.getHousehold(homeA, { from: homeA });
      expect(row[1]).to.equal(SAMPLE_HASH);
      expect(row[2]).to.equal(EMPTY_HASH);
    });

    it("allows the household to set non-renewable hash", async () => {
      await this.utility.updateNonRenewableEnergy(homeA, SAMPLE_HASH, {
        from: homeA
      });
      const row = await this.utility.getHousehold(homeA, { from: homeA });
      expect(row[1]).to.equal(EMPTY_HASH);
      expect(row[2]).to.equal(SAMPLE_HASH);
    });

    it("rejects updates from another address", async () => {
      await shouldFail.reverting(
        this.utility.updateRenewableEnergy(homeA, SAMPLE_HASH, { from: homeB })
      );
    });
  });

  describe("checkNetting with mock verifier", () => {
    const proofSliceHi = `0x${SAMPLE_HASH.substr(2, 32)}`;
    const proofSliceLo = `0x${SAMPLE_HASH.substr(34, 32)}`;

    function buildPublicInputs() {
      const inputs = new Array(8).fill("0");
      inputs[0] = proofSliceHi;
      inputs[1] = proofSliceLo;
      return inputs;
    }

    beforeEach(async () => {
      await registerHousehold(this.utility, admin, homeA);
      await this.utility.updateRenewableEnergy(homeA, SAMPLE_HASH, {
        from: homeA
      });
    });

    it("reverts when proof inputs disagree with stored hash", async () => {
      const wrongHash = `0x${sha256("tampered")}`;
      await this.utility.updateRenewableEnergy(homeA, wrongHash, {
        from: homeA
      });
      await shouldFail.reverting(
        this.utility.checkNetting(
          [homeA],
          [0, 1],
          [[2, 3], [4, 5]],
          [6, 7],
          buildPublicInputs()
        )
      );
    });

    it("emits NettingSuccess when mock verifier accepts proof", async () => {
      await this.verifier.givenAnyReturnBool(true);
      const { logs } = await this.utility.checkNetting(
        [homeA],
        [0, 1],
        [[2, 3], [4, 5]],
        [6, 7],
        buildPublicInputs()
      );
      expectEvent.inLogs(logs, "NettingSuccess");
    });
  });
});
