import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const migration = name => readFileSync(`apps/web/supabase/migrations/${name}.sql`, 'utf8');
// Exact production ledger SQL retrieved on 2026-10-12. Historical bodies are
// immutable: subsequent changes belong in a new migration.
const preview = migration('20260907074128_ask_tldr_owner_preview_content_studio');
const feedback = migration('20260914150654_studio_explicit_writing_feedback');
const cutover = readFileSync('scripts/sql/content-studio-reader-cutover.sql', 'utf8');
for (const [sql, hash] of [
  [preview, '015f89df58f309508ae9c3b527ee91dd59cddd88d8bffa98feb7c44e414e7346'],
  [feedback, 'ad8320a9e8145c3f86159dc3488708bb220ffa55553d5c746b89dc16b3b2287b'],
  [cutover, '7634c04b05c4f15f6548509a8090368238ce9c5cc6de727cda6a3d25f4128ec4']
]) assert.equal(createHash('sha256').update(sql).digest('hex'), hash);

const db = new PGlite();
try {
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create table generated_interpretations(id uuid primary key default gen_random_uuid(),
      content_key text, surface text, mode text, status text, target_date date,
      body text, updated_at timestamptz default now());
    insert into generated_interpretations(content_key,surface,mode,status,body)
      values('qa/preserved','sky','feed','LIVE','Synthetic saved text');`);
  await db.exec(preview);
  await db.exec("insert into generated_interpretations(content_key,surface,mode,status,body) values('qa/preview','ask_tldr','preview','DRAFT','Synthetic private question')");
  await assert.rejects(db.exec("update generated_interpretations set status='LIVE' where surface='ask_tldr'"), e => e.code === '23514');
  await db.exec(migration('20260911152710_studio_memory_feedback'));
  await db.exec(migration('20260911212849_studio_article_memory_feedback'));
  await db.exec(feedback);
  assert.equal((await db.query('select count(*)::int as count from studio_writing_feedback')).rows[0].count, 0, 'Restoration does not backfill or approve feedback');
  const record = text => db.query(`select * from record_studio_writing_feedback(
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','rejection',array['qa/fixture'],$1,null,'Synthetic reason',
    'thread:bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','2026-09-14T00:00:00Z')`, [text]);
  for (const role of ['anon', 'authenticated']) {
    await db.exec(`set role ${role}`);
    await assert.rejects(db.query('select * from studio_writing_feedback'), e => e.code === '42501');
    await assert.rejects(record('Synthetic rejected passage'), e => e.code === '42501');
    await db.exec('reset role');
  }
  await db.exec('set role service_role');
  const first = (await record('Synthetic rejected passage')).rows[0];
  assert.deepEqual((await record('Synthetic rejected passage')).rows[0], first, 'Capture retry is idempotent');
  await assert.rejects(record('Different fixture'), e => e.code === '40001');
  assert.equal((await db.query('select snapshot from studio_memory_active_snapshot()')).rows[0].snapshot.writingFeedback[0].rejected_text, 'Synthetic rejected passage');
  await db.query(`select * from retire_studio_writing_feedback($1,1,
    'cccccccc-cccc-cccc-cccc-cccccccccccc','Synthetic retirement','thread:bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')`, [first.id]);
  assert.equal((await record('Synthetic rejected passage')).rows[0].status, 'retired', 'An old capture retry cannot reactivate retired feedback');
  assert.deepEqual((await db.query('select snapshot from studio_memory_active_snapshot()')).rows[0].snapshot.writingFeedback, []);
  await db.exec('reset role');
  assert.equal((await db.query("select body from generated_interpretations where content_key='qa/preserved'")).rows[0].body, 'Synthetic saved text');
  await db.exec('grant select on generated_interpretations to anon,authenticated; grant select(body) on generated_interpretations to anon,authenticated');
  await db.exec(cutover);
  for (const role of ['anon', 'authenticated']) {
    assert.equal((await db.query("select has_any_column_privilege($1,'generated_interpretations','select') as allowed", [role])).rows[0].allowed, false);
  }
  console.log('PASS restored migration hashes and isolated replay: private preview constraint, feedback capture/retry/retirement, role isolation, preserved copy, raw reader cutover.');
} finally { await db.close(); }
