const { expect } = require("chai");
const hre = require("hardhat");

describe("PQToken", function () {
  let token;
  const Alice   = "0x0000000000000000000000000000000000000001";
  const Bob     = "0x0000000000000000000000000000000000000002";
  const Charlie = "0x0000000000000000000000000000000000000003";
  const validSig = "0xabcd";
  const fakeSig  = "0x1234";

  beforeEach(async function () {
    const PQToken = await hre.ethers.getContractFactory("PQToken");
    token = await PQToken.deploy();
    await token.waitForDeployment();
  });

  it("TEST 1: Normal transfer", async function () {
    await token.transfer(Alice, Bob, 20, validSig, true);
    expect(await token.getBalance(Alice)).to.equal(80);
    expect(await token.getBalance(Bob)).to.equal(70);
  });

  it("TEST 2: Yetersiz bakiye reddedilmeli", async function () {
    await expect(
      token.transfer(Charlie, Alice, 999, validSig, true)
    ).to.be.revertedWith("Yetersiz bakiye");
  });

  it("TEST 3: Zincir transfer", async function () {
    await token.transfer(Alice, Bob, 10, validSig, true);
    await token.transfer(Bob, Charlie, 10, validSig, true);
    await token.transfer(Charlie, Alice, 5, validSig, true);
    expect(await token.getBalance(Alice)).to.equal(95);
    expect(await token.getBalance(Bob)).to.equal(50);
    expect(await token.getBalance(Charlie)).to.equal(35);
  });

  it("TEST 4: Sahte imza reddedilmeli", async function () {
    await expect(
      token.transfer(Alice, Bob, 50, fakeSig, false)
    ).to.be.revertedWith("Gecersiz imza");
  });

  it("TEST 5: Coklu kullanici transferi", async function () {
    await token.transfer(Alice, Bob, 15, validSig, true);
    await token.transfer(Alice, Charlie, 25, validSig, true);
    await token.transfer(Bob, Charlie, 10, validSig, true);
    expect(await token.getBalance(Alice)).to.equal(60);
    expect(await token.getBalance(Bob)).to.equal(55);
    expect(await token.getBalance(Charlie)).to.equal(65);
  });

  it("Hash zinciri dogru olusturulmali", async function () {
    await token.transfer(Alice, Bob, 10, validSig, true);
    await token.transfer(Bob, Charlie, 5, validSig, true);
    expect(await token.getChainLength()).to.equal(3);
  });
});
