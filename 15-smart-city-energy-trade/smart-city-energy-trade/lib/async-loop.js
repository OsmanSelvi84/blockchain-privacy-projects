async function forEach(items, fn) {
  for (let i = 0; i < items.length; i++) {
    await fn(items[i], i);
  }
}

module.exports = { forEach, asyncForEach: forEach };
