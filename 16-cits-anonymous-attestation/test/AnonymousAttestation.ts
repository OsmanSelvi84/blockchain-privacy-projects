import { expect } from "chai";
import { ethers } from "hardhat";

describe("AnonymousAttestation", function () {
  it("Should verify the correct secret", async function () {
    const secret = "my-secret-password";

    const hash = ethers.keccak256(
      ethers.toUtf8Bytes(secret)
    );

    const Contract = await ethers.getContractFactory(
      "AnonymousAttestation"
    );

    const contract = await Contract.deploy(hash);
    await contract.waitForDeployment();

    const result = await contract.verify.staticCall(secret);

    expect(result).to.equal(true);
  });

  it("Should reject an incorrect secret", async function () {
    const secret = "my-secret-password";

    const hash = ethers.keccak256(
      ethers.toUtf8Bytes(secret)
    );

    const Contract = await ethers.getContractFactory(
      "AnonymousAttestation"
    );

    const contract = await Contract.deploy(hash);
    await contract.waitForDeployment();

    const result = await contract.verify.staticCall(
      "wrong-secret"
    );

    expect(result).to.equal(false);
  });
});