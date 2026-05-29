const { H2 } = require("../lib/households");

module.exports = {
  dbUrl: "mongodb://127.0.0.1:27017",
  nedUrl: "http://127.0.0.1:3005",
  host: "127.0.0.1",
  port: 3003,
  dbName: "smart_city_h2",
  sensorDataCollection: "sensor_readings",
  transferCollection: "energy_transfers",
  meterReadingCollection: "meter_reading",
  address: H2,
  password: "node2",
  network: "authority_2"
};
