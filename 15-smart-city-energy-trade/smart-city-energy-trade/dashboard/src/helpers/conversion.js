export const WS_PER_KWH = 3600000;

export function wsToKWh(ws) {
  return Number(ws) / WS_PER_KWH;
}

export function kWhToWs(kwh) {
  return Math.round(Number(kwh) * WS_PER_KWH);
}
