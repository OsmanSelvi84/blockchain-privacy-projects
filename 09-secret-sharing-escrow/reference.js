const secrets = require('secrets.js-grempe');

console.log("=== REFERENCE IMPLEMENTATION ===");
console.log("Source: https://github.com/grempe/secrets.js\n");

const customInput = process.argv[2];

if (customInput) {
  console.log("[CUSTOM TEST] Input: " + customInput);
  const hex    = secrets.str2hex(customInput);
  const shares = secrets.share(hex, 5, 3);
  console.log("Shares   : " + shares.length);
  const fail = secrets.hex2str(secrets.combine(shares.slice(0, 2)));
  console.log("2 shares match: " + (fail === customInput));
  const ok = secrets.hex2str(secrets.combine([shares[1], shares[3], shares[4]]));
  console.log("3 shares match: " + (ok === customInput));
} else {
  console.log("[TEST 1] Split a password with threshold 3-of-5");
  const pw     = "<<PassWord123>>";
  const pwHex  = secrets.str2hex(pw);
  const shares = secrets.share(pwHex, 5, 3);
  console.log("Original : " + pw);
  console.log("Shares   : " + shares.length);
  const fail = secrets.hex2str(secrets.combine(shares.slice(1, 3)));
  console.log("2 shares match: " + (fail === pw));
  const ok = secrets.hex2str(secrets.combine([shares[1], shares[3], shares[4]]));
  console.log("3 shares match: " + (ok === pw));

  console.log("\n[TEST 2] Split a 512-bit random key with threshold 5-of-10");
  const key       = secrets.random(512);
  const keyShares = secrets.share(key, 10, 5);
  const fail2     = secrets.combine(keyShares.slice(0, 4));
  console.log("4 shares match: " + (fail2 === key));
  const ok2 = secrets.combine(keyShares.slice(4, 9));
  console.log("5 shares match: " + (ok2 === key));
}

console.log("\n=== END REFERENCE ===");