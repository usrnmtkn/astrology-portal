import assert from 'node:assert/strict';
import handler from '../api/content-publications';
import { canonicalPublicationLedger, loadPublicationLedgerFromApi } from '../apps/web/src/services/publicationLedgerTransport';
import { isSkyListPublicationKey } from '../apps/web/src/content/skyListPublicationScope';
import { installContentPublications, publicationLedgerReady, publicationAllowsContent, publicationLedgerKey } from '../apps/web/src/content/contentPublicationState';

const keys = ['!', '__content-publication-ledger/v1', 'authored/compat-pair/s', 'authored/transit-aspect/s', 'authored/transit-house-sign/s', 'fallback-hook/n', 'sky-placement', 'zz/future',
  ...Array.from({ length: 2010 }, (_, i) => `authored/compat-pair/a-${String(i).padStart(4, '0')}`)].sort();
const originalRows = keys.map((content_key, i) => ({ content_key, state: i % 17 === 0 ? 'retired' : 'live', revision: 1,
  row_id: content_key, row_updated_at: '2026-09-21T16:00:00.123456Z', updated_at: '2026-09-21T16:00:00.123456Z' }));
let rows = structuredClone(originalRows), requests: URL[] = [], failure = '', held: Promise<void> | null = null, compressed = false;
const originalFetch = globalThis.fetch;
const envKeys = ['SUPABASE_URL', 'VITE_SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_ANON_KEY', 'VITE_SUPABASE_PUBLISHABLE_KEY', 'VITE_SUPABASE_ANON_KEY'];
const saved = Object.fromEntries(envKeys.map(key => [key, process.env[key]]));
async function invoke(tag?: string, method = 'GET', url = '/api/content-publications') {
  const headers: Record<string, string> = {}; let body: string | undefined;
  const response = { statusCode: 200, setHeader(name: string, value: string) { headers[name] = value; }, end(value?: string) { body = value; } };
  await handler({ method, url, headers: { 'if-none-match': tag, authorization: 'Bearer synthetic-owner-token' } } as any, response as any);
  return { status: response.statusCode, headers, body };
}
try {
  for (const key of envKeys) delete process.env[key];
  process.env.SUPABASE_URL = 'https://publication-fixture.supabase.test';
  process.env.SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_synthetic_fixture';
  globalThis.fetch = async (input: any, options: any) => {
    if (String(input).startsWith('/api/content-publications')) {
      assert.equal(options.cache, 'no-store');
      const result = await invoke(options.headers['if-none-match'], 'GET', String(input));
      if (compressed && result.headers.etag) result.headers.etag = `W/${result.headers.etag}`;
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
  assert.equal(requests.length, 6, 'All disjoint ranges start concurrently');
  release(); held = null;
  const first = await pending;
  assert.equal(first.status, 200); assert.equal(requests.length, 8);
  assert.equal(first.headers['cache-control'], 'private, no-store');
  assert.deepEqual(JSON.parse(first.body!).publications, canonicalPublicationLedger(rows));
  const tag = first.headers.etag;
  requests = [];
  const unchanged = await invoke(tag);
  assert.equal(unchanged.status, 304); assert.equal(unchanged.body, undefined);
  assert.equal(requests.length, 8, '304 still requires a complete fresh database read');
  assert.equal((await invoke(`W/${tag}`)).status, 304, 'GET uses weak ETag comparison after HTTP compression');
  compressed = true;
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
  {
    const savedRows = rows;
    rows = ['authored/compat-pair/a-', 'authored/transit-aspect/a-',
      'authored/transit-house-sign/a-', 'authored/transit-house-sign/t-',
      'fallback-hook/p-', 'sky-placement/article/'].flatMap(prefix =>
        Array.from({ length: 700 }, (_, i) => ({ ...originalRows[0], content_key: `${prefix}${String(i).padStart(4, '0')}` })));
    requests = [];
    const balanced = await invoke();
    assert.equal(balanced.status, 200);
    assert.equal(requests.length, 6, 'Balanced families return every publication in one concurrent wave');
    assert.deepEqual(JSON.parse(balanced.body!).publications, canonicalPublicationLedger(rows));
    rows = savedRows;
  }
  {
    const scopeUrl='/api/content-publications?scope=sky-list';
    rows.push(...['sky-placement/article/sun/scorpio','sky-nodes/north-node/aquarius','sky-article/sun/scorpio/2026/2026-10-23',
      'sky-season-fallback/sun/scorpio/future','fallback-vocab/planet-topic/sun','cc/sign/future/actions'].map((content_key,index)=>({
        ...originalRows[0],content_key,state:index===1?'retired':'live',row_id:index===1?null:content_key
      })) as any);
    rows.sort((a,b)=>a.content_key<b.content_key?-1:1);
    requests=[];
    const scoped=await invoke(undefined,'GET',scopeUrl);
    assert.equal(scoped.status,200);
    const scopedRows=JSON.parse(scoped.body!).publications;
    assert.equal(JSON.parse(scoped.body!).schema,'tldr-sky-list-publications/v1');
    assert.deepEqual(scopedRows,canonicalPublicationLedger(rows.filter(row=>isSkyListPublicationKey(row.content_key))));
    assert(scopedRows.some((row:any)=>row.state==='retired'),'Retirements remain in the scoped proof.');
    assert.equal(requests.length,8,'The smaller response still verifies all upstream ranges/pages.');
    assert.equal((await invoke(scoped.headers.etag,'GET',scopeUrl)).status,304);
    assert.deepEqual(await loadPublicationLedgerFromApi([], 'sky-list'),scopedRows);
    assert.deepEqual(await loadPublicationLedgerFromApi(scopedRows, 'sky-list'),scopedRows);
    assert.throws(()=>installContentPublications([originalRows.find(row=>row.content_key===publicationLedgerKey)!],'complete-sky-list'),/coverage/);
    installContentPublications(scopedRows,'complete-sky-list');
    assert.equal(publicationLedgerReady(),false,'List coverage cannot establish full-reader readiness.');
    installContentPublications([originalRows.find(row=>row.content_key===publicationLedgerKey)!]);
    assert.equal(publicationLedgerReady(),false,'A partial content page cannot upgrade the scoped proof.');
    const live=scopedRows.find((row:any)=>row.state==='live');
    assert(publicationAllowsContent(live.content_key,live.row_id,live.row_updated_at));
    assert(!publicationAllowsContent(live.content_key,'older-id',live.row_updated_at));
    assert(!publicationAllowsContent('sky-nodes/north-node/aquarius','anything',originalRows[0].updated_at));
    assert(!publicationAllowsContent('sky-placement/article/future/new-sign','unpublished-row',originalRows[0].updated_at),'An absent Studio publication cannot enter scoped readers.');
    rows.push({...originalRows[0],content_key:'sky-placement/new-family/future',state:'live'});
    rows.sort((a,b)=>a.content_key<b.content_key?-1:1);
    assert.equal((await invoke(scoped.headers.etag,'GET',scopeUrl)).status,200,'New covered families invalidate scoped coverage.');
    assert.equal((await invoke(undefined,'GET','/api/content-publications?scope=unknown')).status,400);
    const savedRows=rows;rows=rows.filter(row=>row.content_key!==publicationLedgerKey);
    assert.equal((await invoke(undefined,'GET',scopeUrl)).status,503,'Missing upstream ledger marker cannot establish scoped coverage.');rows=savedRows;
  }
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
