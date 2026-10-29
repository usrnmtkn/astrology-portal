import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {digest} from '../src/astro-writing/editorial/evidenceRegistry.mjs';

// Actual PostgreSQL foreign-key behavior, with unchanged private journals and
// permissions. This runs only in isolated memory, never against owner storage.
const db=new PGlite(),selected='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',other='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
try{
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
  create table public.generated_interpretations(id uuid primary key,status text,updated_at timestamptz);
  alter table public.generated_interpretations enable row level security;
  grant all on public.generated_interpretations to service_role;`);
 await db.exec(readFileSync(new URL('../apps/web/supabase/migrations/20261006001932_seasonal_editorial_private_runs.sql',import.meta.url),'utf8'));
 await db.query("insert into generated_interpretations values($1,'ARCHIVED','2026-10-28T00:00:00Z'),($2,'DRAFT','2026-10-28T00:00:00Z')",[selected,other]);
 const state={surface:'seasonal',target:{editionId:selected},sources:[{text:'Complete synthetic private source opening. Exact private source ending.'}],attempts:[{candidate:'Complete synthetic private draft.',result:'rejected'}]};
 for(const [id,target]of [['11111111-1111-1111-1111-111111111111',selected],['22222222-2222-2222-2222-222222222222',other]]){
  const savedState={...state,target:{editionId:target}};
  await db.query('insert into studio_editorial_runs(id,target_row_id,revision,state,state_hash) values($1,$2,7,$3,$4)',[id,target,savedState,digest(savedState)]);
 }
 const journals=async()=>(await db.query<any>('select id,target_row_id,(to_jsonb(j)-\'target_row_id\')::text as retained from studio_editorial_runs j order by id')).rows;
 const before=await journals(),security=await db.query("select relrowsecurity,relacl::text from pg_class where oid='public.studio_editorial_runs'::regclass");
 await db.exec('set role service_role');
 await assert.rejects(db.query('delete from generated_interpretations where id=$1',[selected]),(error:any)=>error.code==='23503');
 await db.exec('reset role');assert.deepEqual(await journals(),before);
 await db.exec(readFileSync(new URL('../apps/web/supabase/migrations/20261028231104_preserve_private_runs_after_horoscope_deletion.sql',import.meta.url),'utf8'));
 assert.deepEqual(await db.query("select relrowsecurity,relacl::text from pg_class where oid='public.studio_editorial_runs'::regclass"),security);
 await db.exec('set role service_role');
 assert.equal((await db.query('delete from generated_interpretations where id=$1 and updated_at=$2 and status<>\'LIVE\' returning id',[selected,'2026-10-27T00:00:00Z'])).rows.length,0);
 assert.equal((await db.query('delete from generated_interpretations where id=$1 and updated_at=$2 and status<>\'LIVE\' returning id',[selected,'2026-10-28T00:00:00Z'])).rows.length,1);
 const after=await journals();assert.equal(after[0].target_row_id,null);assert.equal(after[0].retained,before[0].retained);assert.deepEqual(after[1],before[1]);
 assert.equal((await db.query('select id from studio_editorial_runs where target_row_id=$1',[selected])).rows.length,0,'Deleted editions cannot retrieve the detached journal');
 await assert.rejects(db.query('insert into studio_editorial_runs(id,target_row_id,state,state_hash) values($1,$2,$3,$4)',['33333333-3333-3333-3333-333333333333',selected,state,digest(state)]),(error:any)=>error.code==='23503','Non-null links still require a real edition');
 await assert.rejects(db.query('delete from studio_editorial_runs'),(error:any)=>error.code==='42501');
 await db.exec('reset role');
 for(const role of ['anon','authenticated']){
  await db.exec('set role '+role);
  await assert.rejects(db.query('select * from studio_editorial_runs'),(error:any)=>error.code==='42501');
  await assert.rejects(db.query('update studio_editorial_runs set revision=8'),(error:any)=>error.code==='42501');
  await db.exec('reset role');
 }
}finally{await db.close();}
console.log('PASS isolated PostgreSQL horoscope deletion: original FK failure, exact retained private journal, unchanged RLS/grants, unrelated rows and enforced non-null links.');
