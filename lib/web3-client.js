const Web3 = require("web3");
const web3Utils = require("web3-utils");
const truffleConfig = require("../truffle-config");

module.exports = {
  connect(network = "authority") {
    const { host, port } = truffleConfig.networks[network];
    return new Web3(`ws://${host}:${port}`, null, {});
  },

  async signPayload(web3, signer, password, payload) {
    const payloadStr = JSON.stringify(payload);
    const signature = await web3.eth.personal.sign(payloadStr, signer, password);
    return { data: payload, signature, signerAddress: signer };
  },

  async recoverSigner(web3, payload, signature) {
    const payloadStr = JSON.stringify(payload);
    const recovered = await web3.eth.personal.ecRecover(payloadStr, signature);
    return web3Utils.toChecksumAddress(recovered);
  }
};
