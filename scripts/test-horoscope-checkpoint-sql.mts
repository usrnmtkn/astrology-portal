import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {horoscopeStorageChanges} from '../api/_lib/horoscope-storage-delta.js';

// Real PostgreSQL SQL, isolated in memory. No provider or production writes.
const db=new PGlite();
const id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const read=async()=> (await db.query<any>('select id,updated_at::text,content_key,status,body,sections,source_snapshot,facts,review_state,reviewed_at from generated_interpretations where id=$1',[id])).rows[0];
const save=async(row:any,changes:any)=> (await db.query<any>('select id,updated_at::text from checkpoint_weekly_horoscope($1,$2,$3)',[row.id,row.updated_at,changes])).rows;
try{
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create table public.generated_interpretations(id uuid primary key,updated_at timestamptz not null,status text,content_key text,body text,sections jsonb,source_snapshot jsonb,facts jsonb,review_state text,reviewed_at timestamptz);
    alter table public.generated_interpretations enable row level security;
    grant all on public.generated_interpretations to service_role;
    create function public.test_checkpoint_version() returns trigger language plpgsql as $$ begin new.updated_at=greatest(clock_timestamp(),old.updated_at+interval '1 microsecond');return new;end;$$;
    create trigger test_checkpoint_version before update on public.generated_interpretations for each row execute function public.test_checkpoint_version();`);
  await db.exec(readFileSync(new URL('../apps/web/supabase/migrations/20261009114231_weekly_horoscope_checkpoint_deltas.sql',import.meta.url),'utf8'));
  await db.exec(readFileSync(new URL('../apps/web/supabase/migrations/20261009124036_weekly_native_result_checkpoint.sql',import.meta.url),'utf8'));
  await db.exec(readFileSync(new URL('../apps/web/supabase/migrations/20261010042007_weekly_rejection_checkpoint.sql',import.meta.url),'utf8'));
  const original={source_snapshot:{history:'Synthetic retained evidence. '.repeat(650000),horoscopeGeneration:{active:null,failures:[]}},
    sections:{horoscopeEdition:{window:{period:'weekly'},passages:[]}},body:'Synthetic original passage.'};
  await db.query("insert into generated_interpretations(id,updated_at,status,content_key,body,sections,source_snapshot) values($1,clock_timestamp(),'DRAFT','horoscope/weekly/synthetic',$2,$3,$4)",[id,original.body,original.sections,original.source_snapshot]);
  await db.query("update generated_interpretations set facts='{}',review_state='needs_review',reviewed_at=clock_timestamp() where id=$1",[id]);
  const definition=(await db.query<any>("select prosecdef,proconfig from pg_proc where oid='public.checkpoint_weekly_horoscope(uuid,timestamptz,jsonb)'::regprocedure")).rows[0];
  assert.equal(definition.prosecdef,false);
  assert.deepEqual(definition.proconfig,['search_path=""']);
  for(const role of ['anon','authenticated']){
    await db.exec(`set role ${role}`);
    await assert.rejects(save(await Promise.resolve({id,updated_at:'2026-01-01T00:00:00Z'}),[]),(e:any)=>e.code==='42501');
    await assert.rejects(db.query('select checkpoint_weekly_provider_result($1,$2,$3,$4,$5,$6)',[id,'x','x','gemini','x',{id:'x'}]),(e:any)=>e.code==='42501');
    await db.exec('reset role');
  }
  await db.exec('set role service_role');
  let row=await read();const old=row;
  const operation={id:'synthetic-operation',requestHash:'synthetic-hash',responseId:'gemini_synthetic',state:'running',config:{provider:'gemini'}};
  let patch={source_snapshot:{...row.source_snapshot,horoscopeGeneration:{active:operation,failures:[]},horoscopeStorageWriteId:'synthetic-write'}};
  let changes=horoscopeStorageChanges(row,patch);
  assert(JSON.stringify(changes).length<1000,'The retained history never crosses the checkpoint request');
  let receipt=await save(row,changes);assert.equal(receipt.length,1);assert(JSON.stringify(receipt).length<150);
  row=await read();assert.notEqual(row.updated_at,old.updated_at);
  assert.deepEqual(row.source_snapshot,patch.source_snapshot);
  assert.deepEqual(await save(old,changes),[],'A lost acknowledgement cannot admit a second CAS write');
  const capture=async(overrides:any={})=>{
    const args={operationId:operation.id,requestHash:operation.requestHash,provider:'gemini',responseId:operation.responseId,result:{id:operation.responseId,status:'completed',output:[]},...overrides};
    return (await db.query<any>('select checkpoint_weekly_provider_result($1,$2,$3,$4,$5,$6) as outcome',[id,args.operationId,args.requestHash,args.provider,args.responseId,args.result])).rows[0].outcome;
  };
  for(const mismatch of [{operationId:'replaced'},{requestHash:'different'},{provider:'anthropic'},{responseId:'different',result:{id:'different'}}])assert.equal(await capture(mismatch),'obsolete');
  assert.deepEqual(await read(),row,'Mismatched responses do not alter any saved fields');
  assert.equal(await capture(),'saved');row=await read();
  assert.equal(row.source_snapshot.history,original.source_snapshot.history);
  assert.deepEqual(row.sections,original.sections);assert.equal(row.body,original.body);
  assert.equal(await capture(),'already_saved');assert.deepEqual(await read(),row,'Lost-ACK retry is idempotent');
  assert.equal(await capture({result:{id:operation.responseId,status:'failed'}}),'already_saved');assert.deepEqual(await read(),row,'A later failure cannot replace the completed result');
  await assert.rejects(capture({result:{id:'wrong'}}));assert.deepEqual(await read(),row);
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
  const beforeRejection=row;
  const rejectedSnapshot={...row.source_snapshot,horoscopeGeneration:{...row.source_snapshot.horoscopeGeneration,
    rejections:[{passages:row.sections.horoscopeEdition.passages,facts:row.facts}]}};
  changes=horoscopeStorageChanges(row,{source_snapshot:rejectedSnapshot,sections:{...row.sections,horoscopeEdition:{...row.sections.horoscopeEdition,passages:[]}},body:'',facts:{refreshed:true},review_state:null,reviewed_at:null});
  assert(JSON.stringify(changes).length<2000,'Rejection transports the new archive, not retained history');
  await save(row,changes);row=await read();
  assert.deepEqual(row.source_snapshot,rejectedSnapshot);assert.equal(row.source_snapshot.history,original.source_snapshot.history);
  assert.deepEqual(row.facts,{refreshed:true});assert.equal(row.body,'');assert.equal(row.review_state,null);assert.equal(row.reviewed_at,null);
  assert.deepEqual(await save(beforeRejection,changes),[],'Replayed rejection cannot reset a newer version');
  for(const invalid of [
    [{path:['status'],op:'set',value:'LIVE'}],
    [{path:['review_state'],op:'set',value:'approved'}],
    [{path:['reviewed_at'],op:'set',value:'2026-01-01'}],
    [{path:['facts'],op:'set',value:null}],
    [{path:['source_snapshot','missing','child'],op:'set',value:true}],
    [{path:['source_snapshot'],op:'set',value:null}],
    [{path:['sections','horoscopeEdition','window','period'],op:'set',value:'monthly'}],
    [{path:['body'],op:'append',value:['Invalid']}],
    [{path:['body'],op:'set',value:'Must roll back'}, {path:['status'],op:'delete'}],
  ]){await assert.rejects(save(row,invalid));assert.deepEqual(await read(),row,'Invalid changes are atomic');}
  await db.query("update generated_interpretations set status='LIVE' where id=$1",[id]);
  assert.equal(await capture(),'obsolete');
  row=await read();assert.deepEqual(await save(row,[{path:['body'],op:'set',value:'Must not change live copy'}]),[]);
  await db.query("update generated_interpretations set status='DRAFT',sections=jsonb_set(sections,'{horoscopeEdition,window,period}','\"monthly\"') where id=$1",[id]);
  row=await read();assert.deepEqual(await save(row,[]),[]);
  assert.equal(await capture(),'obsolete');
  console.log('PASS PostgreSQL checkpoint SQL: >17MB retained history, compact deltas/receipts, exact CAS, append/delete/null, atomic invalid-write rollback, service-only invoker access and Weekly DRAFT isolation.');
}finally{await db.close();}
