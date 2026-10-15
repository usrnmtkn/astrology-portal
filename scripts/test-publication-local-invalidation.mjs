import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
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
const articlesEffect = effect('apps/web/src/features/articles/ArticlesExperience.tsx',
  'const refresh = () => setRevision(value => value + 1);', '  }, []);');
const summaryEffect = effect('apps/web/src/features/sky/PublishedSkySummary.tsx',
  'const update = () => setRefresh(value => value + 1);', '  }, [sourceKey]);');
const entry = `
import { installContentPublications, publicationAllowsContent, contentPublicationRecords,
  subscribeToContentPublications } from './apps/web/src/content/contentPublicationState';
import { refreshContentPublications, refreshContentPublicationsAfterUpdate } from './apps/web/src/services/contentPublications';
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
const setContentRefreshVersion = update => { counts.app = update(counts.app); };
const setRevision = update => { counts.articles = update(counts.articles); };
const setRefresh = update => { counts.summary = update(counts.summary); };
const keys = [globalThis.__fixture.contentKey];
const stops = [(() => { ${appEffect} })(), (() => { ${articlesEffect} })(), (() => { ${summaryEffect} })()];
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
  refreshContentPublications, announceContentUpdate, loadOfflineContentRows, eligibleSkyDetailContent, seedCalendar, calendar, cleanup };
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
function group(initial, snapshot = initial, { storageUnavailable = false } = {}) {
  let stored = initial, unavailable = false, held, release;
  let clock = Date.parse('2026-10-15T01:00:00Z');
  const data = new Map([[cacheKey, JSON.stringify(initial)]]), queue = [], channels = new Set(), tabs = [];
  for (let index = 0; index < 3; index++) {
    const counts = { metadataReads: 0, app: 0, articles: 0, summary: 0, sharedClears: 0, vocabularyClears: 0,
      taglineClears: 0, storageWrites: 0, broadcastPosts: 0, snapshotFetches: 0 };
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
          const captured = stored, failure = unavailable, pending = held;
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
      console: { log() {}, warn() {} }, URL, TextEncoder, TextDecoder, structuredClone, __fixture: { counts, client, contentKey },
      fetch: async url => {
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
    storageImport(value) { for (const tab of tabs) queue.push(() => tab.window.dispatchEvent(new FixtureEvent('storage', { key: cacheKey, newValue: JSON.stringify(value) }))); },
    holdReads() { held = new Promise(resolve => { release = resolve; }); }, releaseReads() { held = undefined; release(); } };
}

const stable = group(ledger(1));
for (let n = 0; n < 5; n++) stable.tabs[0].api.installContentPublications(ledger(1));
await stable.settle(); stable.assertText(1, true);
assert.equal(stable.totals().app, 0);

const advancing = group(ledger(1));
for (const tab of advancing.tabs) tab.api.seedCalendar(row(1));
advancing.setLedger(ledger(2)); advancing.tabs[0].api.installContentPublications(ledger(2)); await advancing.settle();
advancing.assertText(2, true);
for (const consumer of ['app', 'articles', 'summary']) assert.equal(advancing.totals()[consumer], 3, `${consumer}: one invalidation per changed tab`);
assert.equal(advancing.totals().metadataReads, 0, 'Already-installed metadata must not force a ledger reread.');
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
assert.equal(divergent.totals().metadataReads, 0);
assert.equal(divergent.totals().broadcastPosts, 0);

const recovery = group(ledger(1), ledger(2)); recovery.setUnavailable(true);
await Promise.all(recovery.tabs.map(tab => tab.api.refreshContentPublications(true)));
await Promise.all(recovery.tabs.map(tab => tab.api.loadOfflineContentRows())); await recovery.settle(); recovery.assertText(2, true);
assert.equal(recovery.totals().metadataReads, 18, 'One failed six-range read per tab; snapshot import must not repeat it.');
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
console.log('Publication local invalidation PASS: all three actual effects, Calendar eligibility, storage-only, divergent/out-of-order, Broadcast-only, 503 recovery, external-edit ordering and cleanup.');
