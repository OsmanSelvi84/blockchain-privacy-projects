import React from "react";
import { Heading, Text } from "grommet";
import { StatusGood, StatusWarning, Shield } from "grommet-icons";
import { getGatewayPort } from "../helpers/fetch";
import { expectedForGatewayPort, labelForAddress } from "../helpers/households";

export default function TopBar({
  address,
  meterKwh = 0,
  gatewayUp,
  transferCount,
  lastRefresh
}) {
  const port = getGatewayPort();
  const expected = expectedForGatewayPort(port);
  const label = labelForAddress(address) || expected?.label || (port === "3003" ? "H2" : "H1");
  const meter = Number(meterKwh) || 0;
  const addressOk =
    !address ||
    !expected ||
    address.toLowerCase() === expected.address.toLowerCase();

  return (
    <header className="topbar">
      <div className="app-shell app-shell--pad">
        <div className="topbar__main">
          <div className="topbar__brand">
            <div className="topbar__eyebrow">
              <Shield color="white" size="small" />
              <span>Privacy-preserving P2P netting</span>
            </div>
            <Heading level={2} margin="none" color="white" className="topbar__title">
              Smart City Energy Trade
            </Heading>
            <Text color="white" size="small" className="topbar__tagline">
              Neighbourhood P2P energy · hash + signature · ~60s netting
            </Text>
          </div>

          <div className="topbar__stats">
            <div className="topbar-pill topbar-pill--solid">
              <span className="topbar-pill__value">{label}</span>
              <span className="topbar-pill__meta">:{port}</span>
            </div>
            <StatPill label="Meter reading" value={meter.toFixed(1)} unit="kWh" />
            <StatPill label="Transfers" value={String(transferCount)} />
            <ConnectionPill up={gatewayUp} />
          </div>
        </div>

        {(address || lastRefresh) && (
          <div className="topbar__meta">
            {address && (
              <Text
                color="white"
                size="xsmall"
                className="mono topbar__address"
                style={{ opacity: addressOk ? 0.85 : 1 }}
              >
                {address}
                {!addressOk && (
                  <Text color="#fecaca" size="xsmall" component="span">
                    {" "}
                    — wrong gateway; use yarn start:
                    {expected?.label === "H2" ? "h2" : "h1"}
                  </Text>
                )}
              </Text>
            )}
            {lastRefresh && (
              <Text color="white" size="xsmall" className="topbar__refresh">
                Last refresh: {lastRefresh}
              </Text>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

function StatPill({ label, value, unit }) {
  return (
    <div className="topbar-pill">
      <span className="topbar-pill__label">{label}</span>
      <span className="topbar-pill__value">
        {value}
        {unit && <span className="topbar-pill__unit"> {unit}</span>}
      </span>
    </div>
  );
}

function ConnectionPill({ up }) {
  const offline = up === false;
  return (
    <div className={`topbar-pill topbar-pill--status ${offline ? "is-offline" : "is-online"}`}>
      {offline ? (
        <StatusWarning color="white" size="small" />
      ) : (
        <StatusGood color="#86efac" size="small" />
      )}
      <span className="topbar-pill__value">{offline ? "Offline" : "Connected"}</span>
    </div>
  );
}
