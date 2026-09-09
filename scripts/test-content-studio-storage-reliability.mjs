import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { PGlite } from '@electric-sql/pglite';

process.env.NODE_ENV = 'test';
process.env.CONTENT_GENERATION_SECRET = 'storage-reliability-fixture';
process.env.SUPABASE_URL = 'https://storage-reliability.invalid';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'fixture';
const { default: handler } = await import('../api/admin/generated-content.ts');
process.env.CONTENT_GENERATION_SECRET = 'storage-reliability-fixture';
process.env.SUPABASE_URL = 'https://storage-reliability.invalid';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'fixture';

async function inventory(query = '') {
  const req = Readable.from([]);
  req.method = 'GET';
  req.url = `/api/admin/generated-content?status=all&visibility=all${query}`;
  req.headers = { authorization: 'Bearer storage-reliability-fixture' };
  const res = { statusCode: 0, setHeader() {}, end(body) { this.payload = JSON.parse(body); } };
  await handler(req, res);
  return res;
}

for (const invalid of [null, {}, { error: 'upstream failure' }]) {
  globalThis.fetch = async () => Response.json(invalid);
  const result = await inventory();
  assert.equal(result.statusCode, 502, 'An invalid storage list must never be reported as a successful inventory');
  assert.equal(result.payload.ok, false);
  assert.equal(result.payload.rows, undefined);
}
globalThis.fetch = async () => new Response('{truncated', { status: 200 });
assert.equal((await inventory()).statusCode, 502);
globalThis.fetch = async () => Response.json([]);
const empty = await inventory();
assert.equal(empty.statusCode, 200);
assert.deepEqual(empty.payload.rows, [], 'A genuinely empty inventory remains a valid response');

// Headers arrive immediately, but the body stalls. The storage deadline must
// cover both phases. Shorten only that deadline in this isolated test process.
const realTimeout = globalThis.setTimeout;
globalThis.setTimeout = (callback, delay, ...args) => realTimeout(callback, delay === 8000 ? 20 : delay, ...args);
try {
  let aborted = false;
  globalThis.fetch = async (_input, { signal }) => new Response(new ReadableStream({
    start(controller) {
      const timer = realTimeout(() => { controller.enqueue(new TextEncoder().encode('[]')); controller.close(); }, 100);
      signal.addEventListener('abort', () => {
        aborted = true;
        clearTimeout(timer);
        controller.error(new DOMException('Aborted', 'AbortError'));
      }, { once: true });
    }
  }));
  assert.equal((await inventory()).statusCode, 504, 'A stalled response body must hit the storage timeout');
  assert.equal(aborted, true);
} finally { globalThis.setTimeout = realTimeout; }

const cursor = { updatedAt: '2026-09-02T11:00:00.000Z', id: 'page-a' };
let captured;
globalThis.fetch = async input => { captured = new URL(String(input)); return Response.json([]); };
await inventory(`&cursor=${encodeURIComponent(Buffer.from(JSON.stringify(cursor)).toString('base64url'))}`);
assert.equal(captured.searchParams.get('updated_at'), `lte.${cursor.updatedAt}`);
assert.equal(captured.searchParams.get('or'), `(updated_at.lt.${cursor.updatedAt},and(updated_at.eq.${cursor.updatedAt},id.lt.${cursor.id}))`);
assert.equal(captured.searchParams.get('offset'), '0');

const db = new PGlite();
try {
  await db.exec(`
    create table inventory (id int primary key, updated_at timestamptz not null, body text);
    insert into inventory select i, '2026-01-01'::timestamptz + (i / 100) * interval '1 second', repeat('Fixture ', 100)
      from generate_series(1,16000) i;
    create index inventory_updated_id on inventory(updated_at desc, id desc);
    analyze inventory;
  `);
  const point = (await db.query('select updated_at, id from inventory order by updated_at desc,id desc offset 8000 limit 1')).rows[0];
  const predicate = '(updated_at < $1 or (updated_at = $1 and id < $2))';
  const values = [point.updated_at, point.id];
  const original = `select * from inventory where ${predicate} order by updated_at desc,id desc limit 400`;
  const bounded = `select * from inventory where updated_at <= $1 and ${predicate} order by updated_at desc,id desc limit 400`;
  assert.deepEqual((await db.query(bounded, values)).rows, (await db.query(original, values)).rows, 'The optimized query preserves every row, order, and full body, including timestamp ties');
  const plan = (await db.query(`explain (analyze,format json) ${bounded}`, values)).rows[0]['QUERY PLAN'][0].Plan.Plans[0];
  assert.match(plan['Index Cond'], /updated_at <=/);
  assert.ok(plan['Rows Removed by Filter'] <= 100, 'Later pages skip only the 100-row timestamp group, not thousands of earlier inventory rows');
  for (const point of [{updated_at:'2025-01-01T00:00:00Z',id:1}, {updated_at:'2027-01-01T00:00:00Z',id:16000}]) {
    const values = [point.updated_at,point.id];
    assert.deepEqual((await db.query(bounded,values)).rows,(await db.query(original,values)).rows);
  }
} finally { await db.close(); }
console.log('PASS Studio storage protocol errors, complete-body timeout, cursor request and indexed row parity');
