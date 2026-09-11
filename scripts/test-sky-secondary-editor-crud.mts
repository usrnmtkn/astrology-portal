import assert from "node:assert/strict";
import { mock } from "node:test";
import { Readable } from "node:stream";
import { readGeneratedContentRows, saveGeneratedContentDraft } from "../apps/admin/src/generatedContentClient.ts";
import { skyPlacementSourceRecords } from "../api/_lib/sky-placement-sources.ts";
process.env.NODE_ENV = "test";
process.env.CONTENT_GENERATION_SECRET = "secondary-editor-test";
process.env.SUPABASE_URL = "https://secondary-editor-test.invalid";
process.env.SUPABASE_SERVICE_ROLE_KEY = "secondary-editor-test";
const { default: handler } = await import("../api/admin/generated-content.ts");
const key = "sky-placement/article/saturn/aries";
const baseline = skyPlacementSourceRecords.get(key)!;
const stored: any[] = [{ id: "secondary-row", content_key: key, status: "DRAFT", surface: "sky", mode: "in_depth", target_date: null,
  provider: "tldrastro-fallback-architecture-v3", block_type: "fallback_hook", event_type: "fallback-hook", lane: "reference",
  updated_at: "2026-09-01T00:00:00.000Z", sections: { packageRecord: baseline },
  source_snapshot: { sourcePackage: baseline.source_package, content_role: baseline.content_role }, facts: { fallbackArchitectureV3: true } }];
let writes = 0;
let responseOverride: (() => Response) | null = null;
let requestedVersions: unknown[] = [];
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init = {}) => {
  const address = String(input);
  if (address.startsWith("/api/")) {
    if (responseOverride) return responseOverride();
    const req: any = Readable.from(init.body ? [String(init.body)] : []);
    req.method = init.method ?? "GET"; req.url = address; req.headers = init.headers;
    if (req.method === "PATCH") requestedVersions.push(JSON.parse(String(init.body)).expectedUpdatedAt);
    let reply = new Response(null, { status: 500 });
    const res: any = { statusCode: 0, setHeader() {}, end(body: string) { reply = new Response(body, { status: this.statusCode, headers: { "content-type": "application/json" } }); } };
    await handler(req, res);
    return reply;
  }
  const url = new URL(address);
  assert.equal(url.origin, "https://secondary-editor-test.invalid");
  if (url.pathname.endsWith("/content_publications")) return Response.json([]);
  assert.equal(url.pathname, "/rest/v1/generated_interpretations");
  const found = stored.filter(row => [...url.searchParams].every(([name, filter]) => {
    if (["select", "order", "limit", "offset", "or", "on_conflict"].includes(name)) return true;
    if (filter === "is.null") return row[name] == null;
    if (filter.startsWith("eq.")) return String(row[name]) === filter.slice(3);
    if (filter.startsWith("neq.")) return String(row[name]) !== filter.slice(4);
    if (filter.startsWith("in.(")) return filter.slice(4, -1).split(",").map(v => v.replace(/^"|"$/g, "")).includes(row[name]);
    throw Error(`Unhandled filter ${name}=${filter}`);
  }));
  if (init.method === "PATCH") { writes++; found.forEach(row => Object.assign(row, JSON.parse(String(init.body)))); }
  else assert(!init.method || init.method === "GET", "Test must not create or publish real content");
  return Response.json(found);
};
try {
  const [opened] = await readGeneratedContentRows(`/api/admin/generated-content?status=all&visibility=all&contentKey=${key}&limit=20`, "secondary-editor-test");
  assert.equal(opened.id, "secondary-row");
  mock.timers.enable({ apis: ["Date"], now: new Date("2026-09-11T00:00:00.000Z") });
  const sections = { ...opened.sections as object, packageDraft: { ...baseline, placementArticle: "First editor fixture revision." } };
  const saved = await saveGeneratedContentDraft(opened, sections, "secondary-editor-test");
  assert.equal(requestedVersions[0], opened.updated_at);
  assert.equal((stored[0].sections.packageDraft as any).placementArticle, "First editor fixture revision.");
  const savedAgain = await saveGeneratedContentDraft(saved, { ...saved.sections as object, packageDraft: { ...baseline, placementArticle: "Second editor fixture revision." } }, "secondary-editor-test");
  assert.equal(requestedVersions[1], saved.updated_at);
  assert.notEqual(savedAgain.updated_at, saved.updated_at, "Every accepted edit needs a new version even within the same clock tick.");
  const writesBeforeConflict = writes;
  await assert.rejects(() => saveGeneratedContentDraft(opened, sections, "secondary-editor-test"), /changed after the editor was opened/);
  assert.equal(writes, writesBeforeConflict);
  assert.equal(stored[0].sections.packageDraft.placementArticle, "Second editor fixture revision.");
  responseOverride = () => new Response("<!doctype html><html>Static preview</html>");
  await assert.rejects(() => readGeneratedContentRows("/api/admin/generated-content", "secondary-editor-test"), /did not receive JSON/);
  for (const payload of [{ ok: true, rows: [null] }, { ok: false, rows: [] }, []]) {
    responseOverride = () => Response.json(payload);
    await assert.rejects(() => readGeneratedContentRows("/api/admin/generated-content", "secondary-editor-test"));
  }
  responseOverride = () => Response.json({ ok: true, rows: [{ ...savedAgain, sections: {} }] });
  await assert.rejects(() => saveGeneratedContentDraft(savedAgain, sections, "secondary-editor-test"), /did not confirm/);
  let pages = 0;
  responseOverride = () => Response.json({ ok: true, rows: [savedAgain], nextCursor: ++pages === 1 ? "next" : null });
  assert.equal((await readGeneratedContentRows("/api/admin/generated-content", "secondary-editor-test")).length, 2);
  assert.equal(pages, 2);
  responseOverride = () => Response.json({ ok: true, rows: [], nextCursor: "repeated" });
  await assert.rejects(() => readGeneratedContentRows("/api/admin/generated-content", "secondary-editor-test"), /invalid pagination cursor/);
  console.log("Secondary Sky editor contracts passed: actual-handler load/save/reopen/stale edits; malformed responses, receipts and pagination.");
} finally { mock.timers.reset(); globalThis.fetch = originalFetch; }
