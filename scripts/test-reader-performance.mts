import assert from "node:assert/strict";
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
console.log("Reader measurements accept bounded numeric checkpoints and reject private fields, extra data, and cross-origin submissions.");
