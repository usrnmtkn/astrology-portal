import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { test } from 'node:test';

const env = { NODE_ENV: 'production', CONTENT_GENERATION_SECRET: 'auth-availability-fixture', SUPABASE_URL: 'https://auth-availability.invalid', VITE_SUPABASE_URL: 'https://auth-availability.invalid', VITE_SUPABASE_PUBLISHABLE_KEY: 'fixture', SUPABASE_SERVICE_ROLE_KEY: 'fixture' };
Object.assign(process.env, env);
const { default: inventory } = await import('../api/admin/generated-content-inventory.ts');
const { default: content } = await import('../api/admin/generated-content.ts');
const { default: publication } = await import('../api/admin/content-publication.ts');
const { default: liveStatus } = await import('../api/admin/content-live-status.ts');
const { default: horoscopeWriting } = await import('../api/admin/horoscope-writing.ts');
Object.assign(process.env, env);
const originalFetch = globalThis.fetch;
const originalTimeout = globalThis.setTimeout;
let storageCalls = 0;
let authResponse: (options: RequestInit) => Promise<Response>;
globalThis.fetch = (async (input, options) => {
  const url = new URL(String(input));
  assert.equal(url.origin, env.SUPABASE_URL);
  if (url.pathname !== '/auth/v1/user') { storageCalls++; throw new Error('Unexpected storage call'); }
  return authResponse(options!);
}) as typeof fetch;
async function invoke(handler: typeof inventory, method = 'GET') {
  const req = Object.assign(Readable.from([]), { method, url: '/api/admin/test', headers: { 'x-content-admin-session': 'fixture-session' } });
  const res = { statusCode: 0, headers: {} as Record<string, unknown>, payload: {} as any,
    setHeader(key: string, value: unknown) { this.headers[key.toLowerCase()] = value; },
    end(value: string) { this.payload = JSON.parse(value); } };
  await handler(req, res as any);
  return res;
}
try {
  for (const [name, handler, method] of [['inventory', inventory, 'GET'], ['save', content, 'PATCH'], ['publication', publication, 'POST'], ['status', liveStatus, 'POST'], ['horoscope writing/rejection', horoscopeWriting, 'POST']] as const) {
    await test(`${name}: auth service failure is 503, never a write or an access-denied response`, async () => {
      authResponse = async () => Response.json({ message: 'Unavailable' }, { status: 503 });
      const res = await invoke(handler, method);
      assert.equal(res.statusCode, 503);
      assert.match(res.payload.error, /temporarily unavailable/);
      assert.match(String(res.headers['cache-control']), /no-store/);
      assert.equal(storageCalls, 0);
    });
    await test(`${name}: rejected credentials remain 401`, async () => {
      authResponse = async () => Response.json({ message: 'Invalid JWT' }, { status: 401 });
      const res = await invoke(handler, method);
      assert.equal(res.statusCode, 401);
      assert.equal(res.payload.authFailure, 'content_admin_unauthorized', 'This marker guarantees rejection before storage or provider calls.');
      assert.equal(storageCalls, 0);
    });
  }
  for (const stage of ['headers', 'body']) await test(`auth deadline covers stalled ${stage}`, async () => {
    globalThis.setTimeout = ((callback: (...args: any[]) => void, ms: number, ...args: any[]) => originalTimeout(callback, ms === 6_000 ? 5 : ms, ...args)) as typeof setTimeout;
    authResponse = async options => {
      assert.ok(options.signal, 'Auth requests must have a deadline signal.');
      const stalled = () => new Promise<any>((_resolve, reject) => options.signal!.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError'))));
      return stage === 'headers' ? stalled() : { ok: true, status: 200, json: stalled } as Response;
    };
    assert.equal((await invoke(inventory)).statusCode, 503);
    assert.equal(storageCalls, 0);
    globalThis.setTimeout = originalTimeout;
  });
} finally {
  globalThis.fetch = originalFetch;
  globalThis.setTimeout = originalTimeout;
}
