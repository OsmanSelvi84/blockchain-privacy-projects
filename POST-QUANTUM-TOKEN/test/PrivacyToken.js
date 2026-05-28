const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PrivacyToken", function () {

  it("Should transfer tokens", async function () {
    const [owner, user] = await ethers.getSigners();

    const PrivacyToken = await ethers.getContractFactory("PrivacyToken");
    const token = await PrivacyToken.deploy(1000);

    await token.transfer(user.address, 100);

    expect(await token.balanceOf(user.address)).to.equal(100);
    expect(await token.balanceOf(owner.address)).to.equal(900);
  });

  it("Should create private transfer", async function () {
    const [owner, user] = await ethers.getSigners();

    const PrivacyToken = await ethers.getContractFactory("PrivacyToken");
    const token = await PrivacyToken.deploy(1000);

    const commitment = await token.createCommitment(
      user.address,
      50,
      "secret"
    );

    await token.privateTransfer(commitment, 50);

    expect(await token.commitments(commitment)).to.equal(true);
    expect(await token.balanceOf(owner.address)).to.equal(950);
  });

  it("Should not use same commitment twice", async function () {
    const [owner, user] = await ethers.getSigners();

    const PrivacyToken = await ethers.getContractFactory("PrivacyToken");
    const token = await PrivacyToken.deploy(1000);

    const commitment = await token.createCommitment(
      user.address,
      50,
      "secret"
    );

    await token.privateTransfer(commitment, 50);

    await expect(
      token.privateTransfer(commitment, 50)
    ).to.be.revertedWith("Commitment already used");
  });

});
