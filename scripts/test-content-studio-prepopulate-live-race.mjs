#!/usr/bin/env node
import assert from "node:assert/strict";
import { Readable } from "node:stream";

process.env.NODE_ENV = "test";
process.env.CONTENT_GENERATION_SECRET = "prepopulate-race-secret";
process.env.SUPABASE_URL = "https://prepopulate-race.invalid";
process.env.SUPABASE_SERVICE_ROLE_KEY = "prepopulate-race-role";

const { default: handler } = await import("../api/admin/prepopulate-content.ts");
process.env.CONTENT_GENERATION_SECRET = "prepopulate-race-secret";
process.env.SUPABASE_URL = "https://prepopulate-race.invalid";
process.env.SUPABASE_SERVICE_ROLE_KEY = "prepopulate-race-role";

const requests = [];
globalThis.fetch = async (input, init = {}) => {
  const url = new URL(String(input));
  const method = init.method ?? "GET";
  requests.push({ method, url, headers: init.headers, body: init.body ? JSON.parse(String(init.body)) : null });
  assert.equal(url.origin, "https://prepopulate-race.invalid");
  assert.equal(url.pathname, "/rest/v1/generated_interpretations");
  if (method === "POST") {
    assert.equal(url.searchParams.has("on_conflict"), false, "Queue prepopulation must not use merge-upsert semantics.");
    return Response.json({ code: "23505", message: "duplicate key" }, { status: 409 });
  }
  if (method === "PATCH") {
    assert.equal(url.searchParams.get("status"), "neq.LIVE", "Queue refresh must atomically exclude LIVE rows.");
    return Response.json([]);
  }
  throw new Error(`Unexpected ${method} ${url}`);
};

function request(body) {
  const stream = Readable.from([JSON.stringify(body)]);
  stream.method = "POST";
  stream.url = "/api/admin/prepopulate-content";
  stream.headers = { authorization: "Bearer prepopulate-race-secret" };
  return stream;
}
function responseHarness() {
  let resolve;
  const done = new Promise((r) => { resolve = r; });
  const response = {
    statusCode: 0,
    setHeader() {},
    end(value) { resolve({ status: this.statusCode, payload: value ? JSON.parse(value) : null }); }
  };
  return { done, response };
}

const { done, response } = responseHarness();
await handler(request({ surface: "modifier", targetDate: "2026-09-02" }), response);
const result = await done;
assert.equal(result.status, 200);
assert.equal(result.payload.inserted, 0);
assert.ok(result.payload.skippedLiveRows.length > 0, "Protected duplicate rows should be reported as skipped.");
assert.ok(requests.some((item) => item.method === "PATCH"));
assert.equal(requests.filter((item) => item.method === "POST").length, requests.filter((item) => item.method === "PATCH").length);

console.log("Content Studio prepopulation LIVE race guard passed.");
