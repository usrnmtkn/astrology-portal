import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import {
  buildBirthTimeHistoryRepair, migrationVersion, migrationName,
  migrationSource, migrationSha256, previousStatement
} from './repair-birth-time-migration-history.mjs';

const db = new PGlite();
const sql = readFileSync(migrationSource, 'utf8');
const repair = buildBirthTimeHistoryRepair();
const readHistory = async () => (await db.query('select * from supabase_migrations.schema_migrations order by version')).rows;
try {
  await db.exec(`create schema supabase_migrations;
    create table supabase_migrations.schema_migrations(version text primary key, name text, statements text[], retained_metadata text);
    create role anon; create role authenticated; create role service_role;
    create table public.user_profiles(user_id uuid primary key, data jsonb);
    create table public.report_fulfillment_jobs(id uuid primary key, state text, run_after timestamptz, locked_at timestamptz, locked_by text, attempt integer);
  `);
  await db.query('insert into supabase_migrations.schema_migrations values ($1,$2,$3,$4)',
    [migrationVersion, migrationName, [previousStatement], 'retain this audit metadata']);
  await db.query('insert into supabase_migrations.schema_migrations values ($1,$2,$3,$4)',
    ['20260810130000', 'unrelated', ['select 1;'], 'unrelated metadata']);
  const syntheticProfile = { profile: { charts: [{ birthTime: '11:20 AM' }] }, theme: 'dark' };
  await db.query('insert into user_profiles values ($1,$2)', ['aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', syntheticProfile]);
  const before = await readHistory();
  await assert.rejects(db.exec(previousStatement), error => error.code === '42601', 'The saved annotation reproduces the replay syntax error.');
  await db.exec(repair);
  const after = await readHistory();
  assert.deepEqual(after, before.map(row => row.version === migrationVersion ? { ...row, statements: [sql] } : row));
  assert.deepEqual((await db.query('select data from user_profiles')).rows[0].data, syntheticProfile, 'Repair must not run the historical profile backfill.');
  assert.equal((await db.query("select to_regprocedure('public.canonical_birth_time_text(text)') as fn")).rows[0].fn, null, 'Repair must not recreate historical functions.');
  await db.exec(repair);
  assert.deepEqual(await readHistory(), after, 'Repeated repair is a no-op.');

  // Actually replay the repaired history into the isolated fixture database.
  await db.exec(after.find(row => row.version === migrationVersion).statements[0]);
  assert.equal((await db.query("select canonical_birth_time_text('11:20 PM') as value")).rows[0].value, '23:20');
  assert.equal((await db.query("select data->'profile'->'charts'->0->>'birthTime' as value from user_profiles")).rows[0].value, '11:20');
  await db.exec(readFileSync(new URL('../apps/web/supabase/migrations/20261004160915_authenticated_birth_time_normalization.sql', import.meta.url), 'utf8'));
  assert.equal((await db.query("select has_function_privilege('authenticated','public.canonical_birth_time_text(text)','execute') as allowed")).rows[0].allowed, true);
  await db.exec(repair);
  assert.equal((await db.query("select has_function_privilege('authenticated','public.canonical_birth_time_text(text)','execute') as allowed")).rows[0].allowed, true, 'Metadata repair must not undo later grants.');

  assert.throws(() => buildBirthTimeHistoryRepair(sql + '\n'), /SHA-256/);
  for (const changed of [[migrationName, ['select 2;']], [migrationName, null], ['changed_name', [previousStatement]]]) {
    await db.query('update supabase_migrations.schema_migrations set name=$1,statements=$2 where version=$3', [...changed, migrationVersion]);
    const current = await readHistory();
    await assert.rejects(db.exec(repair), /refusing to overwrite/);
    await db.exec('rollback');
    assert.deepEqual(await readHistory(), current, 'Concurrent or unexpected history must remain unchanged.');
  }
  await db.query('delete from supabase_migrations.schema_migrations where version=$1', [migrationVersion]);
  await assert.rejects(db.exec(repair), /record is missing/);
  await db.exec('rollback');
  console.log(`PASS migration history repair: original replay error, exact ${migrationSha256}, metadata-only update, real replay, idempotence, later grants, changed/missing history refusal.`);
} finally { await db.close(); }
