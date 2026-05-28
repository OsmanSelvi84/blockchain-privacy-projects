const store = require("./storage/mongo-store");
const nedClient = require("./ned-client");

let collectInFlight = false;

module.exports = {
  /** Referans transfer-handler.collectTransfers */
  async pullFromNed(config) {
    if (collectInFlight) return [];
    collectInFlight = true;
    try {
      const latestSavedTimestamp = await store.latestTimestamp(
        config.dbUrl,
        config.dbName,
        config.transferCollection
      );
      const transfers = await nedClient.getTransfers(
        config.nedUrl,
        config.address,
        latestSavedTimestamp
      );
      const seen = new Set();
      const newTransfers = (transfers || []).filter(t => {
        const date = t.date || 0;
        if (date <= latestSavedTimestamp) return false;
        const key = `${t.from}|${t.to}|${date}|${t.amount}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      if (newTransfers.length === 0) return [];
      return store.bulkInsertTransfers(
        config.dbUrl,
        config.dbName,
        config.transferCollection,
        newTransfers
      );
    } catch (err) {
      console.warn("NED→Mongo sync atlandı:", err.message);
      return [];
    } finally {
      collectInFlight = false;
    }
  }
};
