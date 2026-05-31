const request = require("request-promise");

module.exports = {
  getTransfers(nedUrl, householdAddress, fromDate = 0) {
    return request({
      uri: `${nedUrl}/transfers/${householdAddress}?from=${fromDate}`,
      json: true
    });
  },

  submitSignedReading(nedUrl, householdAddress, payload) {
    return request({
      uri: `${nedUrl}/energy/${householdAddress}`,
      method: "PUT",
      json: payload,
      timeout: 20000,
      resolveWithFullResponse: false
    });
  },

  getNetwork(nedUrl) {
    return request({
      uri: `${nedUrl}/network`,
      json: true
    });
  },

  resetNed(nedUrl) {
    return request({
      uri: `${nedUrl}/reset`,
      method: "POST",
      json: true
    });
  },

  getMeterDelta(nedUrl, hash, signature) {
    return request({
      uri: `${nedUrl}/meterdelta`,
      json: true,
      qs: { hash, signature }
    });
  }
};
