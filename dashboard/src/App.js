import React, { useState, useEffect, useCallback } from "react";
import { Grommet, Box, Text } from "grommet";
import { theme } from "./theme";
import { fetchFromEndpoint } from "./helpers/fetch";
import { wsToKWh } from "./helpers/conversion";
import TopBar from "./components/TopBar";
import SensorInput from "./components/SensorInput";
import NetworkPanel from "./components/NetworkPanel";
import TransferTicker from "./components/TransferTicker";
import EnergySavings from "./components/EnergySavings";

function mapTransfers(xfer) {
  return (Array.isArray(xfer) ? xfer : []).map(t => ({
    ...t,
    amount: wsToKWh(Number(t.amount))
  }));
}

function App() {
  const [address, setAddress] = useState("");
  const [meterReadingKwh, setMeterReadingKwh] = useState(0);
  const [meterChangeKwh, setMeterChangeKwh] = useState(0);
  const [networkBalanceKwh, setNetworkBalanceKwh] = useState(0);
  const [transfers, setTransfers] = useState([]);
  const [gatewayUp, setGatewayUp] = useState(null);
  const [lastRefresh, setLastRefresh] = useState("");

  const loadData = useCallback(async () => {
    const safe = (p, fb) => p.catch(() => fb);
    const since = Date.now() - 5 * 24 * 3600 * 1000;
    const sensorFrom = new Date();
    sensorFrom.setDate(sensorFrom.getDate() - 1);

    const [hh, net, xfer, sensorRows] = await Promise.all([
      safe(fetchFromEndpoint("/household-stats"), {}),
      safe(fetchFromEndpoint("/network-stats"), {
        renewableEnergy: 0,
        nonRenewableEnergy: 0
      }),
      safe(fetchFromEndpoint(`/transfers?from=${since}`), []),
      safe(
        fetchFromEndpoint(`/sensor-stats?from=${sensorFrom.getTime()}`),
        []
      )
    ]);

    if (hh.address) setAddress(hh.address);
    if (hh.value != null) setMeterReadingKwh(wsToKWh(Number(hh.value)));

    const latestSensor = Array.isArray(sensorRows) ? sensorRows[0] : null;
    const changeKwh = latestSensor
      ? wsToKWh(Number(latestSensor.produce) - Number(latestSensor.consume))
      : 0;
    setMeterChangeKwh(changeKwh);

    const renewable = wsToKWh(Number(net.renewableEnergy) || 0);
    const grid = wsToKWh(Number(net.nonRenewableEnergy) || 0);
    setNetworkBalanceKwh(renewable - grid);

    setTransfers(mapTransfers(xfer));
    setLastRefresh(
      new Date().toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      })
    );
  }, []);

  useEffect(() => {
    loadData();
    const id = setInterval(loadData, 10000);
    return () => clearInterval(id);
  }, [loadData]);

  return (
    <Grommet theme={theme} full>
      <Box fill direction="column">
        <TopBar
          address={address}
          meterKwh={meterReadingKwh}
          gatewayUp={gatewayUp}
          transferCount={transfers.length}
          lastRefresh={lastRefresh}
        />

        <Box fill="horizontal" flex="grow">
          <Box className="app-shell app-shell--pad" gap="large" pad={{ vertical: "large" }}>
            <Box direction="row-responsive" gap="large" align="stretch">
              <Box basis="400px" flex="grow">
                <SensorInput
                  onGatewayStatus={setGatewayUp}
                  onSubmitted={loadData}
                />
              </Box>
              <Box flex="grow" gap="large">
                <NetworkPanel
                  householdMeterReading={meterReadingKwh}
                  meterChange={meterChangeKwh}
                  networkEnergyBalance={networkBalanceKwh}
                />
                <EnergySavings address={address} transfers={transfers} />
              </Box>
            </Box>

            <TransferTicker transfers={transfers} />
          </Box>
        </Box>

        <Box align="center" pad={{ bottom: "medium" }}>
          <Text size="xsmall" color="dark-5">
            Auto-refresh: 10s · Netting cycle: ~60s
          </Text>
        </Box>
      </Box>
    </Grommet>
  );
}

export default App;
