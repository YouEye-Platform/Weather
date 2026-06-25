/**
 * Next.js instrumentation hook — runs once on server startup.
 *
 * Increases Node.js 22's happy-eyeballs connection-attempt timeout from
 * the default 250 ms to 2 000 ms.  The geocoding API server
 * (geocoding-api.open-meteo.com) has a TCP connect latency of ~310 ms
 * from the app container, which exceeds the 250 ms default and causes
 * every `fetch()` call to fail with ETIMEDOUT.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const net = await import("net");
    net.setDefaultAutoSelectFamilyAttemptTimeout(2000);
  }
}
