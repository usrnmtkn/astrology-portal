#!/usr/bin/env node
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

process.env.NODE_ENV = "test";
process.env.CONTENT_GENERATION_SECRET = "content-studio-api-test-secret";
process.env.SUPABASE_URL = "https://content-studio-api-test.invalid";
process.env.SUPABASE_SERVICE_ROLE_KEY = "content-studio-api-test-service-role";

const { default: generatedContentHandler } = await import("../api/admin/generated-content.ts");

// The endpoint loads local development configuration during import. Reassert
// the isolated credentials so a developer's environment cannot change this
// test's authorization or database boundary.
process.env.CONTENT_GENERATION_SECRET = "content-studio-api-test-secret";
process.env.SUPABASE_URL = "https://content-studio-api-test.invalid";
process.env.SUPABASE_SERVICE_ROLE_KEY = "content-studio-api-test-service-role";

const bundleFile = path.join(os.tmpdir(), "tldrastro-content-studio-reader-api.bundle.mjs");

await build({
  bundle: true,
  define: {
    "import.meta.env": JSON.stringify({
      VITE_SUPABASE_URL: "https://content-studio-api-test.invalid",
      VITE_SUPABASE_PUBLISHABLE_KEY: "content-studio-api-test-publishable-key"
    })
  },
  entryPoints: [path.resolve("apps/web/src/services/generatedContent.ts")],
  format: "esm",
  logLevel: "silent",
  outfile: bundleFile,
  platform: "node"
});

const { loadLiveGeneratedContentForKeys } = await import(
  `${pathToFileURL(bundleFile).href}?t=${Date.now()}`
);

const contentKey = "cms/qa/content-studio-api-roundtrip";
const rowId = "content-studio-api-roundtrip-row";
let row = {
  id: rowId,
  content_key: contentKey,
  surface: "sky",
  mode: "feed",
  status: "LIVE",
  lane: "serving",
  review_state: null,
  event_type: "cms-surface-override",
  target_date: null,
  facts: {},
  knowledge_ids: [],
  source_snapshot: {
    allowedSlots: [],
    contentSystem: "cms-surface-override"
  },
  headline: "Original API headline",
  summary: "Original API summary",
  body: "Original API body.",
  sections: [],
  block_type: "essay",
  flags: [],
  provider: "manual-admin",
  prompt_version: "manual-admin",
  model: "manual",
  reviewer_notes: "",
  evergreen: false,
  evergreen_at: null,
  evergreen_by: null,
  judge_score: null,
  judge_verdict: null,
  judge_gate: null,
  judge_why: null,
  reviewed_at: "2026-08-29T12:00:00.000Z",
  published_at: "2026-08-29T12:00:00.000Z",
  updated_at: "2026-08-29T12:00:00.000Z",
  created_at: "2026-08-29T12:00:00.000Z"
};

const requests = [];

function matchesFilter(params, name, value) {
  const filter = params.get(name);
  if (!filter) return true;
  if (filter === "is.null") return value === null || value === undefined;
  if (filter.startsWith("eq.")) return String(value ?? "") === filter.slice(3);
  if (filter.startsWith("neq.")) return String(value ?? "") !== filter.slice(4);
  if (filter.startsWith("in.(") && filter.endsWith(")")) {
    const values = filter
      .slice(4, -1)
      .split(",")
      .map((item) => decodeURIComponent(item.replace(/^"|"$/gu, "")));
    return values.includes(String(value ?? ""));
  }
  throw new Error(`Unhandled test filter ${name}=${filter}`);
}

globalThis.fetch = async (input, init = {}) => {
  const url = new URL(String(input));
  const method = init.method ?? "GET";
  requests.push({ method, url: url.toString() });

  assert.equal(url.origin, "https://content-studio-api-test.invalid");
  assert.equal(url.pathname, "/rest/v1/generated_interpretations");

  if (method === "PATCH") {
    assert.equal(url.searchParams.get("id"), `eq.${rowId}`);
    const patch = JSON.parse(String(init.body));
    row = { ...row, ...patch };
    return Response.json([row]);
  }

  if (method === "GET") {
    const matches = [
      matchesFilter(url.searchParams, "id", row.id),
      matchesFilter(url.searchParams, "content_key", row.content_key),
      matchesFilter(url.searchParams, "status", row.status),
      matchesFilter(url.searchParams, "lane", row.lane),
      matchesFilter(url.searchParams, "review_state", row.review_state)
    ].every(Boolean);
    return Response.json(matches ? [row] : []);
  }

  throw new Error(`Unexpected Supabase test request: ${method} ${url}`);
};

function apiRequest(method, url, body, secret = "content-studio-api-test-secret") {
  const req = body === undefined
    ? Readable.from([])
    : Readable.from([JSON.stringify(body)]);
  req.method = method;
  req.url = url;
  req.headers = { authorization: `Bearer ${secret}` };
  return req;
}

function responseResult() {
  let resolve;
  const completed = new Promise((done) => { resolve = done; });
  const res = {
    headers: {},
    statusCode: 0,
    setHeader(name, value) { this.headers[name] = value; },
    end(value) {
      resolve({
        payload: value ? JSON.parse(value) : null,
        status: this.statusCode
      });
    }
  };
  return { completed, res };
}

async function invokeApi(method, url, body, secret) {
  const { completed, res } = responseResult();
  await generatedContentHandler(apiRequest(method, url, body, secret), res);
  return completed;
}

const unauthorized = await invokeApi(
  "PATCH",
  "/api/admin/generated-content",
  { id: rowId, body: "This edit must not persist." },
  "wrong-secret"
);
assert.equal(unauthorized.status, 401);
assert.equal(row.body, "Original API body.");

const editedCopy = {
  headline: "Edited through Content Studio",
  summary: "This summary was saved through the admin API.",
  body: "This reader-facing passage was saved through the Content Studio API."
};
const saved = await invokeApi("PATCH", "/api/admin/generated-content", {
  id: rowId,
  ...editedCopy
});

assert.equal(saved.status, 200);
assert.equal(saved.payload.ok, true);
assert.equal(saved.payload.rows[0].headline, editedCopy.headline);
assert.equal(saved.payload.rows[0].summary, editedCopy.summary);
assert.equal(saved.payload.rows[0].body, editedCopy.body);

const readBack = await invokeApi(
  "GET",
  `/api/admin/generated-content?status=all&contentKey=${encodeURIComponent(contentKey)}&limit=1`
);
assert.equal(readBack.status, 200);
assert.equal(readBack.payload.rows.length, 1);
assert.equal(readBack.payload.rows[0].body, editedCopy.body);

const readerContent = await loadLiveGeneratedContentForKeys([contentKey]);
assert.ok(readerContent.has(contentKey));
assert.equal(readerContent.get(contentKey)?.headline, editedCopy.headline);
assert.equal(readerContent.get(contentKey)?.summary, editedCopy.summary);
assert.equal(readerContent.get(contentKey)?.body, editedCopy.body);

const demoted = await invokeApi("PATCH", "/api/admin/generated-content", {
  id: rowId,
  status: "DRAFT"
});
assert.equal(demoted.status, 200);
assert.equal(demoted.payload.rows[0].status, "DRAFT");

const hiddenFromReader = await loadLiveGeneratedContentForKeys([contentKey]);
assert.equal(hiddenFromReader.size, 0, "Draft Content Studio rows must not reach the reader API.");

assert.ok(
  requests.some(({ method, url }) => method === "PATCH" && url.includes(`id=eq.${rowId}`)),
  "The Content Studio endpoint must persist edits through Supabase REST."
);
assert.ok(
  requests.some(({ method, url }) => (
    method === "GET"
    && url.includes("status=eq.LIVE")
    && url.includes("lane=eq.serving")
    && url.includes("review_state=is.null")
  )),
  "The reader must reload saved copy through the serving-only API query."
);

console.log(JSON.stringify({
  adminReadBack: readBack.payload.rows[0].body,
  contentKey,
  draftHiddenFromReader: hiddenFromReader.size === 0,
  readerReadBack: readerContent.get(contentKey)?.body,
  status: "PASS",
  unauthorizedWriteBlocked: unauthorized.status === 401
}, null, 2));
