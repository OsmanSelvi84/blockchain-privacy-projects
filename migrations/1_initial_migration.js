const Migrations = artifacts.require("Migrations");

module.exports = async (deployer, network) => {
  if (network !== "authority" && network !== "authority_docker") {
    await deployer.deploy(Migrations);
  }
};
