import React from "react";
import { Box, Text } from "grommet";
import { Globe } from "grommet-icons";
import DashboardCard from "./DashboardCard";

export default function NetworkPanel({
  householdMeterReading = 0,
  meterChange = 0,
  networkEnergyBalance = 0
}) {
  const meter = Number(householdMeterReading) || 0;
  const change = Number(meterChange) || 0;
  const balance = Number(networkEnergyBalance) || 0;

  return (
    <DashboardCard
      title="Network Overview"
      subtitle="Meter and community totals"
      icon={<Globe size="small" color="#0a6b6f" />}
      flex="grow"
    >
      <Box gap="medium">
        <MeterHero value={meter} />

        <Box direction="row" gap="medium" wrap>
          <StatTile
            label="Community Balance"
            value={balance}
            positive={balance >= 0}
          />
          <StatTile
            label="Meter Change"
            value={change}
            positive={change >= 0}
            subtitle="Latest sensor submission"
          />
        </Box>
      </Box>
    </DashboardCard>
  );
}

function MeterHero({ value }) {
  const positive = value >= 0;
  const color = positive ? "#059669" : "#e11d48";
  const bg = positive
    ? "linear-gradient(135deg, #059669 0%, #10b981 100%)"
    : "linear-gradient(135deg, #e11d48 0%, #f43f5e 100%)";

  return (
    <Box gap="xsmall">
      <Text size="xsmall" color="dark-4" weight="bold">
        Meter reading
      </Text>
      <Box
        pad="large"
        round="medium"
        align="center"
        style={{
          background: bg,
          boxShadow: `0 8px 24px ${color}33`
        }}
      >
        <Text
          weight="bold"
          color="white"
          style={{ fontSize: "36px", lineHeight: 1.1 }}
        >
          {value.toFixed(1)}
        </Text>
        <Text size="small" color="white" style={{ opacity: 0.9 }}>
          kWh
        </Text>
      </Box>
    </Box>
  );
}

function StatTile({ label, value, positive, subtitle }) {
  const color = positive ? "#059669" : "#e11d48";

  return (
    <Box
      flex="grow"
      basis="140px"
      pad="medium"
      background="light-2"
      round="medium"
      border={{ color: "card-border", size: "1px" }}
      align="center"
      gap="xsmall"
    >
      <Box
        round="full"
        width="88px"
        height="88px"
        align="center"
        justify="center"
        border={{ color, size: "4px" }}
        background="white"
      >
        <Text size="large" weight="bold" color="dark-1">
          {value.toFixed(1)}
        </Text>
        <Text size="xsmall" color="dark-4">
          kWh
        </Text>
      </Box>
      <Text size="small" color="dark-2" weight="bold" textAlign="center">
        {label}
      </Text>
      {subtitle && (
        <Text size="xsmall" color="dark-5" textAlign="center">
          {subtitle}
        </Text>
      )}
    </Box>
  );
}
