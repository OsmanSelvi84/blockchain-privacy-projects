const Web3 = require("web3");
const web3Utils = require("web3-utils");
const truffleConfig = require("../truffle-config");

module.exports = {
  connect(network = "authority") {
    const { host, port } = truffleConfig.networks[network];
    const provider = new Web3.providers.WebsocketProvider(
      `ws://${host}:${port}`,
      {
        reconnect: {
          auto: true,
          delay: 2000,
          maxAttempts: 20,
          onTimeout: false
        },
        timeout: 30000
      }
    );
    return new Web3(provider);
  },

  /** Parity WS is often not ready right after docker compose up. */
  async waitUntilReady(web3, { attempts = 30, delayMs = 2000 } = {}) {
    let lastErr;
    for (let i = 0; i < attempts; i++) {
      try {
        await web3.eth.getBlockNumber();
        return;
      } catch (err) {
        lastErr = err;
        if (i === 0) {
          console.log("Waiting for Parity WebSocket (ws://127.0.0.1:8546)...");
        }
        await new Promise(r => setTimeout(r, delayMs));
      }
    }
    throw lastErr || new Error("Parity WebSocket not ready");
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
