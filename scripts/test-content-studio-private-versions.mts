import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Readable } from 'node:stream';
import { PGlite } from '@electric-sql/pglite';
import historyHandler from '../api/admin/content-history.ts';

const db = new PGlite();
const id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const original = '  Synthetic owner opening.\r\n\r\nComplete ending.  ';
try {
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create table public.generated_interpretations (id uuid primary key, content_key text, body text, sections jsonb, updated_at timestamptz);
    grant all on public.generated_interpretations to anon, authenticated, service_role;
    grant select(body) on public.generated_interpretations to anon, authenticated;
    alter table public.generated_interpretations enable row level security;
    create policy old_public_read on public.generated_interpretations for select using (true);`);
  const history = [{ body: 'Synthetic historical passage' }];
  await db.query('insert into generated_interpretations values($1,$2,$3,$4,$5)', [id, 'cms/test/history', original, { dashboardEditHistory: history }, '2026-09-21T18:00:00.123456Z']);
  const before = (await db.query('select to_jsonb(g) as row from generated_interpretations g')).rows[0].row;
  await db.exec(fs.readFileSync('apps/web/supabase/migrations/20260922002101_content_studio_private_versions.sql', 'utf8'));
  assert.deepEqual((await db.query('select to_jsonb(g) as row from generated_interpretations g')).rows[0].row, before, 'Backfill must not rewrite source data or its timestamp');
  assert.deepEqual((await db.query('select original_row from project_privacy.studio_row_versions')).rows[0].original_row, before);
  await db.exec('set role service_role');
  for (let i = 1; i <= 30; i++) await db.query('update generated_interpretations set body=$1,updated_at=$2 where id=$3', [original + i, `2026-09-21T18:01:${String(i).padStart(2, '0')}Z`, id]);
  const first: any = (await db.query('select content_studio_row_history($1) as history', [id])).rows[0].history;
  assert.equal(first.length, 25);
  const last: any = (await db.query('select content_studio_row_history($1,$2) as history', [id, first.at(-1).versionId])).rows[0].history;
  assert.equal(last.length, 6, 'History beyond the inline 25-entry cap survives');
  assert.equal(last.at(-1).row.body, original);
  assert.deepEqual(last.at(-1).row.sections.dashboardEditHistory, history);
  assert.equal(Date.parse(last.at(-1).rowUpdatedAt), Date.parse('2026-09-21T18:00:00.123456Z'));
  assert.match(last.at(-1).rowUpdatedAt, /\.123456[+-]/u, 'History must retain timestamp microseconds');
  await assert.rejects(db.query('delete from project_privacy.studio_row_versions'), /permission denied/);
  await db.exec('reset role');
  await assert.rejects(db.query('delete from project_privacy.studio_row_versions'), /append-only/);
  await assert.rejects(db.query("update project_privacy.studio_row_versions set original_row='{}'"), /append-only/);
  // A failed archive write must roll back the accepted source edit too.
  await db.exec("alter table project_privacy.studio_row_versions add constraint reject_fault check(original_row->>'body' <> 'fault')");
  await assert.rejects(db.query("update generated_interpretations set body='fault' where id=$1", [id]), /reject_fault/);
  assert.equal((await db.query('select body from generated_interpretations where id=$1', [id])).rows[0].body, original + 30);
  await db.exec(fs.readFileSync('scripts/sql/content-studio-reader-cutover.sql', 'utf8'));
  for (const role of ['anon', 'authenticated']) {
    await db.exec(`set role ${role}`);
    await assert.rejects(db.query('select body from generated_interpretations'), /permission denied/);
    await assert.rejects(db.query('select original_row from project_privacy.studio_row_versions'), /permission denied/);
    await assert.rejects(db.query('select content_studio_row_history($1)', [id]), /permission denied/);
    await db.exec('reset role');
  }
  await db.exec('set role service_role');
  assert.equal((await db.query('select body from generated_interpretations')).rows[0].body, original + 30, 'Owner server storage still works after cutover');
} finally { await db.close(); }

process.env.CONTENT_GENERATION_SECRET = 'history-test';
process.env.SUPABASE_URL = 'https://history.invalid';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'history-service';
let calls = 0;
const fetch = globalThis.fetch;
globalThis.fetch = async () => { calls++; return Response.json([{ versionId: '1', row: { body: original } }]); };
async function request(secret = '') {
  const req: any = Readable.from([]); req.method = 'GET'; req.url = `/api/admin/content-history?id=${id}`; req.headers = { 'x-content-generation-secret': secret };
  const res: any = { statusCode: 200, setHeader() {}, end(body: string) { this.payload = JSON.parse(body); } };
  await historyHandler(req, res); return res;
}
try {
  assert.equal((await request()).statusCode, 401); assert.equal(calls, 0);
  assert.equal((await request('not-owner')).statusCode, 401); assert.equal(calls, 0);
  const result = await request('history-test'); assert.equal(result.statusCode, 200); assert.equal(result.payload.versions[0].row.body, original);
} finally { globalThis.fetch = fetch; }
console.log('PASS private version backfill, exact history beyond 25 edits, immutable storage, rollback on capture failure, raw/column grant revocation and owner-only retrieval.');
