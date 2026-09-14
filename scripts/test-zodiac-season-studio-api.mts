import { build } from "esbuild";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { servingPackageRecords } from "../api/_lib/content-live-status";
import { ZODIAC_SEASON_SOURCE_STARTERS } from "../apps/web/src/content/fallbackArchitectureV3/resolver/zodiacSeasonVariables.mjs";
import { skyPlacementSourceRecords } from "../api/_lib/sky-placement-sources";
process.env.NODE_ENV = "test";
const { default: handler } = await import("../api/admin/generated-content.ts");
process.env.CONTENT_GENERATION_SECRET = "sky-studio-test";
process.env.SUPABASE_URL = "https://sky-studio-test.invalid";
process.env.SUPABASE_SERVICE_ROLE_KEY = "sky-studio-test";
const stored: any[] = [];
const retired = new Set<string>();
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
 if (url.pathname === "/rest/v1/content_publications") return Response.json(stored.filter(row => row.status === "LIVE").map(row => ({ content_key: row.content_key, row_id: row.id, row_updated_at: row.updated_at, updated_at: row.updated_at, state: retired.has(row.content_key) ? "retired" : "live", revision: Date.parse(row.updated_at) })));
 assert.equal(url.pathname, "/rest/v1/generated_interpretations");
 const found = stored.filter(row => matches(row, url.searchParams));
 const body = init.body ? JSON.parse(String(init.body)) : null;
 if (init.method === "PATCH") { found.forEach(row => Object.assign(row, body)); return Response.json(found); }
 if (init.method === "POST") { const row = { id: `test-${stored.length}`, updated_at: new Date().toISOString(), ...body }; stored.push(row); return Response.json([row]); }
 return Response.json(found);
};
async function request(method: string, body?: any, query = "", expectedStatus = 200) {
 const req = Readable.from(body ? [JSON.stringify(body)] : []) as any;
 req.method = method; req.url = `/api/admin/generated-content${query}`; req.headers = { authorization: "Bearer sky-studio-test" };
 let output: any;
 const res = { statusCode: 0, setHeader() {}, end(value: string) { output = { status: this.statusCode, ...JSON.parse(value) }; } } as any;
 await handler(req, res); assert.equal(output.status, expectedStatus, JSON.stringify(output)); return output;
}

async function saveSource(baseline: any, copy: any, live?: any) {
 return (await request(live ? 'PATCH' : 'POST', {
  ...(live ? {id: live.id, expectedUpdatedAt: live.updated_at} : {contentKey: baseline.contentKey, surface: 'sky', mode: 'in_depth', status: 'DRAFT', eventType: 'fallback-hook', blockType: baseline.content_role === 'template' ? 'fallback_template' : 'fallback_hook', lane: 'reference'}),
  headline: baseline.headline, summary: baseline.summary ?? '', body: baseline.body_you ?? baseline.body ?? '',
  sections: {...(live?.sections ?? {packageRecord: baseline}), packageDraft: copy},
  sourceSnapshot: {...(live?.source_snapshot ?? {}), sourcePackage: 'tldrastro-fallback-architecture-v3', content_role: baseline.content_role},
  facts: {fallbackArchitectureV3: true}, reviewStatus: 'needs_review'
 })).rows[0];
}
async function publish(row: any, expected=200) { return request('PATCH', {id: row.id, expectedUpdatedAt: row.updated_at, ownerAction: 'approve-package-revision'}, '', expected); }
for (const source of ZODIAC_SEASON_SOURCE_STARTERS) {
 const got = await request('GET', undefined, `?contentKeys=${encodeURIComponent(source.contentKey)}&status=all&visibility=all&limit=1`);
 assert.equal(got.rows[0].sections.packageRecord.body, '');
}
const baseline = skyPlacementSourceRecords.get('sky-placement/article/sun/virgo')!;
let draft = await saveSource(baseline, {...baseline, placementArticle: '{{zodiacSeason}}\n\n{{zodiacSeasonPolarAxis}}'});
assert.equal(draft.sections.packageDraft.placementArticle, '{{zodiacSeason}}\n\n{{zodiacSeasonPolarAxis}}');
await publish(draft, 400);
const moonBaseline = skyPlacementSourceRecords.get('sky-lunation/new-moon/virgo')!;
const moonDraft = await saveSource(moonBaseline, {...moonBaseline, TLDR_What: '{{zodiacSeason}}'});
await publish(moonDraft, 400);
for (const source of ZODIAC_SEASON_SOURCE_STARTERS) {
 let value = await saveSource(source, {...source, body: `During this transit, fixture approved full season prose for ${source.sign}.\n\nFixture second paragraph.`});
 if (source.sign === 'virgo') await publish(draft, 400);
 value = (await publish(value)).rows[0];
 assert.equal(value.status, 'LIVE'); assert.equal(value.lane, 'serving');
 assert.equal(value.sections.packageRecord.body, `During this transit, fixture approved full season prose for ${source.sign}.\n\nFixture second paragraph.`);
}
const published = (await publish(draft)).rows[0];
assert.equal((await publish(moonDraft)).rows[0].sections.packageRecord.TLDR_What, '{{zodiacSeason}}');
assert.equal(published.sections.packageRecord.placementArticle, '{{zodiacSeason}}\n\n{{zodiacSeasonPolarAxis}}');
for (const key of ['fallback-template/natal.planet-in-sign', 'fallback-template/natal.angle-in-sign', 'fallback-template/transit.house', 'fallback-template/compat.same-sign', 'fallback-template/compat.cross-sign']) {
 const template = servingPackageRecords.get(key)!; assert(template, key);
 const row = await saveSource(template, {...template, body: (template.body ?? '') + '\n\n{{zodiacSeason}}\n\n{{zodiacSeasonPolarAxis}}'});
 const approved = (await publish(row)).rows[0];
 assert.equal(approved.status, 'LIVE');
 assert(approved.sections.packageRecord.body.includes('{{zodiacSeason}}'));
}
console.log('PASS: actual handler prepares all 24 shared sources, saves and publishes full prose, preserves article tokens, blocks missing/unpublished sources, and publishes sign-aware Natal, transit and compatibility templates.');

const bundlePath = join(tmpdir(), "zodiac-studio-reader-roundtrip.mjs");
await build({ bundle: true, format: "esm", platform: "node", outfile: bundlePath, logLevel: "silent",
 define: { "import.meta.env": JSON.stringify({ VITE_SUPABASE_URL: "https://sky-studio-test.invalid", VITE_SUPABASE_PUBLISHABLE_KEY: "sky-studio-test" }) },
 stdin: { loader: "ts", resolveDir: process.cwd(), contents: `
 export { refreshContentPublications } from "./apps/web/src/services/contentPublications.ts";
 export { loadFallbackArchitectureV3DashboardBundle, clearCachedFallbackArchitectureV3Bundle } from "./apps/web/src/services/generatedContent.ts";
 export { loadSkyPlacementFallbackArchitectureV3Bundle, loadDeferredFallbackArchitectureV3Bundle, installFallbackArchitectureV3Bundle, skyV4ReaderRenderer, fallbackRendererV3 } from "./apps/web/src/content/fallbackArchitectureV3Runtime.ts";
 ` }
});
const runtime = await import(pathToFileURL(bundlePath).href);
const dashboard = await runtime.loadFallbackArchitectureV3DashboardBundle();
assert(dashboard, "the actual reader loader must include canonical published sources");
runtime.installFallbackArchitectureV3Bundle(dashboard);
await runtime.loadSkyPlacementFallbackArchitectureV3Bundle();
await runtime.loadDeferredFallbackArchitectureV3Bundle();

const input = {route: 'placement', planet: 'sun', sign: 'virgo'};
const firstBody = runtime.skyV4ReaderRenderer.renderRoute(input).mainBody;
assert(runtime.fallbackRendererV3.renderNatalAngle({angle: 'ascendant', sign: 'virgo', voice: 'you'}).body.includes('full season prose for virgo'));
assert(firstBody.includes('full season prose for virgo')); assert(!firstBody.includes('{{'));
const sharedLive = stored.find(row => row.content_key === 'fallback-hook/zodiac-season/virgo' && row.status === 'LIVE');
const changed = await saveSource(sharedLive.sections.packageRecord, {...sharedLive.sections.packageRecord, body: 'During this transit, fixture new approved season prose.\n\nFixture preserved second paragraph.'}, sharedLive);
await runtime.refreshContentPublications(true); runtime.clearCachedFallbackArchitectureV3Bundle();
runtime.installFallbackArchitectureV3Bundle(await runtime.loadFallbackArchitectureV3DashboardBundle());
assert.equal(runtime.skyV4ReaderRenderer.renderRoute(input).mainBody, firstBody, 'Shared draft must not change reader copy');
await publish(changed);
await runtime.refreshContentPublications(true); runtime.clearCachedFallbackArchitectureV3Bundle();
runtime.installFallbackArchitectureV3Bundle(await runtime.loadFallbackArchitectureV3DashboardBundle());
assert(runtime.fallbackRendererV3.renderNatalAngle({angle: 'ascendant', sign: 'virgo', voice: 'you'}).body.includes('new approved season prose.'));
assert(runtime.skyV4ReaderRenderer.renderRoute(input).mainBody.includes('new approved season prose.\n\nFixture preserved second paragraph.'));
assert.equal(published.sections.packageRecord.placementArticle, '{{zodiacSeason}}\n\n{{zodiacSeasonPolarAxis}}');
console.log('PASS: actual publication -> dashboard loader -> shipped Sky reader, source drafts remain isolated and an explicit source publication refreshes referenced prose.');

// A source still marked LIVE in storage cannot bypass its retired publication.
retired.add('fallback-hook/zodiac-season/virgo');
const currentArticle = stored.find(row => row.id === published.id);
const retiredDraft = await saveSource(currentArticle.sections.packageRecord, {...currentArticle.sections.packageRecord, placementArticle: 'During this transit, {{zodiacSeason}}'}, currentArticle);
await publish(retiredDraft, 400);
retired.clear();
// Source drafts use the same exact-version conflict check as canonical articles.
const sourceLive = stored.find(row => row.content_key === 'fallback-hook/zodiac-season/virgo' && row.status === 'LIVE');
const competingDraft = await saveSource(sourceLive.sections.packageRecord, {...sourceLive.sections.packageRecord, body: 'Fixture proposed version.'}, sourceLive);
sourceLive.updated_at = new Date(Date.parse(sourceLive.updated_at) + 1000).toISOString();
const newerBody = sourceLive.sections.packageRecord.body;
await publish(competingDraft, 409);
assert.equal(sourceLive.sections.packageRecord.body, newerBody);
console.log('PASS: retired shared publications and competing source revisions cannot publish or overwrite current prose.');
