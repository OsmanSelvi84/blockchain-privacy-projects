import React from "react";
import { Box, Text } from "grommet";
import { Money, Trigger } from "grommet-icons";
import DashboardCard from "./DashboardCard";

const EEG_UMLAGE_CT = 6.405;
const ENERGY_COSTS_CT = 29;

const normAddr = addr =>
  addr && typeof addr === "string" ? addr.toLowerCase().trim() : "";

function receivedKwh(address, transfers) {
  const me = normAddr(address);
  if (!me) return 0;
  return transfers
    .filter(t => t.to && normAddr(t.to) === me)
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);
}

export default function EnergySavings({ address, transfers = [] }) {
  const kwh = receivedKwh(address, transfers);
  const costsWithoutEeg = ((ENERGY_COSTS_CT - EEG_UMLAGE_CT) * kwh) / 100;
  const savingsEur = (EEG_UMLAGE_CT * kwh) / 100;
  const costsWithEeg = (ENERGY_COSTS_CT * kwh) / 100;
  const savingsPct = costsWithEeg > 0 ? (savingsEur / costsWithEeg) * 100 : 0;

  return (
    <DashboardCard
      title="Energy Savings"
      subtitle={`EEG ${EEG_UMLAGE_CT} ct/kWh · avg. ${ENERGY_COSTS_CT} ct/kWh`}
      icon={<Money size="small" color="#059669" />}
      accent="accent-1"
      flex="grow"
    >
      {kwh === 0 ? (
        <Box
          pad="medium"
          background="light-2"
          round="medium"
          border={{ color: "card-border", size: "1px" }}
        >
          <Text size="small" color="dark-4">
            This household has not received energy from neighbours yet.
            <br />
            <Text size="xsmall" color="dark-5">
              When the producer sends (e.g. H1 → H2), savings appear on the receiver (H2).
            </Text>
          </Text>
        </Box>
      ) : (
        <Box gap="medium">
          <Box direction="row" gap="medium" wrap>
            <MetricCard
              icon={<Trigger size="medium" color="#0a6b6f" />}
              label="total received energy"
              value={kwh.toFixed(2)}
              unit="kWh"
            />
            <MetricCard
              icon={<Money size="medium" color="#059669" />}
              label="total saved money"
              value={savingsEur.toFixed(2)}
              unit="EUR"
              highlight
            />
          </Box>

          <Box gap="xsmall">
            <Box direction="row" justify="between" align="center">
              <Text size="xsmall" color="dark-4">
                Savings rate (EEG levy)
              </Text>
              <Text size="small" weight="bold" color="meter-positive">
                %{savingsPct.toFixed(1)}
              </Text>
            </Box>
            <Box height="10px" background="light-3" round="large" overflow="hidden">
              <Box
                height="10px"
                round="large"
                style={{
                  width: `${Math.max(savingsPct, 6)}%`,
                  background: "linear-gradient(90deg, #059669, #12a37f)",
                  transition: "width 0.5s ease"
                }}
              />
            </Box>
          </Box>

          <Box
            background="light-2"
            round="medium"
            pad="small"
            gap="xsmall"
            border={{ color: "card-border", size: "1px" }}
          >
            <Row label="total energy costs" value={`${costsWithoutEeg.toFixed(2)} EUR`} />
            <Row label="Total bill equivalent" value={`${costsWithEeg.toFixed(2)} EUR`} />
          </Box>
        </Box>
      )}
    </DashboardCard>
  );
}

function MetricCard({ icon, label, value, unit, highlight }) {
  return (
    <Box
      flex="grow"
      basis="140px"
      pad="medium"
      round="medium"
      align="center"
      background={highlight ? "#ecfdf5" : "light-2"}
      border={{
        color: highlight ? "#a7f3d0" : "card-border",
        size: "1px"
      }}
      gap="xsmall"
    >
      {icon}
      <Text size="xsmall" color="dark-4" textAlign="center">
        {label}
      </Text>
      <Box direction="row" align="baseline" gap="4px">
        <Text
          size="xxlarge"
          weight="bold"
          color={highlight ? "meter-positive" : "dark-1"}
        >
          {value}
        </Text>
        <Text size="small" color="dark-4">
          {unit}
        </Text>
      </Box>
    </Box>
  );
}

function Row({ label, value }) {
  return (
    <Box direction="row" justify="between">
      <Text size="xsmall" color="dark-4">
        {label}
      </Text>
      <Text size="small" color="dark-2">
        {value}
      </Text>
    </Box>
  );
}
