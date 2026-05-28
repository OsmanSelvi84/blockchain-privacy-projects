/** Hane adresleri — gateway :3002 / :3003 ile aynı (Parity authority_1 / authority_2). */
export const H1 = "0x00aa39d30f0d20ff03a22ccfc30b7efbfca597c2";
export const H2 = "0x002e28950558fbede1a9675cb113f0bd20912019";

export const BY_GATEWAY_PORT = {
  3002: { label: "H1", address: H1, uiPort: 3000 },
  3003: { label: "H2", address: H2, uiPort: 3010 }
};

export function norm(addr) {
  return (addr || "").toLowerCase().trim();
}

export function labelForAddress(addr) {
  const c = norm(addr);
  if (c === norm(H1)) return "H1";
  if (c === norm(H2)) return "H2";
  return null;
}

export function expectedForGatewayPort(port) {
  return BY_GATEWAY_PORT[String(port)] || null;
}
