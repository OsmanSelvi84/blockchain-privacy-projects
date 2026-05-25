const { expect } = require("chai");
const { ethers } = require("hardhat");
const vectors = require("./vectors.json");

function hexBig(h) {
  return BigInt(h);
}

describe("MimbleWimbleVerifier", function () {
  let verifier;

  before(async function () {
    const Factory = await ethers.getContractFactory("MimbleWimbleVerifier");
    verifier = await Factory.deploy();
    await verifier.waitForDeployment();
  });

  describe("verifyKernelSignature", function () {
    for (const v of vectors.schnorr) {
      it(`accepts a valid Schnorr signature [${v.label}]`, async function () {
        const ok = await verifier.verifyKernelSignature(
          hexBig(v.P.x), hexBig(v.P.y),
          hexBig(v.R.x), hexBig(v.R.y),
          hexBig(v.s),
          v.message
        );
        expect(ok).to.equal(true);
      });
    }

    it("rejects a tampered signature", async function () {
      const v = vectors.schnorr[0];
      const tampered = hexBig(v.s) ^ 1n;
      const ok = await verifier.verifyKernelSignature(
        hexBig(v.P.x), hexBig(v.P.y),
        hexBig(v.R.x), hexBig(v.R.y),
        tampered,
        v.message
      );
      expect(ok).to.equal(false);
    });

    it("rejects a tampered message", async function () {
      const v = vectors.schnorr[0];
      const tampered = "0x" + (v.message.slice(2) || "00") + "ff";
      const ok = await verifier.verifyKernelSignature(
        hexBig(v.P.x), hexBig(v.P.y),
        hexBig(v.R.x), hexBig(v.R.y),
        hexBig(v.s),
        tampered
      );
      expect(ok).to.equal(false);
    });
  });

  describe("verifyBalance", function () {
    for (const v of vectors.balance) {
      it(`accepts a balanced transaction [${v.label}]`, async function () {
        const inX = v.inputs.map(c => hexBig(c.x));
        const inY = v.inputs.map(c => hexBig(c.y));
        const outX = v.outputs.map(c => hexBig(c.x));
        const outY = v.outputs.map(c => hexBig(c.y));
        const ok = await verifier.verifyBalance(
          inX, inY, outX, outY,
          BigInt(v.fee),
          hexBig(v.kernel_excess.x),
          hexBig(v.kernel_excess.y)
        );
        expect(ok).to.equal(true);
      });
    }

    it("rejects an unbalanced transaction (wrong fee)", async function () {
      const v = vectors.balance[0];
      const inX = v.inputs.map(c => hexBig(c.x));
      const inY = v.inputs.map(c => hexBig(c.y));
      const outX = v.outputs.map(c => hexBig(c.x));
      const outY = v.outputs.map(c => hexBig(c.y));
      const ok = await verifier.verifyBalance(
        inX, inY, outX, outY,
        BigInt(v.fee + 1),
        hexBig(v.kernel_excess.x),
        hexBig(v.kernel_excess.y)
      );
      expect(ok).to.equal(false);
    });
  });
});
