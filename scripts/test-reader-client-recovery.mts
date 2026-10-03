import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import handler from '../api/content-reader.ts';
import { loadReaderRows } from '../apps/web/src/services/readerContentClient.ts';
import { publicationLedgerKey } from '../apps/web/src/content/contentPublicationState.ts';

process.env.SUPABASE_URL = 'https://reader-recovery.invalid';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'synthetic-reader-recovery-key';
const originalFetch = globalThis.fetch;
const stamp = '2026-10-03T00:00:00.000Z';
const body = '  Synthetic complete opening.\n\nComplete final sentence.  ';
const makeRow = (i: number) => ({ id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
  content_key: `cms/recovery/${i}`, updated_at: stamp, surface: 'sky', mode: 'article', status: 'LIVE',
  lane: 'serving', review_state: null, target_date: null, body,
  source_snapshot: { contentType: 'manual', internalNotes: 'PRIVATE_RECOVERY_CANARY' }, sections: {} });
let rows = [makeRow(1)];
let retired = false, storageFailures = 0, networkFailures = 0, publicStatus = 0, malformed = false;
let failPublicPage = 0, retireOnFailure = false;
let queries: any[] = [];

globalThis.fetch = async (input, init) => {
  if (String(input) === '/api/content-reader') {
    assert.equal(init?.method, 'POST');
    assert.equal(init?.cache, 'no-store');
    queries.push(JSON.parse(String(init?.body)));
    if (networkFailures-- > 0) throw new TypeError('Synthetic connection interruption');
    if (publicStatus) return new Response('Unavailable', { status: publicStatus });
    if (malformed) return Response.json({ rows: [], nextCursor: null });
    if (queries.length === failPublicPage) storageFailures = 1;
    const req = Object.assign(Readable.from([String(init?.body)]), { method: 'POST', headers: {} });
    let result = new Response();
    const res: any = { statusCode: 200, setHeader() {}, end(payload: string) {
      result = new Response(payload, { status: this.statusCode, headers: { 'content-type': 'application/json' } });
    } };
    await handler(req as any, res);
    return result;
  }
  const url = new URL(String(input));
  assert.equal(url.origin, 'https://reader-recovery.invalid');
  assert.equal(new Headers(init?.headers).get('apikey'), 'synthetic-reader-recovery-key');
  if (storageFailures-- > 0) {
    if (retireOnFailure) retired = true;
    return new Response('Synthetic storage interruption', { status: 503 });
  }
  if (url.pathname.endsWith('/generated_interpretations')) {
    const after = url.searchParams.get('id')?.slice(3);
    return Response.json(rows.filter(row => !after || row.id > after).slice(0, 250));
  }
  assert.equal(url.pathname, '/rest/v1/content_publications');
  const keys = url.searchParams.get('content_key')!;
  return Response.json([
    { content_key: publicationLedgerKey, state: 'live', revision: 1, row_id: null, row_updated_at: null, updated_at: stamp },
    ...rows.filter(row => keys.includes(`"${row.content_key}"`)).map(row => ({ content_key: row.content_key,
      state: retired ? 'retired' : 'live', revision: retired ? 2 : 1, row_id: row.id, row_updated_at: stamp, updated_at: stamp }))
  ]);
};

try {
  storageFailures = 1;
  let result = await loadReaderRows({ keys: [rows[0].content_key] });
  assert.equal(result.error, null);
  assert.equal(queries.length, 2, 'A real handler 503 recovers without a page refresh.');
  assert.equal(result.data?.[0].body, body, 'The complete approved text survives retry.');
  assert(!JSON.stringify(result.data).includes('PRIVATE_RECOVERY_CANARY'));
  assert.deepEqual(queries[0], queries[1]);

  queries = []; networkFailures = 1;
  assert.equal((await loadReaderRows({ keys: [rows[0].content_key] })).error, null);
  assert.equal(queries.length, 2);

  queries = []; storageFailures = Infinity;
  result = await loadReaderRows({ keys: [rows[0].content_key] });
  assert(result.error); assert.equal(result.data, null);
  assert.equal(queries.length, 3, 'A persistent outage must stop after three attempts.');

  storageFailures = 0;
  for (const status of [401, 403, 404, 500]) {
    queries = []; publicStatus = status;
    assert((await loadReaderRows({ keys: [rows[0].content_key] })).error);
    assert.equal(queries.length, 1, `Do not retry status ${status}.`);
  }
  publicStatus = 0; queries = [];
  assert((await loadReaderRows({ keys: [] })).error);
  assert.equal(queries.length, 1, 'The actual handler validation error is not retried.');
  malformed = true; queries = [];
  assert((await loadReaderRows({ keys: [rows[0].content_key] })).error);
  assert.equal(queries.length, 1, 'Invalid content responses are not transient transport failures.');
  malformed = false;

  queries = []; storageFailures = Infinity;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30);
  result = await loadReaderRows({ keys: [rows[0].content_key] }, controller.signal);
  clearTimeout(timer);
  assert(result.error); assert.equal(result.data, null); assert.equal(queries.length, 1);

  queries = []; storageFailures = 1; retireOnFailure = true;
  result = await loadReaderRows({ keys: [rows[0].content_key] });
  assert.equal(result.error, null);
  assert.deepEqual(result.data, [], 'A retry must respect a retirement that happened during the failed request.');
  retireOnFailure = false; retired = false;

  rows = Array.from({ length: 251 }, (_, i) => makeRow(i + 1));
  queries = []; failPublicPage = 2;
  result = await loadReaderRows({ surfaces: ['sky'] });
  assert.equal(result.error, null); assert.equal(result.data?.length, 251);
  assert.equal(new Set(result.data?.map(row => row.id)).size, 251);
  assert.equal(queries.length, 3);
  assert(!queries[0].afterId); assert.equal(queries[1].afterId, rows[249].id);
  assert.deepEqual(queries[1], queries[2], 'Retry the failed page without duplicating the completed page.');
  assert.equal(result.data?.[0].body, body); assert.equal(result.data?.at(-1)?.body, body);
  console.log('PASS reader recovery: actual-handler 503, exact copy/privacy, network failure, bounded attempts, cancellation, non-retryable responses, retirement and pagination.');
} finally { globalThis.fetch = originalFetch; }
