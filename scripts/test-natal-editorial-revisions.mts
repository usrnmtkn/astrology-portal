import assert from 'node:assert/strict';
import {studioApiStore} from '../tests/helpers/studio-api-store.js';
import {createPublicationDb,seedPublicationRow,callPublicationRpc} from '../tests/helpers/studio-publication-db.mjs';
import {natalEditorialDraftForKey} from '../apps/admin/src/natalEditorialLibrary.js';
import {natalEditorialRevisionTarget} from '../src/shared/natalEditorialRevisions.js';

const keys=[
 'cms/natal-twelfth-ruler/you/introduction',
 'cms/natal-twelfth-ruler/they/ruler-house/6',
 'cms/natal-chart-context/you/sect/day',
 'cms/natal-planet-sect/they/jupiter/night',
 'cms/natal-planet-sect/you/jupiter/leo/house-3/day',
 'cms/natal-planet-sect/they/saturn/aries/night'
];
const store=await studioApiStore([],{publicationDb:true});
let sqlFixture:any;
try{
 for(const key of keys){
  const {id:_unsaved,...draft}=natalEditorialDraftForKey(key)!;
  const audience=key.split('/')[2]==='they'?'{{ownerName}}':'You';
  const a=`${audience} synthetic source opening A.\n\nComplete unchanged source ending A.`;
  const b=`${audience} synthetic private opening B.\n\nComplete private source ending B.`;
  const created=await store.call({method:'POST',body:{...draft,body:a}});
  assert.equal(created.status,200,JSON.stringify(created.payload));
  const change=(row:any,body:any)=>store.call({method:'PATCH',body:{id:row.id,expectedUpdatedAt:row.updated_at,...body}});
  const published=await change(created.payload.rows[0],{ownerAction:'publish-owner-content'});
  assert.equal(published.status,200,JSON.stringify(published.payload));
  const live=published.payload.rows[0];
  assert.equal(natalEditorialRevisionTarget(live),true);
  const read=()=>store.call({method:'POST',url:'/api/content-reader',body:{keys:[key]}});
  const publicA=(await read()).payload.rows;
  assert.equal(publicA.length,1);assert.equal(publicA[0].body,a);
  const saved=await change(live,{status:'DRAFT',body:b});
  assert.equal(saved.status,200,JSON.stringify(saved.payload));
  let proposal=saved.payload.rows[0];
  assert.notEqual(proposal.id,live.id);assert.equal(proposal.mode,'studio-draft');
  assert.equal(proposal.event_type,'standalone-article-revision');assert.equal(proposal.body,b);
  assert.equal(natalEditorialRevisionTarget(proposal,'studio-draft'),true);
  assert.deepEqual((await read()).payload.rows,publicA);
  assert.deepEqual((await store.call({method:'rows'})).find((r:any)=>r.id===live.id),live);
  const reviewed=await change(proposal,{status:'REVIEWED'});
  assert.equal(reviewed.status,200);assert.equal(reviewed.payload.rows[0].id,proposal.id);
  assert.deepEqual((await read()).payload.rows,publicA);
  assert.equal((await change(proposal,{status:'DRAFT',body:'Stale private edit.'})).status,409);
  proposal=reviewed.payload.rows[0];
  const back=await change(proposal,{status:'DRAFT'});assert.equal(back.status,200);proposal=back.payload.rows[0];
  assert.equal((await change(proposal,{sourceSnapshot:{...proposal.source_snapshot,targetRowId:'00000000-0000-4000-8000-000000000099'}})).status,409);
  assert.equal((await change(proposal,{ownerAction:'publish-owner-content'})).status,409);
  assert.deepEqual((await read()).payload.rows,publicA);
  const publications=await store.call({method:'publications'});
  const result=await change(proposal,{ownerAction:'publish-standalone-article-revision'});
  assert.equal(result.status,200,JSON.stringify(result.payload));
  assert.equal(result.payload.rows[0].id,live.id);assert.equal(result.payload.rows[0].body,b);
  assert.equal(result.payload.rows[0].mode,'in_depth');assert.deepEqual(result.payload.rows[0].facts,live.facts);
  assert.equal((await read()).payload.rows[0].body,b);
  assert.equal((await store.call({method:'rows'})).find((r:any)=>r.id===proposal.id).status,'ARCHIVED');
  if(key.includes('/leo/house-3/'))sqlFixture={target:live,proposal,publications,args:(await store.call({method:'publication-calls'})).at(-1)};
 }
}finally{store.close();}

assert.ok(sqlFixture);
const db=await createPublicationDb();
try{
 const routine="public.content_studio_publish_revision(text,text,text,text,uuid,timestamptz,uuid,timestamptz,jsonb,jsonb,jsonb)";
 const permissions=(await db.query('select prosecdef,proconfig,has_function_privilege(\'anon\',$1,\'EXECUTE\') anon,has_function_privilege(\'authenticated\',$1,\'EXECUTE\') authenticated,has_function_privilege(\'service_role\',$1,\'EXECUTE\') service from pg_proc where oid=$1::regprocedure',[routine])).rows[0];
 assert.equal(permissions.prosecdef,true);assert.equal(permissions.anon,false);assert.equal(permissions.authenticated,false);assert.equal(permissions.service,true);
 const variants:Array<[string,(target:any,proposal:any,args:any)=>void]>=[
  ['valid',()=>{}],
  ['personalized target',t=>{t.facts.scope='personal_chart';}],
  ['audience mismatch',t=>{t.facts.audience='they';}],
  ['wrong surface',t=>{t.surface='you';}],
  ['wrong mode',t=>{t.mode='article';}],
  ['wrong block',t=>{t.block_type='natal_placement';}],
  ['dated target',t=>{t.target_date='2026-11-12';}],
  ['package provider',t=>{t.provider='tldrastro-fallback-architecture-v3';}],
  ['package fields',t=>{t.sections={packageRecord:{}};}],
  ['wrong source system',t=>{t.source_snapshot.contentSystem='personal';}],
  ['wrong planet',t=>{t.facts.planet='saturn';}],
  ['wrong sign',t=>{t.facts.sign='aries';}],
  ['wrong house',t=>{t.facts.house=4;}],
  ['wrong sect',t=>{t.facts.sect='night';}],
  ['wrong house system',t=>{t.facts.houseSystem='placidus';}],
  ['proposal audience',(_t,p)=>{p.facts.audience='they';}],
  ['proposal context',(_t,p)=>{p.source_snapshot.contextType='personal';}],
  ['proposal package',(_t,p)=>{p.sections={packageRecord:{}};}],
  ['stale target',(_t,_p,a)=>{a.p_target_version='2026-01-01T00:00:00Z';}]
 ];
 for(const [label,alter] of variants){
  const {target,proposal,publications,args}=structuredClone(sqlFixture);alter(target,proposal,args);
  await db.exec('begin');
  try{
   await seedPublicationRow(db,target);await seedPublicationRow(db,proposal);
   await db.exec('delete from public.content_publications');
   for(const p of publications)await db.query('insert into public.content_publications overriding system value select * from jsonb_populate_record(null::public.content_publications,$1::jsonb)',[p]);
   if(label==='valid'){
    await callPublicationRpc(db,'content_studio_publish_revision',args);
    assert.equal((await db.query('select body from generated_interpretations where id=$1',[target.id])).rows[0].body,args.p_patch.body);
    const again=await callPublicationRpc(db,'content_studio_publish_revision',args);assert.equal(again.targetId,target.id);
   }else{
    await assert.rejects(callPublicationRpc(db,'content_studio_publish_revision',args),(error:any)=>error.code===(label==='stale target'?'40001':'22023'),label);
   }
  }finally{await db.exec('rollback');}
 }
 console.log(`PASS: ${keys.length} actual Natal editorial API/private-review/publication flows, ${variants.length} real PostgreSQL target/replay/conflict controls, unchanged private routine permissions.`);
}finally{await db.close();}
