import { expect } from "chai";
import { ethers } from "hardhat";

describe("SocialRecoveryWallet", function () {
  let wallet;
  let owner;
  let guardian1;
  let guardian2;
  let guardian3;
  let newOwner;

  beforeEach(async function () {
    [owner, guardian1, guardian2, guardian3, newOwner] =
      await ethers.getSigners();

    const SocialRecoveryWallet = await ethers.getContractFactory(
      "SocialRecoveryWallet"
    );

    wallet = await SocialRecoveryWallet.deploy([
      guardian1.address,
      guardian2.address,
      guardian3.address,
    ]);

    await wallet.waitForDeployment();
  });

  it("Should set the correct owner", async function () {
    expect(await wallet.owner()).to.equal(owner.address);
  });

  it("Should allow guardians to approve recovery", async function () {
    await wallet
      .connect(guardian1)
      .approveRecovery(newOwner.address);

    await wallet
      .connect(guardian2)
      .approveRecovery(newOwner.address);

    await wallet
      .connect(guardian3)
      .approveRecovery(newOwner.address);

    expect(await wallet.owner()).to.equal(newOwner.address);
  });
  it("Input Output Demo", async function () {
  console.log("===== INPUTS =====");
  console.log("Owner:", owner.address);
  console.log("Guardian1:", guardian1.address);
  console.log("Guardian2:", guardian2.address);
  console.log("Guardian3:", guardian3.address);
  console.log("NewOwner:", newOwner.address);

  console.log("===== OUTPUT =====");
  console.log("Test completed successfully");
});
});

