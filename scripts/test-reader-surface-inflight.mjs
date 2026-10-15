import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { READER_ROW_SCHEMA } from '../apps/web/src/content/readerRowSchema.mjs';

const root = process.cwd();
const symbol = Symbol.for('tldrastro.test.reader-surface-inflight');
assert.equal(globalThis[symbol], undefined);
const sourceRef = process.argv.find(value => value.startsWith('--source-ref='))?.slice(13);
if (sourceRef) assert.match(sourceRef, /^[a-f0-9]{40}$/u);
const actualModule = join(root, 'apps/web/src/services/generatedContent.ts');
const originalSource = sourceRef ? execFileSync('git', ['show', `${sourceRef}:apps/web/src/services/generatedContent.ts`], { cwd: root, encoding: 'utf8' }) : undefined;
const cache = join(root, 'node_modules/.cache/tldrastro');
mkdirSync(cache, { recursive: true });
const temporary = mkdtempSync(join(cache, 'reader-surface-inflight-'));
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
const ledgerGate = deferred();
const mainKey = 'cms/reader-surface/approved';
const vocabularyKey = 'fallback-vocab/reader-surface-fixture';
const markerKey = '__content-publication-ledger/v1';
const stamp = revision => `2026-10-15T00:00:0${revision}.000Z`;
const id = (revision, index) => `00000000-0000-4000-8000-${String(revision * 10 + index).padStart(12, '0')}`;
let revision = 1, retired = false, holdNext = null, failures = 0;
const publications = () => [{ content_key: markerKey, state: 'live', revision: 1, row_id: null, row_updated_at: null, updated_at: stamp(1) },
  ...[mainKey, vocabularyKey].map((content_key, index) => ({ content_key, state: index === 0 && retired ? 'retired' : 'live', revision,
    row_id: id(revision, index), row_updated_at: stamp(revision), updated_at: stamp(revision) }))];
const row = (content_key, index) => ({ id: id(revision, index), content_key, updated_at: stamp(revision), surface: index === 0 ? 'you' : 'modifier',
  mode: 'article', status: 'LIVE', lane: 'serving', review_state: null, target_date: null,
  headline: null, summary: null, body: `Synthetic complete approved opening revision ${revision}. Synthetic final sentence revision ${revision}.`,
  sections: {}, source_snapshot: { contentType: 'manual' } });
const rows = () => [row(mainKey, 0), row(vocabularyKey, 1)];
const requests = [], unexpected = [];
let offlineReads = 0;
const originalFetch = globalThis.fetch;
const state = { client: { from(table) {
  assert.equal(table, 'content_publications');
  let lower, upper, after;
  const query = { select() { return query; }, order() { return query; }, limit() { return query; }, retry(value) { assert.equal(value, false); return query; },
    gte(_key, value) { lower = value; return query; }, lt(_key, value) { upper = value; return query; }, gt(_key, value) { after = value; return query; },
    async abortSignal() { await ledgerGate.promise; return { data: publications().filter(item => (!lower || item.content_key >= lower)
      && (!upper || item.content_key < upper) && (!after || item.content_key > after)), error: null }; } };
  return query;
} } };
const onlineClient = state.client;
async function waitForRequests(count) {
  const deadline = performance.now() + 3000;
  while (requests.length < count && performance.now() < deadline) await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(requests.length, count, `Expected exactly ${count} actual reader transports before the scheduling deadline`);
}
try {
  globalThis[symbol] = state;
  globalThis.fetch = async (input, init) => {
    if (String(input) === '/content-studio-last-known-good.json') {
      offlineReads++;
      return Response.json({ schema: 'content-studio-last-known-good-v2', rows: rows(), rowCount: 2, publications: publications() });
    }
    if (String(input) !== '/api/content-reader') { unexpected.push(String(input)); throw Error('Unexpected fixture destination'); }
    assert.equal(init.method, 'POST'); assert.equal(init.cache, 'no-store'); assert(init.signal instanceof AbortSignal);
    const query = JSON.parse(String(init.body));
    requests.push({ query, signal: init.signal });
    if (failures-- > 0) return new Response('Synthetic unavailable', { status: 503 });
    const snapshotRows = rows().filter(item => query.surfaces.includes(item.surface)
      && !(retired && item.content_key === mainKey) && (!query.vocabularyOnly || item.content_key.startsWith('fallback-vocab/')));
    const keys = new Set(snapshotRows.map(item => item.content_key));
    const snapshot = { schema: READER_ROW_SCHEMA, rows: snapshotRows,
      publications: publications().filter(item => item.content_key === markerKey || keys.has(item.content_key)), nextCursor: null };
    const gate = holdNext; holdNext = null;
    if (gate) await gate.promise;
    return Response.json(snapshot);
  };
  const built = await build({ stdin: { contents: `export {loadLiveGeneratedContentForSurfaces} from './apps/web/src/services/generatedContent.ts';
    export {installContentPublications} from './apps/web/src/content/contentPublicationState.ts';`, resolveDir: root, loader: 'ts' },
    bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent',
    plugins: [{ name: 'isolated-surface-reader', setup(builder) {
      if (originalSource) builder.onLoad({ filter: /\/generatedContent\.ts$/ }, args => args.path === actualModule
        ? { contents: originalSource, loader: 'ts', resolveDir: dirname(actualModule) } : undefined);
      builder.onResolve({ filter: /^\.\/auth$/ }, args => args.importer.includes('/services/') ? { path: 'auth', namespace: 'surface-fixture' } : undefined);
      builder.onLoad({ filter: /.*/, namespace: 'surface-fixture' }, () => ({
        contents: `export async function getSupabaseClient(){return globalThis[Symbol.for('tldrastro.test.reader-surface-inflight')].client}`, loader: 'js' }));
    } }] });
  const modulePath = join(temporary, 'actual-module.mjs'); writeFileSync(modulePath, built.outputFiles[0].text);
  const api = await import(pathToFileURL(modulePath).href);
  const load = (surfaces = ['natal', 'you'], date = '2026-10-15', preview = 'normal', vocabulary = false) =>
    api.loadLiveGeneratedContentForSurfaces(surfaces, date, preview, vocabulary);
  const body = value => value.get(mainKey)?.body;

  // Both calls must cross the complete initial ledger before attaching active work.
  holdNext = deferred(); const firstGate = holdNext;
  const requested = ['you', 'natal'];
  const first = load(requested), duplicate = load(['natal', 'you', 'modifier']);
  await Promise.resolve(); assert.equal(requests.length, 0);
  ledgerGate.resolve(); await waitForRequests(1);
  assert.deepEqual(requested, ['you', 'natal'], 'Canonical identity must not mutate a caller array');
  assert.deepEqual(requests[0].query.surfaces, ['you', 'natal', 'modifier'], 'Wire order remains unchanged');
  firstGate.resolve(); const [one, shared] = await Promise.all([first, duplicate]);
  assert.equal(body(one), 'Synthetic complete approved opening revision 1. Synthetic final sentence revision 1.');
  assert.equal(body(shared), body(one)); assert.equal(requests.length, 1);
  await load(); assert.equal(requests.length, 2, 'Settled responses must never remain in the pending cache');

  const beforeDimensions = requests.length;
  await Promise.all([load(['natal', 'you'], '2026-10-16'), load(['natal', 'you'], '2026-10-15', 'emergency-floor'),
    load(['natal', 'you'], '2026-10-15', 'normal', true), load(['relationship'])]);
  assert.equal(requests.length, beforeDimensions + 4, 'Date, preview, vocabulary and effective surface identities remain independent');

  const beforeSky = requests.length;
  holdNext = deferred(); const skyGate = holdNext;
  const skyOne = load(['sky'], '2026-10-15'), skySame = load(['you', 'sky'], '2026-10-16');
  await waitForRequests(beforeSky + 1);
  assert.deepEqual(requests.at(-1).query.surfaces, ['sky', 'modifier', 'you']);
  assert.equal(requests.at(-1).query.targetDate, undefined, 'Existing Sky date omission stays unchanged');
  skyGate.resolve(); await Promise.all([skyOne, skySame]);
  assert.equal(requests.length, beforeSky + 1, 'Equivalent effective Sky queries can share while their ignored dates differ');

  const beforeGeneration = requests.length;
  holdNext = deferred(); const oldGate = holdNext; const old = load(); await waitForRequests(beforeGeneration + 1);
  revision = 2; api.installContentPublications(publications());
  holdNext = deferred(); const newGate = holdNext; const fresh = load(); await waitForRequests(beforeGeneration + 2);
  oldGate.resolve(); assert.equal((await old).size, 0, 'A superseded response cannot serve older rows or aliases');
  const stillShared = load(); await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(requests.length, beforeGeneration + 2, 'An old completion cannot evict newer active work');
  newGate.resolve(); const [two, sameTwo] = await Promise.all([fresh, stillShared]);
  assert.equal(body(two), 'Synthetic complete approved opening revision 2. Synthetic final sentence revision 2.');
  assert.equal(body(sameTwo), body(two));

  const beforeRetirement = requests.length;
  holdNext = deferred(); const retiringGate = holdNext; const pendingOld = load(); await waitForRequests(beforeRetirement + 1);
  revision = 3; retired = true; api.installContentPublications(publications());
  const retiredValue = await load(); retiringGate.resolve();
  assert.equal(requests.length, beforeRetirement + 2, 'Retirement must start independent work in its new generation');
  assert.equal(body(retiredValue), undefined); assert.equal(body(await pendingOld), undefined, 'Retirement survives completion of older live work');

  state.client = null;
  const beforeOffline = requests.length;
  const [offline, sameOffline] = await Promise.all([load(), load()]);
  assert.equal(offlineReads, 1); assert.equal(requests.length, beforeOffline);
  assert.equal(body(offline), undefined); assert.equal(body(sameOffline), undefined, 'No-client recovery cannot resurrect retired writing');
  state.client = onlineClient;
  revision = 4; retired = false; api.installContentPublications(publications()); failures = 3;
  const beforeFailure = requests.length;
  const [failed, sharedFailed] = await Promise.all([load(), load()]);
  assert.equal(requests.length, beforeFailure + 3, 'Concurrent callers share the existing bounded transient retries');
  assert.equal(failed.size, 0); assert.equal(sharedFailed.size, 0, 'Older offline rows cannot replace current publications or aliases');
  const retried = await load();
  assert.equal(requests.length, beforeFailure + 4, 'A later explicit same-generation call must get a new transport');
  assert.equal(body(retried), 'Synthetic complete approved opening revision 4. Synthetic final sentence revision 4.');
  assert.deepEqual(unexpected, []);
  console.log('PASS actual surface loader: post-ledger active sharing, separate query identities, settled eviction, generation isolation, retirement, no-client/offline recovery and explicit retry.');
} finally {
  globalThis.fetch = originalFetch; delete globalThis[symbol]; rmSync(temporary, { recursive: true, force: true });
}
