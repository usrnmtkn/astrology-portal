import assert from 'node:assert/strict';
import { getEventListeners } from 'node:events';
import vm from 'node:vm';
import { build } from 'esbuild';

// Use the actual dashboard loader, public transport and publication admission.
// Only external auth/revision transport and online readiness are synthetic.
const bundled = await build({ stdin: { resolveDir: process.cwd(), contents: `
 export { loadFallbackArchitectureV3DashboardBundle } from './apps/web/src/services/generatedContent.ts';
` }, bundle: true, platform: 'node', format: 'cjs', write: false, logLevel: 'silent',
 define: { 'import.meta.env': '{}' }, plugins: [{ name: 'navigation-reader-fixture', setup(b) {
  b.onResolve({ filter: /^\.\/auth$/ }, () => ({ path: 'client', namespace: 'fixture' }));
  b.onResolve({ filter: /^\.\/contentPublications$/ }, () => ({ path: 'online', namespace: 'fixture' }));
  b.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: args.path === 'client'
   ? 'export const getSupabaseClient = () => fixture.client();'
   : 'export const contentPublicationsAvailableOnline = () => true; export const refreshContentPublications = () => fixture.refresh(); export const refreshSkyListPublications = refreshContentPublications; export const skyListPublicationReadStarted = () => false;' }));
 } }] });

const deferred = <T = void>() => {
 let resolve!: (value: T) => void, reject!: (reason: unknown) => void;
 const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
 return { promise, resolve, reject };
};
const pause = () => new Promise(resolve => setTimeout(resolve, 0));
function harness() {
 const target = new EventTarget(), coldArrived = deferred(), revisionArrived = deferred();
 const publicationArrived = deferred(), publicationGate = deferred();
 const revision = deferred<{ data: null; error: TypeError }>();
 const requests: { query: any; signal: AbortSignal; reply: ReturnType<typeof deferred<Response>> }[] = [];
 const timeouts: number[] = [], writes: unknown[] = [];
 let holdPublication = false, fresh = false;
 const validPage = () => Response.json({ schema: 'content-reader-row-v1', rows: [], publications: [], nextCursor: null });
 const failure = () => ({ data: null, error: new TypeError('Synthetic cancelled revision') });
 const fixture = {
  refresh: () => { publicationArrived.resolve(); return holdPublication ? publicationGate.promise : Promise.resolve(); },
  client: async () => ({ rpc: async () => { revisionArrived.resolve(); return fresh ? failure() : revision.promise; } })
 };
 const signal = new Proxy(AbortSignal, { get(value, key) {
  if (key === 'timeout') return (ms: number) => { timeouts.push(ms); return AbortSignal.timeout(ms); };
  const member = Reflect.get(value, key); return typeof member === 'function' ? member.bind(value) : member;
 } });
 const context: any = { module: { exports: {} }, fixture, console, URL, DOMException, TypeError,
  AbortSignal: signal, AbortController, setTimeout, clearTimeout, Response, ReadableStream, TextEncoder,
  window: { location: { hostname: 'synthetic.test', href: 'https://synthetic.test/' },
   localStorage: { getItem: () => null, setItem: (...args: unknown[]) => writes.push(args), removeItem: (...args: unknown[]) => writes.push(args) },
   addEventListener: target.addEventListener.bind(target), removeEventListener: target.removeEventListener.bind(target) },
  fetch: (url: unknown, init: any) => {
   assert.equal(url, '/api/content-reader', 'No production or alternate transport');
   const reply = deferred<Response>(), query = JSON.parse(init.body);
   requests.push({ query, signal: init.signal, reply });
   if (fresh || query.latestVersion) return Promise.resolve(validPage());
   init.signal.addEventListener('abort', () => reply.reject(init.signal.reason), { once: true });
   coldArrived.resolve(); return reply.promise;
  } };
 vm.runInNewContext(bundled.outputFiles[0].text, context);
 const qa = context.module.exports;
 writes.length = 0;
 return { target, qa, requests, timeouts, writes, coldArrived, revisionArrived, publicationArrived,
  holdPublications: () => { holdPublication = true; }, releasePublications: () => publicationGate.resolve(),
  cancelRevision: () => revision.resolve(failure()), fresh: () => { fresh = true; },
  clean: () => {
   assert.equal(getEventListeners(target, 'beforeunload').length, 0);
   assert.equal(getEventListeners(target, 'pagehide').length, 0);
  } };
}

for (const mode of ['beforeunload', 'cancelled-beforeunload', 'bfcache-pagehide', 'completed-cold-row']) {
 const h = harness();
 const outcome = h.qa.loadFallbackArchitectureV3DashboardBundle('sky-article')
  .then((value: unknown) => ({ value, error: null }), (error: unknown) => ({ value: null, error }));
 await Promise.all([h.coldArrived.promise, h.revisionArrived.promise]);
 assert.equal(h.requests.length, 1);
 assert.equal(h.requests[0].query.scope, 'sky-article');
 if (mode === 'completed-cold-row') {
  h.requests[0].reply.resolve(Response.json({ schema: 'content-reader-row-v1', rows: [], publications: [], nextCursor: null }));
  await pause();
 }
 const event = new Event(mode === 'bfcache-pagehide' ? 'pagehide' : 'beforeunload', { cancelable: true });
 if (mode === 'cancelled-beforeunload') event.preventDefault();
 if (mode === 'bfcache-pagehide') Object.defineProperty(event, 'persisted', { value: true });
 h.target.dispatchEvent(event);
 // Match browser cancellation even on the old implementation, so a regression
 // fails by observing its follow-on query instead of hanging on a fixture.
 h.requests[0].reply.reject(new TypeError('Synthetic navigation cancellation'));
 h.cancelRevision();
 const result = await outcome;
 assert(result.error instanceof DOMException);
 assert.equal(result.error.name, 'AbortError');
 assert.equal(h.requests.length, 1, 'A cancelled revision must not launch the latestVersion fallback.');
 assert.equal(h.writes.length, 0, 'An obsolete operation must not modify the reader cache.');
 assert(h.timeouts.length > 0 && h.timeouts.every(ms => ms === 20000), 'Default page deadlines remain 20 seconds.');
 h.clean();
 if (mode === 'bfcache-pagehide') {
  const restored = new Event('pageshow'); Object.defineProperty(restored, 'persisted', { value: true }); h.target.dispatchEvent(restored);
 }
 h.fresh();
 await h.qa.loadFallbackArchitectureV3DashboardBundle('sky-article');
 assert.equal(h.requests.length, 3, 'A fresh active load may perform its normal cold read and revision fallback.');
 assert(h.requests.at(-1)!.query.latestVersion);
 assert(h.requests.slice(1).every(request => !request.signal.aborted));
 assert(h.timeouts.every(ms => ms === 20000));
 h.clean();
}

{
 const h = harness(); h.holdPublications();
 const outcome = h.qa.loadFallbackArchitectureV3DashboardBundle('sky-article')
  .then(() => null, (error: unknown) => error);
 await h.publicationArrived.promise;
 h.target.dispatchEvent(new Event('beforeunload'));
 h.releasePublications();
 const error = await outcome;
 assert(error instanceof DOMException); assert.equal(error.name, 'AbortError');
 assert.equal(h.requests.length, 0, 'Navigation while publication readiness is pending cannot start a new read.');
 h.clean();
}

{
 const h = harness(); h.fresh();
 await h.qa.loadFallbackArchitectureV3DashboardBundle('sky-article');
 assert.equal(h.requests.length, 2, 'An active-page revision outage retains the existing compatibility recovery.');
 assert(h.requests[1].query.latestVersion);
 assert(h.timeouts.every(ms => ms === 20000));
 h.clean();
}

{
 const h = harness(), consumed = [0, 0], discarded = [0, 0];
 const early = (index: number) => ({ consume: () => { consumed[index]++; return undefined; }, discard: () => { discarded[index]++; } });
 const pending = [0, 1].map(index => h.qa.loadFallbackArchitectureV3DashboardBundle('sky-article', early(index))
  .then((value: unknown) => ({ value, error: null }), (error: unknown) => ({ value: null, error })));
 await Promise.all([h.coldArrived.promise, h.revisionArrived.promise]);
 assert.equal(h.requests.length, 1, 'Joiners share the active cold read.');
 assert.deepEqual(consumed, [1, 0]); assert.deepEqual(discarded, [1, 1]);
 h.target.dispatchEvent(new Event('beforeunload'));
 h.requests[0].reply.reject(new TypeError('Synthetic navigation cancellation'));
 h.cancelRevision();
 const results = await Promise.all(pending);
 assert(results.every(result => result.error instanceof DOMException && result.error.name === 'AbortError'));
 assert.equal(h.requests.length, 1);
 h.clean();
 h.fresh();
 await Promise.all([h.qa.loadFallbackArchitectureV3DashboardBundle('sky-article'), h.qa.loadFallbackArchitectureV3DashboardBundle('sky-article')]);
 assert.equal(h.requests.length, 3, 'A later shared operation starts normally after cancelled joiners settle.');
 h.clean();
}
console.log('PASS reader navigation: actual concurrent cold-row/revision recovery, no obsolete fallback, publication wait, default page deadlines, listener cleanup and fresh reads after staying/restoration.');
