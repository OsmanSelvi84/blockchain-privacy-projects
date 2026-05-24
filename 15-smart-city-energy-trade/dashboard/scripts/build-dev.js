const { spawn } = require("child_process");

const major = parseInt(process.versions.node.split(".")[0], 10);
const env = { ...process.env };
if (major >= 17) {
  env.NODE_OPTIONS = "--openssl-legacy-provider";
}

const path = require("path");
const buildScript = path.join(
  __dirname,
  "..",
  "node_modules",
  "react-scripts",
  "scripts",
  "build.js"
);

const child = spawn(process.execPath, [buildScript], {
  stdio: "inherit",
  env,
  cwd: path.join(__dirname, "..")
});

child.on("exit", code => process.exit(code == null ? 1 : code));
