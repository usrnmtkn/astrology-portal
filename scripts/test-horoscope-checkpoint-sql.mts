import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {horoscopeStorageChanges} from '../api/_lib/horoscope-storage-delta.js';

// Real PostgreSQL SQL, isolated in memory. No provider or production writes.
const db=new PGlite();
const id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const read=async()=> (await db.query<any>('select id,updated_at::text,content_key,status,body,sections,source_snapshot from generated_interpretations where id=$1',[id])).rows[0];
const save=async(row:any,changes:any)=> (await db.query<any>('select id,updated_at::text from checkpoint_weekly_horoscope($1,$2,$3)',[row.id,row.updated_at,changes])).rows;
try{
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create table public.generated_interpretations(id uuid primary key,updated_at timestamptz not null,status text,content_key text,body text,sections jsonb,source_snapshot jsonb);
    alter table public.generated_interpretations enable row level security;
    grant all on public.generated_interpretations to service_role;
    create function public.test_checkpoint_version() returns trigger language plpgsql as $$ begin new.updated_at=greatest(clock_timestamp(),old.updated_at+interval '1 microsecond');return new;end;$$;
    create trigger test_checkpoint_version before update on public.generated_interpretations for each row execute function public.test_checkpoint_version();`);
  await db.exec(readFileSync(new URL('../apps/web/supabase/migrations/20261009114231_weekly_horoscope_checkpoint_deltas.sql',import.meta.url),'utf8'));
  const original={source_snapshot:{history:'Synthetic retained evidence. '.repeat(650000),horoscopeGeneration:{active:null,failures:[]}},
    sections:{horoscopeEdition:{window:{period:'weekly'},passages:[]}},body:'Synthetic original passage.'};
  await db.query("insert into generated_interpretations values($1,clock_timestamp(),'DRAFT','horoscope/weekly/synthetic',$2,$3,$4)",[id,original.body,original.sections,original.source_snapshot]);
  const definition=(await db.query<any>("select prosecdef,proconfig from pg_proc where oid='public.checkpoint_weekly_horoscope(uuid,timestamptz,jsonb)'::regprocedure")).rows[0];
  assert.equal(definition.prosecdef,false);
  assert.deepEqual(definition.proconfig,['search_path=""']);
  for(const role of ['anon','authenticated']){
    await db.exec(`set role ${role}`);
    await assert.rejects(save(await Promise.resolve({id,updated_at:'2026-01-01T00:00:00Z'}),[]),(e:any)=>e.code==='42501');
    await db.exec('reset role');
  }
  await db.exec('set role service_role');
  let row=await read();const old=row;
  const operation={id:'synthetic-operation',responseId:'gemini_synthetic',state:'running'};
  let patch={source_snapshot:{...row.source_snapshot,horoscopeGeneration:{active:operation,failures:[]},horoscopeStorageWriteId:'synthetic-write'}};
  let changes=horoscopeStorageChanges(row,patch);
  assert(JSON.stringify(changes).length<1000,'The retained history never crosses the checkpoint request');
  let receipt=await save(row,changes);assert.equal(receipt.length,1);assert(JSON.stringify(receipt).length<150);
  row=await read();assert.notEqual(row.updated_at,old.updated_at);
  assert.deepEqual(row.source_snapshot,patch.source_snapshot);
  assert.deepEqual(await save(old,changes),[],'A lost acknowledgement cannot admit a second CAS write');
  const beforeCompletion=row;
  const nextSnapshot={...row.source_snapshot,horoscopeGeneration:{active:null,failures:[{reason:'synthetic retained failure'}]}};
  delete nextSnapshot.horoscopeStorageWriteId;
  const nextSections={...row.sections,horoscopeEdition:{...row.sections.horoscopeEdition,passages:[{sign:'aries',body:'Synthetic saved draft.'}]}};
  changes=horoscopeStorageChanges(row,{source_snapshot:nextSnapshot,sections:nextSections,body:'Synthetic saved draft.'});
  assert(changes.some(c=>c.op==='append'));assert(changes.some(c=>c.op==='delete'));
  await save(row,changes);row=await read();
  assert.deepEqual(row.source_snapshot,nextSnapshot);assert.deepEqual(row.sections,nextSections);assert.equal(row.body,'Synthetic saved draft.');
  assert.equal(row.source_snapshot.history,original.source_snapshot.history);
  assert.deepEqual(await save(beforeCompletion,[{path:['body'],op:'set',value:'Stale overwrite.'}]),[]);
  for(const invalid of [
    [{path:['status'],op:'set',value:'LIVE'}],
    [{path:['source_snapshot','missing','child'],op:'set',value:true}],
    [{path:['source_snapshot'],op:'set',value:null}],
    [{path:['sections','horoscopeEdition','window','period'],op:'set',value:'monthly'}],
    [{path:['body'],op:'append',value:['Invalid']}],
    [{path:['body'],op:'set',value:'Must roll back'}, {path:['status'],op:'delete'}],
  ]){await assert.rejects(save(row,invalid));assert.deepEqual(await read(),row,'Invalid changes are atomic');}
  await db.query("update generated_interpretations set status='LIVE' where id=$1",[id]);
  row=await read();assert.deepEqual(await save(row,[{path:['body'],op:'set',value:'Must not change live copy'}]),[]);
  await db.query("update generated_interpretations set status='DRAFT',sections=jsonb_set(sections,'{horoscopeEdition,window,period}','\"monthly\"') where id=$1",[id]);
  row=await read();assert.deepEqual(await save(row,[]),[]);
  console.log('PASS PostgreSQL checkpoint SQL: >17MB retained history, compact deltas/receipts, exact CAS, append/delete/null, atomic invalid-write rollback, service-only invoker access and Weekly DRAFT isolation.');
}finally{await db.close();}
