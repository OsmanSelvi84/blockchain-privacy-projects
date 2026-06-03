import { expect } from "chai";
import hre from "hardhat";

describe("DynamicConsent", function () {

  async function deployContract() {
    const [patient, provider, otherUser] = await hre.ethers.getSigners();

    const DynamicConsent = await hre.ethers.getContractFactory("DynamicConsent");
    const dynamicConsent = await DynamicConsent.deploy();

    return { dynamicConsent, patient, provider, otherUser };
  }

  it("Test 1: Patient can give consent to a healthcare provider", async function () {
    const { dynamicConsent, patient, provider } = await deployContract();

    await dynamicConsent
      .connect(patient)
      .giveConsent(
        provider.address,
        "Blood test analysis",
        "Blood Test Data"
      );

    const consent = await dynamicConsent.getConsent(
      patient.address,
      provider.address
    );

    expect(consent[0]).to.equal(true);
    expect(consent[1]).to.equal("Blood test analysis");
    expect(consent[2]).to.equal("Blood Test Data");
  });

  it("Test 2: Provider consent check returns true after consent is given", async function () {
    const { dynamicConsent, patient, provider } = await deployContract();

    await dynamicConsent
      .connect(patient)
      .giveConsent(
        provider.address,
        "General examination",
        "Medical History"
      );

    const hasConsent = await dynamicConsent.checkConsent(
      patient.address,
      provider.address
    );

    expect(hasConsent).to.equal(true);
  });

  it("Test 3: Patient can update consent purpose and data type", async function () {
    const { dynamicConsent, patient, provider } = await deployContract();

    await dynamicConsent
      .connect(patient)
      .giveConsent(
        provider.address,
        "General examination",
        "Medical History"
      );

    await dynamicConsent
      .connect(patient)
      .updateConsent(
        provider.address,
        "Cardiology consultation",
        "Heart Report"
      );

    const consent = await dynamicConsent.getConsent(
      patient.address,
      provider.address
    );

    expect(consent[0]).to.equal(true);
    expect(consent[1]).to.equal("Cardiology consultation");
    expect(consent[2]).to.equal("Heart Report");
  });

  it("Test 4: Patient can revoke consent", async function () {
    const { dynamicConsent, patient, provider } = await deployContract();

    await dynamicConsent
      .connect(patient)
      .giveConsent(
        provider.address,
        "Radiology review",
        "X-Ray Data"
      );

    await dynamicConsent
      .connect(patient)
      .revokeConsent(provider.address);

    const hasConsent = await dynamicConsent.checkConsent(
      patient.address,
      provider.address
    );

    expect(hasConsent).to.equal(false);
  });

  it("Test 5: Unauthorized user cannot update another patient's consent", async function () {
    const { dynamicConsent, patient, provider, otherUser } = await deployContract();

    await dynamicConsent
      .connect(patient)
      .giveConsent(
        provider.address,
        "Lab result review",
        "Lab Results"
      );

    await expect(
      dynamicConsent
        .connect(otherUser)
        .updateConsent(
          provider.address,
          "Changed purpose",
          "Changed data"
        )
    ).to.be.revertedWith("Consent does not exist");
  });

  it("Safety Test 1: Reject invalid provider address", async function () {
    const { dynamicConsent, patient } = await deployContract();

    await expect(
      dynamicConsent
        .connect(patient)
        .giveConsent(
          "0x0000000000000000000000000000000000000000",
          "Blood Test",
          "Blood Data"
        )
    ).to.be.revertedWith("Invalid provider address");
  });

  it("Safety Test 2: Reject empty purpose", async function () {
    const { dynamicConsent, patient, provider } = await deployContract();

    await expect(
      dynamicConsent
        .connect(patient)
        .giveConsent(
          provider.address,
          "",
          "Blood Data"
        )
    ).to.be.revertedWith("Purpose is required");
  });

  it("Safety Test 3: Reject empty data type", async function () {
    const { dynamicConsent, patient, provider } = await deployContract();

    await expect(
      dynamicConsent
        .connect(patient)
        .giveConsent(
          provider.address,
          "Blood Test",
          ""
        )
    ).to.be.revertedWith("Data type is required");
  });

  it("Safety Test 4: Reject revoking non-existing consent", async function () {
    const { dynamicConsent, patient, provider } = await deployContract();

    await expect(
      dynamicConsent
        .connect(patient)
        .revokeConsent(provider.address)
    ).to.be.revertedWith("Consent does not exist");
  });

  it("Safety Test 5: Reject updating inactive consent", async function () {
    const { dynamicConsent, patient, provider } = await deployContract();

    await dynamicConsent
      .connect(patient)
      .giveConsent(
        provider.address,
        "General Checkup",
        "Medical Data"
      );

    await dynamicConsent
      .connect(patient)
      .revokeConsent(provider.address);

    await expect(
      dynamicConsent
        .connect(patient)
        .updateConsent(
          provider.address,
          "Updated Purpose",
          "Updated Data"
        )
    ).to.be.revertedWith("Consent is not active");
  });

});
