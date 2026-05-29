const db = require("./apis/db");
const ned = require("./apis/ned");

let collectInFlight = false;

module.exports = {
  /**
   * Collects transfers from NED sever and writes them into DB.
   * @param {{
   *   host: string,
   *   port: number,
   *   dbUrl: string,
   *   nedUrl: string,
   *   network: string,
   *   address: string,
   *   password: string,
   *   dbName: string,
   *   sensorDataCollection: string,
   *   utilityDataCollection: string
   * }} config Server configuration
   */
  collectTransfers: async config => {
    if (collectInFlight) {
      return [];
    }
    collectInFlight = true;
    try {
      const latestSavedTimestamp = await db.getLatestTimestamp(
        config.dbUrl,
        config.dbName,
        config.utilityDataCollection
      );
      const transfers = await ned.getTransfers(
        config.nedUrl,
        config.address,
        latestSavedTimestamp
      );
      const seen = new Set();
      const newTransfers = transfers.filter(transfer => {
        const date = transfer.date || 0;
        if (date <= latestSavedTimestamp) {
          return false;
        }
        const key = `${transfer.from}|${transfer.to}|${date}|${transfer.amount}`;
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      });
      return newTransfers.length > 0
        ? db.bulkWriteToDB(
            config.dbUrl,
            config.dbName,
            config.utilityDataCollection,
            newTransfers
          )
        : [];
    } finally {
      collectInFlight = false;
    }
  }
};
