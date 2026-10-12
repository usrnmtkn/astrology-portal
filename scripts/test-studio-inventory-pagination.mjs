import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { readStudioInventoryPages, readStudioInventoryPasses, studioInventoryPageSize, STUDIO_INVENTORY_PAGE_SIZE, STUDIO_INVENTORY_MAX_PAGES } from "../apps/admin/src/studioInventoryPagination.ts";
import { studioInventoryQuery, studioInventoryRequestPath } from "../apps/admin/src/studioSectionInventory.ts";

// Exercise the actual inventory handler and the client pager together. The
// isolated storage implements the timestamp/id cursor, including timestamp ties.
process.env.NODE_ENV = "test";
const { default: handler } = await import("../api/admin/generated-content-inventory.ts");
process.env.CONTENT_GENERATION_SECRET = "inventory-pagination-fixture";
process.env.SUPABASE_URL = "https://inventory-pagination.invalid";
process.env.SUPABASE_SERVICE_ROLE_KEY = "fixture";
const fixtureRows = Array.from({ length: 10_081 }, (_, i) => ({
  id: String(20_000 - i).padStart(8, "0"),
  content_key: `sky.aspect.fixture-${i}.sextile.mars`,
  updated_at: "2026-09-21T00:00:00Z", status: "DRAFT", lane: "reference",
  headline: `Fixture ${i}`, body: "Document must not enter the inventory.", studio_facts: {}
}));
const originalFetch = globalThis.fetch;
let storageReads = 0;
const requestedLimits = [];
globalThis.fetch = async input => {
  const url = new URL(String(input));
  assert.equal(url.origin, "https://inventory-pagination.invalid");
  assert.equal(url.pathname, "/rest/v1/generated_interpretations");
  const limit = Number(url.searchParams.get("limit"));
  requestedLimits.push(limit);
  assert.ok(limit <= 400, "Compact inventory pages remain bounded");
  assert.equal(url.searchParams.get("order"), "updated_at.desc,id.desc");
  assert.ok(!url.searchParams.get("select").split(",").includes("body"));
  const id = url.searchParams.get("or")?.match(/id\.lt\.([^)]*)/u)?.[1];
  if (id) assert.equal(url.searchParams.get("updated_at"), "lte.2026-09-21T00:00:00Z");
  const offset = id ? fixtureRows.findIndex(row => row.id === id) + 1 : 0;
  storageReads++;
  return Response.json(fixtureRows.slice(offset, offset + limit));
};
const query = studioInventoryQuery({ page: "content", categoryFilter: "Calendar Aspects", showReferenceRows: true });
async function request(cursor, limit = studioInventoryPageSize(cursor)) {
  const req = Readable.from([]);
  req.method = "GET";
  req.url = studioInventoryRequestPath({ ...query, prefixes: ["sky.aspect."] }, limit, cursor);
  req.headers = { "x-content-generation-secret": "inventory-pagination-fixture" };
  const res = { statusCode: 0, setHeader() {}, end(body) { this.payload = JSON.parse(body); } };
  await handler(req, res);
  assert.equal(res.statusCode, 200);
  return res.payload;
}
try {
  const loaded = [];
  let completions = 0;
  await readStudioInventoryPages(request, (rows, complete) => {
    loaded.push(...rows);
    if (complete) completions++;
  });
  assert.equal(storageReads, 27, "A large catalog must not require hundreds of sequential requests");
  assert.equal(requestedLimits[0], 80, "Keep the first page quick to display");
  assert.ok(requestedLimits.slice(1).every(limit => limit === 400));
  assert.deepEqual(loaded.map(row => row.id), fixtureRows.map(row => row.id));
  assert.ok(loaded.every(row => row.inventory_only && row.body === null));
  assert.equal(completions, 1);
  // An older server can still return smaller pages during a rolling deployment.
  storageReads = 0;
  const legacyRows = [];
  await readStudioInventoryPages(cursor => request(cursor, STUDIO_INVENTORY_PAGE_SIZE), rows => legacyRows.push(...rows));
  assert.equal(storageReads, 127, "The client must continue past the former 125-page cutoff");
  assert.deepEqual(legacyRows.map(row => row.id), fixtureRows.map(row => row.id));
  const capped = await request(null, 10_000);
  assert.equal(capped.rows.length, 400, "The handler must bound untrusted requested limits");
} finally { globalThis.fetch = originalFetch; }

for (const cursor of ["repeat", "", 42, {}]) {
  let completed = false;
  await assert.rejects(readStudioInventoryPages(async () => ({ rows: [], nextCursor: cursor }),
    (_rows, complete) => { completed ||= complete; }), /invalid pagination cursor/u);
  assert.equal(completed, false);
}
let page = 0;
await assert.rejects(readStudioInventoryPages(async () => ({ rows: [], nextCursor: `cursor-${++page}` }),
  (_rows, complete) => assert.equal(complete, false)), /list is incomplete/u);
assert.equal(page, STUDIO_INVENTORY_MAX_PAGES);

const controller = new AbortController();
await assert.rejects(readStudioInventoryPages(async () => {
  controller.abort();
  return { rows: ["late response"], nextCursor: null };
}, () => assert.fail("An aborted read must not emit late rows"), controller.signal), { name: "AbortError" });
let requests = 0;
await readStudioInventoryPages(async () => { requests++; return { rows: [], nextCursor: null }; },
  (rows, complete) => { assert.deepEqual(rows, []); assert.equal(complete, true); });
assert.equal(requests, 1);

// Independently paginated prefixes overlap on the wire, without reordering
// duplicate precedence or marking a partial catalog complete.
const pending = new Map();
const started = [];
const emissions = [];
const passes = readStudioInventoryPasses(["a", "b", "c", "d"], (pass, cursor) => {
  const key = `${pass}:${cursor ?? "first"}`;
  started.push(key);
  return new Promise(resolve => pending.set(key, resolve));
}, (rows, complete) => emissions.push({ rows, complete }));
const tick = () => new Promise(resolve => setImmediate(resolve));
assert.deepEqual(started, ["a:first", "b:first", "c:first"]);
pending.get("b:first")({ rows: ["b1"], nextCursor: "second" });
await tick();
assert.deepEqual(started, ["a:first", "b:first", "c:first", "b:second"]);
pending.get("c:first")({ rows: ["c1"], nextCursor: null });
await tick();
assert.equal(started.at(-1), "d:first");
pending.get("d:first")({ rows: ["d1"], nextCursor: null });
pending.get("b:second")({ rows: ["b2"], nextCursor: null });
await tick();
assert.ok(emissions.every(event => !event.complete));
pending.get("a:first")({ rows: ["a1"], nextCursor: null });
assert.deepEqual(await passes, ["a1", "b1", "b2", "c1", "d1"]);
assert.deepEqual(emissions.at(-1), { rows: ["a1", "b1", "b2", "c1", "d1"], complete: true });
assert.equal(emissions.filter(event => event.complete).length, 1);

for (const failure of ["navigation", "server"]) {
  const parent = new AbortController();
  const pending = [];
  const signals = [];
  let emitted = 0;
  const result = readStudioInventoryPasses([1, 2, 3, 4], (_pass, _cursor, signal) => {
    signals.push(signal);
    return new Promise((resolve, reject) => pending.push({ resolve, reject }));
  }, () => emitted++, parent.signal);
  const rejection = assert.rejects(result, failure === "server" ? /unavailable/ : { name: "AbortError" });
  if (failure === "navigation") {
    parent.abort();
    pending[0].resolve({ rows: ["late"], nextCursor: null });
  } else pending[0].reject(new Error("unavailable"));
  await rejection;
  assert.ok(signals.every(signal => signal.aborted), "Stop all sibling requests on navigation or failure");
  pending.slice(1).forEach(({ resolve }) => resolve({ rows: ["late"], nextCursor: "more" }));
  await tick();
  assert.equal(signals.length, 3, "Never start the queued prefix or a late continuation");
  assert.equal(emitted, 0, "Never emit late rows after cancellation/failure");
}
console.log("PASS Studio actual-handler pagination beyond 10,000 rows, compact projection, invalid/repeated cursors, page-limit failure, cancellation and empty inventories");
