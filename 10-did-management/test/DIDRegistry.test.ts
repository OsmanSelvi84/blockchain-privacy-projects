import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";

describe("DIDRegistry", async function () {

  it("Should create and resolve a DID", async function () {
    const { ethers } = await network.create();
    const didRegistry = await ethers.deployContract("DIDRegistry");
    await didRegistry.waitForDeployment();
    await didRegistry.createDID("did:example:123", "name:Angelica");
    const result = await didRegistry.resolveDID("did:example:123");
    assert.equal(result[4], true);
  });

  it("Should update a DID", async function () {
    const { ethers } = await network.create();
    const didRegistry = await ethers.deployContract("DIDRegistry");
    await didRegistry.waitForDeployment();
    await didRegistry.createDID("did:example:123", "name:Angelica");
    await didRegistry.updateDID("did:example:123", "name:Angelica Updated");
    const result = await didRegistry.resolveDID("did:example:123");
    assert.equal(result[1], "name:Angelica Updated");
  });

  it("Should revoke a DID", async function () {
    const { ethers } = await network.create();
    const didRegistry = await ethers.deployContract("DIDRegistry");
    await didRegistry.waitForDeployment();
    await didRegistry.createDID("did:example:123", "name:Angelica");
    await didRegistry.revokeDID("did:example:123");
    const result = await didRegistry.resolveDID("did:example:123");
    assert.equal(result[4], false);
  });

});