import assert from 'node:assert/strict';
import { isSkyArticleDashboardRow, skyArticleDashboardScopeFilter, isSkyDashboardRow, skyDashboardScopeFilter, isSkyListDashboardRow, skyListDashboardScopeFilter } from '../apps/web/src/services/skyDashboardScope';
import { skyPlacementArticleSelection, skyPlacementSourceInSelection } from '../apps/web/src/services/skyPlacementSourceScope';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const file = join(mkdtempSync(join(tmpdir(), 'sky-dashboard-scope-')), 'reader.mjs');
await build({ stdin: { resolveDir: process.cwd(), contents: `
  export { loadFallbackArchitectureV3DashboardBundle, readCachedFallbackArchitectureV3Bundle,
    clearCachedFallbackArchitectureV3Bundle, loadContentStudioLastKnownGoodRows, loadLiveGeneratedContentForKeys, loadLiveGeneratedContentForSurfaces, loadFallbackArchitectureV3SkyPlacementDashboardBundle, prefetchColdSkyArticleRows, prefetchColdSkyContentForKeys, prefetchColdSkyPlacementRows } from './apps/web/src/services/generatedContent.ts';
  export { installContentPublications, contentPublication } from './apps/web/src/content/contentPublicationState.ts';
  export { installFallbackArchitectureV3Bundle, installSkyCoreFallbackArchitectureV3Bundle,
    transitV3AuthoredCardForContentKey } from './apps/web/src/content/fallbackArchitectureV3Runtime.ts';
` }, bundle: true, platform: 'node', format: 'esm', outfile: file,
  define: { 'import.meta.env': '{}' }, logLevel: 'silent', plugins: [{ name: 'reader-service', setup(builder) {
    builder.onResolve({ filter: /^\.\/auth$|^\.\/contentPublications$/ }, args =>
      args.importer.endsWith('/services/generatedContent.ts') ? { path: args.path, namespace: 'fixture' } : undefined);
    builder.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: `
      export const getSupabaseClient = async () => { await globalThis.fixtureClientWait; return globalThis.fixtureClient; };
      export const refreshContentPublications = () => globalThis.publicationWait ?? Promise.resolve();
      export const refreshSkyListPublications = refreshContentPublications;
      export const skyListPublicationReadStarted = () => false;
      export const contentPublicationsAvailableOnline = () => globalThis.fixturePublicationsOnline ?? true;
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
const readerRequests: any[] = [];
assert(skyPlacementSourceInSelection('sky-placement/article/nodes/aquarius-leo', 'north-node/aquarius,south-node/leo'));
assert(!skyPlacementSourceInSelection('sky-placement/article/nodes/pisces-virgo', 'north-node/aquarius,south-node/leo'));
assert(!skyPlacementSourceInSelection('sky-placement/article/sun/libra', 'sun/virgo'));
assert(!skyPlacementSourceInSelection('house-horoscope-core/sun/1', 'sun/virgo'));
assert(skyPlacementSourceInSelection('sky-placement/article/sun/libra'), 'Opening an article retains the full source inventory');
const articleSelection = skyPlacementArticleSelection('sky/placement/sun/virgo', []);
assert.equal(skyPlacementArticleSelection('sky/placement/sun', [{planet:'Sun',sign:'Virgo'}] as any), 'article:sun/virgo');
assert.equal(skyPlacementArticleSelection('sky/placement/jupiter', [{planet:'Jupiter',sign:'Leo'}] as any), 'article:jupiter/leo');
assert.equal(articleSelection, 'article:sun/virgo');
assert(skyPlacementSourceInSelection('sky-placement/article/sun/virgo', articleSelection));
assert(!skyPlacementSourceInSelection('sky-placement/article/sun/libra', articleSelection));
assert(skyPlacementSourceInSelection('house-horoscope-core/sun/virgo/house-1', articleSelection));
assert(!skyPlacementSourceInSelection('house-horoscope-core/sun/libra/house-1', articleSelection));
assert(!skyPlacementSourceInSelection('house-horoscope-core/moon/virgo/house-1', articleSelection));
assert(skyPlacementSourceInSelection('fallback-hook/sky-aspect-pair/sun/moon/soft', articleSelection));
assert.equal(skyPlacementArticleSelection('sky/retrograde/venus', [{planet:'Venus',sign:'Scorpio'}] as any), 'article:venus/scorpio');
assert(skyPlacementSourceInSelection('sky-placement/article/nodes/aquarius-leo', 'article:north-node/aquarius,south-node/leo'));
assert(skyPlacementSourceInSelection('sky-placement/article/nodes/aquarius-leo', 'article:nodes/aquarius-leo'));
assert(!skyPlacementSourceInSelection('sky-placement/article/nodes/pisces-virgo', 'article:north-node/aquarius,south-node/leo'));
assert.equal(skyPlacementArticleSelection('sky/aspect/sun/square/moon', []), '');
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
    assert([skyDashboardScopeFilter, skyListDashboardScopeFilter, skyArticleDashboardScopeFilter].includes(filter));
    this.filters.push(filter === skyDashboardScopeFilter ? isSkyDashboardRow : filter === skyArticleDashboardScopeFilter ? isSkyArticleDashboardRow : isSkyListDashboardRow);
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
  readerRequests.push(body);
  let query = (globalThis as any).fixtureClient.from();
  if (body.provider) query.eq('provider', body.provider);
  if (body.scope) query.or(body.scope === 'sky' ? skyDashboardScopeFilter : body.scope === 'sky-article' ? skyArticleDashboardScopeFilter : skyListDashboardScopeFilter);
  if (body.keys) query.in('content_key', body.keys);
  if (body.ids) query.in('id', body.ids);
  if (body.surfaces) query.in('surface', body.surfaces);
  if (body.afterId) query.gt('id', body.afterId);
  const { data, error } = await query.returns();
  if (error) return new Response('synthetic storage failure', { status: 503 });
  const response = Response.json({ schema: 'content-reader-row-v1', rows: data,
    publications: (globalThis as any).fixtureReaderPublications ?? [], nextCursor: data.length === 250 ? data.at(-1).id : null });
  await (globalThis as any).fixtureReaderResponseWait;
  return response;
};
Object.assign(globalThis, {
  window: Object.assign(new EventTarget(), { location: { hostname: 'reader.example' }, localStorage: { getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value), removeItem: (key: string) => storage.delete(key) } }),
  fixtureClient: { from: () => new Query(), rpc: async () => ({ data: '2026-09-21T12:00:00Z' }) }
});
try {
  const qa = await import(pathToFileURL(file).href);
  const [sky, sameSky] = await Promise.all([
    qa.loadFallbackArchitectureV3DashboardBundle('sky'),
    qa.loadFallbackArchitectureV3DashboardBundle('sky')
  ]);
  assert.equal(queries.length, 1, 'Concurrent mounts must share one paginated inventory load');
  assert.equal(sky, sameSky);
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
  const client = (globalThis as any).fixtureClient;
  const normalRpc = client.rpc;
  qa.clearCachedFallbackArchitectureV3Bundle('sky-list');
  let releaseListRevision!: () => void;
  client.rpc = () => new Promise(resolve => { releaseListRevision = () => resolve({ data: rows[0].updated_at }); });
  const beforeListQueries = queries.length;
  let listSettled = false;
  const coldList = qa.loadFallbackArchitectureV3DashboardBundle('sky-list');
  void coldList.then(() => { listSettled = true; });
  for (let tick = 0; queries.length === beforeListQueries && tick < 100; tick++) await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(queries.length, beforeListQueries + 1, 'Cold list rows must start before the revision RPC finishes.');
  assert.equal(listSettled, false, 'Parallel rows cannot bypass revision and manifest admission.');
  releaseListRevision(); await coldList;
  client.rpc = normalRpc;
  const oldStation = { body: rows[2].body, updated_at: rows[2].updated_at };
  const newerRevision = '2099-01-01T00:00:00Z';
  let releaseRevision!: () => void;
  client.rpc = () => new Promise(resolve => { releaseRevision = () => resolve({ data: newerRevision }); });
  const articleQueries = queries.length;
  let articleSettled = false;
  const coldArticle = qa.loadFallbackArchitectureV3DashboardBundle('sky-article');
  void coldArticle.then(() => { articleSettled = true; });
  for (let tick = 0; queries.length === articleQueries && tick < 100; tick++) await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(queries.length, articleQueries + 1, 'Cold article rows must start before the revision RPC finishes');
  assert.equal(articleSettled, false, 'Prefetched rows must not bypass the revision admission gate');
  rows[2].body = 'Synthetic newer station writing.';
  rows[2].updated_at = newerRevision;
  releaseRevision();
  const coldArticleBundle = await coldArticle;
  assert(coldArticleBundle);
  assert.equal(coldArticleBundle.transitLib.authoredCards[0].body, oldStation.body);
  assert.equal(qa.readCachedFallbackArchitectureV3Bundle('sky-article')?.version, Date.parse(oldStation.updated_at),
    'An old early row snapshot must not be cached under the newer RPC revision');
  const warmArticle = qa.loadFallbackArchitectureV3DashboardBundle('sky-article');
  for (let tick = 0; tick < 5; tick++) await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(queries.length, articleQueries + 1, 'A warm article must retain revision-first cache validation');
  releaseRevision();
  const freshArticleBundle = await warmArticle;
  assert.equal(queries.length, articleQueries + 2, 'A newer revision must refetch the early snapshot');
  assert.equal(freshArticleBundle?.transitLib.authoredCards[0].body, rows[2].body);
  client.rpc = async () => ({ data: newerRevision });
  assert.deepEqual(await qa.loadFallbackArchitectureV3DashboardBundle('sky-article'), freshArticleBundle);
  assert.equal(queries.length, articleQueries + 2, 'A matching verified revision must reuse cached rows');
  Object.assign(rows[2], oldStation);
  client.rpc = normalRpc;
  assert.deepEqual(queries.at(-1).map((row:any)=>row.content_key), [stationKey], 'Article dependencies retain shared station writing without Calendar or personal-transit inventory.');
  qa.clearCachedFallbackArchitectureV3Bundle('sky-article');
  client.rpc = () => new Promise(resolve => { releaseRevision = () => resolve({ data: newerRevision }); });
  const beforeRetirement = queries.length;
  const retiringArticle = qa.loadFallbackArchitectureV3DashboardBundle('sky-article');
  for (let tick = 0; queries.length === beforeRetirement && tick < 100; tick++) await new Promise(resolve => setTimeout(resolve, 0));
  const stationPublication = { content_key: stationKey, state: 'retired', revision: 10,
    row_id: rows[2].id, row_updated_at: rows[2].updated_at, updated_at: rows[2].updated_at };
  qa.installContentPublications([stationPublication]);
  releaseRevision();
  assert(!(await retiringArticle)?.transitLib.authoredCards.some((row:any) => row.contentKey === stationKey),
    'A retirement observed while the revision is held must exclude the early row');
  assert.equal(qa.readCachedFallbackArchitectureV3Bundle('sky-article'), null,
    'A publication change must prevent speculative cache installation');
  qa.installContentPublications([{ ...stationPublication, state: 'live', revision: 11 }]);
  qa.clearCachedFallbackArchitectureV3Bundle('sky-article');
  client.rpc = async () => ({ data: null, error: new Error('Synthetic revision RPC failure') });
  const beforeRevisionFallback = queries.length;
  assert(await qa.loadFallbackArchitectureV3DashboardBundle('sky-article'));
  assert.equal(queries.length, beforeRevisionFallback + 2,
    'An unavailable RPC must retain the version-query fallback as well as the cold row read');
  client.rpc = normalRpc;
  qa.clearCachedFallbackArchitectureV3Bundle('sky-article');
  const normalReaderFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    if (String(input) === '/api/content-reader' && JSON.parse(String(init?.body)).scope === 'sky-article') {
      return new Response('Synthetic cold row failure', { status: 500 });
    }
    return normalReaderFetch(input, init);
  };
  try {
    await qa.loadFallbackArchitectureV3DashboardBundle('sky-article');
    assert.equal(qa.readCachedFallbackArchitectureV3Bundle('sky-article'), null,
      'A failed speculative read must not cache a partial overlay');
  } finally { globalThis.fetch = normalReaderFetch; }
  assert(await qa.loadFallbackArchitectureV3DashboardBundle('sky-article'),
    'A failed speculative request must remain retryable');
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
  assert.equal(qa.readCachedFallbackArchitectureV3Bundle('sky-article'), null);
  {
    let release!: () => void, releaseClient!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    Object.assign(globalThis, { publicationWait: gate, fixturePublicationsOnline: false });
    const before = queries.length;
    const early = qa.prefetchColdSkyArticleRows(gate);
    assert(early);
    assert.equal(qa.prefetchColdSkyArticleRows(gate), early, 'Concurrent cold selections share one transport.');
    for (let tick = 0; queries.length === before && tick < 100; tick++) await new Promise(resolve => setTimeout(resolve, 0));
    assert.equal(queries.length, before + 1, 'The cold core request starts before the complete ledger resolves.');
    assert.equal(qa.readCachedFallbackArchitectureV3Bundle('sky-article'), null);
    (globalThis as any).fixtureClientWait = new Promise<void>(resolve => { releaseClient = resolve; });
    (globalThis as any).fixturePublicationsOnline = true;
    release();
    const first = qa.loadFallbackArchitectureV3DashboardBundle('sky-article', early);
    const duplicate = qa.loadFallbackArchitectureV3DashboardBundle('sky-article', early);
    await new Promise(resolve => setTimeout(resolve, 0));
    releaseClient();
    const [firstBundle, duplicateBundle] = await Promise.all([first, duplicate]);
    assert(firstBundle);
    assert.equal(firstBundle, duplicateBundle, 'A joiner must not discard the owning request while its client is delayed.');
    assert.equal(queries.length, before + 1, 'Admitting the staged page must not fetch it twice.');
    assert.equal(firstBundle.transitLib.authoredCards[0].body, oldStation.body);
    assert.equal(qa.readCachedFallbackArchitectureV3Bundle('sky-article')?.version, Date.parse(oldStation.updated_at));
    (globalThis as any).fixturePublicationsOnline = false;
    assert.equal(qa.prefetchColdSkyArticleRows(Promise.resolve()), undefined, 'A cached article keeps revision-first loading.');
    qa.clearCachedFallbackArchitectureV3Bundle();
    (globalThis as any).fixturePublicationsOnline = true;
    assert.equal(qa.prefetchColdSkyArticleRows(Promise.resolve()), undefined, 'Resolved online readers keep the existing demand-driven path.');
    Reflect.deleteProperty(globalThis, 'fixtureClientWait');
    for (const change of ['new-key', 'revision'] as const) {
      qa.clearCachedFallbackArchitectureV3Bundle();
      (globalThis as any).fixturePublicationsOnline = false;
      let releaseChanged!: () => void;
      const changedGate = new Promise<void>(resolve => { releaseChanged = resolve; });
      (globalThis as any).publicationWait = changedGate;
      const beforeChange = queries.length;
      const staged = qa.prefetchColdSkyArticleRows(changedGate);
      assert(staged);
      for (let tick = 0; queries.length === beforeChange && tick < 100; tick++) await new Promise(resolve => setTimeout(resolve, 0));
      assert.equal(queries.length, beforeChange + 1);
      const source = change === 'new-key'
        ? structuredClone(snapshot.rows.find((row: any) => row.content_key === 'authored/station/mars/rx')) : rows[2];
      assert(source);
      if (change === 'new-key') rows.push(source);
      else Object.assign(source, { body: 'Synthetic newly published complete station passage.', updated_at: newerRevision });
      qa.installContentPublications([{ content_key: source.content_key, state: 'live', revision: 50,
        row_id: source.id, row_updated_at: source.updated_at, updated_at: source.updated_at }]);
      (globalThis as any).fixturePublicationsOnline = true;
      releaseChanged();
      const current = await qa.loadFallbackArchitectureV3DashboardBundle('sky-article', staged);
      assert.equal(queries.length, beforeChange + 2, 'A new key or revision in the initial ledger requires one normal fresh read.');
      assert(current?.transitLib.authoredCards.some((row: any) => row.contentKey === source.content_key && row.body === source.body));
      if (change === 'new-key') rows.pop();
      else Object.assign(source, oldStation);
      qa.installContentPublications([{ content_key: source.content_key, state: change === 'new-key' ? 'retired' : 'live', revision: 51,
        row_id: source.id, row_updated_at: source.updated_at, updated_at: source.updated_at }]);
    }
    for (const change of ['offline-after-ready', 'newer-buffered-publication', 'other-provider'] as const) {
      qa.clearCachedFallbackArchitectureV3Bundle();
      let releaseReady!: () => void, releaseResponse!: () => void;
      const ready = new Promise<void>(resolve => { releaseReady = resolve; });
      const responseWait = new Promise<void>(resolve => { releaseResponse = resolve; });
      const currentPublication = structuredClone(qa.contentPublication(stationKey));
      const otherProviderRow = structuredClone(snapshot.rows.find((row: any) => row.content_key === 'authored/station/mars/rx'));
      Object.assign(globalThis, { publicationWait: ready, fixturePublicationsOnline: false,
        fixtureReaderResponseWait: responseWait, fixtureReaderPublications: change === 'newer-buffered-publication'
          ? [{ ...currentPublication, state: 'retired', revision: currentPublication.revision + 1 }] : [] });
      if (change === 'other-provider') {
        otherProviderRow.provider = 'synthetic-other-provider';
        rows.push(otherProviderRow);
        qa.installContentPublications([{ content_key: otherProviderRow.content_key, state: 'live', revision: 52,
          row_id: otherProviderRow.id, row_updated_at: otherProviderRow.updated_at, updated_at: otherProviderRow.updated_at }]);
      }
      const beforeChange = queries.length;
      const staged = qa.prefetchColdSkyArticleRows(ready);
      assert(staged);
      for (let tick = 0; queries.length === beforeChange && tick < 100; tick++) await new Promise(resolve => setTimeout(resolve, 0));
      assert.equal(queries.length, beforeChange + 1);
      (globalThis as any).fixturePublicationsOnline = true;
      releaseReady();
      // The readiness promise can succeed before the response body finishes.
      // Final admission must recheck live state and buffered publication data.
      for (let tick = 0; tick < 12; tick++) await Promise.resolve();
      if (change === 'offline-after-ready') (globalThis as any).fixturePublicationsOnline = false;
      (globalThis as any).fixtureReaderPublications = [];
      releaseResponse();
      const current = await qa.loadFallbackArchitectureV3DashboardBundle('sky-article', staged);
      assert.equal(queries.length, beforeChange + 2, `${change} must discard early rows and issue exactly one normal read.`);
      assert(current?.transitLib.authoredCards.some((row: any) => row.contentKey === stationKey && row.body === oldStation.body));
      assert.deepEqual(qa.contentPublication(stationKey), currentPublication,
        'Discarded transport must not install a newer retirement into the complete ledger.');
      if (change === 'other-provider') {
        assert(!current?.transitLib.authoredCards.some((row: any) => row.contentKey === otherProviderRow.content_key));
        rows.pop();
        qa.installContentPublications([{ content_key: otherProviderRow.content_key, state: 'retired', revision: 53,
          row_id: otherProviderRow.id, row_updated_at: otherProviderRow.updated_at, updated_at: otherProviderRow.updated_at }]);
      }
      for (const key of ['fixtureReaderPublications', 'fixtureReaderResponseWait']) Reflect.deleteProperty(globalThis, key);
    }
    qa.clearCachedFallbackArchitectureV3Bundle();
    for (const key of ['publicationWait', 'fixturePublicationsOnline', 'fixtureClientWait']) Reflect.deleteProperty(globalThis, key);
  }
  let releaseLedger!: () => void;
  (globalThis as any).publicationWait = new Promise<void>(resolve => { releaseLedger = resolve; });
  const beforeLedger = queries.length;
  const beforePublication = qa.loadFallbackArchitectureV3DashboardBundle('sky');
  qa.installContentPublications([{content_key: 'qa/unrelated-publication', state: 'live', revision: 1,
    row_id: null, row_updated_at: null, updated_at: '2026-10-09T00:00:00Z'}]);
  const afterPublication = qa.loadFallbackArchitectureV3DashboardBundle('sky');
  releaseLedger();
  await Promise.all([beforePublication, afterPublication]);
  Reflect.deleteProperty(globalThis, 'publicationWait');
  assert.equal(queries.length, beforeLedger + 1, 'Ledger hydration must not split one inventory load into two');
  qa.clearCachedFallbackArchitectureV3Bundle();
  const normalReturns = Query.prototype.returns;
  const releases: Array<() => void> = [];
  Query.prototype.returns = async function () {
    await new Promise<void>(resolve => releases.push(resolve));
    return normalReturns.call(this);
  };
  const untilHeld = async (count: number) => {
    for (let tick = 0; releases.length < count && tick < 100; tick++) await new Promise(resolve => setTimeout(resolve, 0));
    assert.equal(releases.length, count);
  };
  try {
    const beforeTargeted = queries.length;
    const firstTargeted = qa.loadLiveGeneratedContentForKeys([skyKey, personalKey]);
    const sameTargeted = qa.loadLiveGeneratedContentForKeys([personalKey, skyKey, skyKey]);
    await untilHeld(1);
    releases[0]();
    const [firstRows, sameRows] = await Promise.all([firstTargeted, sameTargeted]);
    assert.equal(firstRows, sameRows, 'Equivalent simultaneous key requests share one result');
    assert.equal(queries.length, beforeTargeted + 1, 'Simultaneous readers must not duplicate the same API request');
    releases.length = 0;
    const relaxed = qa.loadLiveGeneratedContentForKeys([skyKey]);
    const fresh = qa.loadLiveGeneratedContentForKeys([skyKey], { requireFresh: true });
    await untilHeld(2);
    releases.forEach(release => release());
    await Promise.all([relaxed, fresh]);
    releases.length = 0;
    const older = qa.loadFallbackArchitectureV3DashboardBundle('sky');
    await untilHeld(1);
    qa.clearCachedFallbackArchitectureV3Bundle('sky');
    const newer = qa.loadFallbackArchitectureV3DashboardBundle('sky');
    await untilHeld(2);
    releases[0](); await older;
    assert.equal(qa.readCachedFallbackArchitectureV3Bundle('sky'), null, 'Invalidated pending work cannot refill the cache');
    releases[1](); await newer;
    assert(qa.readCachedFallbackArchitectureV3Bundle('sky'), 'An old completion cannot remove the replacement request');
    qa.clearCachedFallbackArchitectureV3Bundle();
  } finally { Query.prototype.returns = normalReturns; }
  for (const scope of ['sky', 'all']) {
    await qa.loadFallbackArchitectureV3DashboardBundle(scope);
    const suffix = scope === 'all' ? '' : `:${scope}`;
    const cacheKey = `tldrastro:fallbackArchitectureV3:dashboardBundle${suffix}`;
    const versionKey = `tldrastro:fallbackArchitectureV3:dashboardBundleVersion${suffix}`;
    const valid = JSON.parse(storage.get(cacheKey)!);
    for (const invalid of [
      JSON.stringify({ ...valid, schema: 'fallback-architecture-v3-dashboard-overlay-cache-v8' }),
      JSON.stringify({ ...valid, bundledPackageVersion: 'synthetic-obsolete-package' }),
      '{invalid-json'
    ]) {
      qa.clearCachedFallbackArchitectureV3Bundle();
      storage.set(versionKey, String(valid.dashboardVersion));
      storage.set(cacheKey, invalid);
      if (scope === 'sky') {
        storage.set('tldrastro:fallbackArchitectureV3:dashboardBundleVersion', String(valid.dashboardVersion));
        storage.set('tldrastro:fallbackArchitectureV3:dashboardBundle', invalid);
      }
      const before = queries.length;
      const [fresh, shared] = await Promise.all([
        qa.loadFallbackArchitectureV3DashboardBundle(scope),
        qa.loadFallbackArchitectureV3DashboardBundle(scope)
      ]);
      assert.equal(fresh, shared, 'Stale cache recovery must retain shared in-flight work');
      assert.equal(queries.length, before + 1, 'Stale cache recovery needs one complete row read');
      const restored = qa.readCachedFallbackArchitectureV3Bundle(scope);
      assert(restored, `Rejecting an obsolete ${scope} cache must not invalidate its fresh pending replacement`);
      assert.equal(JSON.stringify(restored.bundle) === JSON.stringify(fresh), true, 'The cache must preserve the complete fresh bundle');
      assert.equal(JSON.parse(storage.get(cacheKey)!).schema, 'fallback-architecture-v3-dashboard-overlay-cache-v9');
      if (scope === 'sky') assert.equal(storage.has('tldrastro:fallbackArchitectureV3:dashboardBundle'), false);
      await qa.loadFallbackArchitectureV3DashboardBundle(scope);
      assert.equal(queries.length, before + 1, 'A recovered cache must survive the next revision-validated read');
    }
    qa.clearCachedFallbackArchitectureV3Bundle();
  }
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
  let secondPageFailure: 'none' | 'once' | 'persistent' = 'none';
  let changePublicationOnSecondPage = false;
  class PagedQuery extends Query {
    async returns() {
      const data = pagedRows.filter(row => this.filters.every(filter => filter(row))).slice(0, 250);
      pages.push(data.length);
      if (changePublicationOnSecondPage && data[0]?.id === pagedRows[250].id) {
        qa.installContentPublications([{ content_key: 'qa/paged-article-change', state: 'live', revision: 1,
          row_id: null, row_updated_at: null, updated_at: '2026-10-15T00:00:00Z' }]);
      }
      const fail = data[0]?.id === pagedRows[250].id
        && (secondPageFailure === 'persistent' || secondPageFailure === 'once' && pages.length === 2);
      return fail ? { data: null, error: new Error('Fixture page failure') } : { data };
    }
  }
  (globalThis as any).fixtureClient = { from: () => new PagedQuery(), rpc: originalClient.rpc };
  try {
    qa.clearCachedFallbackArchitectureV3Bundle();
    await qa.loadFallbackArchitectureV3DashboardBundle('sky-list');
    assert.deepEqual(pages, [250, 1], 'The shared pager must fetch beyond the first page using its ID cursor');
    qa.clearCachedFallbackArchitectureV3Bundle();
    pages.length = 0; secondPageFailure = 'once';
    await qa.loadFallbackArchitectureV3DashboardBundle('sky-list');
    assert.deepEqual(pages, [250, 1, 1], 'A temporary later-page failure retries only that page');
    qa.clearCachedFallbackArchitectureV3Bundle();
    pages.length = 0; secondPageFailure = 'persistent';
    await assert.rejects(qa.loadFallbackArchitectureV3DashboardBundle('sky-list'), /Current Sky content/);
    assert.deepEqual(pages, [250, 1, 1, 1], 'A persistent later-page failure exhausts its bounded retry');
    assert.equal(qa.readCachedFallbackArchitectureV3Bundle('sky-list'), null, 'A failed later page must not cache a partial overlay');
    qa.clearCachedFallbackArchitectureV3Bundle();
    secondPageFailure = 'none'; changePublicationOnSecondPage = true; pages.length = 0;
    const pagedArticleSource = snapshot.rows.find((row:any) => row.content_key === 'authored/station/venus/rx');
    assert(pagedArticleSource);
    for (const row of pagedRows) Object.assign(row, structuredClone(pagedArticleSource), { id: row.id });
    const pagedArticle = await qa.loadFallbackArchitectureV3DashboardBundle('sky-article');
    assert.deepEqual(pages, [250, 1], 'Cold article reads retain complete keyset pagination');
    assert(pagedArticle?.transitLib.authoredCards.some((row:any) => row.contentKey === pagedArticleSource.content_key
      && row.body === pagedArticleSource.body), 'The paginated fixture must actually admit its complete article row');
    assert.equal(qa.readCachedFallbackArchitectureV3Bundle('sky-article'), null,
      'A publication change between pages must prevent speculative cache installation');
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
  {
    const cacheKey = 'tldrastro:sky-publication-rows:v2';
    const originalSections = structuredClone(libra.sections);
    libra.sections = { ...libra.sections, packageRecord: { ...libra.sections.packageRecord, body_you: 'Synthetic complete approved passage with its original final sentence.' } };
    const marker = { content_key: '__content-publication-ledger/v1', state: 'live', revision: 1,
      row_id: null, row_updated_at: null, updated_at: libra.updated_at };
    qa.installContentPublications([marker]);
    const untilRead = async (count: number) => {
      for (let tick = 0; readerRequests.length < count && tick < 100; tick++) await new Promise(resolve => setTimeout(resolve, 0));
      assert.equal(readerRequests.length, count);
    };
    for (const change of ['unchanged', 'new-key', 'revision', 'retirement', 'newer-buffered', 'failed-ledger'] as const) {
      qa.clearCachedFallbackArchitectureV3Bundle(); storage.delete(cacheKey);
      const currentRevision = (qa.contentPublication(libra.content_key)?.revision ?? 0) + 1;
      qa.installContentPublications([publication(libra, currentRevision)]);
      const baseline = structuredClone(libra);
      let release!: () => void;
      const ready = new Promise<void>(resolve => { release = resolve; });
      Object.assign(globalThis, { publicationWait: ready, fixturePublicationsOnline: false,
        fixtureReaderPublications: [marker, publication(libra, change === 'newer-buffered' ? currentRevision + 1 : currentRevision)] });
      const before = readerRequests.length;
      const staged = qa.prefetchColdSkyPlacementRows('article:sun/libra', ready);
      assert(staged); await untilRead(before + 1);
      const query = readerRequests.at(-1);
      assert(query.keys.includes(libra.content_key), 'Canonical article body must be in known candidates.');
      assert(query.keys.includes('sky-placement/retrograde/sun'), 'Retrograde transport uses the existing planet-wide key.');
      assert(!query.ids && query.keys.length <= 200);
      assert.equal(storage.has(cacheKey), false, 'Staging cannot expose rows in the selected cache before the ledger.');
      const extra = { ...structuredClone(libra), id: 'aaaaaaaa-aaaa-aaaa-aaaa-999999999999',
        content_key: 'sky-placement/article/sun/libra/synthetic-new-variant' };
      if (change === 'new-key') { rows.push(extra); qa.installContentPublications([publication(extra, currentRevision)]); }
      if (change === 'revision') {
        libra.updated_at = '2099-10-16T18:00:00.000001Z';
        qa.installContentPublications([publication(libra, currentRevision + 1)]);
      }
      if (change === 'retirement') qa.installContentPublications([publication(libra, currentRevision + 1, 'retired')]);
      (globalThis as any).fixturePublicationsOnline = change !== 'failed-ledger';
      (globalThis as any).fixtureReaderPublications = [marker];
      release();
      const loaded = await qa.loadFallbackArchitectureV3SkyPlacementDashboardBundle('article:sun/libra', staged);
      const missingReads = readerRequests.slice(before + 1);
      if (change === 'unchanged') assert.equal(missingReads.length, 0, 'The actual API ledger marker must not reject valid staged rows.');
      if (['new-key', 'revision', 'newer-buffered', 'failed-ledger'].includes(change)) {
        assert.equal(missingReads.length, 1, 'Incomplete or rejected candidates require exactly one normal missing-ID read.');
        assert(missingReads[0].ids.length > 0);
      }
      if (change === 'retirement') assert.equal(loaded, null, 'A staged passage cannot resurrect a retired article.');
      if (change === 'new-key') {
        assert(missingReads[0].keys.includes(extra.content_key), 'A future unlisted key still loads by its exact current ID.');
        rows.splice(rows.indexOf(extra), 1);
        qa.installContentPublications([publication(extra, currentRevision + 1, 'retired')]);
      }
      if (change === 'newer-buffered') assert.equal(qa.contentPublication(libra.content_key).revision, currentRevision,
        'Discarded speculative state cannot install a newer revision.');
      Object.assign(libra, baseline);
      qa.installContentPublications([publication(libra, currentRevision + 2)]);
    }
    for (const cancelled of [false, true]) {
      let release!: () => void;
      const ready = new Promise<void>(resolve => { release = resolve; });
      Object.assign(globalThis, { fixturePublicationsOnline: false, fixtureReaderPublications: [marker, publication(libra, qa.contentPublication(libra.content_key).revision)] });
      const before = readerRequests.length;
      const staged = qa.prefetchColdSkyContentForKeys([libra.content_key], ready);
      const content = staged.rows;
      await untilRead(before + 1);
      let admitted = false;
      void content.then(() => { admitted = true; });
      await Promise.resolve(); assert.equal(admitted, false, 'Claimed candidate content remains private while admission is held.');
      if (cancelled) staged.discard();
      (globalThis as any).fixturePublicationsOnline = true; release();
      const result = await content;
      assert.equal(result.has(libra.content_key), !cancelled, 'An owned claimed request must respect subsequent route cancellation.');
    }
    const beforeOversize = readerRequests.length;
    const oversize = qa.prefetchColdSkyContentForKeys(Array.from({ length: 51 }, (_, i) => `synthetic/aspect/${i}`), Promise.resolve());
    assert.equal((await oversize.rows).size, 0);
    assert.equal(readerRequests.length, beforeOversize, 'The whole over-50 candidate batch is skipped without truncation or transport.');
    // A cache populated while transport is in flight must not wait for it or
    // duplicate its current row. Only its owning loader may cancel that claim.
    storage.set(cacheKey, JSON.stringify([libra]));
    (globalThis as any).fixturePublicationsOnline = false;
    assert.equal(qa.prefetchColdSkyPlacementRows('article:sun/libra', Promise.resolve()), undefined,
      'An existing selected cache preserves the normal warm path.');
    let claimed = false, cancelled = false;
    const complete = qa.loadFallbackArchitectureV3SkyPlacementDashboardBundle('article:sun/libra', {
      consume: () => { claimed = true; return { request: new Promise(() => {}), cancel: () => { cancelled = true; } }; },
      discard: () => { throw Error('A claimed handle cannot be discarded by a joiner'); }
    });
    assert.equal(claimed, true, 'The owner claims selected transport before its first await.');
    const cached = await complete;
    assert.equal(cancelled, true, 'Complete cached rows cancel the owned optional request without waiting.');
    assert(cached, 'The synthetic complete approved cached passage must remain packaged.');
    assert.equal(cached.rowsFile.hookRows.length, 1);
    assert.equal(JSON.parse(storage.get(cacheKey)!).filter((row: any) => row.id === libra.id).length, 1);
    storage.delete(cacheKey); qa.clearCachedFallbackArchitectureV3Bundle();
    libra.sections = originalSections;
    for (const key of ['publicationWait', 'fixturePublicationsOnline', 'fixtureReaderPublications']) Reflect.deleteProperty(globalThis, key);
  }
  rows.splice(rows.indexOf(libra), 1);
  await assert.rejects(qa.loadFallbackArchitectureV3SkyPlacementDashboardBundle('sun/virgo,sun/libra'), /Current Sky publications/,
    'One valid row must not disguise a partial response missing another required publication');
  // A cold client has no per-row browser cache. The verified offline snapshot
  // must satisfy its exact ledger while the live reader continues returning 503.
  globalThis.fetch = async input => String(input) === '/content-studio-last-known-good.json'
    ? Response.json({ schema: 'content-studio-last-known-good-v2', rowCount: 2, rows: [virgin, libra],
        publications: [publication(virgin, 4), publication(libra, 4), { content_key: '__content-publication-ledger/v1', state: 'live', revision: 1,
          row_id: null, row_updated_at: null, updated_at: virgin.updated_at }] })
    : new Response('offline', { status: 503 });
  assert.equal((await qa.loadContentStudioLastKnownGoodRows()).length, 2, "Verified recovery snapshot must load");
  const recovered = await qa.loadFallbackArchitectureV3SkyPlacementDashboardBundle('sun/virgo');
  assert.equal(recovered.rowsFile.hookRows[0].publicationRowId, virgin.id, 'Cold recovery uses the exact already-loaded offline row');
  assert.deepEqual(JSON.parse(storage.get('tldrastro:sky-publication-rows:v2')!).map((row: any) => row.content_key), [virgin.content_key],
    'A selected placement must not copy the entire offline inventory into browser storage');
  storage.set('tldrastro:sky-publication-rows:v2', JSON.stringify([{ ...virgin, updated_at: '2026-01-01T00:00:00Z' }]));
  assert(await qa.loadFallbackArchitectureV3SkyPlacementDashboardBundle('sun/virgo'),
    'An older browser row with the same ID cannot overwrite the verified current offline row');
  qa.installContentPublications([{ ...publication(virgin, 5), row_updated_at: '2026-10-01T00:00:00Z' }]);
  await assert.rejects(qa.loadFallbackArchitectureV3SkyPlacementDashboardBundle('sun/virgo'), /Current Sky publications/,
    'An older offline snapshot cannot satisfy a newer publication');
  qa.installContentPublications([publication(virgin, 6, 'retired')]);
  assert.equal(await qa.loadFallbackArchitectureV3SkyPlacementDashboardBundle('sun/virgo'), null,
    'Offline recovery cannot resurrect a retired passage');
  console.log('PASS: Sky inventory filtering, isolated revision caches, shared invalidation and cross-page overlay preservation.');
} finally {
  globalThis.fetch = originalFetch;
  if (originalWindow === undefined) Reflect.deleteProperty(globalThis, 'window'); else globalThis.window = originalWindow;
  Reflect.deleteProperty(globalThis, 'fixtureClient');
}
