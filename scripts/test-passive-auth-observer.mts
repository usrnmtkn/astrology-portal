import assert from 'node:assert/strict';
import { build } from 'esbuild';
const fixture: any = { imports: 0, listeners: new Set(), user: null, token: 'synthetic-a', verify: null, flushes: [] };
fixture.client = { auth: {
 getSession: async () => ({ data: { session: fixture.user ? { user: fixture.user, access_token: fixture.token } : null }, error: null }),
 getUser: async () => fixture.verify ? fixture.verify() : { data: { user: fixture.user }, error: null },
 onAuthStateChange: (callback: any) => { fixture.listeners.add(callback); return { data: { subscription: { unsubscribe: () => fixture.listeners.delete(callback) } } }; }
} };
(globalThis as any).passiveAuthFixture = fixture;
const built = await build({ stdin: { resolveDir: process.cwd(), contents: `import './apps/web/src/hooks/useChartSyncFlush.ts'; export { getSupabaseClient } from './apps/web/src/services/auth.ts'; export { observeVerifiedAccount } from './apps/web/src/services/verifiedAccountObserver.ts';` },
 bundle: true, write: false, platform: 'node', format: 'esm', logLevel: 'silent',
 define: { 'import.meta.env': JSON.stringify({ VITE_SUPABASE_URL: 'https://passive-auth.supabase.test', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_synthetic' }) },
 plugins: [{ name: 'synthetic-sdk', setup(b) {
  b.onResolve({ filter: /^@supabase\/supabase-js$/ }, () => ({ path: 'sdk', namespace: 'fixture' }));
  b.onResolve({ filter: /\/manualCharts$/ }, () => ({ path: 'charts', namespace: 'fixture' }));
  b.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: args.path === 'charts'
    ? `export const flushManualChartSync=async id=>{globalThis.passiveAuthFixture.flushes.push(id);};`
    : `const f=globalThis.passiveAuthFixture;f.imports++;export const createClient=()=>f.client;` }));
 } }] });
const load = (name: string) => import('data:text/javascript;base64,' + Buffer.from(built.outputFiles[0].text+'\n//'+name).toString('base64'));
const tick = () => new Promise(resolve => setImmediate(resolve));
const deferred = () => { let resolve!: (value: any) => void; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
const emit = (event: string) => { for (const callback of [...fixture.listeners] as any[]) callback(event, fixture.user ? { user: fixture.user } : null); };
const user = (id: string) => ({ id, email: id+'@example.test', user_metadata: {}, app_metadata: {}, identities: [] });
const storageEvent = (key: string, value: string) => Object.assign(new Event('storage'), { key, newValue: value });
(globalThis as any).window = Object.assign(new EventTarget(), { location: { origin: 'https://reader.test', href: 'https://reader.test/#sky' } });
(globalThis as any).document = Object.assign(new EventTarget(), { visibilityState: 'visible' });
try {
 const api = await load('same-tab');
 const discarded: any[] = [], states: any[] = [];
 const stopDiscarded = api.observeVerifiedAccount((state: any) => discarded.push(state), { deferUntilAuthRequested: true });
 stopDiscarded();
 const stop = api.observeVerifiedAccount((state: any) => states.push(state), { deferUntilAuthRequested: true });
 for (const event of ['focus','pageshow','online']) window.dispatchEvent(new Event(event));
 document.dispatchEvent(new Event('visibilitychange'));
 window.dispatchEvent(storageEvent('unrelated-session', '{}'));
 await tick();
 assert.equal(fixture.imports, 0, 'Anonymous notifications cannot initialize the SDK.');
 assert.deepEqual(fixture.flushes, [], 'Importing chart synchronization cannot initialize authentication or flush anonymously.');
 assert.equal(fixture.listeners.size, 0);
 assert.deepEqual(states, []);
 await api.getSupabaseClient(); await tick();
 assert.equal(fixture.imports, 1);
 assert.equal(fixture.listeners.size, 2, 'Only the active observer and deferred chart synchronization attach.');
 assert.deepEqual(discarded, []);
 assert.deepEqual(states.at(-1), { id: null, checked: true, error: false });

 const verification = deferred(); fixture.verify = () => verification.promise;
 fixture.user = user('synthetic-a'); emit('SIGNED_IN'); await tick();
 assert.equal(states.at(-1).id, null, 'An SDK signal cannot expose an unverified account.');
 verification.resolve({ data: { user: fixture.user }, error: null }); await tick();
 assert.equal(states.at(-1).id, 'synthetic-a');
 assert(fixture.flushes.includes('synthetic-a'), 'Chart synchronization resumes after the same-tab sign-in.');
 const late = deferred(); fixture.verify = () => late.promise;
 fixture.user = user('synthetic-b'); fixture.token = 'synthetic-b'; emit('SIGNED_IN'); await tick();
 fixture.user = null; emit('SIGNED_OUT');
 late.resolve({ data: { user: user('synthetic-b') }, error: null }); await tick();
 assert.deepEqual(states.at(-1), { id: null, checked: true, error: false }, 'Late verification cannot restore a signed-out account.');
 fixture.verify = null; fixture.user = user('synthetic-c'); fixture.token = 'synthetic-c'; emit('SIGNED_IN'); await tick();
 assert.equal(states.at(-1).id, 'synthetic-c');
 stop(); assert.equal(fixture.listeners.size, 1);

 const other = await load('other-tab'); const external: any[] = []; const before = fixture.imports;
 const stopOther = other.observeVerifiedAccount((state: any) => external.push(state), { deferUntilAuthRequested: true });
 await tick(); assert.equal(fixture.imports, before);
 window.dispatchEvent(storageEvent('sb-passive-auth-auth-token', JSON.stringify({ user: fixture.user })));
 await tick(); await tick();
 assert.equal(fixture.imports, before+1, 'A real cross-tab session activates verification.');
 assert.equal(external.at(-1).id, 'synthetic-c');
 const already: any[] = []; const stopAlready = other.observeVerifiedAccount((state: any) => already.push(state), { deferUntilAuthRequested: true });
 await tick(); assert.equal(already.at(-1).id, 'synthetic-c', 'An initialized client is observed immediately.');
 stopAlready(); stopOther(); assert.equal(fixture.listeners.size, 2);
} finally { delete (globalThis as any).window; delete (globalThis as any).document; delete (globalThis as any).passiveAuthFixture; }
console.log('PASS: real auth initialization and passive observer, zero anonymous SDK work, same-tab verified sign-in, cross-tab recovery, immediate initialized subscription, disposal and late sign-out isolation.');
