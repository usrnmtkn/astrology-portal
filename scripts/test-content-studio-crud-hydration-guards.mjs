#!/usr/bin/env node
import assert from "node:assert/strict";
import { Readable } from "node:stream";

process.env.NODE_ENV = "test";
process.env.CONTENT_GENERATION_SECRET = "crud-guard-secret";
process.env.SUPABASE_URL = "https://crud-guard.invalid";
process.env.SUPABASE_SERVICE_ROLE_KEY = "crud-guard-service-role";

const { default: handler } = await import("../api/admin/generated-content.ts");
process.env.CONTENT_GENERATION_SECRET = "crud-guard-secret";
process.env.SUPABASE_URL = "https://crud-guard.invalid";
process.env.SUPABASE_SERVICE_ROLE_KEY = "crud-guard-service-role";

const base = {
  surface: "sky", mode: "feed", event_type: "manual", target_date: null,
  headline: "", summary: "", sections: {}, facts: {}, source_snapshot: {},
  knowledge_ids: [], block_type: "essay", flags: [], provider: "manual-admin",
  prompt_version: "manual-admin", model: "manual", reviewer_notes: "",
  evergreen: false, evergreen_at: null, evergreen_by: null,
  judge_score: null, judge_verdict: null, judge_gate: null, judge_why: null,
  reviewed_at: null, published_at: null, created_at: "2026-09-02T10:00:00.000Z"
};
let rows = new Map([
  ["draft-id", { ...base, id: "draft-id", content_key: "crud/draft", status: "DRAFT", lane: "serving", review_state: "EDITORIAL_REVIEW_REQUIRED", body: "draft old", updated_at: "2026-09-02T10:00:00.000Z" }],
  ["reference-id", { ...base, id: "reference-id", content_key: "crud/reference", status: "DRAFT", lane: "reference", review_state: null, body: "reference", updated_at: "2026-09-02T10:01:00.000Z" }],
  ["sample-id", { ...base, id: "sample-id", content_key: "sample-you-crud", surface: "you", status: "DRAFT", lane: "serving", review_state: null, body: "sample", updated_at: "2026-09-02T10:02:00.000Z" }],
  ["live-id", { ...base, id: "live-id", content_key: "crud/live", status: "LIVE", lane: "serving", review_state: null, body: "live", updated_at: "2026-09-02T10:03:00.000Z" }]
]);
const requests = [];
const pageRows = [
  { ...base, id: "page-b", content_key: "page/b", status: "DRAFT", lane: "serving", review_state: null, body: "b", updated_at: "2026-09-02T12:00:00.000Z" },
  { ...base, id: "page-a", content_key: "page/a", status: "DRAFT", lane: "serving", review_state: null, body: "a", updated_at: "2026-09-02T11:00:00.000Z" }
];

function targetKey(row) { return [row.content_key, row.target_date ?? "", row.mode].join("|"); }

globalThis.fetch = async (input, init = {}) => {
  const url = new URL(String(input));
  const method = init.method ?? "GET";
  requests.push({ method, url: url.toString(), body: init.body ? JSON.parse(String(init.body)) : null });
  assert.equal(url.origin, "https://crud-guard.invalid");
  assert.equal(url.pathname, "/rest/v1/generated_interpretations");

  if (method === "GET") {
    const idFilter = url.searchParams.get("id");
    if (idFilter?.startsWith("eq.")) {
      const row = rows.get(idFilter.slice(3));
      return Response.json(row ? [row] : []);
    }
    const cursor = url.searchParams.get("or") ?? "";
    return Response.json(cursor.includes("updated_at.lt") ? [pageRows[1]] : pageRows);
  }
  if (method === "PATCH") {
    const id = (url.searchParams.get("id") ?? "").replace(/^eq\./u, "");
    const existing = rows.get(id);
    if (!existing) return Response.json([]);
    const patch = JSON.parse(String(init.body));
    const next = { ...existing, ...patch, updated_at: "2026-09-02T13:00:00.000Z" };
    rows.set(id, next);
    return Response.json([next]);
  }
  if (method === "DELETE") {
    const id = (url.searchParams.get("id") ?? "").replace(/^eq\./u, "");
    const existing = rows.get(id);
    if (!existing) return Response.json([]);
    rows.delete(id);
    return Response.json([existing]);
  }
  if (method === "POST") {
    assert.equal(url.searchParams.has("on_conflict"), false, "Single create must not use upsert semantics.");
    const created = JSON.parse(String(init.body));
    const duplicate = [...rows.values()].find((row) => targetKey(row) === targetKey(created));
    if (duplicate) return Response.json({ code: "23505", message: "duplicate key" }, { status: 409 });
    const next = { ...base, ...created, id: "created-id", updated_at: "2026-09-02T13:30:00.000Z", created_at: "2026-09-02T13:30:00.000Z" };
    rows.set(next.id, next);
    return Response.json([next]);
  }
  throw new Error(`Unexpected ${method} ${url}`);
};

function req(method, url, body) {
  const stream = body === undefined ? Readable.from([]) : Readable.from([JSON.stringify(body)]);
  stream.method = method; stream.url = url; stream.headers = { authorization: "Bearer crud-guard-secret" };
  return stream;
}
function res() {
  let resolve;
  const done = new Promise((r) => { resolve = r; });
  const response = { statusCode: 0, setHeader() {}, end(value) { resolve({ status: this.statusCode, payload: value ? JSON.parse(value) : null }); } };
  return { done, response };
}
async function invoke(method, url, body) {
  const { done, response } = res();
  await handler(req(method, url, body), response);
  return done;
}

let result = await invoke("PATCH", "/api/admin/generated-content", { id: "missing", body: "x" });
assert.equal(result.status, 404);
result = await invoke("DELETE", "/api/admin/generated-content?id=missing");
assert.equal(result.status, 404);

result = await invoke("PATCH", "/api/admin/generated-content", { id: "reference-id", status: "LIVE" });
assert.equal(result.status, 409, "LIVE + reference must be rejected.");
assert.equal(rows.get("reference-id").status, "DRAFT");

result = await invoke("PATCH", "/api/admin/generated-content", { id: "sample-id", status: "LIVE" });
assert.notEqual(result.status, 200, "Partial PATCH must not publish an existing sample row.");

result = await invoke("PATCH", "/api/admin/generated-content", { id: "draft-id", expectedUpdatedAt: "2026-09-02T00:00:00.000Z", body: "stale overwrite" });
assert.equal(result.status, 409);
assert.equal(rows.get("draft-id").body, "draft old");

result = await invoke("PATCH", "/api/admin/generated-content", { id: "draft-id", expectedUpdatedAt: "2026-09-02T10:00:00.000Z", body: "fresh edit" });
assert.equal(result.status, 200);
assert.equal(rows.get("draft-id").body, "fresh edit");

result = await invoke("DELETE", "/api/admin/generated-content?id=live-id&expectedUpdatedAt=2026-09-02T10%3A03%3A00.000Z");
assert.equal(result.status, 409, "Published content must not hard-delete.");
assert.ok(rows.has("live-id"));

result = await invoke("PATCH", "/api/admin/generated-content", { id: "live-id", expectedUpdatedAt: "2026-09-02T10:03:00.000Z", status: "DRAFT" });
assert.equal(result.status, 200);
const demotedVersion = result.payload.rows[0].updated_at;
result = await invoke("DELETE", `/api/admin/generated-content?id=live-id&expectedUpdatedAt=${encodeURIComponent(demotedVersion)}`);
assert.equal(result.status, 200);
assert.equal(rows.has("live-id"), false);

result = await invoke("POST", "/api/admin/generated-content", {
  contentKey: "crud/draft", surface: "sky", mode: "feed", eventType: "manual", body: "must not replace"
});
assert.equal(result.status, 409, "Duplicate Create must conflict rather than overwrite.");
assert.equal(rows.get("draft-id").body, "fresh edit");

result = await invoke("POST", "/api/admin/generated-content", {
  contentKey: "crud/new-reference-live", surface: "sky", mode: "feed", status: "LIVE", lane: "reference", eventType: "manual", body: "no"
});
assert.equal(result.status, 409);

const firstPage = await invoke("GET", "/api/admin/generated-content?status=all&visibility=all&limit=2");
assert.equal(firstPage.status, 200);
assert.ok(firstPage.payload.nextCursor);
const secondPage = await invoke("GET", `/api/admin/generated-content?status=all&visibility=all&limit=2&cursor=${encodeURIComponent(firstPage.payload.nextCursor)}`);
assert.equal(secondPage.status, 200);
const cursorRequest = requests.map((item) => ({ ...item, parsed: new URL(item.url) })).find((item) => item.method === "GET" && (item.parsed.searchParams.get("or") ?? "").includes("updated_at.lt"));
assert.ok(cursorRequest, "Second inventory page must use a stable updated_at/id cursor.");
assert.equal(cursorRequest.parsed.searchParams.get("offset"), "0");

console.log("Content Studio CRUD and hydration guards passed.");
