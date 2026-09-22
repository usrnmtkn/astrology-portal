import assert from 'node:assert/strict';
import handler from '../api/content-publications';
import { canonicalPublicationLedger, loadPublicationLedgerFromApi } from '../apps/web/src/services/publicationLedgerTransport';

const keys = ['!', '__content-publication-ledger/v1', 'authored/compat-pair/s', 'authored/transit-house-sign/m', 'fallback-hook/n', 'zz/future',
  ...Array.from({ length: 2010 }, (_, i) => `authored/compat-pair/a-${String(i).padStart(4, '0')}`)].sort();
const originalRows = keys.map((content_key, i) => ({ content_key, state: i % 17 === 0 ? 'retired' : 'live', revision: 1,
  row_id: content_key, row_updated_at: '2026-09-21T16:00:00.123456Z', updated_at: '2026-09-21T16:00:00.123456Z' }));
let rows = structuredClone(originalRows), requests: URL[] = [], failure = '', held: Promise<void> | null = null;
const originalFetch = globalThis.fetch;
const envKeys = ['SUPABASE_URL', 'VITE_SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_ANON_KEY', 'VITE_SUPABASE_PUBLISHABLE_KEY', 'VITE_SUPABASE_ANON_KEY'];
const saved = Object.fromEntries(envKeys.map(key => [key, process.env[key]]));
async function invoke(tag?: string, method = 'GET') {
  const headers: Record<string, string> = {}; let body: string | undefined;
  const response = { statusCode: 200, setHeader(name: string, value: string) { headers[name] = value; }, end(value?: string) { body = value; } };
  await handler({ method, headers: { 'if-none-match': tag, authorization: 'Bearer synthetic-owner-token' } } as any, response as any);
  return { status: response.statusCode, headers, body };
}
try {
  for (const key of envKeys) delete process.env[key];
  process.env.SUPABASE_URL = 'https://publication-fixture.supabase.test';
  process.env.SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_synthetic_fixture';
  globalThis.fetch = async (input: any, options: any) => {
    if (String(input) === '/api/content-publications') {
      assert.equal(options.cache, 'no-store');
      const result = await invoke(options.headers['if-none-match']);
      return new Response(result.body ?? null, { status: result.status, headers: result.headers });
    }
    const url = new URL(String(input)); requests.push(url);
    assert.equal(url.origin, 'https://publication-fixture.supabase.test');
    assert.equal(url.pathname, '/rest/v1/content_publications');
    assert.equal(options.headers.apikey, process.env.SUPABASE_PUBLISHABLE_KEY);
    assert.equal(options.headers.authorization, options.headers.apikey.startsWith('sb_publishable_') ? undefined : `Bearer ${options.headers.apikey}`,
      'Only a legacy anonymous key may be the upstream bearer; owner tokens never propagate');
    assert.equal(url.searchParams.get('select'), 'content_key,state,revision,row_id,row_updated_at,updated_at');
    assert(options.signal instanceof AbortSignal);
    await held;
    const filters = url.searchParams.getAll('content_key');
    if (failure === 'network' && filters.some(f => f.startsWith('gte.'))) return new Response('{}', { status: 503 });
    let page = rows.filter(row => filters.every(filter => {
      const dot = filter.indexOf('.'), op = filter.slice(0, dot), value = filter.slice(dot + 1);
      return op === 'gte' ? row.content_key >= value : op === 'lt' ? row.content_key < value : row.content_key > value;
    })).slice(0, Number(url.searchParams.get('limit')));
    if (failure === 'invalid' && filters.some(f => f.startsWith('gt.'))) page = [{}] as any;
    if (failure === 'cursor' && filters.some(f => f.startsWith('gt.'))) page = Array.from({ length: 1000 }, () => rows[0]);
    return Response.json(page);
  };
  let release!: () => void;
  held = new Promise<void>(resolve => { release = resolve; });
  const pending = invoke();
  await Promise.resolve();
  assert.equal(requests.length, 4, 'All disjoint ranges start concurrently');
  release(); held = null;
  const first = await pending;
  assert.equal(first.status, 200); assert.equal(requests.length, 6);
  assert.equal(first.headers['cache-control'], 'private, no-store');
  assert.deepEqual(JSON.parse(first.body!).publications, canonicalPublicationLedger(rows));
  const tag = first.headers.etag;
  requests = [];
  const unchanged = await invoke(tag);
  assert.equal(unchanged.status, 304); assert.equal(unchanged.body, undefined);
  assert.equal(requests.length, 6, '304 still requires a complete fresh database read');
  const clientRows = await loadPublicationLedgerFromApi([]);
  assert.deepEqual(await loadPublicationLedgerFromApi(clientRows), clientRows);
  rows[2] = { ...rows[2], state: 'retired', revision: 2, row_id: null as any, updated_at: '2026-09-21T16:01:00.000001Z' };
  const changed = await invoke(tag);
  assert.equal(changed.status, 200); assert.notEqual(changed.headers.etag, tag);
  const current = await loadPublicationLedgerFromApi(clientRows);
  assert.equal(current.find(row => row.content_key === rows[2].content_key)?.revision, 2);
  assert.equal(current.find(row => row.content_key === rows[2].content_key)?.state, 'retired');
  rows.push({ ...originalRows[0], content_key: 'zz/new-family' });
  assert.equal((await invoke(changed.headers.etag)).status, 200, 'Future key families invalidate the whole-set tag');
  for (failure of ['network', 'invalid', 'cursor']) {
    const bad = await invoke(tag);
    assert.equal(bad.status, 503, `${failure}: never return a partial ledger`);
    assert.equal(bad.headers.etag, undefined);
  }
  failure = '';
  assert.equal((await invoke(undefined, 'POST')).status, 405);
  process.env.SUPABASE_PUBLISHABLE_KEY = `e30.${Buffer.from(JSON.stringify({ role: 'anon' })).toString('base64url')}.synthetic`;
  assert.equal((await invoke()).status, 200, 'Legacy anonymous keys retain RLS');
  requests = [];
  process.env.SUPABASE_PUBLISHABLE_KEY = 'sb_secret_synthetic_disallowed';
  assert.equal((await invoke()).status, 503); assert.equal(requests.length, 0);
  process.env.SUPABASE_PUBLISHABLE_KEY = `e30.${Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url')}.synthetic`;
  assert.equal((await invoke()).status, 503); assert.equal(requests.length, 0);
  for (const response of [new Response(null, { status: 304, headers: { etag: 'wrong' } }), Response.json({ schema: 'tldr-publications/v1', publications: [{}] }), Response.json({ schema: 'tldr-publications/v1', publications: [] }, { headers: { etag: 'wrong' } })]) {
    globalThis.fetch = async () => response;
    await assert.rejects(loadPublicationLedgerFromApi(clientRows));
  }
  globalThis.fetch = async () => new Response(null, { status: 304 });
  await assert.rejects(loadPublicationLedgerFromApi([]), 'An unsolicited 304 cannot invent a verified cache');
} finally {
  globalThis.fetch = originalFetch;
  for (const key of envKeys) if (saved[key] === undefined) delete process.env[key]; else process.env[key] = saved[key];
}
console.log('PASS: actual public-ledger handler, anonymous-only upstream, all ranges/pages, complete fresh 304, retirement/new-key invalidation, exact client reuse, invalid-response rejection and all-or-nothing errors.');
