import assert from 'node:assert/strict';
import http from 'node:http';
import { build } from 'esbuild';
import { webkit, devices } from '@playwright/test';

// Compile the actual checkout module. No copied retry/lifecycle implementation,
// production service, owner session, private source, or writing fixture is used.
const bundle = await build({ stdin: { resolveDir: process.cwd(), contents: `
 export { loadFallbackArchitectureV3DashboardBundle } from './apps/web/src/services/generatedContent.ts';
 export { loadReaderRows } from './apps/web/src/services/readerContentClient.ts';
` }, bundle: true, platform: 'browser', format: 'iife', globalName: 'readerModule', write: false, logLevel: 'silent',
 define: { 'import.meta.env': '{}' }, plugins: [{ name: 'loopback-reader-services', setup(b) {
  b.onResolve({ filter: /^\.\/auth$/ }, () => ({ path: 'client', namespace: 'fixture' }));
  b.onResolve({ filter: /^\.\/contentPublications$/ }, () => ({ path: 'online', namespace: 'fixture' }));
  b.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: args.path === 'client'
   ? `export const getSupabaseClient = async () => ({rpc:async()=>{try{const response=await fetch('/revision',{method:'POST',body:'{}'});if(!response.ok)throw new TypeError('Synthetic revision failure');return{data:await response.json(),error:null}}catch(error){return{data:null,error}}}});`
   : 'export const contentPublicationsAvailableOnline = () => true; export const refreshContentPublications = async () => {}; export const refreshSkyListPublications = refreshContentPublications; export const skyListPublicationReadStarted = () => false;' }));
 } }] });
const deferred = () => { let resolve!: () => void; const promise = new Promise<void>(r => { resolve = r; }); return { promise, resolve }; };
const bound = async <T>(promise: Promise<T>, ms = 10000) => {
 let timer: ReturnType<typeof setTimeout>;
 try { return await Promise.race([promise, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(Error('Reader browser regression deadline')), ms); })]); }
 finally { clearTimeout(timer!); }
};
type Case = { name: string; delay?: number; routed?: boolean; failure?: number | 'TypeError' };
const cases: Case[] = [
 ...[35, 750].flatMap(delay => [false, true].map(routed => ({ name: `fast-navigation-${delay}-${routed ? 'routed' : 'ordinary'}`, delay, routed }))),
 ...[502, 503, 504, 'TypeError' as const].map(failure => ({ name: `active-page-recovery-${failure}`, failure }))
];
const browser = await webkit.launch({ headless: true });
const results: unknown[] = [];
try {
 for (const entry of cases) {
  const cold = deferred(), revision = deferred(), release = deferred();
  const errors: string[] = [], handlerErrors: string[] = [], denied: string[] = [];
  const requests: { category: string; at: number }[] = [], browserRequests: { path: string; failed: boolean }[] = [];
  const active = new Set<Promise<unknown>>();
  let documents = 0, attempts = 0;
  const server = http.createServer(async (request, response) => {
   const path = new URL(request.url!, 'http://127.0.0.1').pathname;
   if (path === '/module.js') { response.writeHead(200, { 'Content-Type': 'text/javascript' }); response.end(bundle.outputFiles[0].text); return; }
   if (request.method === 'POST' && path === '/revision') {
    requests.push({ category: 'revision', at: Date.now() }); revision.resolve(); await release.promise;
    response.writeHead(503).end('Synthetic revision unavailable'); return;
   }
   if (request.method === 'POST' && path === '/api/content-reader') {
    let body = ''; for await (const chunk of request) { body += chunk; assert(body.length <= 2048); }
    const query = JSON.parse(body); attempts++;
    requests.push({ category: query.latestVersion ? 'latestVersion' : query.scope ? 'scope' : 'keys', at: Date.now() });
    cold.resolve();
    if (!entry.failure) await release.promise;
    else if (entry.failure === 'TypeError' && attempts <= 2) { request.socket.destroy(); return; }
    else if (typeof entry.failure === 'number' && attempts === 1) { response.writeHead(entry.failure).end('Synthetic transient outage'); return; }
    response.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    response.end(JSON.stringify({ schema: 'content-reader-row-v1', rows: [], publications: [], nextCursor: null })); return;
   }
   if (path !== '/') { response.writeHead(404).end(); return; }
   documents++;
   if (documents > 1) await new Promise(resolve => setTimeout(resolve, entry.delay));
   response.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-store', 'Content-Security-Policy': "default-src 'none'; script-src 'self' 'unsafe-inline'; connect-src 'self'; base-uri 'none'" });
   response.end(documents > 1 ? '<!doctype html><title>Reloaded reader</title><h1>Reloaded reader</h1>' : `<!doctype html><title>Reader regression</title><script src="/module.js"></script><script>
    window.result=null;
    const operation=${entry.failure ? "readerModule.loadReaderRows({keys:['cms/recovery/browser']})" : "readerModule.loadFallbackArchitectureV3DashboardBundle('sky-article')"};
    operation.then(value=>window.result={value,error:null}).catch(error=>window.result={error:error.name});
   </script>`);
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${(server.address() as import('node:net').AddressInfo).port}`;
  const context = await browser.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block', acceptDownloads: false });
  try {
   const tracked = new Map();
   context.on('request', request => { const u = new URL(request.url()); assert.equal(u.origin, origin); const row = { path: u.pathname, failed: false }; tracked.set(request, row); browserRequests.push(row); });
   context.on('requestfailed', request => { const row = tracked.get(request); if (row) row.failed = true; });
   if (entry.routed) await context.route('**/*', route => {
    const operation = (async () => {
     const request = route.request(); if (new URL(request.url()).origin !== origin) { denied.push('non-loopback'); await route.abort(); return; }
     if (request.method() !== 'POST') return route.continue();
     const response = await route.fetch({ maxRedirects: 0, timeout: 10000 }); return route.fulfill({ response });
    })().catch(error => { handlerErrors.push(error.name); });
    active.add(operation); void operation.then(() => active.delete(operation)); return operation;
   });
   const page = await context.newPage();
   page.on('pageerror', error => errors.push(error.message.replace(/https?:\/\/\S+/g, '[loopback-url]')));
   await page.goto(origin, { waitUntil: 'load', timeout: 10000 });
   if (entry.failure) {
    await page.waitForFunction(() => (window as any).result !== null, undefined, { timeout: 10000 });
    const result = await page.evaluate(() => (window as any).result);
    assert.equal(result.error, null); assert.equal(result.value.error, null); assert.deepEqual(result.value.data, []);
    assert.equal(attempts, entry.failure === 'TypeError' ? 3 : 2);
    const times = requests.filter(row => row.category === 'keys').map(row => row.at);
    assert(times[1] - times[0] >= 200, 'Preserve the 250ms transient backoff.');
    if (entry.failure === 'TypeError') assert(times[2] - times[1] >= 450, 'Preserve the 500ms transient backoff.');
   } else {
    await bound(Promise.all([cold.promise, revision.promise]));
    await page.reload({ waitUntil: 'load', timeout: 10000 }); release.resolve();
    await bound((async () => { while (active.size) await Promise.all([...active]); })());
    assert.equal(await page.title(), 'Reloaded reader');
    assert.equal(requests.filter(row => row.category === 'latestVersion').length, 0, 'No fallback after navigation cancels the revision.');
    assert(browserRequests.some(row => row.path === '/api/content-reader' && row.failed));
    assert(browserRequests.some(row => row.path === '/revision' && row.failed));
   }
   await page.waitForTimeout(300);
   assert.deepEqual(errors, [], 'Zero unfiltered browser pageerrors.');
   assert.deepEqual(handlerErrors, []); assert.deepEqual(denied, []);
   results.push({ case: entry.name, passed: true, pageErrors: 0, handlerErrors: 0, requests: requests.map(row => row.category) });
  } finally {
   release.resolve(); await context.close(); server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve()));
  }
 }
} finally { await browser.close(); }
console.log(JSON.stringify({ scope: 'actual checkout module on synthetic loopback, not production acceptance', passed: results.length, cases: results }));
