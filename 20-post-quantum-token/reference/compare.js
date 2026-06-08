// Reference comparison harness: runs simple-lamport through the same logical
// scenarios as the Solidity verifier, showing functional equivalence.

const SimpleLamport = require('./simple-lamport');
const lamport = new SimpleLamport();

let passed = 0, failed = 0;

function safeVerify(message, signature, publicKey) {
  try {
    return lamport.verify(message, signature, publicKey) === true;
  } catch (e) {
    return false;
  }
}

function check(label, actual, expected) {
  const ok = actual === expected;
  if (ok) { passed++; } else { failed++; }
  console.log('  [' + (ok ? 'PASS' : 'FAIL') + '] ' + label +
              '  (got ' + actual + ', expected ' + expected + ')');
}

console.log('=== Reference (simple-lamport): Lamport signature behavior ===\n');

const { privateKey, publicKey } = lamport.generateKeys();
const message = 'transfer:100:bob';
const signature = lamport.sign(message, privateKey);

const other = lamport.generateKeys();
const signatureForOtherMessage = lamport.sign('transfer:999:eve', privateKey);

check('Valid signature verifies',
      safeVerify(message, signature, publicKey), true);
check('Signature for another message rejected',
      safeVerify(message, signatureForOtherMessage, publicKey), false);
check('Modified message rejected',
      safeVerify('transfer:100:eve', signature, publicKey), false);
check('Wrong public key rejected',
      safeVerify(message, signature, other.publicKey), false);

console.log('\nResult: ' + passed + ' passed, ' + failed + ' failed.');
process.exit(failed === 0 ? 0 : 1);
