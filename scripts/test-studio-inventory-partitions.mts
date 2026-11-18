import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { PGlite } from '@electric-sql/pglite';
import { readStudioInventoryPasses, studioInventoryPageSize } from '../apps/admin/src/studioInventoryPagination';
import { studioInventoryPasses, studioInventoryQuery, studioInventoryRequestPath } from '../apps/admin/src/studioSectionInventory';
import { matchesStoredInventory } from '../tests/helpers/calendar-review-api.mjs';

process.env.NODE_ENV = 'test';
process.env.CONTENT_GENERATION_SECRET = 'partition-fixture';
process.env.SUPABASE_URL = 'https://partition.invalid';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'fixture';
const { default: handler } = await import('../api/admin/generated-content-inventory');
const db = new PGlite();
await db.exec(`create table inventory(id uuid primary key, updated_at timestamptz not null, content_key text);
  insert into inventory select md5(i::text)::uuid, '2026-10-01T00:00:00Z'::timestamptz - (i % 4) * interval '1 day', 'future-family/' || i from generate_series(1, 4801) i;
  insert into inventory values ('00000000-0000-0000-0000-000000000000','2026-10-01','lower'),
  ('55555555-5555-5555-5555-555555555555','2026-10-01','boundary-one'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','2026-10-01','boundary-two'),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff','2026-10-01','upper');`);
const originalFetch = globalThis.fetch;
const reads = [0, 0, 0];
let active = 0, peak = 0;
globalThis.fetch = async input => {
  const url = new URL(String(input));
  assert.equal(url.origin, 'https://partition.invalid');
  assert.equal(url.pathname, '/rest/v1/generated_interpretations');
  assert.equal(url.searchParams.get('order'), 'updated_at.desc,id.desc');
  assert(!url.searchParams.get('select')!.split(',').includes('body'));
  const range = url.searchParams.get('and')!;
  assert(/^\(id\.(?:gte|lt)\.[a-f0-9-]+(?:,id\.lt\.[a-f0-9-]+)?\)$/u.test(range));
  const lower = range.match(/id.gte.([a-f0-9-]+)/u)?.[1];
  const upper = range.match(/id.lt.([a-f0-9-]+)/u)?.[1];
  reads[lower ? upper ? 1 : 2 : 0]++;
  const conditions = [], values: string[] = [];
  if (lower) { values.push(lower); conditions.push(`id >= $${values.length}::uuid`); }
  if (upper) { values.push(upper); conditions.push(`id < $${values.length}::uuid`); }
  const cursorDate = url.searchParams.get('updated_at')?.slice(4);
  if (cursorDate) {
    const cursorId = url.searchParams.get('or')!.match(/id.lt.([a-f0-9-]+)/u)![1];
    values.push(cursorDate, cursorId);
    conditions.push(`(updated_at, id) < ($${values.length - 1}::timestamptz, $${values.length}::uuid)`);
  }
  active++; peak = Math.max(peak, active);
  try {
    await new Promise(resolve => setTimeout(resolve, 2));
    const result = await db.query(`select id, updated_at, content_key from inventory where ${conditions.join(' and ')} order by updated_at desc, id desc limit ${Number(url.searchParams.get('limit'))}`, values);
    return Response.json(result.rows);
  } finally { active--; }
};
async function request(path: string, authenticated = true) {
  const req = Readable.from([]) as any;
  req.method = 'GET'; req.url = path;
  req.headers = authenticated ? { 'x-content-generation-secret': 'partition-fixture' } : {};
  const res = { statusCode: 0, payload: null as any, setHeader() {}, end(body: string) { this.payload = JSON.parse(body); } };
  await handler(req, res as any);
  return res;
}
try {
  const query = studioInventoryQuery({ page: 'reviewQueue' });
  const passes = studioInventoryPasses(query);
  assert.deepEqual(passes.map(pass => pass.partition), [0, 1, 2]);
  let completions = 0;
  const rows = await readStudioInventoryPasses(passes, async (pass, cursor) => {
    const response = await request(studioInventoryRequestPath(pass, studioInventoryPageSize(cursor), cursor));
    assert.equal(response.statusCode, 200);
    return response.payload;
  }, (_rows, complete) => { if (complete) completions++; });
  const expected = await db.query<{ id: string }>('select id from inventory order by id');
  const fixtureRanges = [
    '(id.lt.55555555-5555-5555-5555-555555555555)',
    '(id.gte.55555555-5555-5555-5555-555555555555,id.lt.aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa)',
    '(id.gte.aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa)'
  ];
  const fixtureIds = fixtureRanges.flatMap(and => expected.rows
    .filter(row => matchesStoredInventory(row, new URLSearchParams({ and }))).map(row => row.id));
  assert.deepEqual(fixtureIds.sort(), expected.rows.map(row => row.id),
    'The isolated browser storage must implement exact UUID range boundaries, including gte, without dropping or duplicating rows.');
  assert.deepEqual(rows.map((row: any) => row.id).sort(), expected.rows.map(row => row.id));
  assert.equal(new Set(rows.map((row: any) => row.id)).size, 4805);
  assert(reads.every(count => count > 2), 'Each range must follow its cursor through timestamp ties');
  assert.equal(peak, 3); assert.equal(completions, 1);
  const readsBeforeInvalid = reads.reduce((a, b) => a + b, 0);
  for (const suffix of ['partition=-1', 'partition=3', 'partition=x', 'partition=0&scope=sky-types', 'partition=0&contentKeyPrefix=sky/', 'partition=0&id=one', 'partition=0&mode=card']) {
    assert.equal((await request(`/api/admin/generated-content-inventory?view=inventory&${suffix}`)).statusCode, 400);
  }
  const unauthorized = await request(studioInventoryRequestPath(passes[0], 80), false);
  assert([401, 403].includes(unauthorized.statusCode));
  assert.equal(reads.reduce((a, b) => a + b, 0), readsBeforeInvalid);
  console.log(JSON.stringify({ pass: 'partitioned actual inventory handler + PostgreSQL UUID ordering, boundary IDs, tied dates, all rows exactly once, validation and auth', rows: rows.length, reads, peak }));
} finally { globalThis.fetch = originalFetch; await db.close(); }
