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
 if (url.pathname === "/rest/v1/content_publications") return Response.json(stored.filter(row => row.status === "LIVE").map(row => ({ content_key: row.content_key, row_id: row.id, row_updated_at: row.updated_at, updated_at: row.updated_at, state: "live", revision: Date.parse(row.updated_at) })));
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
const editorSources = [["sky-placement/article/saturn/aries", "placementArticle"], ["sky-placement/retrograde/saturn", "Body"],
 ["sky-placement/article/sun/aries", "placementArticle"],
 ...[...skyPlacementSourceRecords.keys()].filter(key => key.startsWith("sky-placement/seasonal-context/")).map(key => [key, "Copy"])];
for (const [key, path] of editorSources) {
 const baseline = skyPlacementSourceRecords.get(key)!;
 const sources = await request("GET", undefined, `?contentKeys=${encodeURIComponent(key)}&status=all&visibility=all&limit=1`);
 assert.equal(sources.rows[0].sections.packageRecord[path], baseline[path]);
 let row: any = null;
 for (let version = 1; version <= 2; version++) {
  const copy = { ...(row?.sections.packageRecord ?? baseline), [path]: `During this transit, fixture approved editorial revision ${version}.` };
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
 export { refreshContentPublications } from "./apps/web/src/services/contentPublications.ts";
 export { loadFallbackArchitectureV3DashboardBundle, clearCachedFallbackArchitectureV3Bundle } from "./apps/web/src/services/generatedContent.ts";
 export { loadSkyPlacementFallbackArchitectureV3Bundle, installFallbackArchitectureV3Bundle, skyV4ReaderRenderer } from "./apps/web/src/content/fallbackArchitectureV3Runtime.ts";
 ` }
});
const runtime = await import(pathToFileURL(bundlePath).href);
const dashboard = await runtime.loadFallbackArchitectureV3DashboardBundle();
assert(dashboard, "the actual reader loader must include canonical published sources");
runtime.installFallbackArchitectureV3Bundle(dashboard);
await runtime.loadSkyPlacementFallbackArchitectureV3Bundle();
const actual = runtime.skyV4ReaderRenderer.renderRoute({ route: "placement", planet: "saturn", sign: "aries", isRetrograde: true });
assert(actual.readerParts.filter((part: string) => part === "During this transit, fixture approved editorial revision 2.").length === 2, JSON.stringify(actual.readerParts));
for (const key of [...skyPlacementSourceRecords.keys()].filter(key => key.startsWith("sky-placement/seasonal-context/"))) {
 const [, , sign, hemisphere] = key.split("/");
 const seasonal = runtime.skyV4ReaderRenderer.renderRoute({ route: "seasonal", sign, hemisphere });
 assert.deepEqual(seasonal.readerParts, ["During this transit, fixture approved editorial revision 2."]);
 const placement = runtime.skyV4ReaderRenderer.renderRoute({ route: "placement", planet: "sun", sign, seasonalContext: seasonal.readerParts.join("\n\n") });
 assert(placement.readerParts.includes("During this transit, fixture approved editorial revision 2."));
}
console.log("PASS: all twelve seasonal sources edit/publish twice through the actual API and arrive in the installed Sun reader.");
console.log("PASS: API publication → actual dashboard loader → installed reader → full Saturn Rx payload.");

// Structured evergreen sections use the same publish transaction and survive a
// second edit. All API/database state here is an isolated fixture.
const articleKey = "sky-placement/article/saturn/aries";
let evergreenRow = stored.find(row => row.content_key === articleKey && row.status === "LIVE");
for (let version = 1; version <= 2; version++) {
 const base = evergreenRow.sections.packageRecord;
 const layout = [
  { id: "extra", label: "Optional section", body: `During this transit, fixture evergreen paragraph ${version}.` },
  { id: "turn", source: "turn" }, { id: "empty", label: "Empty", body: "" }, { id: "hook", source: "hook" }, { id: "lived", source: "lived" }
 ];
 const copy = { ...base, placementArticle: "", fallback: { ...base.fallback, lived: "", sections: layout } };
 const draft = (await request("PATCH", { id: evergreenRow.id, expectedUpdatedAt: evergreenRow.updated_at, reviewStatus: "needs_review", sections: { ...evergreenRow.sections, packageDraft: copy } })).rows[0];
 evergreenRow = (await request("PATCH", { id: draft.id, expectedUpdatedAt: draft.updated_at, ownerAction: "approve-package-revision" })).rows[0];
 assert.deepEqual(evergreenRow.sections.packageRecord.fallback.sections, layout);
 assert.equal(evergreenRow.sections.packageRecord.placementArticle, "");
 assert.equal(evergreenRow.sections.packageRecord.fallback.lived, "");
 assert.equal(evergreenRow.status, "LIVE");
 assert(evergreenRow.body.includes(`During this transit, fixture evergreen paragraph ${version}.`));
}
await runtime.refreshContentPublications(true);
runtime.clearCachedFallbackArchitectureV3Bundle();
const currentDashboard = await runtime.loadFallbackArchitectureV3DashboardBundle();
runtime.installFallbackArchitectureV3Bundle(currentDashboard);
const evergreen = runtime.skyV4ReaderRenderer.renderRoute({ route: "placement", planet: "saturn", sign: "aries", isRetrograde: true });
assert.equal(evergreen.resolution, "exact-fallback");
assert(evergreen.readerParts.join("\n\n").includes("During this transit, fixture evergreen paragraph 2."));
assert(!evergreen.readerParts.join("\n\n").includes("During this transit, fixture evergreen paragraph 1."));
console.log("PASS: evergreen section API save/publish twice → real loader → reader, with empty article and optional section omission.");

// Inline variables survive the same publication and reader-loading path.
const variableCopy = "During this transit, {{planetTitle}} in {{signTitle}} is {{motion}} from {{entryDate}} to {{exitDate}}.";
for (const articleAvailable of [true, false]) {
 const base = evergreenRow.sections.packageRecord;
 const copy = { ...base, placementArticle: articleAvailable ? variableCopy : "", fallback: { ...base.fallback, sections: [{ id: "variables", label: "Variable fixture", body: variableCopy }] } };
 const draft = (await request("PATCH", { id: evergreenRow.id, expectedUpdatedAt: evergreenRow.updated_at, reviewStatus: "needs_review", sections: { ...evergreenRow.sections, packageDraft: copy } })).rows[0];
 evergreenRow = (await request("PATCH", { id: draft.id, expectedUpdatedAt: draft.updated_at, ownerAction: "approve-package-revision" })).rows[0];
 await runtime.refreshContentPublications(true);
 runtime.clearCachedFallbackArchitectureV3Bundle();
 runtime.installFallbackArchitectureV3Bundle(await runtime.loadFallbackArchitectureV3DashboardBundle());
 const rendered = runtime.skyV4ReaderRenderer.renderRoute({ route: "placement", planet: "saturn", sign: "aries", isRetrograde: true, facts: { entryDate: "Fixture entry", exitDate: "Fixture exit" } });
 assert.equal(rendered.mainBody, "During this transit, Saturn in Aries is retrograde from Fixture entry to Fixture exit.");
 assert.equal(rendered.resolution, articleAvailable ? "canonical-article" : "exact-fallback");
}
for (const token of ["{{fallback.hook}}", "{{unknown}}", "{{signTitle", "{{constructor}}"])
 await request("PATCH", { id: evergreenRow.id, expectedUpdatedAt: evergreenRow.updated_at, reviewStatus: "needs_review", sections: { ...evergreenRow.sections, packageDraft: { ...evergreenRow.sections.packageRecord, placementArticle: token } } }, "", 400);
console.log("PASS: new Sky variables save/publish in article and custom fallback → actual reader loader; invalid variables cannot save.");

// A deliberate empty layout is still a current publication. Keep that identity
// through the loader instead of exposing an older packaged article underneath.
const clearedCopy = { ...evergreenRow.sections.packageRecord, placementArticle: "", fallback: { ...evergreenRow.sections.packageRecord.fallback, sections: [] } };
const clearedDraft = (await request("PATCH", { id: evergreenRow.id, expectedUpdatedAt: evergreenRow.updated_at, reviewStatus: "needs_review", sections: { ...evergreenRow.sections, packageDraft: clearedCopy } })).rows[0];
evergreenRow = (await request("PATCH", { id: clearedDraft.id, expectedUpdatedAt: clearedDraft.updated_at, ownerAction: "approve-package-revision" })).rows[0];
await runtime.refreshContentPublications(true);
runtime.clearCachedFallbackArchitectureV3Bundle();
runtime.installFallbackArchitectureV3Bundle(await runtime.loadFallbackArchitectureV3DashboardBundle());
assert.deepEqual(runtime.skyV4ReaderRenderer.renderRoute({ route: "placement", planet: "saturn", sign: "aries" }).readerParts, []);
console.log("PASS: an empty published evergreen layout survives reload without resurrecting the package article.");

// Motion selection and new aspect variables survive the same real handler,
// publication projection, dashboard loader, and installed reader boundary.
{
 const base = evergreenRow.sections.packageRecord;
 const layout = [
  { id: "shared", label: "Shared", role: "main", depth: "standard", paragraphs: [{ id: "main", job: "Event and interpretation", phrases: [
   { id: "opening", text: "During this transit", joinBefore: "", source: "fixture-corpus#opening" },
   { id: "ending", text: "fixture shared section.", joinBefore: ", ", source: "fixture-corpus#ending" }
  ] }] },
  { id: "direct", label: "Direct", motion: "direct", body: "Fixture direct block: {{aspectsInSignCount}}." },
  { id: "rx", label: "Retrograde", motion: "retrograde", body: "Fixture retrograde block: {{aspectsWhileRetrogradeCount}}." }
 ];
 const copy = { ...base, placementArticle: "", placementArticleDirect: "During this transit, fixture direct article.", placementArticleRetrograde: "During this transit, fixture retrograde article.", fallback: { ...base.fallback, sections: layout } };
 const draft = (await request("PATCH", { id: evergreenRow.id, expectedUpdatedAt: evergreenRow.updated_at, reviewStatus: "needs_review", sections: { ...evergreenRow.sections, packageDraft: copy } })).rows[0];
 evergreenRow = (await request("PATCH", { id: draft.id, expectedUpdatedAt: draft.updated_at, ownerAction: "approve-package-revision" })).rows[0];
 assert.deepEqual(evergreenRow.sections.packageRecord.fallback.sections, layout);
 for (const invalidText of ["{{unknown}}", "{{planetTitle"]) {
  const invalid = structuredClone(evergreenRow.sections.packageRecord);
  invalid.fallback.sections[0].paragraphs[0].phrases[0].text = invalidText;
  await request("PATCH", { id: evergreenRow.id, expectedUpdatedAt: evergreenRow.updated_at, reviewStatus: "needs_review", sections: { ...evergreenRow.sections, packageDraft: invalid } }, "", 400);
 }
 await runtime.refreshContentPublications(true);
 runtime.clearCachedFallbackArchitectureV3Bundle();
 runtime.installFallbackArchitectureV3Bundle(await runtime.loadFallbackArchitectureV3DashboardBundle());
 for (const isRetrograde of [false, true]) {
  const input = { route: "placement", planet: "saturn", sign: "aries", isRetrograde, facts: { aspectsInSignCount: "3", aspectsWhileRetrogradeCount: "2" } };
  assert.equal(runtime.skyV4ReaderRenderer.renderRoute(input).mainBody, `During this transit, fixture ${isRetrograde ? "retrograde" : "direct"} article.`);
  assert.equal(runtime.skyV4ReaderRenderer.renderRoute({ ...input, articleAvailable: false }).mainBody, `During this transit, fixture shared section.\n\nFixture ${isRetrograde ? "retrograde block: 2" : "direct block: 3"}.`);
 }
 console.log("PASS: motion-specific articles, scoped blocks and aspect variables save/publish → real loader → installed reader.");
}

// V5 is saved and published atomically; drafting never activates incomplete copy.
{
 const { makeSkyIngressComposition } = await import('../apps/web/src/content/fallbackArchitectureV3/resolver/skyIngressComposition.mjs');
 const composition = makeSkyIngressComposition();
 composition.enabled = true;
 const base = structuredClone(evergreenRow.sections.packageRecord);
 const incomplete = (await request('PATCH', { id: evergreenRow.id, expectedUpdatedAt: evergreenRow.updated_at, reviewStatus: 'needs_review', sections: { ...evergreenRow.sections, packageDraft: { ...base, ingress: composition } } })).rows[0];
 await request('PATCH', { id: incomplete.id, expectedUpdatedAt: incomplete.updated_at, ownerAction: 'approve-package-revision' }, '', 400);
 for (const module of composition.modules.filter((item: any) => item.required)) for (const match of module.template.matchAll(/\{\{(\w+)\}\}/gu)) composition.sources[match[1]].text = `During this transit, fixture ${match[1]} for {{planetTitle}}.`;
 for (let revision = 0; revision < 2; revision++) {
  if (revision === 1) { composition.modules.reverse(); delete composition.sources.openingHook; composition.modules = composition.modules.filter((item: any) => item.id !== 'opening'); }
  const copy = { ...incomplete.sections.packageRecord, placementArticleDirect: '', placementArticleRetrograde: '', ingress: composition };
  const draft = (await request('PATCH', { id: incomplete.id, expectedUpdatedAt: incomplete.updated_at, reviewStatus: 'needs_review', sections: { ...incomplete.sections, packageDraft: copy } })).rows[0];
  const published = (await request('PATCH', { id: draft.id, expectedUpdatedAt: draft.updated_at, ownerAction: 'approve-package-revision' })).rows[0];
  assert.deepEqual(published.sections.packageRecord.ingress, composition);
  Object.assign(incomplete, published);
  await runtime.refreshContentPublications(true); runtime.clearCachedFallbackArchitectureV3Bundle();
  runtime.installFallbackArchitectureV3Bundle(await runtime.loadFallbackArchitectureV3DashboardBundle());
  const rendered = runtime.skyV4ReaderRenderer.renderRoute({ route: 'placement', planet: 'saturn', sign: 'aries' });
  assert.equal(rendered.resolution, 'ingress-composition');
  assert(rendered.mainBody.includes('fixture responseSentence for Saturn.'));
  assert(!rendered.mainBody.includes('{{'));
 }
 console.log('PASS: V5 incomplete draft retained and publish rejected; complete revisions and removed sources round-trip through API, publication, actual loader and reader.');
}

// Inline Writing Library phrases use the complete article even with composition disabled.
{
 const { makeSkyIngressComposition } = await import('../apps/web/src/content/fallbackArchitectureV3/resolver/skyIngressComposition.mjs');
 let row = stored.find(item => item.content_key === articleKey && item.status === 'LIVE');
 const composition = { ...makeSkyIngressComposition(), modules: [], enabled: false };
 Object.assign(composition.sources, {
  openingHook: { kind: 'placement', text: 'During this transit, fixture article opening.' },
  planetFunction: { kind: 'planet', text: 'fixture planetary function' },
  signMethod: { kind: 'sign', text: 'fixture sign method' },
  closingLine: { kind: 'placement', text: 'Fixture article final sentence.' },
  directNote: { kind: 'placement', text: 'During this transit, fixture direct {{planetTitle}}.' },
  retrogradeNote: { kind: 'placement', text: 'During this transit, fixture retrograde {{planetTitle}}.' }
 });
 const template = '{{openingHook}} {{planetTitle}} uses {{planetFunction}} with {{signMethod}}. {{closingLine}}';
 for (let revision = 1; revision <= 2; revision++) {
  composition.sources.closingLine.text = `Fixture article final sentence ${revision}.`;
  const copy = { ...row.sections.packageRecord, ingress: composition, placementArticle: template,
   placementArticleDirect: '{{directNote}} {{closingLine}}', placementArticleRetrograde: '{{retrogradeNote}} {{closingLine}}' };
  const draft = (await request('PATCH', { id: row.id, expectedUpdatedAt: row.updated_at, reviewStatus: 'needs_review', sections: { ...row.sections, packageDraft: copy } })).rows[0];
  assert.equal(draft.sections.packageDraft.placementArticle, template);
  row = (await request('PATCH', { id: draft.id, expectedUpdatedAt: draft.updated_at, ownerAction: 'approve-package-revision' })).rows[0];
  assert.equal(row.sections.packageRecord.placementArticle, template);
  assert.equal(row.sections.packageRecord.ingress.enabled, false);
  await runtime.refreshContentPublications(true); runtime.clearCachedFallbackArchitectureV3Bundle();
  runtime.installFallbackArchitectureV3Bundle(await runtime.loadFallbackArchitectureV3DashboardBundle());
  for (const isRetrograde of [false, true]) {
   const rendered = runtime.skyV4ReaderRenderer.renderRoute({ route: 'placement', planet: 'saturn', sign: 'aries', isRetrograde });
   assert.equal(rendered.mainBody, `During this transit, fixture ${isRetrograde ? 'retrograde' : 'direct'} Saturn. Fixture article final sentence ${revision}.`);
   assert.equal(rendered.resolution, 'canonical-article');
  }
 }
 const lastPublished = JSON.stringify(row.sections.packageRecord);
 let pending = row;
 for (const ingress of [undefined, { ...composition, sources: { ...composition.sources, placementOpportunity: { kind: 'placement', text: '' } } }]) {
  const copy = { ...pending.sections.packageRecord, ingress, placementArticle: '{{placementOpportunity}}', placementArticleDirect: '', placementArticleRetrograde: '' };
  const draft = (await request('PATCH', { id: pending.id, expectedUpdatedAt: pending.updated_at, reviewStatus: 'needs_review', sections: { ...pending.sections, packageDraft: copy } })).rows[0];
  pending = draft;
  assert.equal(draft.sections.packageDraft.placementArticle, '{{placementOpportunity}}');
  const rejected = await request('PATCH', { id: draft.id, expectedUpdatedAt: draft.updated_at, ownerAction: 'approve-package-revision' }, '', 400);
  assert(JSON.stringify(rejected).includes('placementOpportunity'));
  row = stored.find(item => item.id === row.id);
  assert.equal(JSON.stringify(row.sections.packageRecord), lastPublished, 'rejected publication preserves approved copy');
 }
 console.log('PASS: phrase templates and both motions save/publish twice through API/loader/reader; missing phrases cannot publish with disabled or absent composition.');
}

// Shared planet/sign edits stay at their source and require exact revision review.
{
 const { makeSkyIngressComposition } = await import('../apps/web/src/content/fallbackArchitectureV3/resolver/skyIngressComposition.mjs');
 const { sha256Text } = await import('../apps/web/src/content/fallbackArchitectureV3/resolver/contentIntegrity.mjs');
 async function saveSource(key: string, source: any, row?: any) {
  const base = row?.sections.packageRecord ?? skyPlacementSourceRecords.get(key)!;
  return (await request(row ? 'PATCH' : 'POST', {
   ...(row ? { id: row.id, expectedUpdatedAt: row.updated_at } : { contentKey: key, surface: 'sky', mode: 'in_depth', status: 'DRAFT', eventType: 'fallback-hook', blockType: 'fallback_hook', lane: 'reference' }),
   headline: base.headline, summary: base.summary, body: base.body_you,
   sections: { ...(row?.sections ?? { packageRecord: base }), packageDraft: { ...base, ...source } },
   sourceSnapshot: { ...(row?.source_snapshot ?? {}), sourcePackage: base.source_package, content_role: base.content_role },
   facts: { fallbackArchitectureV3: true }, reviewStatus: 'needs_review'
  })).rows[0];
 }
 const publish = async (draft: any) => (await request('PATCH', { id: draft.id, expectedUpdatedAt: draft.updated_at, ownerAction: 'approve-package-revision' })).rows[0];
 const library = (sources: any) => ({ ...makeSkyIngressComposition(), enabled: false, modules: [], sources });
 const planetKey = 'sky-placement/article/sun/taurus';
 const signKey = 'sky-placement/article/venus/virgo';
 const ownerKey = 'sky-placement/article/sun/virgo';
 const planetText = 'fixture shared Sun function';
 const signText = 'fixture shared Virgo method';
 let planetRow = await publish(await saveSource(planetKey, { ingress: library({ planetFunction: { kind: 'planet', text: planetText } }) }));
 await publish(await saveSource(signKey, { ingress: library({ signMethod: { kind: 'sign', text: signText } }) }));
 const references = library({
  planetFunction: { kind: 'planet', reference: { contentKey: planetKey, field: 'ingress.sources.planetFunction', sha256: sha256Text(planetText) } },
  signMethod: { kind: 'sign', reference: { contentKey: signKey, field: 'ingress.sources.signMethod', sha256: sha256Text(signText) } },
  placementPressure: { kind: 'placement', text: 'Fixture Sun in Virgo ending.' }
 });
 const template = 'During this transit, {{planetTitle}} uses {{planetFunction}} and {{signMethod}}. {{placementPressure}}';
 let ownerRow = await publish(await saveSource(ownerKey, { ingress: references, placementArticle: template, placementArticleDirect: '', placementArticleRetrograde: '' }));
 const render = async () => {
  await runtime.refreshContentPublications(true); runtime.clearCachedFallbackArchitectureV3Bundle();
  runtime.installFallbackArchitectureV3Bundle(await runtime.loadFallbackArchitectureV3DashboardBundle());
  return runtime.skyV4ReaderRenderer.renderRoute({ route: 'placement', planet: 'sun', sign: 'virgo', facts: { entryDate: 'Fixture entry', exitDate: 'Fixture exit' } });
 };
 assert.equal((await render()).mainBody, 'During this transit, Sun uses fixture shared Sun function and fixture shared Virgo method. Fixture Sun in Virgo ending.');
 const changedLibrary = library({ planetFunction: { kind: 'planet', text: 'fixture revised Sun function' } });
 const planetDraft = await saveSource(planetKey, { ingress: changedLibrary }, planetRow);
 assert((await render()).mainBody.includes(planetText), 'a source draft never alters published dependent copy');
 planetRow = await publish(planetDraft);
 const approvedOwner = JSON.stringify(ownerRow.sections.packageRecord);
 const ownerDraft = await saveSource(ownerKey, { ingress: references }, ownerRow);
 const rejected = await request('PATCH', { id: ownerDraft.id, expectedUpdatedAt: ownerDraft.updated_at, ownerAction: 'approve-package-revision' }, '', 400);
 assert.match(rejected.error, /Referenced writing changed/);
 assert.equal(JSON.stringify(stored.find(row => row.id === ownerRow.id).sections.packageRecord), approvedOwner);
 await assert.rejects(render, /Referenced writing changed/);
 references.sources.planetFunction.reference.sha256 = sha256Text(changedLibrary.sources.planetFunction.text);
 ownerRow = await publish(await saveSource(ownerKey, { ingress: references }, ownerDraft));
 assert((await render()).mainBody.includes('fixture revised Sun function'));
 assert.equal(ownerRow.sections.packageRecord.placementArticle, template);
 console.log('PASS: actual API and reader resolve Sun, Virgo and Sun-in-Virgo scopes; source drafts preserve approved copy, stale links block publication/reading, and reviewed relinking admits the new source revision.');
}
