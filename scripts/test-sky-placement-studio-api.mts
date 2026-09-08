import { build } from "esbuild";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { skyPlacementSourceRecords } from "../api/_lib/sky-placement-sources";
process.env.NODE_ENV = "test";
const { default: handler } = await import("../api/admin/generated-content.ts");
process.env.CONTENT_GENERATION_SECRET = "sky-studio-test";
process.env.SUPABASE_URL = "https://sky-studio-test.invalid";
process.env.SUPABASE_SERVICE_ROLE_KEY = "sky-studio-test";
const stored: any[] = [];
function matches(row: any, params: URLSearchParams) {
 return [...params].every(([name, filter]) => {
  if (["on_conflict", "select", "order", "limit", "offset", "or"].includes(name)) return true;
  if (filter === "is.null") return row[name] == null;
  if (filter.startsWith("eq.")) return String(row[name]) === filter.slice(3);
  if (filter.startsWith("neq.")) return String(row[name]) !== filter.slice(4);
  if (filter.startsWith("in.(")) return filter.slice(4, -1).split(",").map(v => v.replace(/^"|"$/g, "")).includes(row[name]);
  throw Error(`Unhandled ${name}=${filter}`);
 });
}
globalThis.fetch = async (input, init = {}) => {
 const url = new URL(String(input));
 assert.equal(url.origin, "https://sky-studio-test.invalid");
 if (url.pathname === "/rest/v1/rpc/content_runtime_revision") return Response.json(new Date().toISOString());
 if (url.pathname === "/rest/v1/content_publications") return Response.json(stored.filter(row => row.status === "LIVE").map(row => ({ content_key: row.content_key, row_id: row.id, row_updated_at: row.updated_at, updated_at: row.updated_at, state: "live", revision: 1 })));
 assert.equal(url.pathname, "/rest/v1/generated_interpretations");
 const found = stored.filter(row => matches(row, url.searchParams));
 const body = init.body ? JSON.parse(String(init.body)) : null;
 if (init.method === "PATCH") { found.forEach(row => Object.assign(row, body)); return Response.json(found); }
 if (init.method === "POST") { const row = { id: `test-${stored.length}`, updated_at: new Date().toISOString(), ...body }; stored.push(row); return Response.json([row]); }
 return Response.json(found);
};
async function request(method: string, body?: any, query = "") {
 const req = Readable.from(body ? [JSON.stringify(body)] : []) as any;
 req.method = method; req.url = `/api/admin/generated-content${query}`; req.headers = { authorization: "Bearer sky-studio-test" };
 let output: any;
 const res = { statusCode: 0, setHeader() {}, end(value: string) { output = { status: this.statusCode, ...JSON.parse(value) }; } } as any;
 await handler(req, res); assert.equal(output.status, 200, JSON.stringify(output)); return output;
}
for (const [key, path] of [["sky-placement/article/saturn/aries", "placementArticle"], ["sky-placement/retrograde/saturn", "Body"]]) {
 const baseline = skyPlacementSourceRecords.get(key)!;
 const sources = await request("GET", undefined, `?contentKeys=${encodeURIComponent(key)}&status=all&visibility=all&limit=1`);
 assert.equal(sources.rows[0].sections.packageRecord[path], baseline[path]);
 let row: any = null;
 for (let version = 1; version <= 2; version++) {
  const copy = { ...(row?.sections.packageRecord ?? baseline), [path]: `Fixture approved editorial revision ${version}.` };
  const data = { ...(row ? { id: row.id, expectedUpdatedAt: row.updated_at } : { contentKey: key, surface: "sky", mode: "in_depth", status: "DRAFT", eventType: "fallback-hook", blockType: "fallback_hook", lane: "reference" }),
   headline: baseline.headline, summary: baseline.summary, body: baseline.body_you,
   sections: { ...(row?.sections ?? { packageRecord: baseline }), packageDraft: copy },
   sourceSnapshot: { ...(row?.source_snapshot ?? {}), sourcePackage: baseline.source_package, content_role: baseline.content_role },
   facts: { fallbackArchitectureV3: true }, reviewStatus: "needs_review" };
  const saved = await request(row ? "PATCH" : "POST", data);
  const revision = saved.rows[0];
  assert.equal(revision.status, "DRAFT");
  const published = await request("PATCH", { id: revision.id, expectedUpdatedAt: revision.updated_at, ownerAction: "approve-package-revision" });
  row = published.rows[0];
  assert.equal(row.status, "LIVE"); assert.equal(row.lane, "serving");
  assert.equal(row.sections.packageRecord[path], copy[path]);
  assert.equal(row.sections.packageRecord.serving_enabled, true);
  assert(!row.sections.packageDraft);
  assert(row.sections.contentStudioPublication.copySha256);
  assert.equal(row.sections.packageOriginalRecord[path], baseline[path]);
 }
}
console.log("PASS: canonical Saturn source lookup, create, edit, publish, second edit/publish, immutable originals and approval receipt.");

const bundlePath = join(tmpdir(), "sky-studio-reader-roundtrip.mjs");
await build({ bundle: true, format: "esm", platform: "node", outfile: bundlePath, logLevel: "silent",
 define: { "import.meta.env": JSON.stringify({ VITE_SUPABASE_URL: "https://sky-studio-test.invalid", VITE_SUPABASE_PUBLISHABLE_KEY: "sky-studio-test" }) },
 stdin: { loader: "ts", resolveDir: process.cwd(), contents: `
 export { loadFallbackArchitectureV3DashboardBundle } from "./apps/web/src/services/generatedContent.ts";
 export { loadSkyPlacementFallbackArchitectureV3Bundle, installFallbackArchitectureV3Bundle, skyV4ReaderRenderer } from "./apps/web/src/content/fallbackArchitectureV3Runtime.ts";
 ` }
});
const runtime = await import(pathToFileURL(bundlePath).href);
const dashboard = await runtime.loadFallbackArchitectureV3DashboardBundle();
assert(dashboard, "the actual reader loader must include canonical published sources");
runtime.installFallbackArchitectureV3Bundle(dashboard);
await runtime.loadSkyPlacementFallbackArchitectureV3Bundle();
const actual = runtime.skyV4ReaderRenderer.renderRoute({ route: "placement", planet: "saturn", sign: "aries", isRetrograde: true });
assert(actual.readerParts.filter((part: string) => part === "Fixture approved editorial revision 2.").length === 2, JSON.stringify(actual.readerParts));
console.log("PASS: API publication → actual dashboard loader → installed reader → full Saturn Rx payload.");
