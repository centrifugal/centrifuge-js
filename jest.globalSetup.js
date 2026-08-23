// Most tests in this repo require a running Centrifugo instance (see
// docker-compose.yml). Without it every test would hang until its own timeout,
// making the whole run slow and the failure reason non-obvious. So probe the
// server once before the suite starts and abort immediately with a clear hint.

const http = require('http');

const PROBE_URL = process.env.CENTRIFUGO_PROBE_URL || 'http://localhost:8000/';
const TOTAL_TIMEOUT_MS = Number(process.env.CENTRIFUGO_WAIT_MS || 5000);
const ATTEMPT_TIMEOUT_MS = 1000;
const RETRY_DELAY_MS = 250;

function probe() {
  return new Promise((resolve) => {
    // Any HTTP response means the server is up and accepting connections -
    // the exact status does not matter (/health may be disabled in config).
    const req = http.get(PROBE_URL, { timeout: ATTEMPT_TIMEOUT_MS }, (res) => {
      res.resume();
      resolve(null);
    });
    req.on('timeout', () => {
      req.destroy();
      resolve('timeout');
    });
    req.on('error', (err) => resolve(err.code || err.message || String(err)));
  });
}

module.exports = async () => {
  if (process.env.SKIP_CENTRIFUGO_CHECK) return;

  const deadline = Date.now() + TOTAL_TIMEOUT_MS;
  let lastError;
  for (;;) {
    lastError = await probe();
    if (lastError === null) return;
    if (Date.now() + RETRY_DELAY_MS >= deadline) break;
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
  }

  throw new Error(
    `Centrifugo is not available at ${PROBE_URL} (${lastError}) after ${TOTAL_TIMEOUT_MS}ms.\n` +
    'Tests in this repo need a running server. Start it with:\n\n' +
    '    docker compose up -d --wait\n\n' +
    'Set SKIP_CENTRIFUGO_CHECK=1 to bypass this check, or CENTRIFUGO_PROBE_URL to point to another instance.'
  );
};
