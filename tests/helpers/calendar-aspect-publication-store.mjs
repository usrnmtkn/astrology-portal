// Publication acceptance uses the real lifecycle migrations, never a ledger
// inferred from the row's LIVE label. All storage origins are synthetic.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createPublicationDb, seedPublicationRow } from './studio-publication-db.mjs';
import { matchesStoredInventory } from './calendar-review-api.mjs';

export async function createCalendarAspectPublicationStore(origin, initial = []) {
  assert.ok(new URL(origin).hostname.endsWith('.invalid'));
  const db = await createPublicationDb();
  await db.exec(readFileSync(new URL('../../apps/web/supabase/migrations/20260901135500_content_studio_draft_mode.sql', import.meta.url), 'utf8'));
  await db.query("select set_config('request.headers','{}',false)");
  for (const row of initial) await seedPublicationRow(db, row);
  const columns = new Set((await db.query("select column_name from information_schema.columns where table_name='generated_interpretations' and table_schema='public'")).rows.map(row => row.column_name));
  let omitPublicationSignal = false;
  async function fetch(input, init = {}) {
    const url = new URL(String(input));
    assert.equal(url.origin, origin, 'No live storage or provider calls');
    const table = url.pathname.split('/').at(-1);
    if (table === 'retire_content_everywhere') {
      assert.equal(init.method, 'POST');
      const args = JSON.parse(String(init.body));
      return Response.json((await db.query('select to_jsonb(public.retire_content_everywhere($1,$2,$3)) as row',
        [args.p_content_key, args.p_row_id, args.p_expected_updated_at])).rows[0].row);
    }
    assert.ok(['generated_interpretations', 'studio_generated_content_listing', 'content_publications'].includes(table));
    const stored = (await db.query(`select to_jsonb(g) as row from public.${table === 'studio_generated_content_listing' ? 'generated_interpretations' : table} g`)).rows.map(item => item.row);
    const found = stored.filter(candidate => matchesStoredInventory(candidate, url.searchParams));
    if (!init.method || init.method === 'GET') {
      const offset = Number(url.searchParams.get('offset') ?? 0);
      return Response.json(found.slice(offset, offset + Number(url.searchParams.get('limit') ?? found.length)),
        { headers: { 'content-range': `0-${Math.max(0,found.length-1)}/${found.length}` } });
    }
    assert.equal(table, 'generated_interpretations');
    const headers = new Headers(init.headers);
    if (omitPublicationSignal) headers.delete('x-content-publication-action');
    await db.query("select set_config('request.headers',$1,false)", [JSON.stringify(Object.fromEntries(headers))]);
    if (init.method === 'DELETE') {
      for (const row of found) await db.query('delete from generated_interpretations where id=$1 and updated_at=$2', [row.id,row.updated_at]);
      return Response.json(found);
    }
    const patch = JSON.parse(String(init.body));
    if (init.method === 'POST') {
      const row = { id: randomUUID(), updated_at: new Date().toISOString(), created_at: new Date().toISOString(), ...patch };
      try { await seedPublicationRow(db, row); }
      catch (error) { return Response.json({code:error.code,message:error.message},{status:error.code === '23505' ? 409 : 400}); }
      return Response.json((await db.query('select to_jsonb(g) as row from generated_interpretations g where id=$1', [row.id])).rows.map(item => item.row));
    }
    assert.equal(init.method, 'PATCH');
    const fields = Object.keys(patch);
    assert.ok(fields.every(field => columns.has(field)));
    const saved = [];
    for (const row of found) {
      const result = await db.query(`update generated_interpretations g set (${fields.join(',')}) =
        (select ${fields.join(',')} from jsonb_populate_record(g,$1::jsonb))
        where id=$2::uuid and updated_at=$3::timestamptz returning to_jsonb(g) as row`, [patch,row.id,row.updated_at]);
      saved.push(...result.rows.map(item => item.row));
    }
    return Response.json(saved);
  }
  return { db, fetch, suppressPublicationSignal(value) { omitPublicationSignal = value; }, close: () => db.close() };
}
