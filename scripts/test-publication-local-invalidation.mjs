import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
import { build } from 'esbuild';

const root = process.cwd();
// Execute each real subscription effect with counted React setters, rather
// than reproducing its notification logic in the fixture.
function effect(file, firstLine, terminator) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  const start = source.indexOf(firstLine);
  const end = source.indexOf(terminator, start);
  assert.ok(start > 0 && end > start, `Missing subscription effect: ${file}`);
  return source.slice(start, end);
}
const appSource = fs.readFileSync('apps/web/src/App.tsx', 'utf8');
const appStart = appSource.includes('const refreshInstalledContent = () => {')
  ? 'const refreshInstalledContent = () => {' : 'const refreshContent = (notice?: ContentUpdateNotice) => {';
const appEffect = effect('apps/web/src/App.tsx', appStart, '  }, []);');
const appAdmission = effect('apps/web/src/App.tsx', 'function admitInitialSkyArticlePublication(', '\nasync function prepareSkyPlacementArticleContent(');
const articlesEffect = effect('apps/web/src/features/articles/ArticlesExperience.tsx',
  'const refresh = () => setRevision(value => value + 1);', '  }, []);');
const summaryEffect = effect('apps/web/src/features/sky/PublishedSkySummary.tsx',
  'const update = () => setRefresh(value => value + 1);', '  }, [sourceKey]);');
const entry = `
import { installContentPublications, publicationAllowsContent, contentPublicationRecords, contentPublicationGeneration,
  subscribeToContentPublications } from './apps/web/src/content/contentPublicationState';
import { contentPublicationsResolved, refreshContentPublications, refreshContentPublicationsAfterUpdate } from './apps/web/src/services/contentPublications';
import { loadReaderRows } from './apps/web/src/services/readerContentClient';
import { canonicalPublicationLedger, publicationLedgerTag, loadPublicationLedgerFromApi } from './apps/web/src/services/publicationLedgerTransport';
import { announceContentUpdate, subscribeToContentUpdates, subscribeToContentRevalidation } from './apps/web/src/services/contentUpdateSignal';
import { loadOfflineContentRows } from './apps/web/src/services/offlineContentSnapshot';
import { eligibleSkyDetailContent } from './apps/web/src/services/skyDetailContent';
const counts = globalThis.__fixture.counts;
const clearSharedGeneratedContentCache = () => counts.sharedClears++;
const clearPlanetTopicVocabularyCache = () => counts.vocabularyClears++;
const clearNatalCardTaglineCache = () => counts.taglineClears++;
const calendarContentCacheRef = { current: new Map() };
const fallbackDashboardHydrationRequestedRef = { current: true };
const compatibilityDashboardHydrationVersionRef = { current: 17 };
const skyArticlePreparationRef = { current: null };
${appAdmission}
function seedSkyPreparation() {
  skyArticlePreparationRef.current = { initialPublication: !contentPublicationsResolved(), generation: contentPublicationGeneration, refreshVersion: counts.app };
}
function skyPreparation() {
  const value = skyArticlePreparationRef.current;
  return { ...value, currentGeneration: contentPublicationGeneration, currentRefreshVersion: counts.app };
}
const setContentRefreshVersion = update => { counts.app = update(counts.app); };
const setRevision = update => { counts.articles = update(counts.articles); };
const setRefresh = update => { counts.summary = update(counts.summary); };
const keys = [globalThis.__fixture.contentKey];
const installSources = [];
const stopSource = subscribeToContentPublications(source => installSources.push(source));
const stops = [(() => { ${appEffect} })(), (() => { ${articlesEffect} })(), (() => { ${summaryEffect} })(), stopSource];
function seedCalendar(row) {
  calendarContentCacheRef.current.set('fixture', { content: new Map([[row.contentKey, row]]), requestedKeys: new Set([row.contentKey]) });
}
function calendar() {
  const entry = calendarContentCacheRef.current.get('fixture');
  return { body: entry?.content.get(globalThis.__fixture.contentKey)?.body ?? '', requestedKeys: entry?.requestedKeys.size,
    hydrationRequested: fallbackDashboardHydrationRequestedRef.current,
    compatibilityVersion: compatibilityDashboardHydrationVersionRef.current };
}
function cleanup() { for (const stop of stops) stop(); }
export { installContentPublications, publicationAllowsContent, contentPublicationRecords,
  contentPublicationsResolved, refreshContentPublications, loadReaderRows, canonicalPublicationLedger,
  publicationLedgerTag, loadPublicationLedgerFromApi, installSources,
  announceContentUpdate, loadOfflineContentRows, eligibleSkyDetailContent, seedCalendar, calendar, seedSkyPreparation, skyPreparation, cleanup };
`;
const bundle = await build({ stdin: { contents: entry, resolveDir: root, loader: 'ts' }, bundle: true,
  platform: 'browser', format: 'iife', globalName: 'fixtureAPI', write: false, logLevel: 'silent',
  plugins: [{ name: 'isolated-auth', setup(builder) {
    builder.onResolve({ filter: /^\.\/auth$/ }, args => args.importer.includes('/services/')
      ? { path: 'auth', namespace: 'fixture' } : undefined);
    builder.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({
      contents: 'export async function getSupabaseClient() { return globalThis.__fixture.client; }', loader: 'js' }));
  } }] });
const script = new vm.Script(bundle.outputFiles[0].text, { filename: 'publication-local-invalidation-fixture.js' });
const marker = '__content-publication-ledger/v1';
const cacheKey = 'tldrastro:content-publications:v1';
const contentKey = 'cms/notification/approved';
const id = revision => `00000000-0000-4000-8000-${String(revision).padStart(12, '0')}`;
const stamp = revision => new Date(Date.UTC(2026, 9, 15, 0, 0, revision)).toISOString();
const record = (key, revision, state = 'live') => ({ content_key: key, revision, state,
  row_id: key === marker ? null : id(revision), row_updated_at: key === marker ? null : stamp(revision), updated_at: stamp(revision) });
const ledger = (revision, state = 'live') => [record(marker, revision), record(contentKey, revision, state)];
const row = revision => ({ contentKey, id: id(revision), updatedAt: stamp(revision), body: `Complete synthetic approved wording revision ${revision}.` });
class FixtureEvent { constructor(type, fields = {}) { this.type = type; Object.assign(this, fields); } }
function target() {
  const listeners = new Map();
  return { addEventListener(type, listener) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(listener); },
    removeEventListener(type, listener) { listeners.get(type)?.delete(listener); },
    dispatchEvent(event) { for (const listener of [...(listeners.get(event.type) ?? [])]) listener(event); } };
}
function group(initial, snapshot = initial, { storageUnavailable = false, tabCount = 3 } = {}) {
  let stored = initial, unavailable = false, held, release, scoped, failedLower;
  let clock = Date.parse('2026-10-15T01:00:00Z');
  const data = new Map([[cacheKey, JSON.stringify(initial)]]), queue = [], channels = new Set(), tabs = [];
  for (let index = 0; index < tabCount; index++) {
    const counts = { metadataReads: 0, app: 0, articles: 0, summary: 0, sharedClears: 0, vocabularyClears: 0,
      taglineClears: 0, storageWrites: 0, broadcastPosts: 0, snapshotFetches: 0, readerRequests: 0, relayReads: 0 };
    const window = target(), document = Object.assign(target(), { visibilityState: 'visible' });
    const localStorage = { getItem(key) { if (storageUnavailable) throw Error('Storage unavailable'); return data.get(key) ?? null; },
      setItem(key, value) {
        if (storageUnavailable) throw Error('Storage unavailable');
        if (data.get(key) === String(value)) return;
        data.set(key, String(value)); counts.storageWrites++;
        for (const tab of tabs) if (tab.window !== window) queue.push(() => tab.window.dispatchEvent(new FixtureEvent('storage', { key, newValue: String(value) })));
      } };
    const client = { from(table) {
      assert.equal(table, 'content_publications');
      let lower, upper, after;
      const query = { select() { return query; }, order() { return query; }, limit() { return query; }, retry() { return query; },
        gte(key, value) { lower = value; return query; }, lt(key, value) { upper = value; return query; }, gt(key, value) { after = value; return query; },
        async abortSignal() {
          counts.metadataReads++;
          const captured = stored, failure = unavailable || failedLower !== undefined && lower === failedLower, pending = held;
          if (pending) await pending;
          return failure ? { data: null, error: Error('Synthetic 503') }
            : { data: captured.filter(r => (!lower || r.content_key >= lower) && (!upper || r.content_key < upper) && (!after || r.content_key > after)), error: null };
        } };
      return query;
    } };
    class Channel {
      constructor(name) { this.name = name; this.listeners = new Set(); channels.add(this); }
      addEventListener(type, listener) { this.listeners.add(listener); }
      removeEventListener(type, listener) { this.listeners.delete(listener); }
      close() { channels.delete(this); }
      postMessage(value) {
        counts.broadcastPosts++;
        for (const channel of [...channels]) if (channel !== this && channel.name === this.name)
          queue.push(() => { for (const listener of channel.listeners) listener({ data: structuredClone(value) }); });
      }
    }
    class ClockDate extends Date { constructor(value) { super(value === undefined ? clock++ : value); } static now() { return clock++; } }
    Object.assign(window, { localStorage, navigator: { onLine: true }, setInterval: () => 1, clearInterval() {} });
    const context = vm.createContext({ window, document, localStorage, navigator: window.navigator,
      CustomEvent: FixtureEvent, BroadcastChannel: Channel, Date: ClockDate, setTimeout, clearTimeout, AbortSignal,
      console: { log() {}, warn() {} }, URL, TextEncoder, TextDecoder, crypto: webcrypto, structuredClone, __fixture: { counts, client, contentKey },
      fetch: async (url, options) => {
        if (String(url) === '/api/content-reader') {
          counts.readerRequests++; assert.ok(scoped);
          return { ok: true, json: async () => scoped };
        }
        if (String(url) === '/api/content-publications') {
          counts.relayReads++;
          if (unavailable) return { status: 503, ok: false };
          const records = context.fixtureAPI.canonicalPublicationLedger(stored);
          const tag = await context.fixtureAPI.publicationLedgerTag(records);
          const unchanged = options?.headers?.['if-none-match'] === tag;
          return { status: unchanged ? 304 : 200, ok: !unchanged, headers: { get: () => tag },
            json: async () => ({ schema: 'tldr-publications/v1', publications: records }) };
        }
        assert.equal(String(url), '/content-studio-last-known-good.json', 'Fixture must never contact a real endpoint.');
        counts.snapshotFetches++;
        return { ok: true, json: async () => ({ schema: 'content-studio-last-known-good-v2', rowCount: 1,
          rows: [{ id: snapshot[1].row_id, content_key: contentKey, updated_at: snapshot[1].row_updated_at, status: 'LIVE',
            lane: 'serving', review_state: null, body: row(2).body, sections: {}, source_snapshot: { contentType: 'manual' } }], publications: snapshot }) };
      } });
    script.runInContext(context);
    tabs.push({ window, counts, api: context.fixtureAPI });
  }
  async function settle() {
    for (let turn = 0; turn < 100; turn++) {
      assert.ok(queue.length < 1000, 'Notification queue must remain bounded.');
      while (queue.length) queue.shift()();
      await new Promise(resolve => setImmediate(resolve));
      if (!queue.length) { await new Promise(resolve => setImmediate(resolve)); if (!queue.length) return; }
    }
    assert.fail('Notification graph did not quiesce within 100 scheduling turns.');
  }
  const totals = () => Object.fromEntries(Object.keys(tabs[0].counts).map(key => [key, tabs.reduce((sum, tab) => sum + tab.counts[key], 0)]));
  const assertText = (revision, eligible) => {
    for (const tab of tabs) {
      assert.equal(tab.api.publicationAllowsContent(contentKey, id(revision), stamp(revision)), eligible);
      const retained = tab.api.eligibleSkyDetailContent(new Map([[contentKey, row(revision)]]));
      assert.equal(retained.get(contentKey)?.body ?? '', eligible ? row(revision).body : '');
      if (revision > 1) assert.equal(tab.api.publicationAllowsContent(contentKey, id(1), stamp(1)), false);
    }
  };
  return { tabs, settle, totals, assertText, setLedger(value) { stored = value; }, setUnavailable(value) { unavailable = value; },
    setScoped(value) { scoped = value; }, failRange(lower) { failedLower = lower; },
    storageImport(value) { for (const tab of tabs) queue.push(() => tab.window.dispatchEvent(new FixtureEvent('storage', { key: cacheKey, newValue: JSON.stringify(value) }))); },
    holdReads() { held = new Promise(resolve => { release = resolve; }); }, releaseReads() { held = undefined; release(); } };
}

const otherKey = 'cms/notification/other';
const retiredA = { ...record(contentKey, 2, 'retired'), row_id: id(1), row_updated_at: stamp(1) };
const liveB = { ...record(otherKey, 2), row_id: id(99) };
for (const ordering of ['warm-resolved', 'after-held-read-completes', 'during-held-old-read', 'unchanged-marker', 'no-marker']) {
  const scoped = group(ledger(1));
  await Promise.all(scoped.tabs.map(tab => tab.api.refreshContentPublications(true))); await scoped.settle();
  assert.ok(scoped.tabs.every(tab => tab.api.contentPublicationsResolved())); scoped.assertText(1, true);
  for (const tab of scoped.tabs) tab.api.seedCalendar(row(1));
  let oldRead;
  if (ordering.includes('held')) {
    scoped.holdReads(); oldRead = Promise.all(scoped.tabs.map(tab => tab.api.refreshContentPublications(true)));
    await new Promise(resolve => setImmediate(resolve));
  }
  const nextMarker = record(marker, ordering === 'unchanged-marker' || ordering === 'no-marker' ? 1 : 2);
  scoped.setLedger([nextMarker, retiredA, liveB]);
  if (ordering === 'after-held-read-completes') { scoped.releaseReads(); await oldRead; await scoped.settle(); }
  scoped.setScoped({ schema: 'content-reader-row-v1', rows: [{ id: id(99), content_key: otherKey, updated_at: stamp(2), target_date: null, body: 'Complete synthetic B.' }],
    publications: ordering === 'no-marker' ? [liveB] : [nextMarker, liveB], nextCursor: null });
  const response = await scoped.tabs[0].api.loadReaderRows({ keys: [otherKey] });
  assert.equal(response.error, null); assert.equal(response.data.length, 1);
  if (ordering === 'during-held-old-read') { scoped.releaseReads(); await oldRead; }
  await scoped.settle();
  // Normal callers inside the current TTL must not be the reason a missing
  // retirement is discovered: the partial install owns the fresh complete read.
  const beforeNormalRead = scoped.totals().metadataReads;
  await Promise.all(scoped.tabs.map(tab => tab.api.refreshContentPublications())); await scoped.settle();
  assert.equal(scoped.totals().metadataReads, beforeNormalRead);
  for (const tab of scoped.tabs) {
    assert.equal(tab.api.publicationAllowsContent(contentKey, id(1), stamp(1)), false, `${ordering}: omitted retirement must be discovered`);
    assert.equal(tab.api.eligibleSkyDetailContent(new Map([[contentKey, row(1)]])).size, 0);
    assert.equal(tab.api.calendar().body, '');
  }
  assert.equal(scoped.totals().broadcastPosts, 0);
}

const cold = group([], [], { tabCount: 1 }); cold.setLedger(ledger(1));
cold.tabs[0].api.seedSkyPreparation();
await cold.tabs[0].api.refreshContentPublications(true); await cold.settle(); cold.assertText(1, true);
assert.equal(cold.totals().metadataReads, 6, 'A complete first cold read must not repeat itself.');
assert.deepEqual(Array.from(cold.tabs[0].api.installSources), ['complete-live']);
const admitted = cold.tabs[0].api.skyPreparation();
assert.equal(admitted.initialPublication, false);
assert.equal(admitted.generation, admitted.currentGeneration);
assert.equal(admitted.refreshVersion, admitted.currentRefreshVersion);
cold.setLedger(ledger(2, 'retired'));
await cold.tabs[0].api.refreshContentPublications(true); await cold.settle(); cold.assertText(2, false);
const revised = cold.tabs[0].api.skyPreparation();
assert.notEqual(revised.generation, revised.currentGeneration, 'A later retirement must invalidate the admitted Sky preparation.');
assert.notEqual(revised.refreshVersion, revised.currentRefreshVersion);

const batchedInitial = group([], [], { tabCount: 1 }); batchedInitial.setLedger(ledger(1));
batchedInitial.tabs[0].api.seedSkyPreparation(); batchedInitial.holdReads();
const initialRead = batchedInitial.tabs[0].api.refreshContentPublications(true);
await new Promise(resolve => setImmediate(resolve));
batchedInitial.tabs[0].api.announceContentUpdate({ contentKey, published: true, updatedAt: stamp(1) });
batchedInitial.releaseReads(); await initialRead; await batchedInitial.settle();
const refreshed = batchedInitial.tabs[0].api.skyPreparation();
assert.equal(refreshed.generation, refreshed.currentGeneration);
assert.equal(refreshed.refreshVersion, 1);
assert.equal(refreshed.currentRefreshVersion, 2, 'Explicit refresh plus initial admission remain two invalidations.');

const relay = group([], [], { tabCount: 1 }); relay.setLedger(ledger(1));
await relay.tabs[0].api.refreshContentPublications(true, () => relay.tabs[0].api.loadPublicationLedgerFromApi()); await relay.settle();
relay.assertText(1, true);
assert.equal(relay.totals().relayReads, 1); assert.equal(relay.totals().metadataReads, 0);
assert.deepEqual(Array.from(relay.tabs[0].api.installSources), ['complete-live']);
await relay.tabs[0].api.refreshContentPublications(true, () => relay.tabs[0].api.loadPublicationLedgerFromApi()); await relay.settle();
assert.equal(relay.totals().relayReads, 2, 'Verified 304 remains a complete read without recursive follow-up.');
assert.equal(relay.totals().metadataReads, 0);

const failed = group([], [], { tabCount: 1 }); failed.setLedger(ledger(1)); failed.failRange('fallback-hook/n');
await failed.tabs[0].api.refreshContentPublications(true); await failed.settle();
assert.equal(failed.tabs[0].api.contentPublicationsResolved(), false);
assert.equal(failed.tabs[0].api.installSources.length, 0, 'A failed range must not install partial pages as complete.');
assert.equal(failed.tabs[0].api.contentPublicationRecords().length, 0);

const coalesced = group(ledger(1), ledger(1), { tabCount: 1 });
await coalesced.tabs[0].api.refreshContentPublications(true); await coalesced.settle();
coalesced.holdReads(); const heldRead = coalesced.tabs[0].api.refreshContentPublications(true);
await new Promise(resolve => setImmediate(resolve));
const extraC = record('cms/notification/c', 2), extraD = record('cms/notification/d', 2);
coalesced.setLedger([record(marker, 2), retiredA, liveB, extraC, extraD]);
coalesced.tabs[0].api.installContentPublications([record(marker, 2), liveB]);
coalesced.storageImport([extraC]); coalesced.storageImport([extraD]); await coalesced.settle();
coalesced.releaseReads(); await heldRead; await coalesced.settle();
assert.equal(coalesced.totals().metadataReads, 18, 'Initial6 + held6 + one coalesced fresh6, not one follow-up per partial event.');
assert.equal(coalesced.tabs[0].api.publicationAllowsContent(contentKey, id(1), stamp(1)), false);
assert.equal(coalesced.totals().broadcastPosts, 0);

const stable = group(ledger(1));
for (let n = 0; n < 5; n++) stable.tabs[0].api.installContentPublications(ledger(1));
await stable.settle(); stable.assertText(1, true);
assert.equal(stable.totals().app, 0);

const advancing = group(ledger(1));
for (const tab of advancing.tabs) tab.api.seedCalendar(row(1));
advancing.setLedger(ledger(2)); advancing.tabs[0].api.installContentPublications(ledger(2)); await advancing.settle();
advancing.assertText(2, true);
for (const consumer of ['app', 'articles', 'summary']) assert.equal(advancing.totals()[consumer], 3, `${consumer}: one invalidation per changed tab`);
assert.equal(advancing.totals().metadataReads, 18, 'Unknown installs require one legitimate complete read per tab.');
assert.equal(advancing.totals().broadcastPosts, 0, 'Ledger imports must not announce another external edit.');
for (const tab of advancing.tabs) {
  assert.equal(tab.api.calendar().body, '', 'Superseded Calendar text must be filtered.');
  assert.equal(tab.api.calendar().requestedKeys, 0);
  assert.equal(tab.api.calendar().hydrationRequested, false);
  assert.equal(tab.api.calendar().compatibilityVersion, null);
  tab.api.seedCalendar(row(2));
}
const wave = advancing.totals();
advancing.storageImport(ledger(1)); advancing.storageImport(ledger(2)); await advancing.settle();
assert.deepEqual(advancing.totals(), wave, 'Older/equal storage deliveries must not invalidate again.');
advancing.tabs[0].api.installContentPublications([record('cms/notification/unrelated', 1)]); await advancing.settle();
for (const tab of advancing.tabs) assert.equal(tab.api.calendar().body, row(2).body, 'An unrelated publication must preserve the complete current Calendar text.');
advancing.setLedger(ledger(3, 'retired')); advancing.storageImport(ledger(3, 'retired')); await advancing.settle();
advancing.assertText(3, false);
for (const tab of advancing.tabs) assert.equal(tab.api.calendar().body, '', 'Retired Calendar text must disappear.');

const divergent = group(ledger(1));
const first = record('cms/notification/first', 7), second = record('cms/notification/second', 2, 'retired');
divergent.tabs[0].api.installContentPublications([first]); divergent.tabs[1].api.installContentPublications([second]);
await divergent.settle();
for (const tab of divergent.tabs) {
  const records = tab.api.contentPublicationRecords();
  assert.ok(records.some(row => row.content_key === first.content_key && row.revision === 7));
  assert.ok(records.some(row => row.content_key === second.content_key && row.state === 'retired'));
}
assert.ok(divergent.tabs.every(tab => tab.counts.metadataReads <= 12), 'Concurrent unknown imports must coalesce with bounded follow-up.');
assert.equal(divergent.totals().broadcastPosts, 0);

const recovery = group(ledger(1), ledger(2)); recovery.setUnavailable(true);
await Promise.all(recovery.tabs.map(tab => tab.api.refreshContentPublications(true)));
await Promise.all(recovery.tabs.map(tab => tab.api.loadOfflineContentRows())); await recovery.settle(); recovery.assertText(2, true);
assert.equal(recovery.totals().metadataReads, 36, 'Failed full read plus necessary verification of a newer unknown snapshot, without rebroadcast fanout.');
recovery.setUnavailable(false); recovery.setLedger(ledger(3, 'retired'));
await Promise.all(recovery.tabs.map(tab => tab.api.refreshContentPublications(true))); await recovery.settle(); recovery.assertText(3, false);
const recovered = recovery.totals();
await Promise.all(recovery.tabs.map(tab => tab.api.loadOfflineContentRows())); await recovery.settle();
assert.deepEqual(recovery.totals(), recovered, 'Older offline snapshots cannot revive text or emit fresh notifications.');

const channelOnly = group([], ledger(2), { storageUnavailable: true }); channelOnly.setLedger(ledger(2));
channelOnly.tabs[0].api.announceContentUpdate({ contentKey, published: true, updatedAt: stamp(2) }); await channelOnly.settle();
channelOnly.assertText(2, true);
assert.equal(channelOnly.totals().broadcastPosts, 1, 'Only the original external edit is broadcast.');
assert.equal(channelOnly.totals().metadataReads, 18, 'Broadcast-only external edit still refreshes every tab.');
for (const consumer of ['app', 'articles', 'summary']) assert.equal(channelOnly.totals()[consumer], 6, 'External notice plus installed ledger are distinct valid invalidations.');

const ordered = group(ledger(1)); ordered.holdReads();
const oldRead = ordered.tabs[0].api.refreshContentPublications(true);
await new Promise(resolve => setImmediate(resolve));
ordered.setLedger(ledger(2)); ordered.tabs[0].api.announceContentUpdate({ contentKey, published: true, updatedAt: stamp(2) });
ordered.releaseReads(); await oldRead; await ordered.settle(); ordered.assertText(2, true);
assert.equal(ordered.totals().broadcastPosts, 1);
assert.equal(ordered.tabs[0].counts.metadataReads, 12, 'External edits arriving during a read require a newer complete read afterward.');

for (const tab of ordered.tabs) tab.api.cleanup();
const stopped = ordered.totals(); ordered.storageImport(ledger(3, 'retired')); await ordered.settle(); ordered.assertText(3, false);
for (const consumer of ['app', 'articles', 'summary']) assert.equal(ordered.totals()[consumer], stopped[consumer], 'Unmounted consumers must unsubscribe.');
console.log('Publication local invalidation PASS: omitted retirements through actual scoped reader responses, complete direct/relay cold reads, coalesced partial follow-up, all three effects, Calendar, storage/BC, 503 recovery and cleanup.');
