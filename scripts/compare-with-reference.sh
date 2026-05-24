#!/usr/bin/env bash
# Compare NED transfer amounts with reference repo (requires both stacks running).
set -euo pipefail

REF_NED="${REF_NED:-http://127.0.0.1:3005}"
H1="${H1:-0x00aa39d30f0d20ff03a22ccfc30b7efbfca597c2}"

echo "=== Test vector amounts (Ws) from this project NED ==="
for label in T1 T2 T3; do
  case "$label" in
    T1)
      curl -s -X PUT http://127.0.0.1:3002/sensor-stats -H 'Content-Type: application/json' \
        -d '{"produce":1800000000,"consume":720000000,"meterDelta":1080000000}' >/dev/null
      curl -s -X PUT http://127.0.0.1:3003/sensor-stats -H 'Content-Type: application/json' \
        -d '{"produce":720000000,"consume":2160000000,"meterDelta":-1440000000}' >/dev/null
      EXPECT=1080000000
      ;;
    T2)
      curl -s -X PUT http://127.0.0.1:3002/sensor-stats -H 'Content-Type: application/json' \
        -d '{"produce":1440000000,"consume":540000000,"meterDelta":900000000}' >/dev/null
      curl -s -X PUT http://127.0.0.1:3003/sensor-stats -H 'Content-Type: application/json' \
        -d '{"produce":540000000,"consume":1800000000,"meterDelta":-1260000000}' >/dev/null
      EXPECT=900000000
      ;;
    T3)
      curl -s -X PUT http://127.0.0.1:3002/sensor-stats -H 'Content-Type: application/json' \
        -d '{"produce":2160000000,"consume":720000000,"meterDelta":1440000000}' >/dev/null
      curl -s -X PUT http://127.0.0.1:3003/sensor-stats -H 'Content-Type: application/json' \
        -d '{"produce":360000000,"consume":2520000000,"meterDelta":-2160000000}' >/dev/null
      EXPECT=1440000000
      ;;
  esac
  echo "Sent $label — wait 60s, then checking amounts..."
  sleep 60
  AMOUNTS=$(curl -s "${REF_NED}/transfers/${H1}?from=0" | python -c 'import sys,json; d=json.load(sys.stdin); print(" ".join(str(x.get("amount")) for x in d))' 2>/dev/null || echo "")
  echo "$label expected amount: $EXPECT"
  echo "$label observed amounts: $AMOUNTS"
  if echo "$AMOUNTS" | grep -q "$EXPECT"; then
    echo "$label OK"
  else
    echo "$label MISMATCH"
  fi
  echo "--- restart household gateways before next test ---"
done

echo "Manual reference diff example:"
echo "diff <(curl -s :3005/transfers/H1?from=0 | jq -S '[.[].amount]') <(curl -s REF:3005/... | jq ...)"
