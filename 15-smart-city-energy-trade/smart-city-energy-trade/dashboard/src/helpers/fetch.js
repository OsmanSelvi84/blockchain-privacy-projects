function resolveApiPort() {
  const raw = process.env.REACT_APP_HSS_PORT || "3002";
  if (raw === "3000" || raw === "3010") {
    console.warn(
      `[fetch] REACT_APP_HSS_PORT=${raw} is a UI port. Using gateway: ${raw === "3010" ? "3003" : "3002"}`
    );
    return raw === "3010" ? "3003" : "3002";
  }
  return raw;
}

const API_PORT = resolveApiPort();
const BASE = `http://127.0.0.1:${API_PORT}`;
const REQUEST_TIMEOUT_MS = 15000;

export function getGatewayPort() {
  return API_PORT;
}

export function getGatewayUrl() {
  return BASE;
}

function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  return fetch(url, { ...options, signal: controller.signal }).finally(() =>
    clearTimeout(timer)
  );
}

async function parseResponse(res) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function fetchFromEndpoint(path) {
  const res = await fetchWithTimeout(`${BASE}${path}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return parseResponse(res);
}

export async function putSensorStats({ produce, consume, meterDelta }) {
  let res;
  try {
    res = await fetchWithTimeout(`${BASE}/sensor-stats`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ produce, consume, meterDelta })
    });
  } catch (e) {
    if (e.name === "AbortError") {
      throw new Error(
        `Timeout (15s). Gateway :${API_PORT} is not responding — restart it.`
      );
    }
    throw new Error(
      `Cannot connect (${BASE}). Run yarn run-gateway-h1 or run-gateway-h2`
    );
  }
  const body = await parseResponse(res);
  if (!res.ok) {
    const msg =
      body && typeof body === "object" && body.error
        ? body.error
        : String(body || "");
    throw new Error(msg || `HTTP ${res.status}`);
  }
  if (body && typeof body === "object") return body;
  return {
    ok: true,
    message:
      "Accepted. Netting runs in ~60s after both households submit. UI refreshes automatically."
  };
}

export async function resetDemoRound() {
  const res = await fetchWithTimeout(`${BASE}/demo/reset`, { method: "POST" });
  const body = await parseResponse(res);
  if (!res.ok) {
    const msg =
      typeof body === "object" && body.error ? body.error : String(body);
    throw new Error(msg || `HTTP ${res.status}`);
  }
  return body || {};
}
