import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const migration = name => readFileSync(new URL(`../apps/web/supabase/migrations/${name}`, import.meta.url), 'utf8');
const db = new PGlite();
const owner = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const signature = 'public.claim_report_facts_window(text,uuid,text)';
const claim = (key, worker) => db.query('select public.claim_report_facts_window($1,$2,$3) as claimed', [key, owner, worker]);
try {
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create role unrelated_client;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
    create table public.user_reports(id uuid primary key, user_id uuid, report_type text,
      report_domain text, report_horizon text, subject_id uuid, period_start date, period_end date,
      facts jsonb, facts_engine text, status text);
  `);
  await db.exec(migration('20260809150000_report_fulfillment.sql'));
  await db.query('insert into auth.users values($1)', [owner]);
  // Match both the default PUBLIC grant and explicit Supabase client grants.
  await db.exec(`grant execute on function ${signature} to anon, authenticated, service_role; set role anon`);
  assert.equal((await claim('preexisting-window', 'worker-before')).rows[0].claimed, true, 'Reproduce the original RLS bypass');
  await db.exec('reset role');
  const beforeRows = (await db.query('select * from public.report_facts_claims')).rows;
  const beforeDefinition = (await db.query('select pg_get_functiondef($1::regprocedure) as definition', [signature])).rows;
  const fix = migration('20261012040303_restrict_report_facts_claim_execution.sql');
  await db.exec(fix);
  await db.exec(fix);
  assert.deepEqual((await db.query('select * from public.report_facts_claims')).rows, beforeRows, 'Permission repair is idempotent and preserves existing locks');
  assert.deepEqual((await db.query('select pg_get_functiondef($1::regprocedure) as definition', [signature])).rows, beforeDefinition, 'Function behavior remains unchanged');
  for (const role of ['anon', 'authenticated', 'unrelated_client']) {
    assert.equal((await db.query("select has_function_privilege($1,$2,'execute') as allowed", [role, signature])).rows[0].allowed, false);
    await db.exec(`set role ${role}`);
    await assert.rejects(claim('denied-window', role), error => error.code === '42501');
    await assert.rejects(db.query('insert into report_facts_claims(window_key,user_id,locked_by) values($1,$2,$3)', ['direct-window', owner, role]), error => error.code === '42501');
    await db.exec('reset role');
  }
  assert.deepEqual((await db.query('select * from public.report_facts_claims')).rows, beforeRows, 'Denied clients create no locks');
  await db.exec('set role service_role');
  assert.equal((await claim('worker-window', 'worker-1')).rows[0].claimed, true);
  assert.equal((await claim('worker-window', 'worker-2')).rows[0].claimed, false, 'An active lock remains exclusive');
  await db.exec("reset role; update report_facts_claims set locked_at=now()-interval '16 minutes' where window_key='worker-window'; set role service_role");
  assert.equal((await claim('worker-window', 'worker-2')).rows[0].claimed, true, 'Worker can reclaim an expired lock');
  await db.exec('reset role');
  assert.equal((await db.query("select locked_by from report_facts_claims where window_key='worker-window'")).rows[0].locked_by, 'worker-2');
  console.log('PASS report facts RPC: reproduced exposure, client/PUBLIC denial, unchanged data and definition, idempotent repair, worker claims and stale-lock recovery.');
} finally { await db.close(); }
