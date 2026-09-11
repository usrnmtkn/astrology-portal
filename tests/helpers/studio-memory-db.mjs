import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';

export async function createStudioMemoryDb() {
  const db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create table public.generated_interpretations (
      id uuid primary key, content_key text not null, surface text, mode text,
      target_date date, body text, status text, updated_at timestamptz not null
    ); grant all on public.generated_interpretations to service_role;`);
  await db.exec(readFileSync(new URL('../../apps/web/supabase/migrations/20260911145857_studio_memory_feedback.sql', import.meta.url), 'utf8'));
  return db;
}

export function databaseFetch(db) {
  return async (input, init = {}) => {
    const url = new URL(String(input));
    if (url.origin !== 'https://studio-memory.invalid') throw new Error('Test forbids external network');
    try {
      if (url.pathname === '/rest/v1/rpc/studio_memory_active_snapshot')
        return Response.json((await db.query('select * from studio_memory_active_snapshot()')).rows);
      if (url.pathname === '/rest/v1/studio_memory_feedback_decisions')
        return Response.json((await db.query('select version,status,scope,reason,decided_at from studio_memory_feedback_decisions where feedback_id=$1 order by version desc limit 100', [url.searchParams.get('feedback_id').slice(3)])).rows);
      if (url.pathname === '/rest/v1/rpc/review_studio_memory_feedback') {
        const body = JSON.parse(init.body);
        return Response.json((await db.query('select * from public.review_studio_memory_feedback($1,$2,$3,$4,$5)',
          [body.p_id,body.p_version,body.p_status,body.p_scope,body.p_reason])).rows);
      }
      if (url.pathname !== '/rest/v1/studio_memory_feedback') throw new Error('Unexpected test table');
      const values = [], clauses = [];
      for (const name of ['content_key','status']) {
        if (url.searchParams.has(name)) {
          values.push(url.searchParams.get(name).slice(3)); clauses.push(`${name} = $${values.length}`);
        }
      }
      values.push(Number(url.searchParams.get('limit') ?? 100), Number(url.searchParams.get('offset') ?? 0));
      return Response.json((await db.query(`select * from public.studio_memory_feedback
        ${clauses.length ? `where ${clauses.join(' and ')}` : ''} order by created_at desc,id asc
        limit $${values.length - 1} offset $${values.length}`, values)).rows);
    } catch (error) { return Response.json({code:error.code, message:error.message}, { status: 400 }); }
  };
}
