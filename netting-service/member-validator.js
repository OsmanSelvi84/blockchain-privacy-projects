const web3Utils = require("web3-utils");

module.exports = {
  async isValidatorAddress(ownedSetContract, address) {
    const validators = await ownedSetContract.methods.getValidators().call();
    const checksum = web3Utils.toChecksumAddress(address);
    return validators.some(v => web3Utils.toChecksumAddress(v) === checksum);
  }
};
