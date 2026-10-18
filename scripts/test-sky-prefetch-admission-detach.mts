import assert from 'node:assert/strict';
import { build } from 'esbuild';
import vm from 'node:vm';
import { READER_ROW_SCHEMA } from '../apps/web/src/content/readerRowSchema.mjs';

// Actual prefetch wrapper/private implementation, reader pagination/admission,
// row serving filters and publication store. Only auth/online transport are fixtures.
const bundled = await build({ stdin: { resolveDir: process.cwd(), contents: `
 export { prefetchColdSkyContentForKeys, loadLiveGeneratedContentForKeys } from './apps/web/src/services/generatedContent.ts';
 export { loadReaderRows } from './apps/web/src/services/readerContentClient.ts';
 export { generatedContentAliases } from './apps/web/src/services/generatedContentKeys.ts';
 export * from './apps/web/src/content/contentPublicationState.ts';
` }, bundle: true, platform: 'node', format: 'cjs', write: false, logLevel: 'silent',
 define: { 'import.meta.env': '{}' }, plugins: [{ name: 'synthetic-client-and-online', setup(b) {
  b.onResolve({ filter: /^\.\/auth$/ }, () => ({ path: 'client', namespace: 'fixture' }));
  b.onResolve({ filter: /^\.\/contentPublications$/ }, () => ({ path: 'online', namespace: 'fixture' }));
  b.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: args.path === 'client'
   ? 'export const getSupabaseClient = () => fixture.client();'
   : 'export const contentPublicationsAvailableOnline = () => true; export const refreshContentPublications = async () => {};' }));
 } }] });
const deferred = <T = void>() => { let resolve!: (v: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; };
const key = 'cms/reader-surface/approved';
const stamp = (revision: number) => `2026-10-18T00:00:0${revision}.000001Z`;
const publication = (revision = 1) => ({ content_key: key, state: 'live', revision,
 row_id: '00000000-0000-4000-8000-000000000001', row_updated_at: stamp(revision), updated_at: stamp(revision) });
const row = (revision = 1) => ({ id: publication().row_id, content_key: key, updated_at: stamp(revision), surface: 'you',
 mode: 'article', status: 'LIVE', lane: 'serving', review_state: null, target_date: null, headline: null, summary: null,
 body: 'Synthetic complete approved opening. Synthetic final sentence.', sections: {}, source_snapshot: { contentType: 'manual' } });
const page = (revision = 1, nextCursor: string | null = null) => ({ schema: READER_ROW_SCHEMA,
 rows: [row(revision)], publications: [publication(revision)], nextCursor });
function harness() {
 const clientCalled = deferred(), clientGate = deferred<unknown>();
 const requests: any[] = [], waiters = new Map<number, () => void>(), writes: any[] = [];
 let holdClient = false, notifications = 0;
 const fixture = { client: async () => { clientCalled.resolve(); return holdClient ? clientGate.promise : {}; } };
 const context: any = { module: { exports: {} }, fixture, console, URL, AbortSignal, AbortController, setTimeout, clearTimeout,
  window: { location: { hostname: 'synthetic.test', href: 'https://synthetic.test/' },
   localStorage: { getItem: () => null, setItem: (...args: any[]) => writes.push(args) }, addEventListener: () => {} },
  fetch: (url: unknown, init: any) => {
   assert.equal(url, '/api/content-reader', 'No production or alternate transport');
   const reply = deferred<any>(), request = { query: JSON.parse(init.body), signal: init.signal, reply };
   requests.push(request); waiters.get(requests.length)?.();
   return reply.promise;
  } };
 vm.runInNewContext(bundled.outputFiles[0].text, context);
 const qa = context.module.exports;
 qa.installContentPublications([publication()]);
 qa.subscribeToContentPublications(() => { notifications++; });
 writes.length = 0;
 return { qa, requests, clientCalled, clientGate, holdClient: () => { holdClient = true; }, writes,
  notifications: () => notifications,
  async waitForRequest(count: number) {
   if (requests.length < count) await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(Error(`Missing actual request ${count}`)), 3000);
    waiters.set(count, () => { clearTimeout(timer); resolve(); });
   });
   assert.equal(requests.length, count); return requests[count - 1];
  }, reply(request: any, value: unknown) { request.reply.resolve({ ok: true, json: async () => value }); } };
}
{
 const h = harness(); h.holdClient();
 const early = h.qa.prefetchColdSkyContentForKeys([key], Promise.resolve());
 await h.clientCalled.promise; early.detach(); h.clientGate.resolve({});
 assert.equal((await early.rows).size, 0);
 assert.equal(h.requests.length, 0, 'Detach during awaited client acquisition must prevent later dispatch.');
 assert.equal(h.notifications(), 0); assert.equal(h.writes.length, 0);
}
{
 const h = harness(), early = h.qa.prefetchColdSkyContentForKeys([key], Promise.resolve());
 const first = await h.waitForRequest(1); h.reply(first, page(1, 'cursor-one'));
 const second = await h.waitForRequest(2);
 early.detach(); h.reply(second, page(2));
 assert.equal((await early.rows).size, 0);
 assert.equal(first.signal.aborted, false); assert.equal(second.signal.aborted, false);
 assert.equal(h.qa.contentPublication(key).revision, 1);
 assert.equal(h.notifications(), 0); assert.equal(h.writes.length, 0, 'Detached pagination must not write publication cache.');
}
// Both pages are current and independently admissible: only withdrawal can
// explain the empty result. The newer-page case above tests a separate guard.
for (const withdrawn of [false, true]) {
 const h = harness(), early = h.qa.prefetchColdSkyContentForKeys([key], Promise.resolve());
 const first = await h.waitForRequest(1); h.reply(first, page(1, 'cursor-current'));
 const second = await h.waitForRequest(2);
 assert.equal(second.query.afterId, 'cursor-current', 'Positive barrier: actual second page is dispatched.');
 if (withdrawn) early.detach();
 h.reply(second, page(1));
 const content = await early.rows;
 assert.equal(content.get(key)?.body, withdrawn ? undefined : row().body,
  'Identical valid pagination admits content only while the actual prefetch handle owns admission.');
 // equivalentAstroContentKeys retains the exact key and its dash-normalized
 // canonical alias; generatedContentAliases installs both into the reader map.
 const expectedKeys = [key, 'cms-reader-surface-approved'].sort();
 assert.deepEqual(Array.from(h.qa.generatedContentAliases(row())).sort(), expectedKeys);
 assert.deepEqual(Array.from(content.keys()).sort(), withdrawn ? [] : expectedKeys);
 for (const expectedKey of withdrawn ? [] : expectedKeys) {
  assert.equal(content.get(expectedKey)?.contentKey, key);
  assert.equal(content.get(expectedKey)?.body, row().body);
 }
 assert.equal(first.signal.aborted, false); assert.equal(second.signal.aborted, false);
 assert.equal(h.qa.contentPublication(key).revision, 1);
 assert.equal(h.notifications(), 0); assert.equal(h.writes.length, 0);
}
{
 const h = harness(), early = h.qa.prefetchColdSkyContentForKeys([key], Promise.resolve());
 const request = await h.waitForRequest(1); h.reply(request, page());
 const content = await early.rows;
 assert.equal(content.get(key)?.body, row().body, 'Completed admitted rows pass actual serving filters.');
 early.detach(); assert.equal(content.get(key)?.updatedAt, stamp(1));
 assert.equal(request.signal.aborted, false);
}
{
 const h = harness(), early = h.qa.prefetchColdSkyContentForKeys([key], Promise.resolve());
 const request = await h.waitForRequest(1); early.discard();
 assert.equal(request.signal.aborted, true, 'Cancellation before handoff remains real cancellation.');
 h.reply(request, page()); assert.equal((await early.rows).size, 0);
 assert.equal(h.notifications(), 0); assert.equal(h.writes.length, 0);
}
// Positive/negative actual terminal admission boundary: same newer response must
// install+notify+cache when enabled, and do none when withdrawn after dispatch.
for (const withdrawn of [false, true]) {
 const h = harness(), ready = deferred<boolean>(); let enabled = true;
 const pending = h.qa.loadReaderRows({ keys: [key] }, undefined,
  { ready: ready.promise, validate: () => enabled });
 const request = await h.waitForRequest(1); if (withdrawn) enabled = false;
 h.reply(request, page(2)); ready.resolve(true); const result = await pending;
 assert.equal(h.qa.contentPublication(key).revision, withdrawn ? 1 : 2);
 assert.equal(h.notifications(), withdrawn ? 0 : 1); assert.equal(h.writes.length, withdrawn ? 0 : 1);
 assert.equal(Boolean(result.error), withdrawn); assert.equal(result.data === null, withdrawn);
}
{
 const h = harness(), early = h.qa.prefetchColdSkyContentForKeys([key], Promise.resolve());
 const optional = await h.waitForRequest(1); early.detach();
 const required = h.qa.loadLiveGeneratedContentForKeys([key], { requireFresh: true });
 const exact = await h.waitForRequest(2); h.reply(exact, page());
 assert.equal((await required).get(key)?.body, row().body, 'Normal required owner is unaffected by optional withdrawal.');
 h.reply(optional, page()); assert.equal((await early.rows).size, 0);
 assert.equal(optional.signal.aborted, false); assert.equal(exact.signal.aborted, false);
}
console.log('PASS: actual prefetch client-wait detach, private pagination withdrawal, admitted rows, cancellation, terminal publication/cache/notification boundary and independent required reads.');
