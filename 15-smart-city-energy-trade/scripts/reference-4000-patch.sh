#!/usr/bin/env bash
# Apply 4000-series ports to decentralized-energy-trading (avoid clash with smart-city 3000-series).
# Usage: bash ~/smart-city-energy-trade/scripts/reference-4000-patch.sh ~/decentralized-energy-trading

set -e
REF="${1:-$HOME/decentralized-energy-trading}"
if [ ! -f "$REF/package.json" ]; then
  echo "Not a reference repo: $REF"
  exit 1
fi

echo "Patching reference repo: $REF"

cat > "$REF/household-server-config.js" <<'EOF'
module.exports = {
  dbUrl: "mongodb://127.0.0.1:27011",
  nedUrl: "http://127.0.0.1:4005",
  host: "127.0.0.1",
  port: 4002,
  dbName: "decentralized_energy_h1",
  sensorDataCollection: "sensor_data",
  utilityDataCollection: "utility_data",
  meterReadingCollection: "meter_reading",
  address: "0x00bd138abd70e2f00903268f3db08f2d25677c9e",
  password: "node0",
  network: "authority",
  sensorInterval: 15000
};
EOF

cat > "$REF/ned-server-config.js" <<'EOF'
module.exports = {
  host: "127.0.0.1",
  port: 4005,
  address: "0x00bd138abd70e2f00903268f3db08f2d25677c9e",
  password: "node0",
  network: "authority",
  nettingInterval: 60000,
  workingDir: "./ned-server",
  fileName: "helloworld.sh",
  executionEnv: "bash",
  hhProduce: 1,
  hhConsume: 1
};
EOF

mkdir -p "$REF/household-ui"
cat > "$REF/household-ui/.env.h1" <<'EOF'
PORT=4000
BROWSER=none
REACT_APP_HSS_PORT=4002
EOF

cat > "$REF/household-ui/.env.h2" <<'EOF'
PORT=4010
BROWSER=none
REACT_APP_HSS_PORT=4003
EOF

cat > "$REF/household-ui/src/helpers/fetch.js" <<'EOF'
export const fetchFromEndpoint = async endpoint => {
  const hhsPort = process.env.REACT_APP_HSS_PORT || "4002";
  const response = await fetch(`http://localhost:${hhsPort}${endpoint}`, {
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    }
  });
  return response.json();
};
EOF

# Add yarn shortcuts (idempotent: skip if already present)
node - "$REF/package.json" <<'NODE'
const fs = require("fs");
const p = process.argv[1];
const pkg = JSON.parse(fs.readFileSync(p, "utf8"));
pkg.scripts = pkg.scripts || {};
Object.assign(pkg.scripts, {
  "run-netting-ref": "node ./netting-entity/index.js -p 4005 -i 60000",
  "run-server-h1":
    "node ./household-server/index.js -p 4002 -a 0x00aa39d30f0d20ff03a22ccfc30b7efbfca597c2 -P node1 -n authority_1 -d mongodb://127.0.0.1:27011 -N http://127.0.0.1:4005",
  "run-server-h2":
    "node ./household-server/index.js -p 4003 -a 0x002e28950558fbede1a9675cb113f0bd20912019 -P node2 -n authority_2 -d mongodb://127.0.0.1:27012 -N http://127.0.0.1:4005",
  "run-ui-h1": "sh -c 'set -a && . ./household-ui/.env.h1 && set +a && yarn --cwd household-ui start'",
  "run-ui-h2": "sh -c 'set -a && . ./household-ui/.env.h2 && set +a && yarn --cwd household-ui start'"
});
fs.writeFileSync(p, JSON.stringify(pkg, null, 2) + "\n");
NODE

echo "Done. Reference ports: UI 4000/4010, API 4002/4003, NED 4005, Mongo 27011/27012."
echo "Start: yarn run-netting-ref, run-server-h1, run-server-h2, run-ui-h1, run-ui-h2"
