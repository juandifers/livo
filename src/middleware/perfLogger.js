const { markRequestStart, getPerfSnapshot } = require('../utils/perfState');

const roundMs = (value) => Math.round(value);

const formatPhaseMetrics = (phaseTotals) => (
  Object.entries(phaseTotals)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, value]) => `${key}=${roundMs(value)}ms`)
);

module.exports = (req, res, next) => {
  if (!req.originalUrl.startsWith('/api/')) {
    return next();
  }

  const requestMeta = markRequestStart();
  const startedAt = process.hrtime.bigint();
  const phaseTotals = Object.create(null);

  req.perf = {
    add: (phase, ms) => {
      if (!phase || !Number.isFinite(ms) || ms < 0) {
        return;
      }
      phaseTotals[phase] = (phaseTotals[phase] || 0) + ms;
    }
  };

  res.on('finish', () => {
    const totalMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    const snapshot = getPerfSnapshot();
    const phaseMetrics = formatPhaseMetrics(phaseTotals);

    const parts = [
      '[perf]',
      req.method,
      req.originalUrl,
      `status=${res.statusCode}`,
      `total=${roundMs(totalMs)}ms`
    ];

    if (requestMeta.isFirstRequest) {
      parts.push(`coldStart=${requestMeta.coldStartMs}ms`);
    }
    if (snapshot.lastDbConnectMs !== null) {
      parts.push(`dbConnect=${snapshot.lastDbConnectMs}ms`);
    }

    if (phaseMetrics.length > 0) {
      parts.push(...phaseMetrics);
    }

    console.log(parts.join(' '));
  });

  next();
};

