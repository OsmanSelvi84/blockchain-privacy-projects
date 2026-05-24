import React, { useState, useMemo, useEffect } from "react";
import {
  Box,
  Button,
  Form,
  FormField,
  Text,
  TextInput
} from "grommet";
import { FormDown, Refresh, Send } from "grommet-icons";
import {
  getGatewayPort,
  getGatewayUrl,
  putSensorStats,
  fetchFromEndpoint,
  resetDemoRound
} from "../helpers/fetch";
import { kWhToWs, wsToKWh } from "../helpers/conversion";
import { expectedForGatewayPort } from "../helpers/households";
import DashboardCard from "./DashboardCard";

const NETTING_WAIT_MS = 60000;

export default function SensorInput({ onSubmitted, onGatewayStatus }) {
  const port = getGatewayPort();
  const householdLabel = port === "3003" ? "H2" : "H1";
  const uiPort = port === "3003" ? "3010" : "3000";

  const [produceKwh, setProduceKwh] = useState("500");
  const [consumeKwh, setConsumeKwh] = useState("200");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState(null);
  const [gatewayUp, setGatewayUp] = useState(null);

  const expectedHousehold = expectedForGatewayPort(port);

  useEffect(() => {
    Promise.all([
      fetchFromEndpoint("/household-stats"),
      fetchFromEndpoint("/")
    ])
      .then(([stats, root]) => {
        setGatewayUp(true);
        if (onGatewayStatus) onGatewayStatus(true);
        const gwAddr = (stats.address || root.household || "").toLowerCase();
        const want = expectedHousehold?.address?.toLowerCase();
        if (want && gwAddr && gwAddr !== want) {
          setStatus({
            type: "error",
            message:
              `Wrong gateway on :${port} (${gwAddr.slice(0, 10)}…). ` +
              `This screen expects ${expectedHousehold.label}. ` +
              `Use yarn start:h1 or yarn start:h2.`
          });
        }
      })
      .catch(() => {
        setGatewayUp(false);
        if (onGatewayStatus) onGatewayStatus(false);
      });
  }, [onGatewayStatus, port, expectedHousehold]);

  const payload = useMemo(() => {
    const produce = kWhToWs(produceKwh);
    const consume = kWhToWs(consumeKwh);
    return { produce, consume, meterDelta: produce - consume };
  }, [produceKwh, consumeKwh]);

  const deltaKwh = wsToKWh(payload.meterDelta);
  const deltaPositive = deltaKwh >= 0;

  const handleSubmit = async () => {
    setSubmitting(true);
    setStatus(null);
    try {
      const result = await putSensorStats(payload);
      const okMessage =
        (result && result.message) ||
        `Accepted (${householdLabel}). Netting runs in ~60s after both households submit. UI refreshes every 10s.`;
      setStatus({ type: "ok", message: okMessage });
      if (onSubmitted) {
        setTimeout(() => onSubmitted(), NETTING_WAIT_MS);
      }
    } catch (err) {
      setStatus({
        type: "error",
        message: err.message || "Submit failed"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleFullReset = async () => {
    try {
      await resetDemoRound();
      setStatus({
        type: "ok",
        message:
          "Full reset (NED + Mongo). Submit from H1 and H2, then wait ~60s."
      });
      if (onSubmitted) onSubmitted();
    } catch (err) {
      setStatus({ type: "error", message: err.message });
    }
  };

  return (
    <DashboardCard
      title="Sensor input"
      subtitle={`${householdLabel} · gateway :${port} · UI :${uiPort}`}
      icon={<FormDown size="small" color="#0a6b6f" />}
      flex="grow"
    >
      {expectedHousehold && (
        <Box
          pad="small"
          background="light-2"
          round="small"
          margin={{ bottom: "medium" }}
          className="mono"
        >
          <Text size="xsmall" color="dark-4">
            {expectedHousehold.address}
          </Text>
        </Box>
      )}

      {gatewayUp === false && (
        <Box
          pad="small"
          background="status-warning"
          round="medium"
          margin={{ bottom: "medium" }}
          border={{ color: "#fcd34d", size: "1px" }}
        >
          <Text size="small" color="dark-2">
            Gateway offline: <strong>{getGatewayUrl()}</strong>
          </Text>
        </Box>
      )}

      <Form
        onSubmit={e => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <Box direction="row" gap="medium" wrap>
          <Box flex="grow" basis="140px">
            <FormField label="Production (kWh)" htmlFor="produce">
              <TextInput
                id="produce"
                type="number"
                min="0"
                value={produceKwh}
                onChange={e => setProduceKwh(e.target.value)}
              />
            </FormField>
          </Box>
          <Box flex="grow" basis="140px">
            <FormField label="Consumption (kWh)" htmlFor="consume">
              <TextInput
                id="consume"
                type="number"
                min="0"
                value={consumeKwh}
                onChange={e => setConsumeKwh(e.target.value)}
              />
            </FormField>
          </Box>
        </Box>

        <Box
          pad="medium"
          round="medium"
          margin={{ vertical: "medium" }}
          align="center"
          style={{
            background: deltaPositive ? "#ecfdf5" : "#fff1f2",
            border: `1px solid ${deltaPositive ? "#a7f3d0" : "#fecdd3"}`
          }}
        >
          <Text size="xsmall" color="dark-4">
            meterDelta
          </Text>
          <Text
            size="xxlarge"
            weight="bold"
            color={deltaPositive ? "meter-positive" : "meter-negative"}
          >
            {deltaPositive ? "+" : ""}
            {deltaKwh.toFixed(2)} kWh
          </Text>
        </Box>

        <Box direction="row" gap="small" margin={{ bottom: "medium" }}>
          <Button
            icon={<Refresh size="small" />}
            label="Reset"
            onClick={handleFullReset}
          />
        </Box>

        <Button
          type="submit"
          primary
          icon={<Send size="small" />}
          label={submitting ? "Submitting…" : "Submit"}
          fill="horizontal"
          disabled={submitting}
        />
      </Form>

      {status && (
        <Box
          margin={{ top: "medium" }}
          pad="medium"
          background={status.type === "ok" ? "status-ok" : "status-critical"}
          round="medium"
          border={{
            color: status.type === "ok" ? "#6ee7b7" : "#fca5a5",
            size: "1px"
          }}
        >
          <Text size="small" color="dark-2">
            {status.message}
          </Text>
        </Box>
      )}
    </DashboardCard>
  );
}
