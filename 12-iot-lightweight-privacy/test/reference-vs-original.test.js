const { expect } = require("chai");
const { ethers } = require("hardhat");
const {
  buildCaseInput,
  deployReference,
  runBothCase,
  vectors
} = require("../scripts/lib/flows");

describe("Reference vs original IoT privacy behavior", function () {
  for (const vector of vectors) {
    it(`matches privacy behavior for ${vector.name}`, async function () {
      const output = await runBothCase(ethers, vector);

      expect(output.reference.policyMatched).to.equal(true);
      expect(output.original.policyMatched).to.equal(true);
      expect(output.reference.inputHash).to.equal(output.original.inputHash);
      expect(output.reference.storedParticipationHash).to.equal(output.original.storedPayloadHash);
      expect(output.reference.hashValid).to.equal(output.original.hashValid);
      expect(output.reference.producerAccepted).to.equal(output.original.readingAccepted);
      expect(output.reference.resultHash).to.equal(output.original.resultHash);
      expect(output.reference.rawPlaintextStored).to.equal(false);
      expect(output.original.rawPlaintextStored).to.equal(false);
      expect(output.original.nullifierUsed).to.equal(true);
      expect(output.comparison.functionalEquivalent).to.equal(true);
    });
  }

  it("the reference contract reports false for a tampered participation hash", async function () {
    const accounts = await ethers.getSigners();
    const [, consumer, , , kgn] = accounts;
    const reference = await deployReference(ethers, consumer, kgn);
    const input = buildCaseInput(ethers, vectors[0]);

    expect(await reference.verifyHashVal(input.encryptedParticipation, ethers.ZeroHash)).to.equal(false);
  });
});
