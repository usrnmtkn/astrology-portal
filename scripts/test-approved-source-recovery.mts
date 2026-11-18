import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {Readable} from 'node:stream';
import {publicationAllowsContent} from '../apps/web/src/content/contentPublicationState.js';
import {servingPackageRecords} from '../api/_lib/serving-package-records.js';
import {createTransitSynastryRenderer} from '../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js';
import {approvedSourceBaseline} from '../api/_lib/approved-source-recovery.js';
const db=new PGlite();
await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
create table public.generated_interpretations(id uuid primary key,content_key text,status text,lane text,review_state text,updated_at timestamptz,sections jsonb,target_date date,source_snapshot jsonb,body text);
grant all on public.generated_interpretations to service_role;`);
await db.exec(readFileSync(new URL('../apps/web/supabase/migrations/20260907180000_content_publications.sql',import.meta.url),'utf8'));
await db.exec('grant usage on sequence public.content_publications_revision_seq to service_role');
await db.exec(readFileSync(new URL('../apps/web/supabase/migrations/20261107123057_studio_approved_source_recovery.sql',import.meta.url),'utf8'));
await db.exec(readFileSync(new URL('../apps/web/supabase/migrations/20260922002101_content_studio_private_versions.sql',import.meta.url),'utf8'));
const key='fallback-hook/placement-sentence/moon/scorpio',id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',operation='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const baseline=approvedSourceBaseline(key);assert(baseline);assert.match(baseline.sha256,/^[a-f0-9]{64}$/u);
for(const invalid of ['cms/qa/custom','studio-writing-profile/qa','cms/personal-transit-aspect/you/template'])assert.equal(approvedSourceBaseline(invalid),null);
const original={body:'Neutral complete opening. Neutral complete final sentence.',sections:{packageRecord:{body_you:'Complete saved you passage.',body_they:'Complete saved they passage.'},history:[{body:'Retained previous passage.'}]},snapshot:{source:'neutral-fixture'},updatedAt:'2026-11-07T12:00:00Z'};
await db.query(`insert into public.generated_interpretations values($1,$2,'DRAFT','serving',null,$3,$4,null,$5,$6)`,[id,key,original.updatedAt,original.sections,original.snapshot,original.body]);
let sources=[{id,contentKey:key,expectedUpdatedAt:original.updatedAt,expectedPublicationRevision:null,baselineSHA256:baseline.sha256}];
const restore=(op=operation,items=sources)=>db.query<{result:any}>('select public.restore_approved_content_sources($1,$2::jsonb) as result',[op,JSON.stringify(items)]);
await db.exec('set role anon');await assert.rejects(restore(),/permission denied/u);await db.exec('reset role;set role authenticated');await assert.rejects(restore(),/permission denied/u);await db.exec('reset role;set role service_role');
await assert.rejects(restore(operation,[{...sources[0],expectedUpdatedAt:'2026-11-07T11:00:00Z'}]),/changed/u);
await db.exec('reset role');
assert.equal((await db.query<any>('select status from generated_interpretations where id=$1',[id])).rows[0].status,'DRAFT');
// A failure in the second member rolls back the first member and its publication.
const missing='cccccccc-cccc-cccc-cccc-cccccccccccc';
await assert.rejects(restore(operation,[...sources,{...sources[0],id:missing,contentKey:'fallback-hook/zz-missing'}]),/changed/u);
assert.equal((await db.query<any>('select status from generated_interpretations where id=$1',[id])).rows[0].status,'DRAFT');
assert.equal((await db.query('select * from content_publications')).rows.length,0);
await db.exec('set role service_role');
const result=(await restore()).rows[0].result;assert.equal(result.length,1);assert.equal(result[0].publication.state,'live');assert.equal(result[0].publication.row_id,null);assert.equal(result[0].publication.row_updated_at,null);
const ledger=new Map([[key,result[0].publication]]);
assert.equal(publicationAllowsContent(key,null,null,null,ledger),true,'Approved unversioned source is available');
assert.equal(publicationAllowsContent(key,id,original.updatedAt,null,ledger),false,'Cached override cannot reappear after recovery');
assert.deepEqual((await restore()).rows[0].result,result,'Lost acknowledgement retry is idempotent');
await assert.rejects(restore(operation,[{...sources[0],baselineSHA256:'f'.repeat(64)}]),/identity changed/u);
await db.exec('reset role');
const saved=(await db.query<any>('select * from generated_interpretations where id=$1',[id])).rows[0];
assert.equal(saved.status,'ARCHIVED');assert.equal(saved.body,original.body);assert.deepEqual(saved.sections,original.sections);assert.deepEqual(saved.source_snapshot,original.snapshot);
const history=(await db.query<any>('select original_row from project_privacy.studio_row_versions where row_id=$1',[id])).rows;
const before=history.find(v=>v.original_row.status==='DRAFT'&&v.original_row.body===original.body);
assert(before,'Actual immutable history retains the complete before version');assert.deepEqual(before.original_row.sections,original.sections);
await db.query("update generated_interpretations set updated_at=clock_timestamp() where id=$1",[id]);
await assert.rejects(restore(),/Recovered content changed/u);
assert.equal((await db.query('select * from content_baseline_recoveries')).rows.length,1);
// Exercise the real owner API against the same actual SQL store, not a success stub.
process.env.CONTENT_GENERATION_SECRET='recovery-fixture';process.env.SUPABASE_URL='https://recovery.invalid';process.env.SUPABASE_SERVICE_ROLE_KEY='fixture-only';
const handler=(await import('../api/admin/content-baseline-recovery.js')).default;
const previousFetch=globalThis.fetch;
let rpcCalls=0;
globalThis.fetch=async(input,init)=>{
  const url=new URL(String(input));assert.equal(url.origin,'https://recovery.invalid','No external requests');
  if(url.pathname.endsWith('/rpc/cancel_content_source_recovery')){
    const args=JSON.parse(String(init?.body));await db.query('select public.cancel_content_source_recovery($1)',[args.p_operation_id]);return Response.json(null);
  }
  if(url.pathname.endsWith('/rpc/restore_approved_content_sources')){
    rpcCalls++;const args=JSON.parse(String(init?.body));
    try{return Response.json((await db.query<any>('select public.restore_approved_content_sources($1,$2::jsonb) result',[args.p_operation_id,JSON.stringify(args.p_sources)])).rows[0].result);}
    catch(e:any){return Response.json({code:e.code},{status:e.code==='40001'?409:400});}
  }
  assert.equal(init?.method??'GET','GET');
  if(url.pathname.endsWith('/generated_interpretations'))return Response.json((await db.query('select id,content_key,updated_at,target_date,status from generated_interpretations where id=$1',[url.searchParams.get('id')!.slice(3)])).rows);
  if(url.pathname.endsWith('/content_publications'))return Response.json((await db.query('select * from content_publications where content_key=$1',[url.searchParams.get('content_key')!.slice(3)])).rows);
  if(url.pathname.endsWith('/content_baseline_recoveries'))return Response.json((await db.query('select result from content_baseline_recoveries where operation_id=$1',[url.searchParams.get('operation_id')!.slice(3)])).rows);
  throw new Error('Unexpected storage path');
};
async function request(body:any,secret='recovery-fixture') {
  const req:any=Readable.from([JSON.stringify(body)]);req.method='POST';req.headers={'x-content-generation-secret':secret};
  const res:any={statusCode:0,setHeader(){},end(value:string){this.result=JSON.parse(value);}};
  await handler(req,res);return {code:res.statusCode,...res.result};
}
try {
  assert.equal((await request({action:'preview',sources},'wrong')).code,401);assert.equal(rpcCalls,0);
  const apiID='dddddddd-dddd-dddd-dddd-dddddddddddd',apiKey='fallback-hook/placement-sentence/moon/aries';
  await db.query(`insert into generated_interpretations values($1,$2,'DRAFT','serving',null,$3,$4,null,$5,$6)`,[apiID,apiKey,original.updatedAt,original.sections,original.snapshot,original.body]);
  const input=[{id:apiID,contentKey:apiKey,expectedUpdatedAt:original.updatedAt,body:'Must never enter a receipt'}];
  const preview=await request({action:'preview',sources:input});assert.equal(preview.code,200);assert.equal(rpcCalls,0);assert(!('body' in preview.sources[0]));
  assert.equal((await request({action:'restore',operationId:missing,sources:[{...preview.sources[0],baselineSHA256:'f'.repeat(64)}]})).code,409);assert.equal(rpcCalls,0);
  assert.equal((await request({action:'preview',sources:[{...input[0],contentKey:'cms/custom'}]})).code,422);
  const restored=await request({action:'restore',operationId:missing,sources:preview.sources});assert.equal(restored.code,200);assert.equal(rpcCalls,1);assert.equal(restored.recovered[0].publication.row_id,null);
  const status=await request({action:'status',operationId:missing});assert.equal(status.code,200);assert.equal(status.state,'restored');assert.equal(rpcCalls,1,'Status cannot replay a write');
  assert.equal((await request({action:'status',operationId:'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'})).state,'unconfirmed');
  const pairKeys=['fallback-hook/daily-headline/square/sun','fallback-hook/daily-body/square/sun'];
  const pairIDs=['11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222'];
  for(let i=0;i<2;i++)await db.query(`insert into generated_interpretations values($1,$2,'DRAFT','serving',null,$3,$4,null,$5,$6)`,[pairIDs[i],pairKeys[i],original.updatedAt,original.sections,original.snapshot,original.body]);
  const pairInput=pairKeys.map((contentKey,i)=>({contentKey,id:pairIDs[i],expectedUpdatedAt:original.updatedAt}));
  assert.equal((await request({action:'preview',sources:[pairInput[0]]})).code,422,'Half a Daily pair is not a restoration');
  const pairPlan=await request({action:'preview',sources:pairInput});assert.equal(pairPlan.code,200);
  await db.query('update generated_interpretations set source_snapshot=$2 where id=$1',[pairIDs[1],{writing:{state:'running'}}]);
  const pairOperation='33333333-3333-3333-3333-333333333333';
  const blocked=await request({action:'restore',operationId:pairOperation,sources:pairPlan.sources});assert.equal(blocked.code,422);
  assert.equal((await db.query<any>('select status from generated_interpretations where id=$1',[pairIDs[0]])).rows[0].status,'DRAFT','Active second writer rolls back first archive');
  await db.query('update generated_interpretations set source_snapshot=$2 where id=$1',[pairIDs[1],original.snapshot]);
  const pairResult=await request({action:'restore',operationId:pairOperation,sources:pairPlan.sources});assert.equal(pairResult.code,200);assert.equal(pairResult.recovered.length,2);
  const lateOperation='44444444-4444-4444-4444-444444444444';
  assert.equal((await request({action:'cancel',operationId:lateOperation})).state,'cancelled');
  await assert.rejects(restore(lateOperation,sources),/identity changed/u,'A delayed write cannot commit after cancellation');
  assert.equal((await request({action:'cancel',operationId:pairOperation})).state,'restored','Cancel after a committed write reports its actual result');
  const compositeID='77777777-7777-4777-8777-777777777777';
  const compositeKey='composite-sun-in-leo';
  await db.query("insert into generated_interpretations values($1,$2,'LIVE','serving',null,$3,$4,null,$5,$6)",
    [compositeID,compositeKey,original.updatedAt,original.sections,original.snapshot,original.body]);
  const compositePlan=await request({action:'preview',sources:[{id:compositeID,contentKey:compositeKey,expectedUpdatedAt:original.updatedAt}]});
  assert.equal(compositePlan.code,200);assert.equal(compositePlan.sources[0].baselineSHA256,approvedSourceBaseline(compositeKey)?.sha256);
  const compositeOperation='88888888-8888-4888-8888-888888888888';
  const compositeResult=await request({action:'restore',operationId:compositeOperation,sources:compositePlan.sources});
  assert.equal(compositeResult.code,200);
  assert.equal((await request({action:'status',operationId:compositeOperation})).state,'restored');
  const recoveredComposite=(await db.query<any>('select status,body,sections from generated_interpretations where id=$1',[compositeID])).rows[0];
  assert.deepEqual(recoveredComposite,{status:'ARCHIVED',body:original.body,sections:original.sections});
  const pairKey='fallback-hook/synastry-pair/sun/moon/trine';
  const groupedKey='fallback-hook/synastry-pair/sun/moon/soft';
  const grouped=servingPackageRecords.get(groupedKey)!;
  const baseline=approvedSourceBaseline(pairKey);
  assert.equal(baseline?.inherited,true);
  assert.equal(approvedSourceBaseline(groupedKey)?.inherited,false);
  assert.equal(baseline?.sha256,approvedSourceBaseline(groupedKey)?.sha256);
  for(const invalid of [pairKey+'/extra',pairKey.replace('/trine','/unknown'),pairKey.replace('/moon','/unknown')])assert.equal(approvedSourceBaseline(invalid),null);
  const inheritedId='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',inheritedOperation='ffffffff-ffff-4fff-8fff-ffffffffffff';
  const render=(blocked:string[])=>{
    const read=(file:string)=>JSON.parse(readFileSync(new URL('../apps/web/src/content/fallbackArchitectureV3/'+file,import.meta.url),'utf8'));
    const renderer=createTransitSynastryRenderer(read('source-rows/transit-synastry-rows-v1.json'),read('templates/fallback-templates-v3.json'),
      {hookRows:[grouped],vocabularyRows:[]},{blockedContentKeys:blocked});
    return ['sun','moon'].map((first,i)=>renderer.renderSynastryAspect({planetA:first,planetB:i?'sun':'moon',aspect:'trine',otherName:'Synthetic'}));
  };
  const inheritedBefore=render([]);
  assert.throws(()=>render([pairKey]),(error:any)=>error.publicationBlocked===true);
  await db.query("insert into generated_interpretations values($1,$2,'LIVE','serving',null,$3,$4,null,$5,$6)",
    [inheritedId,pairKey,original.updatedAt,original.sections,original.snapshot,original.body]);
  const source={id:inheritedId,contentKey:pairKey,expectedUpdatedAt:original.updatedAt};
  const plan=await request({action:'preview',sources:[source]});
  assert.equal(plan.code,200);assert.equal(plan.inherited,true);
  const inheritedResult=await request({action:'restore',operationId:inheritedOperation,sources:plan.sources});
  assert.equal(inheritedResult.code,200);
  const marker=inheritedResult.recovered[0].publication;
  const records=new Map([[pairKey,marker]]);
  assert.equal(publicationAllowsContent(pairKey,inheritedId,original.updatedAt,undefined,records),false);
  assert.equal(publicationAllowsContent(pairKey,null,null,undefined,records),true);
  assert.deepEqual(render(publicationAllowsContent(pairKey,null,null,undefined,records)?[]:[pairKey]),inheritedBefore);
  assert.equal((await request({action:'status',operationId:inheritedOperation})).state,'restored');
  const savedPair=(await db.query<any>('select status,body from generated_interpretations where id=$1',[inheritedId])).rows[0];
  assert.deepEqual(savedPair,{status:'ARCHIVED',body:original.body});
} finally {globalThis.fetch=previousFetch;}
await db.close();
console.log('PASS actual owner API + SQL recovery, role authorization, baseline pinning, CAS, atomic pair rollback, immutable complete history, idempotency and status-only lost-ack recovery; production writes 0');
