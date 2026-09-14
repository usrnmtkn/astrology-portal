import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { servingPackageRecords } from '../api/_lib/content-live-status.ts';
import handler, { normalizeNatalPlacementPreviewInput, renderNatalPlacementPreviewState } from '../api/admin/natal-placement-preview.ts';

process.env.CONTENT_GENERATION_SECRET = 'empty-house-fixture';
process.env.SUPABASE_URL = 'https://empty-house-preview.invalid';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'fixture-only';
const input = { kind: 'empty-house', house: '2', sign: 'aries', rulerHouse: 6, audience: 'you', overrides: [] };
let publications: any[] = [];
let rows: any[] = [];
let reads = 0;
globalThis.fetch = async (url, init) => {
  const parsed = new URL(String(url));
  assert.equal(parsed.origin, 'https://empty-house-preview.invalid');
  assert.equal(init?.method ?? 'GET', 'GET');
  reads++;
  if (parsed.pathname.endsWith('/content_publications')) return Response.json(publications);
  assert.equal(parsed.pathname, '/rest/v1/generated_interpretations');
  return Response.json(rows);
};
async function request(body: unknown, authorized = true) {
  const req = Readable.from([JSON.stringify(body)]) as any;
  req.method = 'POST';
  req.headers = { 'content-type': 'application/json', ...(authorized ? { 'x-content-generation-secret': 'empty-house-fixture' } : {}) };
  let value: any;
  const res: any = { statusCode: 200, setHeader() {}, end(text: string) { value = JSON.parse(text); } };
  await handler(req, res);
  return { status: res.statusCode, value };
}
assert.equal((await request(input, false)).status, 401);
assert.equal(reads, 0);
for (const invalid of [{ ...input, house: '0' }, { ...input, rulerHouse: 2 }, { ...input, rulerHouse: 13 }, { ...input, sign: 'invalid' }]) {
  assert.equal((await request(invalid)).status, 400);
}
assert.equal(reads, 0);
const baseline = await request(input);
assert.equal(baseline.status, 200);
assert.deepEqual(baseline.value.rendered, renderNatalPlacementPreviewState(normalizeNatalPlacementPreviewInput(input)).rendered);
assert(baseline.value.rendered.body.length > 0);
const key = baseline.value.rendered.sourceKeys.find((key: string) => key.startsWith('fallback-hook/empty-house/sign/'));
assert(key);
const source = servingPackageRecords.get(key)!;
const copy = 'Fixture opening for the current empty house. Fixture final sentence.';
const updated = '2026-09-14T00:00:00.000001Z';
publications = [{ content_key: key, state: 'live', revision: 1, row_id: 'fixture', row_updated_at: updated, updated_at: updated }];
rows = [{ id: 'fixture', content_key: key, status: 'LIVE', lane: 'serving', review_state: null,
  provider: 'tldrastro-fallback-architecture-v3', updated_at: updated, body: copy,
  sections: { packageRecord: { ...source, review_status: 'approved', body: copy, body_you: copy, body_they: copy } } }];
const published = await request(input);
assert.equal(published.status, 200);
assert(published.value.rendered.body.includes(copy), JSON.stringify({ applied: published.value.appliedOverrideKeys, ignored: published.value.ignoredOverrides }));
assert(published.value.appliedOverrideKeys.includes(key));
publications[0] = { ...publications[0], state: 'retired', revision: 2 };
rows = [];
const retired = await request(input);
assert.equal(retired.status, 400);
assert.match(retired.value.error, /SOURCE_GAP/);
console.log('PASS actual empty-house preview handler: auth, input validation, shipped copy, current publication, retirement, and GET-only storage.');
