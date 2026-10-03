import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { test } from 'node:test';

const fixtureEnv = {
  NODE_ENV: 'production', CONTENT_GENERATION_SECRET: 'review-bootstrap-fixture',
  SUPABASE_URL: 'https://review-bootstrap.invalid', SUPABASE_SERVICE_ROLE_KEY: 'fixture',
  TLDR_ASTRO_API_URL: 'https://review-calculation.invalid'
};
Object.assign(process.env, fixtureEnv);
const { default: publicHandler } = await import('../api/admin/review-records.ts');
const { default: fastHandler } = await import('../api/admin/review-records-fast.ts');
Object.assign(process.env, fixtureEnv);
const originalFetch = globalThis.fetch;
let calls: URL[] = [];
globalThis.fetch = (async input => {
  const url = new URL(String(input));
  calls.push(url);
  if (url.pathname.startsWith('/rest/v1/')) return Response.json([]);
  if (url.pathname === '/sky/current') return Response.json({ generatedAt: '2026-10-03T12:00:00Z', positions: [], aspects: [] });
  throw new Error(`Unexpected fixture request: ${url.pathname}`);
}) as typeof fetch;

async function invoke(handler: typeof publicHandler, query: string, method = 'GET', authenticated = true) {
  const req = Object.assign(Readable.from([]), { method, url: `/api/admin/review-records${query}`,
    headers: authenticated ? { authorization: 'Bearer review-bootstrap-fixture' } : {} });
  const res = { statusCode: 0, headers: {} as Record<string, unknown>, payload: {} as any,
    setHeader(key: string, value: unknown) { this.headers[key.toLowerCase()] = value; },
    end(value: string) { this.payload = JSON.parse(value); } };
  await handler(req as any, res as any);
  return res;
}

try {
  // Invoke both physical functions, without relying on a local rewrite that
  // can mask the deployed public handler's month-long calculation fan-out.
  for (const [name, handler] of [['public', publicHandler], ['fast', fastHandler]] as const) {
    await test(`${name} default Studio request does no storage or sky calculation`, async () => {
      for (const query of ['', '?surface=upcomingAspects&status=all']) {
        calls = [];
        const result = await invoke(handler, query);
        assert.equal(result.statusCode, 200);
        assert.equal(result.payload.supplementalOnly, true);
        assert.deepEqual(result.payload.rows, []);
        assert.equal(calls.length, 0, 'Initial loading already has its saved inventory; it must not query storage or calculate a month of sky');
      }
    });
    await test(`${name} explicit review window still loads saved records and calculates the requested days`, async () => {
      calls = [];
      const result = await invoke(handler, '?surface=upcomingAspects&status=all&startDate=2026-10-03&endDate=2026-10-04');
      assert.equal(result.statusCode, 200);
      assert.equal(result.payload.supplementalOnly, undefined);
      assert.equal(result.payload.startDate, '2026-10-03');
      assert.equal(result.payload.endDate, '2026-10-04');
      assert.equal(calls.filter(url => url.pathname === '/sky/current').length, 2);
      assert.ok(calls.some(url => url.pathname === '/rest/v1/generated_interpretations'));
    });
    await test(`${name} rejects missing authorization and wrong method before any work`, async () => {
      calls = [];
      assert.equal((await invoke(handler, '', 'GET', false)).statusCode, 401);
      const rejected = await invoke(handler, '', 'POST');
      assert.equal(rejected.statusCode, 405);
      assert.equal(rejected.headers.allow, 'GET');
      assert.equal(calls.length, 0);
    });
  }
} finally { globalThis.fetch = originalFetch; }
