import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
const {PGlite} = await import(pathToFileURL(process.env.REPORT_PGLITE_MODULE).href);
const db = new PGlite();
try {
 await db.exec(`create role authenticated; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql as $$select current_setting('test.uid',true)::uuid$$; grant usage on schema auth to authenticated;`);
 await db.exec(fs.readFileSync('apps/web/supabase/migrations/20260906214000_report_library_state.sql','utf8'));
 await db.exec(fs.readFileSync('apps/web/supabase/migrations/20260911151405_report_library_delete.sql','utf8'));
 const owner='00000000-0000-4000-8000-000000000001',other='00000000-0000-4000-8000-000000000002',source='00000000-0000-4000-8000-000000000003';
 await db.exec(`insert into auth.users values ('${owner}'),('${other}'); insert into public.user_report_library_state(user_id,source_kind,source_id) values ('${other}','premium_report','${source}'); set role authenticated; set test.uid='${owner}';`);
 await db.query(`insert into public.user_report_library_state(user_id,source_kind,source_id,deleted_at) values ($1,'generated_interpretation',$2,now())`,[owner,source]);
 assert.equal((await db.query('select * from public.user_report_library_state')).rows.length,1);
 assert.equal((await db.query('update public.user_report_library_state set deleted_at=now() where user_id=$1 returning *',[other])).rows.length,0,'other owner cannot be deleted');
 await assert.rejects(db.query(`insert into public.user_report_library_state(user_id,source_kind,source_id,deleted_at) values ($1,'generated_interpretation',$2,now())`,[other,source]),/row-level security/);
 await db.query('update public.user_report_library_state set archived_at=null,seen_at=now() where user_id=$1',[owner]);
 assert.ok((await db.query('select deleted_at from public.user_report_library_state')).rows[0].deleted_at);
 console.log('Report deletion migration and cross-account RLS passed in isolated PostgreSQL.');
} finally {await db.close();}
