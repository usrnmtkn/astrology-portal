import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

// Execute the actual migration on an isolated PostgreSQL engine. No production
// connection, roles, report data or provider calls are used.
const db = new PGlite();
try {
  await db.exec(`create table public.transit_report_model_checkpoints (
    id integer primary key, step integer not null,
    response jsonb, constraint transit_report_model_checkpoints_step_check check(step between 0 and 6)
  ); insert into public.transit_report_model_checkpoints values (1, 6, '{"saved":"unchanged"}');`);
  const before = await db.query('select * from public.transit_report_model_checkpoints');
  await assert.rejects(db.query('insert into public.transit_report_model_checkpoints values (2,7,null)'), /check constraint/);
  const migration = fs.readFileSync('apps/web/supabase/migrations/20260922215546_transit_report_scoped_review_steps.sql', 'utf8');
  await db.exec(migration);
  assert.deepEqual((await db.query('select * from public.transit_report_model_checkpoints')).rows, before.rows);
  await db.query('insert into public.transit_report_model_checkpoints values (2,7,null),(3,8,null)');
  await assert.rejects(db.query('insert into public.transit_report_model_checkpoints values (4,9,null)'), /check constraint/);
  await assert.rejects(db.query('insert into public.transit_report_model_checkpoints values (5,-1,null)'), /check constraint/);
  await db.exec(migration);
  assert.equal((await db.query('select count(*)::int as count from public.transit_report_model_checkpoints')).rows[0].count, 3);
  console.log('Scoped checkpoint migration: PostgreSQL accepts steps 7/8, rejects 9/negative, preserves saved rows, and safely reapplies. Not applied to production.');
} finally { await db.close(); }
