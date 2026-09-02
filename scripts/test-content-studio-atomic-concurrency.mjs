#!/usr/bin/env node
import assert from "node:assert/strict";
import { Readable } from "node:stream";

process.env.NODE_ENV = "test";
process.env.CONTENT_GENERATION_SECRET = "atomic-concurrency-secret";
process.env.SUPABASE_URL = "https://atomic-concurrency.invalid";
process.env.SUPABASE_SERVICE_ROLE_KEY = "atomic-concurrency-role";

const { default: handler } = await import("../api/admin/generated-content.ts");
process.env.CONTENT_GENERATION_SECRET = "atomic-concurrency-secret";
process.env.SUPABASE_URL = "https://atomic-concurrency.invalid";
process.env.SUPABASE_SERVICE_ROLE_KEY = "atomic-concurrency-role";

const base = {
  surface: "sky", mode: "feed", event_type: "manual", target_date: null,
  status: "DRAFT", lane: "serving", review_state: null,
  headline: "", summary: "", body: "", sections: {}, facts: {}, source_snapshot: {},
  provider: "manual-admin", prompt_version: "manual-admin", block_type: "essay",
  updated_at: "2026-09-02T14:00:00.000Z"
};
const rows = new Map([
  ["edit-id", { ...base, id: "edit-id", content_key: "atomic/edit", body: "old" }],
  ["delete-id", { ...base, id: "delete-id", content_key: "atomic/delete", updated_at: "2026-09-02T14:01:00.000Z" }]
]);
let raceEdit = true;
let raceDelete = true;

function matches(row, url) {
  const expectedUpdatedAt = url.searchParams.get("updated_at");
  if (expectedUpdatedAt?.startsWith("eq.") && row.updated_at !== expectedUpdatedAt.slice(3)) return false;
  if (url.searchParams.get("status") === "neq.LIVE" && row.status === "LIVE") return false;
  return true;
}

globalThis.fetch = async (input, init = {}) => {
  const url = new URL(String(input));
  const method = init.method ?? "GET";
  assert.equal(url.origin, "https://atomic-concurrency.invalid");
  assert.equal(url.pathname, "/rest/v1/generated_interpretations");
  const id = (url.searchParams.get("id") ?? "").replace(/^eq\./u, "");

  if (method === "GET") {
    const row = rows.get(id);
    return Response.json(row ? [row] : []);
  }
  if (method === "PATCH") {
    let row = rows.get(id);
    if (!row) return Response.json([]);
    if (id === "edit-id" && raceEdit) {
      raceEdit = false;
      row = { ...row, body: "concurrent edit", updated_at: "2026-09-02T14:02:00.000Z" };
      rows.set(id, row);
    }
    if (!matches(row, url)) return Response.json([]);
    const patch = JSON.parse(String(init.body));
    const next = { ...row, ...patch };
    rows.set(id, next);
    return Response.json([next]);
  }
  if (method === "DELETE") {
    let row = rows.get(id);
    if (!row) return Response.json([]);
    if (id === "delete-id" && raceDelete) {
      raceDelete = false;
      row = { ...row, status: "LIVE", updated_at: "2026-09-02T14:03:00.000Z" };
      rows.set(id, row);
    }
    if (!matches(row, url)) return Response.json([]);
    rows.delete(id);
    return Response.json([row]);
  }
  throw new Error(`Unexpected ${method} ${url}`);
};

function request(method, url, body) {
  const stream = body === undefined ? Readable.from([]) : Readable.from([JSON.stringify(body)]);
  stream.method = method;
  stream.url = url;
  stream.headers = { authorization: "Bearer atomic-concurrency-secret" };
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
async function invoke(method, url, body) {
  const { done, response } = responseHarness();
  await handler(request(method, url, body), response);
  return done;
}

let result = await invoke("PATCH", "/api/admin/generated-content", {
  id: "edit-id",
  expectedUpdatedAt: "2026-09-02T14:00:00.000Z",
  body: "stale writer"
});
assert.equal(result.status, 409, "A writer that loses the race after the initial read must conflict.");
assert.equal(rows.get("edit-id").body, "concurrent edit");

result = await invoke(
  "DELETE",
  `/api/admin/generated-content?id=delete-id&expectedUpdatedAt=${encodeURIComponent("2026-09-02T14:01:00.000Z")}`
);
assert.equal(result.status, 409, "Delete must fail if the row becomes LIVE after the initial read.");
assert.equal(rows.get("delete-id").status, "LIVE");

console.log("Content Studio atomic concurrency guards passed.");
