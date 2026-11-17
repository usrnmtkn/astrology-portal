import assert from "node:assert/strict";
import { createServer } from "node:http";
import healthHandler from "../api/health.ts";
import { checkCalculationReadiness, checkRuntimeEphemeris } from "../api/_lib/ephemeris-health.ts";
import { getAstrodienstSky } from "../apps/web/src/services/ephemeris.ts";
import { isEphemerisHealthReport } from "../src/shared/ephemerisHealth.mjs";

const readiness = () => ({ ok: true, checkedAt: new Date().toISOString(), ephemeris: {
  available: true, ready: true, actualEngine: "swiss", fallback: false, degraded: false,
  checks: ["Sun", "Moon", "True Black Moon Lilith"].map(body => ({ body, ok: true, engine: "swiss", returnedFlags: 2 }))
} });
const readyFetch = (async () => Response.json(readiness())) as typeof fetch;
assert.equal((await checkCalculationReadiness(readyFetch)).ok, true);
for (const mutate of [
  (value: ReturnType<typeof readiness>) => { value.ok = false; },
  value => { value.ephemeris.actualEngine = "moshier"; },
  value => { value.ephemeris.fallback = true; },
  value => { value.ephemeris.checks[1].returnedFlags = 4; },
  value => { value.ephemeris.checks.pop(); },
  value => { value.checkedAt = "2020-01-01T00:00:00Z"; }
] as Array<(value: ReturnType<typeof readiness>) => void>) {
  const value = readiness(); mutate(value);
  const result = await checkCalculationReadiness((async () => Response.json(value)) as typeof fetch);
  assert.equal(result.ok, false, "HTTP 200 cannot hide degraded or stale readiness");
}
assert.equal((await checkCalculationReadiness((async () => new Promise(() => {})) as typeof fetch, 10)).code, "timeout");

// Exercise the actual configured engine on two dates. No provider or private profile.
for (const at of ["2026-03-08T09:30:00Z", "2026-11-01T12:00:00Z"]) {
  const date = new Date(at);
  assert.equal((await checkRuntimeEphemeris(getAstrodienstSky, date)).ok, true);
}
const date = new Date("2026-11-01T12:00:00Z");
const sky = await getAstrodienstSky({ label: "Health check", latitude: 0, longitude: 0, timeZone: "UTC" }, date,
  { includeTransitWindows: false, includeAspectTiming: false });
assert.equal((await checkRuntimeEphemeris(async () => ({ ...sky, generatedAt: "2026-01-01T00:00:00Z" }), date)).code, "invalid_facts");
assert.equal((await checkRuntimeEphemeris(async () => ({ ...sky, facts: [] }), date)).code, "invalid_facts");
assert.equal((await checkRuntimeEphemeris(async () => new Promise(() => {}), date, 10)).code, "timeout");

const nativeFetch = globalThis.fetch;
const nativeNow = Date.now;
let upstreamReady = true;
let upstreamProbes = 0;
globalThis.fetch = (async (input, init) => {
  if (String(input).endsWith("/ready")) {
    upstreamProbes++;
    const payload = readiness(); payload.ok = upstreamReady;
    return Response.json(payload);
  }
  if (String(input).startsWith("http://127.0.0.1:")) return nativeFetch(input, init);
  throw new Error("Unexpected external request in health regression");
}) as typeof fetch;
const server = createServer((req, res) => { void healthHandler(req, res); });
await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
try {
  const address = server.address(); assert.ok(address && typeof address !== "string");
  const target = `http://127.0.0.1:${address.port}/api/health?scope=ephemeris`;
  const response = await fetch(target);
  const report = await response.json();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(isEphemerisHealthReport(report), true);
  assert.deepEqual(Object.keys(report.dependencies).sort(), ["ephemeris", "skyCalculationApi"]);
  assert.equal(isEphemerisHealthReport({ ...report, timestamp: "2020-01-01T00:00:00Z" }), false);
  assert.equal(isEphemerisHealthReport({ ...report, ok: false }), false);
  assert.equal((await fetch(target, { method: "POST" })).status, 405);
  await Promise.all([fetch(target), fetch(target)]);
  assert.equal(upstreamProbes, 1, "Concurrent/recent health requests share the fixed-input probe");
  upstreamReady = false; Date.now = () => nativeNow() + 20_000;
  const down = await fetch(target);
  assert.equal(down.status, 503);
  assert.equal((await down.json()).dependencies.skyCalculationApi.code, "unready");
  upstreamReady = true; Date.now = () => nativeNow() + 40_000;
  assert.equal((await fetch(target)).status, 200, "An expired failed observation must not block recovery");
} finally {
  server.closeAllConnections(); server.close(); globalThis.fetch = nativeFetch; Date.now = nativeNow;
}
console.log("Ephemeris health passed: actual Swiss engine on two dates, scoped HTTP handler, fallback/staleness rejection, and bounded hangs; no paid calls.");
