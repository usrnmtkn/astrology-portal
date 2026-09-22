import assert from 'node:assert/strict';
import { isSkyDashboardRow, skyDashboardScopeFilter, isSkyListDashboardRow, skyListDashboardScopeFilter } from '../apps/web/src/services/skyDashboardScope';
import { skyPlacementSourceInSelection } from '../apps/web/src/services/skyPlacementSourceScope';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const file = join(mkdtempSync(join(tmpdir(), 'sky-dashboard-scope-')), 'reader.mjs');
await build({ stdin: { resolveDir: process.cwd(), contents: `
  export { loadFallbackArchitectureV3DashboardBundle, readCachedFallbackArchitectureV3Bundle,
    clearCachedFallbackArchitectureV3Bundle, loadLiveGeneratedContentForKeys, loadLiveGeneratedContentForSurfaces, loadFallbackArchitectureV3SkyPlacementDashboardBundle } from './apps/web/src/services/generatedContent.ts';
  export { installContentPublications } from './apps/web/src/content/contentPublicationState.ts';
  export { installFallbackArchitectureV3Bundle, installSkyCoreFallbackArchitectureV3Bundle,
    transitV3AuthoredCardForContentKey } from './apps/web/src/content/fallbackArchitectureV3Runtime.ts';
` }, bundle: true, platform: 'node', format: 'esm', outfile: file,
  define: { 'import.meta.env': '{}' }, logLevel: 'silent', plugins: [{ name: 'reader-service', setup(builder) {
    builder.onResolve({ filter: /^\.\/auth$|^\.\/contentPublications$/ }, args =>
      args.importer.endsWith('/services/generatedContent.ts') ? { path: args.path, namespace: 'fixture' } : undefined);
    builder.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: `
      export const getSupabaseClient = async () => globalThis.fixtureClient;
      export const refreshContentPublications = () => globalThis.publicationWait ?? Promise.resolve();
    ` }));
  } }] });
const snapshot = JSON.parse(readFileSync('apps/web/public/content-studio-last-known-good.json', 'utf8'));
const skyKey = 'authored/calendar-weekly-moon/taurus/variant-4';
const personalKey = 'authored/transit-aspect/venus/moon/hard';
const stationKey = 'authored/station/mercury/rx';
const rows = [skyKey, personalKey, stationKey].map(key => {
  const row = snapshot.rows.find((row: any) => row.content_key === key);
  assert(row, `Missing fixture ${key}`); return row;
});
const dependencyKeys = new Set<string>();
for (const name of ['bundled-sky-core-rows-v3', 'bundled-sky-authored-cards-v3', 'bundled-initial-reader-rows-v3']) {
  const partition = JSON.parse(readFileSync(`apps/web/src/content/fallbackArchitectureV3/${name}.json`, 'utf8'));
  for (const values of Object.values(partition)) if (Array.isArray(values)) {
    for (const row of values) if (row.contentKey) dependencyKeys.add(row.contentKey);
  }
}
assert.deepEqual(snapshot.rows.filter((row: any) => row.provider === 'tldrastro-fallback-architecture-v3'
  && dependencyKeys.has(row.content_key) && !isSkyDashboardRow(row)).map((row: any) => row.content_key), [],
  'Every shared dependency in the shipped Sky package must retain its live override');
const queries: any[] = [];
assert(skyPlacementSourceInSelection('sky-placement/article/nodes/aquarius-leo', 'north-node/aquarius,south-node/leo'));
assert(!skyPlacementSourceInSelection('sky-placement/article/nodes/pisces-virgo', 'north-node/aquarius,south-node/leo'));
assert(!skyPlacementSourceInSelection('sky-placement/article/sun/libra', 'sun/virgo'));
assert(!skyPlacementSourceInSelection('house-horoscope-core/sun/1', 'sun/virgo'));
assert(skyPlacementSourceInSelection('sky-placement/article/sun/libra'), 'Opening an article retains the full source inventory');
assert(isSkyListDashboardRow({content_key: 'fallback-vocab/planet/sun'}));
assert(!isSkyListDashboardRow({content_key: 'fallback-hook/sky-aspect-pair/sun/moon/soft'}));
class Query {
  filters: Array<(row: any) => boolean> = [];
  select() { return this; } order() { return this; } limit() { return this; }
  is(key: string, value: any) { this.filters.push(row => row[key] === value); return this; }
  abortSignal() { return this; }
  eq(key: string, value: string) { this.filters.push(row => row[key] === value); return this; }
  in(key: string, values: string[]) { this.filters.push(row => values.includes(row[key])); return this; }
  or(filter: string) {
    assert([skyDashboardScopeFilter, skyListDashboardScopeFilter].includes(filter));
    this.filters.push(filter === skyDashboardScopeFilter ? isSkyDashboardRow : isSkyListDashboardRow);
    return this;
  }
  gt(key: string, value: string) { this.filters.push(row => row[key] > value); return this; }
  async returns() { const data = rows.filter(row => this.filters.every(filter => filter(row))); queries.push(data); return { data }; }
}
const storage = new Map<string, string>();
const originalWindow = globalThis.window;
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  assert.equal(String(input), '/api/content-reader');
  const body = JSON.parse(String(init?.body));
  let query = (globalThis as any).fixtureClient.from();
  if (body.provider) query.eq('provider', body.provider);
  if (body.scope) query.or(body.scope === 'sky' ? skyDashboardScopeFilter : skyListDashboardScopeFilter);
  if (body.keys) query.in('content_key', body.keys);
  if (body.ids) query.in('id', body.ids);
  if (body.surfaces) query.in('surface', body.surfaces);
  if (body.afterId) query.gt('id', body.afterId);
  const { data, error } = await query.returns();
  if (error) return new Response('synthetic storage failure', { status: 503 });
  return Response.json({ schema: 'content-reader-row-v1', rows: data, publications: [], nextCursor: data.length === 250 ? data.at(-1).id : null });
};
Object.assign(globalThis, {
  window: Object.assign(new EventTarget(), { location: { hostname: 'reader.example' }, localStorage: { getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value), removeItem: (key: string) => storage.delete(key) } }),
  fixtureClient: { from: () => new Query(), rpc: async () => ({ data: '2026-09-21T12:00:00Z' }) }
});
try {
  const qa = await import(pathToFileURL(file).href);
  const sky = await qa.loadFallbackArchitectureV3DashboardBundle('sky');
  const all = await qa.loadFallbackArchitectureV3DashboardBundle();
  assert.deepEqual(queries.map(data => data.map((row: any) => row.content_key)), [[skyKey, stationKey], [skyKey, personalKey, stationKey]]);
  assert(sky && all);
  assert.equal(sky.transitLib.authoredCards.length, 2);
  assert.equal(all.transitLib.authoredCards.length, 3, 'A Sky cache cannot satisfy a complete reader inventory');
  await qa.loadFallbackArchitectureV3DashboardBundle('sky');
  await qa.loadFallbackArchitectureV3DashboardBundle();
  assert.equal(queries.length, 2, 'Each unchanged revision should reuse only its own partition');
  await qa.loadFallbackArchitectureV3DashboardBundle('sky-list');
  assert.deepEqual(queries.at(-1), [], 'The list must not reuse the broader article inventory');
  qa.installFallbackArchitectureV3Bundle(all);
  const changed = structuredClone(sky);
  changed.transitLib.authoredCards.find((row: any) => row.contentKey === skyKey).body = 'Fixture updated Sky passage.';
  qa.installSkyCoreFallbackArchitectureV3Bundle(changed);
  assert.equal(qa.transitV3AuthoredCardForContentKey(personalKey).body, rows[1].body,
    'Returning to Sky must preserve an already loaded personal overlay');
  assert.equal(qa.transitV3AuthoredCardForContentKey(skyKey).body, 'Fixture updated Sky passage.');
  qa.installFallbackArchitectureV3Bundle(all);
  assert.equal(qa.transitV3AuthoredCardForContentKey(skyKey).body, rows[0].body,
    'A subsequent complete inventory must supersede the partial overlay');
  qa.clearCachedFallbackArchitectureV3Bundle();
  assert.equal(qa.readCachedFallbackArchitectureV3Bundle(), null);
  assert.equal(qa.readCachedFallbackArchitectureV3Bundle('sky'), null);
  assert.equal(qa.readCachedFallbackArchitectureV3Bundle('sky-list'), null);
  const originalTimeout = AbortSignal.timeout;
  let deadlines = 0;
  AbortSignal.timeout = (ms: number) => { deadlines++; return originalTimeout(ms); };
  try {
    for (const load of [() => qa.loadLiveGeneratedContentForKeys([skyKey]), () => qa.loadLiveGeneratedContentForSurfaces(['sky'])]) {
      let release!: () => void;
      (globalThis as any).publicationWait = new Promise<void>(resolve => { release = resolve; });
      const before = deadlines;
      const request = load();
      await Promise.resolve();
      assert.equal(deadlines, before, 'Content deadlines must not run while the publication ledger is pending');
      release(); await request;
      assert.equal(deadlines, before + 1, 'The content request must still have a bounded deadline');
    }
  } finally { AbortSignal.timeout = originalTimeout; Reflect.deleteProperty(globalThis, 'publicationWait'); }
  const originalClient = (globalThis as any).fixtureClient;
  const listSource = { ...rows[0], content_key: 'sky-context/fixture-paging' };
  const pages: number[] = [];
  const pagedRows = Array.from({ length: 251 }, (_, i) => ({ ...listSource, id: `aaaaaaaa-aaaa-aaaa-aaaa-${String(i).padStart(12, '0')}` }));
  let failSecondPage = false;
  class PagedQuery extends Query {
    async returns() {
      const data = pagedRows.filter(row => this.filters.every(filter => filter(row))).slice(0, 250);
      pages.push(data.length);
      return failSecondPage && pages.length === 2 ? { data: null, error: new Error('Fixture page failure') } : { data };
    }
  }
  (globalThis as any).fixtureClient = { from: () => new PagedQuery(), rpc: originalClient.rpc };
  try {
    qa.clearCachedFallbackArchitectureV3Bundle();
    await qa.loadFallbackArchitectureV3DashboardBundle('sky-list');
    assert.deepEqual(pages, [250, 1], 'The shared pager must fetch beyond the first page using its ID cursor');
    qa.clearCachedFallbackArchitectureV3Bundle();
    pages.length = 0; failSecondPage = true;
    await assert.rejects(qa.loadFallbackArchitectureV3DashboardBundle('sky-list'), /Current Sky content/);
    assert.equal(qa.readCachedFallbackArchitectureV3Bundle('sky-list'), null, 'A failed later page must not cache a partial overlay');
  } finally { (globalThis as any).fixtureClient = originalClient; }
  const virgin = snapshot.rows.find((row: any) => row.content_key === 'sky-placement/article/sun/virgo');
  const libra = snapshot.rows.find((row: any) => row.content_key === 'sky-placement/article/sun/libra');
  assert(virgin && libra); rows.push(virgin, libra);
  const publication = (row: any, revision = 1, state = 'live') => ({ content_key:row.content_key, state, revision,
    row_id:row.id, row_updated_at:row.updated_at, updated_at:row.updated_at });
  qa.installContentPublications([publication(virgin), publication(libra)]);
  const before = queries.length;
  const selected = await qa.loadFallbackArchitectureV3SkyPlacementDashboardBundle('sun/virgo');
  assert.deepEqual(selected.rowsFile.hookRows.map((row: any) => row.contentKey), [virgin.content_key]);
  assert.equal(queries.length,before+1);
  await qa.loadFallbackArchitectureV3SkyPlacementDashboardBundle('sun/virgo');
  assert.equal(queries.length,before+1,'Unchanged publication identity reuses cached bytes');
  await qa.loadFallbackArchitectureV3SkyPlacementDashboardBundle('sun/libra');
  assert.deepEqual(queries.at(-1).map((row: any) => row.content_key),[libra.content_key],'Changing signs loads only the new selection');
  const changedPublication={...publication(virgin,2),row_updated_at:'2026-09-21T19:00:00.000Z'};
  qa.installContentPublications([changedPublication]);
  await assert.rejects(qa.loadFallbackArchitectureV3SkyPlacementDashboardBundle('sun/virgo'),/Current Sky publications/,
    'Neither a cached old row nor a stale network row may satisfy a newer publication');
  virgin.updated_at=changedPublication.row_updated_at;
  assert(await qa.loadFallbackArchitectureV3SkyPlacementDashboardBundle('sun/virgo'),'Retry can recover the exact current row');
  qa.installContentPublications([publication(virgin,3,'retired')]);
  assert.equal(await qa.loadFallbackArchitectureV3SkyPlacementDashboardBundle('sun/virgo'),null,'Retired rows must disappear from cache-backed reads');
  qa.installContentPublications([publication(virgin), publication(libra)]);
  storage.delete('tldrastro:sky-publication-rows:v2');
  rows.splice(rows.indexOf(libra), 1);
  await assert.rejects(qa.loadFallbackArchitectureV3SkyPlacementDashboardBundle('sun/virgo,sun/libra'), /Current Sky publications/,
    'One valid row must not disguise a partial response missing another required publication');
  console.log('PASS: Sky inventory filtering, isolated revision caches, shared invalidation and cross-page overlay preservation.');
} finally {
  globalThis.fetch = originalFetch;
  if (originalWindow === undefined) Reflect.deleteProperty(globalThis, 'window'); else globalThis.window = originalWindow;
  Reflect.deleteProperty(globalThis, 'fixtureClient');
}
