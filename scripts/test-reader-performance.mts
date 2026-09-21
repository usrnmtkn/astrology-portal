import assert from "node:assert/strict";
import vm from "node:vm";
import { buildSync } from "esbuild";
import handler, { validatedReaderMetrics } from "../api/reader-performance.ts";

const event = { checkpoint: "calendar.reading", outcome: "ready", durationMs: 400, viewport: "small", network: "4g", cache: "miss" };
assert.deepEqual(validatedReaderMetrics({ events: [event] }), [event]);
for (const invalid of [
  { events: [{ ...event, accountId: "synthetic-id" }] },
  { events: [{ ...event, checkpoint: "private journal text" }] },
  { events: [{ ...event, durationMs: Infinity }] },
  { events: [{ ...event, durationMs: -1 }] },
  { events: Array(9).fill(event) }, { events: [], note: "must not log" }
]) assert.equal(validatedReaderMetrics(invalid), null);

const logs: string[] = [];
const original = console.info;
console.info = value => { logs.push(value); };
try {
  const invoke = async (body: unknown, origin = "https://reader.test") => {
    const response = { statusCode: 0, setHeader() {}, end() {} };
    await handler({ method: "POST", headers: { host: "reader.test", origin, "content-type": "application/json", "sec-fetch-site": "same-origin" }, body } as any, response as any);
    return response.statusCode;
  };
  assert.equal(await invoke({ events: [event] }), 204);
  assert.equal(await invoke({ events: [{ ...event, privateNote: "never recorded" }] }), 400);
  assert.equal(await invoke({ events: [event] }, "https://another.test"), 403);
  assert.equal(await invoke({ events: [event], text: "a".repeat(4000) }), 413);
  assert.equal(logs.length, 1);
  assert.deepEqual(JSON.parse(logs[0]).events, [event]);
} finally { console.info = original; }

const clientCode = buildSync({ entryPoints: ["apps/web/src/services/readerPerformance.ts"],
  bundle: true, write: false, platform: "browser", format: "cjs",
  define: { "import.meta.env.PROD": "true" }
}).outputFiles[0].text;
function clientFixture(doNotTrack = "0") {
  const requests: Array<{ url: string; options: RequestInit }> = [];
  const timers: Array<() => void> = [];
  const context = { module: { exports: {} as any }, navigator: { webdriver: false, doNotTrack },
    performance: { now: () => 40, measure() {} }, innerWidth: 390,
    Math: { random: () => 0, round: Math.round },
    document: { addEventListener() {} }, clearTimeout() {},
    setTimeout(callback: () => void) { timers.push(callback); return timers.length; },
    fetch(url: string, options: RequestInit) { requests.push({ url, options }); return Promise.resolve(); }
  };
  vm.runInNewContext(clientCode, context);
  return { requests, timers, measure: context.module.exports.startReaderMeasurement };
}
const client = clientFixture();
for (let batch = 0; batch < 3; batch++) {
  for (let index = 0; index < 12; index++) client.measure("calendar.reading", "miss")("ready");
  client.timers.shift()?.();
}
assert.equal(client.requests.length, 2, "Sampling must never exceed two batches per visit.");
for (const request of client.requests) {
  assert.equal(request.url, "/api/reader-performance");
  assert.equal(request.options.credentials, "omit");
  assert.equal(request.options.referrerPolicy, "no-referrer", "The selected date or other page URL state must not leak through Referer.");
  const payload = JSON.parse(String(request.options.body));
  assert.equal(payload.events.length, 8);
  assert.ok(validatedReaderMetrics(payload));
}
const optedOut = clientFixture("1");
optedOut.measure("calendar.reading")("ready");
assert.equal(optedOut.timers.length, 0);
assert.equal(optedOut.requests.length, 0);
console.log("Reader measurements accept bounded numeric checkpoints and reject private fields, extra data, and cross-origin submissions.");
