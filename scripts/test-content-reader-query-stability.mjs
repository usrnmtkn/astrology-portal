import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const db = new PGlite();
try {
  await db.exec(`
    create role anon;
    create table public.generated_interpretations (
      id integer primary key, provider text, status text, lane text,
      review_state text, body text
    );
    insert into public.generated_interpretations
    select i, case when i % 5 = 0 then 'fixture-provider' else 'other-provider' end,
      case when i % 3 = 0 then 'DRAFT' else 'LIVE' end,
      case when i % 7 = 0 then 'reference' else 'serving' end,
      case when i % 11 = 0 then 'needs-review' else null end,
      repeat('Fixture prose ',100)
    from generate_series(1,16000) i;
    alter table public.generated_interpretations enable row level security;
    grant select on public.generated_interpretations to anon;
    create policy reader on public.generated_interpretations for select to anon
      using (status='LIVE' and lane='serving' and review_state is null);
  `);
  const query = `select * from public.generated_interpretations
    where provider='fixture-provider' and status='LIVE' and lane='serving'
    and review_state is null and id > 200 order by id limit 1000`;
  await db.exec('set role anon');
  const before = (await db.query(query)).rows;
  await db.exec('reset role');
  const migration = readFileSync(new URL('../apps/web/supabase/migrations/20260908171846_content_reader_query_stability.sql', import.meta.url), 'utf8');
  await db.exec(migration);
  await db.exec(migration); // Retry-safe recovery rollout.
  await db.exec('set role anon');
  assert.deepEqual((await db.query(query)).rows, before, 'Index migration preserves exact reader rows and cursor order');
  const plan = JSON.stringify((await db.query(`explain (format json) ${query}`)).rows);
  assert.ok(plan.includes('Index Scan'), 'Reader page follows an index in cursor order');
  assert.ok(!plan.includes('"Node Type":"Sort"'), 'Reader page does not sort the entire prose inventory');
  assert.equal((await db.query("select * from generated_interpretations where status='DRAFT' or lane='reference' or review_state is not null")).rows.length,0);
  await assert.rejects(db.exec("update generated_interpretations set status='LIVE' where id=3"), /permission denied/);
  console.log('PASS indexed cursor pages, exact row preservation, repeat application, and anonymous RLS/write restrictions');
} finally { await db.close(); }
