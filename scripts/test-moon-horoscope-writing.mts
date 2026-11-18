import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {createApiStore} from '../tests/helpers/calendar-review-api.mjs';
import {emptyMoonHoroscopes,moonWritingDraftPayload} from '../apps/admin/src/moonHoroscopeDraft';
import {lunationArticleEvents} from '../api/_lib/lunation-article-facts';
import {mapLegacyIdentifier} from '../src/astro-writing/productionEvidenceAdapter.cjs';
const store=await createApiStore([],{sqlMoonLifecycle:true}),storeFetch=globalThis.fetch;
Object.assign(process.env,{OPENAI_API_KEY:'synthetic-moon-key',ANTHROPIC_API_KEY:'synthetic-moon-key'});
let calls=0,hold:Promise<void>|null=null,fail=false,badFields=false;
globalThis.fetch=async(url:any,init:any={})=>{
 if(String(url).includes('/rpc/studio_memory_active_snapshot'))return Response.json([{snapshot:{rows:[],writingFeedback:[]}}]);
 if(String(url).includes('studio_writing_feedback'))return Response.json([]);
 if(['https://api.openai.com/v1/responses','https://api.anthropic.com/v1/messages'].includes(String(url))){
  calls++;const request=JSON.parse(init.body),claude=String(url).includes('anthropic'),fields=Object.keys((claude?request.tools[0].input_schema:request.text.format.schema).properties.slotValues.properties);
  if(claude)request.input=request.messages[0].content[0].text;
  assert(request.input.includes('moon-horoscope-writing/v1'));assert(request.input.includes('whole-sign'));assert(request.input.includes('GOVERNED KNOWLEDGE EVIDENCE'));assert(request.input.includes('Complete synthetic saved lunar reference opening.')&&request.input.includes('Complete synthetic saved lunar reference final sentence.'));
  assert(!fields.includes('ariesBody'),'Existing owner reading is never sent for replacement.');
  if(hold)await hold;if(fail)throw new Error('Synthetic uncertain transport failure.');
  const value={slotValues:{...Object.fromEntries(fields.map(name=>[name,`${name} synthetic opening.\n\n${name} synthetic final sentence.`])),...(badFields?{unrequestedBody:'Unexpected field.'}:{})}};
  return Response.json(claude?{id:'synthetic-moon-claude',content:[{type:'tool_use',name:request.tools[0].name,id:'synthetic-moon-tool',input:value}]}:{id:'synthetic-moon-response',output_text:JSON.stringify(value)});
 }
 return storeFetch(url,init);
};
const {default:handler}=await import('../api/admin/sky-article-template-slots');
async function invoke(body:any,authorized=true){const req:any=Object.assign(Readable.from([JSON.stringify(body)]),{method:'POST',url:'/api/admin/sky-article-template-slots',headers:authorized?{'x-content-generation-secret':'calendar-api-fixture'}:{}});const res:any={statusCode:0,setHeader(){},end(s:string){this.payload=JSON.parse(s)}};await handler(req,res);return {status:res.statusCode,...res.payload};}
try{
 const context={surface:'sky',eventType:'new-moon',writingSchema:'moon-horoscope-writing/v1'};
 assert.deepEqual(mapLegacyIdentifier('house/8',context).targetUsages,['mechanism-reference']);
 assert.deepEqual(mapLegacyIdentifier('house/8',{...context,writingSchema:'unrelated'}).targetUsages,['primary']);
 for(const phase of ['new-moon','full-moon']){
  process.env.CONTENT_GENERATION_PROVIDER_SKY_ARTICLE=phase==='new-moon'?'openai':'claude';
  const event=(await lunationArticleEvents('2026-11','America/New_York')).find(e=>e.phase===phase)!;
  store.rows.set(`synthetic-reference-${phase}`,{id:`synthetic-reference-${phase}`,content_key:`authored/sky-lunation-macro/${event.phase}/${event.sign.toLowerCase()}`,status:'DRAFT',updated_at:'2026-11-01T00:00:00.000Z',headline:'Synthetic lunar reference',body:'Complete synthetic saved lunar reference opening.\n\nComplete synthetic saved lunar reference final sentence.',sections:{},facts:{},source_snapshot:{}});
  const section=emptyMoonHoroscopes(event);section.passages[0].body='  Owner opening.\n\nOwner final sentence.  ';
  const created=await store.invoke('POST',moonWritingDraftPayload(event,section,null,null,null));assert.equal(created.status,200,JSON.stringify(created));
  const row=created.payload.rows[0];let body:any={moonHoroscopes:{id:row.id,expectedUpdatedAt:row.updated_at,action:'generate'}};
  const before=calls;
  const staleTarget=structuredClone(row);staleTarget.sections.moonWritingDraft.target={id:'missing-target',updatedAt:row.updated_at};store.rows.set(row.id,staleTarget);assert.equal((await invoke({...body,preview:true})).status,409);assert.equal(calls,before);store.rows.set(row.id,row);
  const badHeading=structuredClone(row);badHeading.sections.moonWritingDraft.section.passages[1].heading='Wrong sign';store.rows.set(row.id,badHeading);assert.equal((await invoke({...body,preview:true})).status,400);assert.equal(calls,before);store.rows.set(row.id,row);
  assert.equal((await invoke(body,false)).status,401);
  assert.equal((await invoke({...body,facts:{house:1}})).status,400);
  assert.equal((await invoke({moonHoroscopes:{...body.moonHoroscopes,expectedUpdatedAt:'stale'}})).status,409);
  const sourceId=`synthetic-reference-${phase}`,reference=store.rows.get(sourceId)!;
  store.rows.set(sourceId,{...reference,status:'ARCHIVED'});assert.equal((await invoke({...body,preview:true})).status,409);assert.equal(calls,before);store.rows.set(sourceId,reference);
  const forged=structuredClone(row);forged.sections.moonWritingDraft.event.startsAt=new Date(Date.parse(event.startsAt)+60000).toISOString();store.rows.set(row.id,forged);assert.equal((await invoke({...body,preview:true})).status,409);assert.equal(calls,before);store.rows.set(row.id,row);
  const preview=await invoke({...body,preview:true});assert.equal(preview.status,200,preview.error);assert.equal(calls,before);
  let release!:()=>void;hold=new Promise(resolve=>{release=resolve;});
  const running=invoke(body);
  while(calls===before)await Promise.race([new Promise(resolve=>setTimeout(resolve,5)),running.then(result=>{throw new Error(`Generation stopped before dispatch: ${result.status} ${result.error}`);})]);
  const status=await invoke({moonHoroscopes:{...body.moonHoroscopes,action:'status'}});assert.equal(status.generation.status,'running');
  const duplicate=await invoke({moonHoroscopes:{...body.moonHoroscopes,expectedUpdatedAt:status.rows[0].updated_at}});assert.equal(duplicate.status,409);assert.equal(calls,before+1);
  release();hold=null;const result=await running;assert.equal(result.status,200,result.error);
  const saved=result.rows[0];assert.equal(saved.status,'DRAFT');assert.equal(saved.lane,'reference');assert.equal(saved.body,'');assert.equal(result.published,false);
  assert.equal(saved.sections.moonWritingDraft.section.passages[0].body,section.passages[0].body);
  assert.equal(saved.sections.moonWritingDraft.section.passages.filter((p:any)=>p.body.trim()).length,12);
  assert.equal(saved.source_snapshot.moonHoroscopeGeneration.ownerApproved,false);
  assert.equal((await invoke({moonHoroscopes:{id:row.id,expectedUpdatedAt:saved.updated_at,action:'generate'}})).status,409);
  // A lost provider response remains recoverable and never enables an automatic paid retry.
  const next=emptyMoonHoroscopes(event);next.passages[0].body='Owner untouched.';
  const raw=(await store.invoke('POST',moonWritingDraftPayload(event,next,null,null,null))).payload.rows[0];
  fail=true;body={moonHoroscopes:{id:raw.id,expectedUpdatedAt:raw.updated_at,action:'generate'}};
  assert.equal((await invoke(body)).status,503);fail=false;
  const recovery=await invoke({moonHoroscopes:{...body.moonHoroscopes,action:'status'}});assert.equal(recovery.generation.status,'running');
  assert.equal(recovery.rows[0].sections.moonWritingDraft.section.passages[0].body,'Owner untouched.');
  const current={...body.moonHoroscopes,expectedUpdatedAt:recovery.rows[0].updated_at};
  assert.equal((await invoke({moonHoroscopes:{...current,action:'release'}})).status,409);
  const released=await invoke({moonHoroscopes:{...current,action:'release',acknowledgeUnknownOutcome:true}});assert.equal(released.status,200,released.error);assert.equal(released.rows[0].source_snapshot.moonHoroscopeGeneration.status,'released');
  // Releasing an in-flight operation invalidates its exact storage version.
  const startedBefore=calls;hold=new Promise(resolve=>{release=resolve;});
  const late=invoke({moonHoroscopes:{id:raw.id,expectedUpdatedAt:released.rows[0].updated_at,action:'generate'}});
  while(calls===startedBefore)await Promise.race([new Promise(resolve=>setTimeout(resolve,5)),late.then(result=>{throw new Error(`Stopped before dispatch: ${result.status} ${result.error}`);})]);
  const active=await invoke({moonHoroscopes:{...current,action:'status'}});
  const stopped=await invoke({moonHoroscopes:{id:raw.id,expectedUpdatedAt:active.rows[0].updated_at,action:'release',acknowledgeUnknownOutcome:true}});assert.equal(stopped.status,200);
  release();hold=null;assert.equal((await late).status,503);assert.deepEqual(store.rows.get(raw.id),stopped.rows[0]);
  badFields=true;assert.equal((await invoke({moonHoroscopes:{id:raw.id,expectedUpdatedAt:stopped.rows[0].updated_at,action:'generate'}})).status,503);badFields=false;
  assert.equal(store.rows.get(raw.id).sections.moonWritingDraft.section.passages[0].body,'Owner untouched.');
 }
 console.log('PASS: actual authenticated Moon AI handler; calculated New/Full events and houses, free plan, missing-only schema, exact owner text, private recovery, duplicate/stale guards and explicit uncertain-request release. Synthetic provider only; no paid calls.');
}finally{globalThis.fetch=storeFetch;store.close();}
