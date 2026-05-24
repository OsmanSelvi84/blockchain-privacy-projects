module.exports = function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(
        () => reject(new Error(`${label} timed out (${ms}ms) — is Parity/NED running?`)),
        ms
      );
    })
  ]);
};
