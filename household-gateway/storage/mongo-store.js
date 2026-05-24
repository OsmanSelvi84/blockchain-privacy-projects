const { MongoClient } = require("mongodb");
const households = require("../../lib/households");

function connect(dbUrl) {
  return new Promise((resolve, reject) => {
    MongoClient.connect(
      dbUrl,
      { useNewUrlParser: true, useUnifiedTopology: true },
      (err, client) => {
        if (err) reject(err);
        else resolve(client);
      }
    );
  });
}

function withClient(dbUrl, fn) {
  return connect(dbUrl).then(client => fn(client).finally(() => client.close()));
}

module.exports = {
  ensureCollections(dbUrl, dbName, names) {
    withClient(dbUrl, client => {
      const dbo = client.db(dbName);
      return Promise.all(
        names.map(
          name =>
            new Promise(resolve => {
              dbo.createCollection(name, () => {
                console.log(`Collection ready: ${name}`);
                resolve();
              });
            })
        )
      ).then(() =>
        dbo
          .collection("meter_reading")
          .updateOne({ _id: 1 }, { $setOnInsert: { value: 0 } }, { upsert: true })
      );
    }).catch(err => {
      console.warn(`Mongo kapalı (${dbUrl}):`, err.message);
    });
  },

  insertSensor(dbUrl, dbName, collection, doc) {
    return withClient(dbUrl, client => {
      const row = { ...doc, timestamp: Date.now() };
      return client.db(dbName).collection(collection).insertOne(row).then(() => row);
    });
  },

  /** Referans: kümülatif meter (produce - consume) */
  bumpMeter(dbUrl, dbName, collection, produce, consume) {
    const deltaWs = Number(produce) - Number(consume);
    return withClient(dbUrl, client =>
      client
        .db(dbName)
        .collection(collection)
        .updateOne({ _id: 1 }, { $inc: { value: deltaWs } }, { upsert: true })
    );
  },

  resetMeter(dbUrl, dbName, collection) {
    return withClient(dbUrl, client =>
      client
        .db(dbName)
        .collection(collection)
        .updateOne({ _id: 1 }, { $set: { value: 0 } }, { upsert: true })
    );
  },

  readAll(dbUrl, dbName, collection, filter = {}) {
    return withClient(dbUrl, client =>
      client
        .db(dbName)
        .collection(collection)
        .find(filter)
        .sort({ timestamp: -1 })
        .toArray()
    );
  },

  getMeterReading(dbUrl, dbName, collection) {
    return withClient(dbUrl, client =>
      client.db(dbName).collection(collection).findOne({ _id: 1 })
    ).then(row => row || { value: 0 });
  },

  latestTimestamp(dbUrl, dbName, collection) {
    return withClient(dbUrl, client =>
      client
        .db(dbName)
        .collection(collection)
        .find({}, { projection: { timestamp: 1, date: 1 } })
        .sort({ timestamp: -1 })
        .limit(1)
        .toArray()
    ).then(rows => {
      if (!rows[0]) return 0;
      return rows[0].timestamp || rows[0].date || 0;
    });
  },

  bulkInsertTransfers(dbUrl, dbName, collection, transfers) {
    if (!transfers.length) return Promise.resolve([]);
    return withClient(dbUrl, client => {
      const rows = transfers.map(t => ({
        ...t,
        from: households.checksum(t.from),
        to: households.checksum(t.to),
        timestamp: t.date || t.timestamp || Date.now()
      }));
      return client
        .db(dbName)
        .collection(collection)
        .insertMany(rows)
        .then(() => rows);
    });
  },

  clearTransfers(dbUrl, dbName, collection) {
    return withClient(dbUrl, client =>
      client.db(dbName).collection(collection).deleteMany({})
    );
  }
};
