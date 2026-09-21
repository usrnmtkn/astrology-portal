import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { readStudioInventoryPages, STUDIO_INVENTORY_PAGE_SIZE, STUDIO_INVENTORY_MAX_PAGES } from "../apps/admin/src/studioInventoryPagination.ts";
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
globalThis.fetch = async input => {
  const url = new URL(String(input));
  assert.equal(url.origin, "https://inventory-pagination.invalid");
  assert.equal(url.pathname, "/rest/v1/generated_interpretations");
  assert.equal(url.searchParams.get("limit"), String(STUDIO_INVENTORY_PAGE_SIZE));
  assert.equal(url.searchParams.get("order"), "updated_at.desc,id.desc");
  assert.ok(!url.searchParams.get("select").split(",").includes("body"));
  const id = url.searchParams.get("or")?.match(/id\.lt\.([^)]*)/u)?.[1];
  if (id) assert.equal(url.searchParams.get("updated_at"), "lte.2026-09-21T00:00:00Z");
  const offset = id ? fixtureRows.findIndex(row => row.id === id) + 1 : 0;
  storageReads++;
  return Response.json(fixtureRows.slice(offset, offset + STUDIO_INVENTORY_PAGE_SIZE));
};
const query = studioInventoryQuery({ page: "content", categoryFilter: "Calendar Aspects", showReferenceRows: true });
async function request(cursor) {
  const req = Readable.from([]);
  req.method = "GET";
  req.url = studioInventoryRequestPath({ ...query, prefixes: ["sky.aspect."] }, STUDIO_INVENTORY_PAGE_SIZE, cursor);
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
  assert.equal(storageReads, 127, "The client must continue past the former 125-page cutoff");
  assert.deepEqual(loaded.map(row => row.id), fixtureRows.map(row => row.id));
  assert.ok(loaded.every(row => row.inventory_only && row.body === null));
  assert.equal(completions, 1);
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
console.log("PASS Studio actual-handler pagination beyond 10,000 rows, compact projection, invalid/repeated cursors, page-limit failure, cancellation and empty inventories");
