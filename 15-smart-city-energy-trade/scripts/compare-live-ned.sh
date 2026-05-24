#!/usr/bin/env bash
# Compare transfer amounts on both NEDs (after Test 1 curl on each stack).
H1=0x00aa39d30f0d20ff03a22ccfc30b7efbfca597c2
echo "smart-city (3005):"
curl -s "http://127.0.0.1:3005/transfers/${H1}?from=0" 2>/dev/null | jq '[.[].amount]' || echo "(NED not running)"
echo "reference (4005):"
curl -s "http://127.0.0.1:4005/transfers/${H1}?from=0" 2>/dev/null | jq '[.[].amount]' || echo "(NED not running)"
