/**
 * react-scripts 3.x fails on Node 17+ without OpenSSL legacy provider.
 */
const { spawn } = require("child_process");
const path = require("path");

const uiPort = process.env.PORT || "3000";
const apiPort = process.env.REACT_APP_HSS_PORT || "3002";

if (apiPort === uiPort || apiPort === "3000" || apiPort === "3010") {
  console.error(
    "\n[ERROR] REACT_APP_HSS_PORT must be the gateway port (3002 or 3003), not the UI port (" +
      uiPort +
      ").\n" +
      "  H1: yarn start:h1   → UI :3000, API :3002\n" +
      "  H2: yarn start:h2   → UI :3010, API :3003\n\n"
  );
  process.exit(1);
}

console.log(`UI http://localhost:${uiPort}  →  gateway API http://127.0.0.1:${apiPort}`);

const major = parseInt(process.versions.node.split(".")[0], 10);
const env = { ...process.env };
if (major >= 17) {
  env.NODE_OPTIONS = env.NODE_OPTIONS
    ? `${env.NODE_OPTIONS} --openssl-legacy-provider`
    : "--openssl-legacy-provider";
}

const startScript = path.join(
  __dirname,
  "..",
  "node_modules",
  "react-scripts",
  "scripts",
  "start.js"
);

const child = spawn(process.execPath, [startScript], {
  stdio: "inherit",
  env,
  cwd: path.join(__dirname, "..")
});

child.on("exit", code => process.exit(code == null ? 1 : code));
