const web3Utils = require("web3-utils");
const web3Client = require("../lib/web3-client");
const privacyHash = require("../lib/privacy-hash");
const withTimeout = require("../lib/with-timeout");
const nedClient = require("./ned-client");

module.exports = {
  async submitReading(config, web3, utilityContract, meterDeltaWs) {
    if (!web3 || !utilityContract) {
      throw new Error("Parity not connected — start the authority nodes");
    }

    const { address, password, nedUrl } = config;
    const timestamp = Date.now();
    const hash = privacyHash.hashMeterReading(meterDeltaWs);

    try {
      await withTimeout(
        web3.eth.personal.unlockAccount(address, password, null),
        8000,
        "Unlock account (Parity)"
      );
    } catch (unlockErr) {
      console.warn("unlock skipped:", unlockErr.message);
    }

    utilityContract.methods
      .updateRenewableEnergy(address, web3Utils.hexToBytes(hash))
      .send({ from: address, gas: 500000 })
      .once("error", err => console.error("updateRenewableEnergy:", err.message))
      .once("transactionHash", tx => console.log("updateRenewableEnergy tx:", tx));

    const { signature } = await withTimeout(
      web3Client.signPayload(web3, address, password, hash),
      8000,
      "Sign payload (Parity)"
    );

    await withTimeout(
      nedClient.submitSignedReading(nedUrl, address, {
        signature,
        hash,
        timestamp,
        meterDelta: meterDeltaWs
      }),
      15000,
      "NED submit"
    );

    console.log(`Sent to NED: meterDelta=${meterDeltaWs} Ws`);
  }
};
