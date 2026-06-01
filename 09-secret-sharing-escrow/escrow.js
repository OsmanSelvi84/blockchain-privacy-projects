const secrets = require('secrets.js-grempe');

function divider(label) {
  const line = '-'.repeat(60);
  console.log('\n' + line);
  if (label) console.log(' ' + label);
  console.log(line);
}

function verifyRecovery(recovered, original) {
  return recovered && recovered.trim() !== '' && recovered === original;
}

const ORIGINAL_SECRET = process.argv[2] || '0xABC123Def456Ghi789PrivateWalletKeyBBSSE';
const TOTAL_SHARES    = 5;
const THRESHOLD       = 3;

divider('SETUP: SECRET SHARING ESCROW SYSTEM');
console.log('\n  Secret   : ' + ORIGINAL_SECRET);
console.log('  Shares   : ' + TOTAL_SHARES + ' parties');
console.log('  Threshold: ' + THRESHOLD + ' parties required for reconstruction');
console.log('\n  Any ' + THRESHOLD + ' of ' + TOTAL_SHARES + ' trustees can reconstruct.');
console.log('  Fewer than ' + THRESHOLD + ' reveal ZERO information.');

divider('PHASE 1: Splitting secret into shares');

const secretHex   = secrets.str2hex(ORIGINAL_SECRET);
const shareValues = secrets.share(secretHex, TOTAL_SHARES, THRESHOLD);

const TRUSTEES = {
  'Aytunc': shareValues[0],
  'Selin' : shareValues[1],
  'Zeynep': shareValues[2],
  'Polat' : shareValues[3],
  'Esref' : shareValues[4],
};

console.log('\n  Each trustee receives one share:\n');
Object.entries(TRUSTEES).forEach(function(entry, i) {
  console.log('  [Share ' + (i+1) + '] ' + entry[0] + ': ' + entry[1].substring(0, 20) + '...');
});
console.log('\n  Individual shares are mathematically meaningless alone.');

divider('PHASE 2: Blockchain Escrow (Escrow.sol)');
console.log('');
console.log('  Escrow.sol enforces the trust model on-chain:');
console.log('  1. Owner deploys contract with threshold=' + THRESHOLD + ' and ' + TOTAL_SHARES + ' trustee addresses.');
console.log('  2. Owner calls initiateRecovery() to start a recovery session.');
console.log('  3. Each trustee calls approveRecovery() -- recorded on-chain.');
console.log('  4. When approvalCount >= ' + THRESHOLD + ', contract emits RecoverySuccess().');
console.log('  5. Off-chain: approved trustees combine shares to reconstruct the secret.');

divider('PHASE 3: Reconstruction Scenarios');

console.log('\n  [SCENARIO A] 2 trustees attempt reconstruction (below threshold)');
console.log('  Parties: Aytunc, Selin | Shares: 2 | Required: ' + THRESHOLD);

var failedStr = secrets.hex2str(secrets.combine([TRUSTEES['Aytunc'], TRUSTEES['Selin']]));
if (verifyRecovery(failedStr, ORIGINAL_SECRET)) {
  console.log('  Result: UNEXPECTED SUCCESS -- implementation error!');
} else {
  console.log('  Result: FAILED (expected)');
  console.log('  Reason: Shamir produces cryptographic garbage with insufficient shares.');
  console.log('  On-chain: approvalCount=2 < threshold(' + THRESHOLD + '). Contract rejects.');
}

console.log('\n  [SCENARIO B] 3 trustees reconstruct (meets threshold)');
console.log('  Parties: Zeynep, Polat, Esref | Shares: 3 | Required: ' + THRESHOLD);

try {
  var recoveredB = secrets.hex2str(secrets.combine([TRUSTEES['Zeynep'], TRUSTEES['Polat'], TRUSTEES['Esref']]));
  if (verifyRecovery(recoveredB, ORIGINAL_SECRET)) {
    console.log('  Result: SUCCESS');
    console.log('  Recovered: ' + recoveredB);
    console.log('  On-chain: approvalCount=3 >= threshold(' + THRESHOLD + '). RecoverySuccess() emitted.');
  } else {
    console.log('  Result: MISMATCH');
  }
} catch(e) { console.log('  Error: ' + e.message); }

console.log('\n  [SCENARIO C] 4 trustees reconstruct (exceeds threshold)');
console.log('  Parties: Aytunc, Selin, Polat, Esref | Shares: 4 | Required: ' + THRESHOLD);

try {
  var recoveredC = secrets.hex2str(secrets.combine([TRUSTEES['Aytunc'], TRUSTEES['Selin'], TRUSTEES['Polat'], TRUSTEES['Esref']]));
  if (verifyRecovery(recoveredC, ORIGINAL_SECRET)) {
    console.log('  Result: SUCCESS');
    console.log('  Recovered: ' + recoveredC);
    console.log('  Extra shares do not change result -- threshold already met.');
  } else {
    console.log('  Result: MISMATCH');
  }
} catch(e) { console.log('  Error: ' + e.message); }

divider('SUMMARY');
console.log('');
console.log('  Shamir Secret Sharing (' + THRESHOLD + '-of-' + TOTAL_SHARES + '):');
console.log('  Shares available   |  Reconstruct?');
console.log('  1 of ' + TOTAL_SHARES + '             |  NO  -- random noise');
console.log('  2 of ' + TOTAL_SHARES + '             |  NO  -- random noise');
console.log('  3 of ' + TOTAL_SHARES + ' (threshold) |  YES -- exact secret');
console.log('  4 of ' + TOTAL_SHARES + '             |  YES -- exact secret');
console.log('  5 of ' + TOTAL_SHARES + '             |  YES -- exact secret');
console.log('');
console.log('  Privacy concept: Distributed Trust Model');
console.log('  - No single party holds the complete secret.');
console.log('  - Blockchain (Escrow.sol) enforces threshold rule transparently.');