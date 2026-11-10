import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {build} from 'esbuild';
import {mkdtempSync,rmSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {invoke,store} from '../tests/helpers/moon-horoscope-api.mts';
import {createPublicationDb,seedPublicationRow} from '../tests/helpers/studio-publication-db.mjs';
import {MOON_HOROSCOPE_SIGNS,moonHoroscopeKey,moonHoroscopeBody,parseMoonHoroscopes} from '../src/shared/datedLunationHoroscopes.mjs';

const endpoint='/api/admin/content-baseline-recovery';
const recover=(body:any)=>invoke('POST',{recoveryKind:'moon-reusable',...body},endpoint);
mkdirSync('test-results',{recursive:true});
const directory=mkdtempSync(join(process.cwd(),'test-results/moon-recovery-'));
const db=await createPublicationDb();
try{
  const bundle=join(directory,'reader.mjs');
  await build({stdin:{contents:`
    export {resolveLunationArticleHoroscopes} from './apps/web/src/content/lunationArticleHoroscopes';
    export {resolveLunationReaderSource} from './apps/web/src/content/lunationReaderSource';
    export {generatedContentMapFromRows} from './apps/web/src/services/generatedContent';
    export {installContentPublications,publicationAllowsContent} from './apps/web/src/content/contentPublicationState';
    export {loadLunationBookFallbackArchitectureV3Bundle} from './apps/web/src/content/fallbackArchitectureV3Runtime';
  `,resolveDir:process.cwd(),loader:'ts'},bundle:true,format:'esm',platform:'node',outfile:bundle,
    banner:{js:"import {createRequire} from 'node:module'; const require=createRequire(import.meta.url);"},loader:{'.css':'empty'},define:{'import.meta.env':'{}'},logLevel:'silent'});
  const reader=await import(pathToFileURL(bundle).href);
  await reader.loadLunationBookFallbackArchitectureV3Bundle();
  const events=await invoke('GET',undefined,'/api/admin/lunation-writing?month=2020-05&timeZone=America%2FNew_York');
  const event=events.payload.events.find((value:any)=>value.phase==='full-moon');assert(event);
  const contentKey=moonHoroscopeKey(event),empty=new Map();
  const baseline=reader.resolveLunationArticleHoroscopes(event,empty),general=reader.resolveLunationReaderSource(event,empty);
  assert(baseline.length>0,'Fixture must have complete independently approved reusable readings');
  assert(general?.body,'Fixture must have a complete general article');
  const paste=MOON_HOROSCOPE_SIGNS.map(sign=>`${sign}\n${sign} neutral dated test opening.\n\n${sign} exact dated test ending.`).join('\n\n');
  const section=parseMoonHoroscopes(paste,event);
  let result=await invoke('POST',{contentKey,surface:'sky',mode:'article',eventType:'lunation-horoscopes',targetDate:null,provider:'manual-admin',status:'DRAFT',lane:'serving',body:moonHoroscopeBody(section),headline:'Temporary Moon recovery verification',summary:'',sections:{articleHoroscopes:section},facts:{lunationHoroscopes:{event}},sourceSnapshot:{editorialImport:{originalSource:paste}}});
  assert.equal(result.status,200,JSON.stringify(result.payload));let row=result.payload.rows[0];
  result=await invoke('PATCH',{id:row.id,expectedUpdatedAt:row.updated_at,ownerAction:'publish-owner-content'});assert.equal(result.status,200,JSON.stringify(result.payload));
  const live=result.payload.rows[0];
  result=await invoke('PATCH',{id:live.id,expectedUpdatedAt:live.updated_at,sourceLifecycleAction:'archive'});assert.equal(result.status,200,JSON.stringify(result.payload));
  row=result.payload.rows[0];const original=structuredClone(row);
  reader.installContentPublications(await store.publication.publications());
  const staleMap=reader.generatedContentMapFromRows([live]);
  assert.deepEqual(reader.resolveLunationArticleHoroscopes(event,staleMap),[],'Archive continues to suppress dated and reusable readings');
  const sources=[{id:row.id,contentKey,expectedUpdatedAt:row.updated_at}];
  const forbidden=await store.invoke('POST',{recoveryKind:'moon-reusable',action:'preview',sources},endpoint,'wrong-secret');assert.equal(forbidden.status,401);
  let metadataReads=0,rpcWrites=0;
  const previousFetch=globalThis.fetch;
  globalThis.fetch=async(input:any,init:any={})=>{
    const url=new URL(String(input));
    if(url.pathname.endsWith('/generated_interpretations')&&url.searchParams.get('select')?.startsWith('id,content_key,updated_at,status,surface,mode,event_type,target_date,facts')){
      metadataReads++;assert(!/body|sections|source_snapshot/u.test(url.searchParams.get('select')!),'Preview/status must not request saved passages');
    }
    if(url.pathname.endsWith('/rpc/restore_moon_reusable_readings'))rpcWrites++;
    return previousFetch(input,init);
  };
  try{
    const preview=await recover({action:'preview',sources:sources.map(source=>({...source,body:'Never include this in a receipt'}))});
    assert.equal(preview.status,200,JSON.stringify(preview.payload));assert.equal(rpcWrites,0);assert.equal(preview.payload.sources[0].fallbacks.length,12);
    assert(!JSON.stringify(preview.payload).includes('Never include'));assert(!JSON.stringify(preview.payload).includes('dated test opening'));
    const planned=preview.payload.sources;
    for(const patch of [{baselineSHA256:'f'.repeat(64)},{expectedPublicationRevision:0},{fallbacks:[]},{expectedUpdatedAt:'2000-01-01T00:00:00Z'}]){
      const stale=await recover({action:'restore',operationId:randomUUID(),sources:[{...planned[0],...patch}]});assert.equal(stale.status,409,JSON.stringify(stale.payload));
    }
    assert.equal(rpcWrites,0,'Stale/unapproved plans fail before a write');
    const operationId=randomUUID(),restored=await recover({action:'restore',operationId,sources:planned});
    assert.equal(restored.status,200,JSON.stringify(restored.payload));assert.equal(rpcWrites,1);
    assert.deepEqual(store.rows.get(row.id),original,'Recovery retains every archived row field, not only prose/counts');
    const publication=restored.payload.recovered[0].publication;
    assert.equal(publication.state,'live');assert.equal(publication.row_id,null);assert.equal(publication.row_updated_at,null);
    reader.installContentPublications(await store.publication.publications());
    const unrelated='cms/recovery-unrelated';
    reader.installContentPublications([{content_key:unrelated,state:'retired',revision:999999,row_id:null,row_updated_at:null,updated_at:new Date().toISOString()},
      {content_key:'cms/personal-transit-aspect/you/template',state:'live',revision:999998,row_id:null,row_updated_at:null,updated_at:new Date().toISOString()}]);
    assert.equal(reader.publicationAllowsContent(unrelated),false,'Unrelated retirements remain blocked');
    assert.equal(reader.publicationAllowsContent('cms/personal-transit-aspect/you/template'),false,'Permanent retirement cannot be reset by a baseline identity');
    assert.deepEqual(reader.resolveLunationArticleHoroscopes(event,staleMap),baseline,'Full reusable passages and order match the original baseline in RAM');
    assert.deepEqual(reader.resolveLunationReaderSource(event,staleMap),general,'Complete general article is unchanged');
    for(const id of [row.id,randomUUID()])assert.equal(reader.publicationAllowsContent(contentKey,id,live.updated_at,'2020-05-07'),false,'Cached LIVE rows, old revisions and target-date shortcuts stay unavailable');
    assert.equal((await invoke('reader',{keys:[contentKey]})).payload.rows.length,0,'Archived dated writing stays outside the actual reader API');
    const replay=await recover({action:'restore',operationId,sources:JSON.parse(JSON.stringify(planned))});assert.equal(replay.status,200);assert.equal(replay.payload.state,'restored');assert.equal(rpcWrites,1,'Same operation checks its receipt without replaying a write');
    const checked=await recover({action:'status',operationId});assert.equal(checked.payload.state,'restored');assert.equal(rpcWrites,1);
    assert.equal((await recover({action:'restore',operationId,sources:[{...planned[0],baselineSHA256:'e'.repeat(64)}]})).status,409);
    const unknown=randomUUID();assert.equal((await recover({action:'status',operationId:unknown})).payload.state,'unconfirmed');
    const cancelled=await recover({action:'cancel',operationId:unknown});assert.equal(cancelled.payload.state,'cancelled');
    assert.equal((await recover({action:'restore',operationId:unknown,sources:planned})).status,409,'A delayed request cannot commit after cancellation');
    const draft=await invoke('PATCH',{id:row.id,expectedUpdatedAt:row.updated_at,sourceLifecycleAction:'restore'});assert.equal(draft.status,200);
    assert.equal((await recover({action:'status',operationId})).payload.state,'changed');
    assert.equal((await recover({action:'preview',sources:[{...sources[0],expectedUpdatedAt:draft.payload.rows[0].updated_at}]})).status,422,'Drafts cannot take the archived recovery path');
    assert(metadataReads>0);
    // Apply and exercise the same actual migration under each database role.
    await seedPublicationRow(db,{...original,id:randomUUID()});
    const sqlRow=(await db.query<any>('select to_jsonb(g) row from generated_interpretations g')).rows[0].row;
    await db.query('select public.retire_content_everywhere($1,$2,$3)',[contentKey,sqlRow.id,sqlRow.updated_at]);
    const before=structuredClone(sqlRow),sqlPublication=(await db.query<any>('select * from content_publications where content_key=$1',[contentKey])).rows[0];
    const sqlPlan={...planned[0],id:sqlRow.id,expectedUpdatedAt:sqlRow.updated_at,expectedPublicationRevision:sqlPublication.revision};
    for(const patch of [{expectedUpdatedAt:'2000-01-01T00:00:00Z'},{expectedPublicationRevision:0},
      {fallbacks:sqlPlan.fallbacks.map((item:any,index:number)=>index?item:{...item,expectedPublicationRevision:1})}]){
      await assert.rejects(db.query('select public.restore_moon_reusable_readings($1,$2::jsonb)',[randomUUID(),{...sqlPlan,...patch}]),/changed/u);
      assert.equal((await db.query<any>('select state from content_publications where content_key=$1',[contentKey])).rows[0].state,'retired','Failed CAS cannot partially restore publication');
    }
    const sqlOperation=randomUUID(),sql=()=>db.query<any>('select public.restore_moon_reusable_readings($1,$2::jsonb) result',[sqlOperation,sqlPlan]);
    for(const role of ['anon','authenticated']){await db.exec(`set role ${role}`);await assert.rejects(sql(),/permission denied/u);await db.exec('reset role');}
    await db.exec('set role service_role');const sqlResult=(await sql()).rows[0].result;
    assert.deepEqual((await sql()).rows[0].result,sqlResult,'Actual SQL replay is idempotent');await db.exec('reset role');
    assert.deepEqual((await db.query<any>('select to_jsonb(g) row from generated_interpretations g')).rows[0].row,before,'Actual transaction leaves the entire archived row unchanged');
    assert.equal((await db.query('select * from content_baseline_recoveries')).rows.length,1);
  }finally{globalThis.fetch=previousFetch;}
}finally{await db.close();await store.close();rmSync(directory,{recursive:true,force:true});}
console.log('PASS Moon explicit reusable recovery: actual SQL/owner handler, complete baseline equality, archived-row preservation, stale cached/date rejection, CAS, roles, receipts/status/cancel; production actions 0');
