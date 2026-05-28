import React, { useMemo } from "react";
import { Box, Text } from "grommet";
import { LinkNext, History } from "grommet-icons";
import DashboardCard from "./DashboardCard";
import { labelForAddress } from "../helpers/households";

export default function TransferTicker({ transfers = [] }) {
  const sorted = useMemo(() => {
    return [...transfers].sort((a, b) => {
      const ta = a.date || a.timestamp || 0;
      const tb = b.date || b.timestamp || 0;
      return tb - ta;
    });
  }, [transfers]);

  const totalKwh = sorted.reduce((s, t) => s + Number(t.amount || 0), 0);

  return (
    <DashboardCard
      title="Transfer Ticker"
      subtitle={
        sorted.length
          ? `${sorted.length} record(s) · ${totalKwh.toFixed(2)} kWh total`
          : "Stored in Mongo · visible after netting"
      }
      icon={<History size="small" color="#0a6b6f" />}
      flex="grow"
      minHeight="200px"
    >
      {sorted.length === 0 ? (
        <Box
          pad="large"
          background="light-2"
          round="medium"
          align="center"
          gap="small"
        >
          <LinkNext size="large" color="dark-5" />
          <Text size="small" color="dark-4" textAlign="center">
            No transfers yet.
            <br />
            Submit from H1 (:3000) and H2 (:3010), then wait ~60s.
          </Text>
        </Box>
      ) : (
        <Box gap="small">
          {sorted.map((t, i) => (
            <TransferRow key={t._id || `${t.from}-${t.to}-${i}`} transfer={t} />
          ))}
        </Box>
      )}
    </DashboardCard>
  );
}

function TransferRow({ transfer: t }) {
  const kwh = Number(t.amount || 0).toFixed(2);
  const when = t.date || t.timestamp;
  const timeStr = when
    ? new Date(when).toLocaleString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      })
    : "—";

  return (
    <Box
      direction="row"
      align="center"
      justify="between"
      pad="medium"
      background="light-2"
      round="medium"
      gap="medium"
      wrap
      border={{ color: "card-border", size: "1px" }}
      style={{ transition: "box-shadow 0.2s ease" }}
    >
      <Box direction="row" align="center" gap="small" flex="grow" wrap>
        <AddrChip addr={t.from} />
        <Box
          pad={{ horizontal: "xsmall" }}
          background="white"
          round="full"
          border={{ color: "card-border", size: "1px" }}
        >
          <LinkNext size="small" color="flow-arrow" />
        </Box>
        <AddrChip addr={t.to} />
      </Box>
      <Box align="end" gap="2px">
        <Text weight="bold" color="meter-positive" size="medium">
          {kwh} kWh
        </Text>
        <Text size="xsmall" color="dark-5">
          {timeStr}
        </Text>
      </Box>
    </Box>
  );
}

function AddrChip({ addr }) {
  const label = labelForAddress(addr);
  return (
    <Box
      background="white"
      round="small"
      pad={{ horizontal: "small", vertical: "xsmall" }}
      border={{ color: "card-border", size: "1px" }}
    >
      {label && (
        <Text size="xsmall" weight="bold" color="brand">
          {label}
        </Text>
      )}
      <Text size="xsmall" color="dark-4" className="mono">
        {shortAddr(addr)}
      </Text>
    </Box>
  );
}

function shortAddr(addr) {
  if (!addr) return "—";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}
