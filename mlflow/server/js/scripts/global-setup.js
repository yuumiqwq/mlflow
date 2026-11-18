module.exports = () => {
  // Keep UTC confined to this process and its workers, including on Windows.
  process.env.TZ = 'UTC';
  if (new Date('2026-01-01T00:00:00Z').getTimezoneOffset() !== 0) {
    throw new Error('This Node runtime does not support process-local UTC; tests are disabled.');
  }
};
