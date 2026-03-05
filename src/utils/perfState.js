const state = {
  processStartedAtMs: Date.now(),
  requestCount: 0,
  firstRequestAtMs: null,
  lastDbConnectMs: null,
  dbConnectedAtMs: null
};

const markRequestStart = () => {
  const now = Date.now();
  state.requestCount += 1;

  if (!state.firstRequestAtMs) {
    state.firstRequestAtMs = now;
  }

  return {
    requestCount: state.requestCount,
    isFirstRequest: state.requestCount === 1,
    coldStartMs: state.requestCount === 1
      ? Math.max(0, now - state.processStartedAtMs)
      : 0
  };
};

const setLastDbConnectMs = (ms) => {
  if (!Number.isFinite(ms) || ms < 0) {
    return;
  }
  state.lastDbConnectMs = Math.round(ms);
  state.dbConnectedAtMs = Date.now();
};

const getPerfSnapshot = () => ({
  processStartedAtMs: state.processStartedAtMs,
  requestCount: state.requestCount,
  firstRequestAtMs: state.firstRequestAtMs,
  lastDbConnectMs: state.lastDbConnectMs,
  dbConnectedAtMs: state.dbConnectedAtMs,
  uptimeMs: Math.round(process.uptime() * 1000)
});

module.exports = {
  markRequestStart,
  setLastDbConnectMs,
  getPerfSnapshot
};

