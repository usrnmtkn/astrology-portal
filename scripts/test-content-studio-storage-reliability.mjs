import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { PGlite } from '@electric-sql/pglite';

process.env.NODE_ENV = 'test';
process.env.CONTENT_GENERATION_SECRET = 'storage-reliability-fixture';
process.env.SUPABASE_URL = 'https://storage-reliability.invalid';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'fixture';
const { default: handler } = await import('../api/admin/generated-content.ts');
const { default: fastInventoryHandler } = await import('../api/admin/generated-content-inventory.ts');
process.env.CONTENT_GENERATION_SECRET = 'storage-reliability-fixture';
process.env.SUPABASE_URL = 'https://storage-reliability.invalid';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'fixture';

async function inventory(query = '', actualHandler = handler) {
  const req = Readable.from([]);
  req.method = 'GET';
  req.url = `/api/admin/generated-content?status=all&visibility=all${query}`;
  req.headers = { authorization: 'Bearer storage-reliability-fixture' };
  const res = { statusCode: 0, setHeader() {}, end(body) { this.payload = JSON.parse(body); } };
  await actualHandler(req, res);
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

// Opening a document needs one indexed lookup, independent of listing metadata.
let detailReads = 0;
const saved = { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', content_key: 'fallback-hook/sky-placement-hook/moon/cancer', body: 'Synthetic opening.\n\nSynthetic ending.', updated_at: '2026-10-03T12:00:00Z', sections: { packageRecord: { body_you: 'Complete synthetic saved document.' } } };
globalThis.fetch = async input => {
  detailReads++;
  const query = new URL(String(input)).searchParams;
  assert.equal(query.get('id'), `eq.${saved.id}`);
  assert.equal(query.get('limit'), '1');
  assert.ok(!query.get('select').split(',').includes('studio_facts'));
  return Response.json([saved]);
};
const detail = await inventory(`&id=${saved.id}`, fastInventoryHandler);
assert.equal(detail.statusCode, 200);
assert.equal(detailReads, 1);
assert.deepEqual(detail.payload.rows, [{ ...saved, inventory_only: false }]);
globalThis.fetch = async () => Response.json({ error: 'Unavailable' }, { status: 503 });
assert.equal((await inventory(`&id=${saved.id}`, fastInventoryHandler)).statusCode, 502);

// Lists must not download every edition's accumulated provider evidence. Only
// an explicit open returns the full document needed by recovery comparisons.
const horoscope = {...saved, content_key:'horoscope/weekly/fixture', mode:'article', status:'DRAFT',
  headline:'Synthetic weekly edition', sections:{horoscopeEdition:{window:{period:'weekly'},passages:[]}},
  source_snapshot:{history:'Complete synthetic evidence. '.repeat(700_000)}, studio_facts:null};
globalThis.fetch = async input => {
  const query = new URL(String(input)).searchParams;
  assert.equal(query.get('mode'),'eq.article');
  const columns=query.get('select');
  return Response.json([columns==='*'?horoscope:Object.fromEntries(columns.split(',').map(key=>[key,horoscope[key]]))]);
};
const legacyList=await inventory('&horoscopeEditions=true');
assert.equal(legacyList.statusCode,200);
assert.equal(typeof legacyList.payload.rows[0].source_snapshot?.history,'string','Already-open clients still expect complete edition documents');
assert.deepEqual(legacyList.payload.rows,[horoscope]);
const editionList=await inventory('&horoscopeEditions=true&editionInventory=true');
assert.equal(editionList.statusCode,200);
assert.equal(editionList.payload.rows[0].source_snapshot,undefined,'A list must exclude large generation history at the storage query');
assert.equal(editionList.payload.rows[0].inventory_only,true,'A list row must never be treated as an editable full document');
assert.deepEqual(editionList.payload.rows[0].sections,horoscope.sections);
assert.ok(JSON.stringify(editionList.payload).length<2000);
for(const query of [`id=${saved.id}`,`contentKey=${horoscope.content_key}`,`id=${saved.id}&editionInventory=true`]) {
  const opened=await inventory(`&horoscopeEditions=true&${query}`);
  assert.equal(opened.statusCode,200);
  assert.deepEqual(opened.payload.rows,[horoscope],'An explicit open retains every original field and byte');
}
assert.equal((await inventory('&horoscopeEditions=true&contentKey=other/family')).statusCode,400);

// Headers arrive immediately, but the body stalls. The storage deadline must
// cover both phases. Shorten only that deadline in this isolated test process.
const realTimeout = globalThis.setTimeout;
globalThis.setTimeout = (callback, delay, ...args) => realTimeout(callback, delay === 8000 ? 20 : delay === 30000 ? 80 : delay, ...args);
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
  const boundedOpen=await inventory(`&horoscopeEditions=true&id=${saved.id}`);
  assert.equal(boundedOpen.statusCode,504,'The longer full-document deadline remains bounded');
  assert.match(boundedOpen.payload.error,/30 seconds/);
  globalThis.fetch = async () => new Response(new ReadableStream({
    start(controller) { realTimeout(()=>{controller.enqueue(new TextEncoder().encode('[]'));controller.close();},40); }
  }));
  assert.equal((await inventory(`&horoscopeEditions=true&id=${saved.id}`)).statusCode,200,'A full edition may take longer than the short inventory deadline');
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
