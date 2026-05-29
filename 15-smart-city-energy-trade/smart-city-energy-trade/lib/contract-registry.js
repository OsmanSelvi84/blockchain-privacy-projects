const dUtilityArtifact = require("../build/contracts/dUtility.json");
const OwnedSetArtifact = require("../build/contracts/OwnedSet.json");
const {
  UTILITY_ADDRESS,
  OWNED_SET_ADDRESS
} = require("./chain-constants");

const REGISTRY = {
  dUtility: { fixedAddress: UTILITY_ADDRESS, artifact: dUtilityArtifact },
  ownedSet: { fixedAddress: OWNED_SET_ADDRESS, artifact: OwnedSetArtifact }
};

module.exports = {
  abi(name) {
    return REGISTRY[name].artifact.abi;
  },

  deployedAddress(name, networkId = 8995) {
    const id = String(networkId);
    if (id === "8995") {
      return REGISTRY[name].fixedAddress;
    }
    const nets = REGISTRY[name].artifact.networks;
    if (!nets[id]) {
      throw new Error(`No deployment for ${name} on network ${id}`);
    }
    return nets[id].address;
  }
};
