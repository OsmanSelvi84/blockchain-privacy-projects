module.exports = {
  async forEach(items, fn) {
    for (let i = 0; i < items.length; i++) {
      await fn(items[i], i);
    }
  }
};
