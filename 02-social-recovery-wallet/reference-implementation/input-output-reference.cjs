const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log("Reference Social Recovery Wallet Demo");

rl.question("Enter guardian approval count: ", function (answer) {
  const approvals = Number(answer);
  const threshold = 2;

  console.log("\nInput:", approvals);

  if (approvals >= threshold) {
    console.log("Output: Recovery successful");
    console.log("Owner changed to new owner");
  } else {
    console.log("Output: Recovery failed");
    console.log("Owner remains the same");
  }

  rl.close();
});
