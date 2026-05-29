const Migrations = artifacts.require("Migrations");

const web3Helper = require("../lib/web3-client");
const { address, password } = require("../ned-config");

module.exports = async (deployer, network) => {
  if (network !== "authority" && network !== "authority_docker") {
    if (network === "benchmark") {
      const web3 = web3Helper.connect("benchmark");
      await web3.eth.personal.unlockAccount(address, password, null);
      await deployer.deploy(Migrations);
      await web3.eth.personal.unlockAccount(address, password, null);
    } else {
      await deployer.deploy(Migrations);
    }
  }
};
