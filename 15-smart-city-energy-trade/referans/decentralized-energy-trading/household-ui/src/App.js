import React, { useState, useEffect } from "react";
import { Grommet, Box } from "grommet";
import { grommet } from "grommet/themes";
import TopNav from "./components/TopNav";
import SensorStats from "./components/SensorStats";
import NetworkStats from "./components/NetworkStats";
import TransfersTicker from "./components/TransfersTicker";
import Savings from "./components/Savings";
import { fetchFromEndpoint } from "./helpers/fetch";
import { wsToKWh } from "./helpers/conversion";

function App() {
  const [householdStats, setHouseholdStats] = useState({});
  const [networkStats, setNetworkStats] = useState({});
  const [meterChange, setMeterChange] = useState({});
  const [sensorData, setSensorData] = useState([]);
  const [transfers, setTransfers] = useState([]);

  useEffect(() => {
    const fetchSensorData = async () => {
      const date = new Date();
      date.setDate(date.getDate() - 1);
      return fetchFromEndpoint(`/sensor-stats?from=${date.getTime()}`);
    };

    const fetchTransfers = async () => {
      const date = new Date();
      date.setDate(date.getDate() - 5);
      return fetchFromEndpoint(`/transfers?from=${date.getTime()}`);
    };

    const fetchData = async () => {
      const safe = (promise, fallback) =>
        promise.catch(err => {
          console.error(err);
          return fallback;
        });

      const [household, network, sensor, transferList] = await Promise.all([
        safe(fetchFromEndpoint(`/household-stats`), {}),
        safe(fetchFromEndpoint(`/network-stats`), {
          renewableEnergy: 0,
          nonRenewableEnergy: 0
        }),
        safe(fetchSensorData(), []),
        safe(fetchTransfers(), [])
      ]);

      const householdObj =
        household && typeof household === "object" ? household : {};
      const meterChange =
        sensor.length > 0
          ? wsToKWh(Number(sensor[0].produce) - Number(sensor[0].consume))
          : 0;

      setHouseholdStats({
        ...householdObj,
        value: wsToKWh(Number(householdObj.value) || 0)
      });
      setNetworkStats({
        ...network,
        renewableEnergy: wsToKWh(Number(network.renewableEnergy) || 0),
        nonRenewableEnergy: wsToKWh(Number(network.nonRenewableEnergy) || 0)
      });
      setSensorData(
        sensor.map(entry => ({
          ...entry,
          produce: wsToKWh(Number(entry.produce)),
          consume: wsToKWh(Number(entry.consume))
        }))
      );
      setTransfers(
        (Array.isArray(transferList) ? transferList : []).map(entry => ({
          ...entry,
          amount: wsToKWh(Number(entry.amount))
        }))
      );
      setMeterChange(meterChange);
    };

    fetchData();
    const interval = setInterval(() => fetchData(), 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Grommet theme={grommet}>
      <TopNav address={householdStats.address} />
      <Box
        pad={"medium"}
        direction={"row"}
        wrap
        justify={"around"}
        background={{ color: "light-2" }}
      >
        <SensorStats sensorData={sensorData} />
        <NetworkStats
          householdMeterReading={Number(householdStats.value)}
          meterChange={meterChange}
          networkEnergyBalance={networkStats.renewableEnergy - networkStats.nonRenewableEnergy}
        />
        <TransfersTicker transfers={transfers} />
        <Savings address={householdStats.address} transfers={transfers} />
      </Box>
    </Grommet>
  );
}

export default App;
