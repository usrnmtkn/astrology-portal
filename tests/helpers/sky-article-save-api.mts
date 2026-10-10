import horoscopeWriter from '../../api/admin/horoscope-writing';
import {applyCheckpointFixture} from './horoscope-checkpoint-fixture.mts';
import {Readable} from 'node:stream';
import {readFileSync} from 'node:fs';
import {lunarSavedWritingFixtures} from './lunar-saved-writing-fixture.mjs';
import { readerRouteResponse, fixturePublications } from './content-reader-route.mjs';
import { servingPackageRecords } from "../../api/_lib/content-live-status";
// Actual handler, isolated storage, realistic latest-first/limit-one reads.
import { createApiStore } from './calendar-review-api.mjs';
import { skyPlacementSourceRecords } from '../../api/_lib/sky-placement-sources';
const key = 'sky-placement/article/sun/virgo';
const record = { ...structuredClone(skyPlacementSourceRecords.get(key)), placementArticle: 'During this transit, fixture existing article.',
 owner_approved: true, serving_enabled: true, review_status: 'approved' };
record.fallback.hook = 'During this transit, fixture governed opening.';
record.tldrTakeaway = 'Fixture governed ending.';
const live = { id: 'live-sun-virgo', content_key: key, surface: 'sky', mode: 'in_depth', status: 'LIVE', lane: 'serving', review_state: null,
 event_type: 'fallback-hook', block_type: 'fallback_hook', provider: 'tldrastro-fallback-architecture-v3', headline: record.headline, summary: record.summary, body: record.placementArticle,
 sections: { packageRecord: record }, facts: { fallbackArchitectureV3: true }, source_snapshot: { sourcePackage: record.source_package, content_role: record.content_role },
 updated_at: '2026-09-14T00:55:45.864Z', target_date: null };
const revision = { ...structuredClone(live), id: 'revision-sun-virgo', mode: 'studio-draft', lane: 'reference',
 status: process.env.SKY_SAVE_LEGACY_DRAFT ? 'DRAFT' : 'ARCHIVED', review_state: process.env.SKY_SAVE_LEGACY_DRAFT ? 'owner-review-required' : 'published-revision',
 event_type: 'sky-v4-reader-copy-draft', updated_at: '2026-09-14T00:55:46.035Z',
 sections: { packageRecord: { ...structuredClone(record), owner_approved: false, serving_enabled: false }, packageDraft: structuredClone(record) },
 source_snapshot: { ...live.source_snapshot, targetRowId: live.id, targetRowUpdatedAt: process.env.SKY_SAVE_LEGACY_DRAFT ? live.updated_at : '2026-09-14T00:50:00.000Z' } };
const template = structuredClone(servingPackageRecords.get('fallback-template/natal.angle-in-sign')!);
template.body = 'Fixture {{signTitle}}. TARGET';
const templateRow = {...structuredClone(live), id: 'fixture-natal-template', content_key: template.contentKey, surface: 'natal', event_type: 'fallback-template', block_type: 'fallback_template', headline: 'Fixture sign-aware template', body: template.body, sections: {packageRecord: template}, source_snapshot: {sourcePackage: 'tldrastro-fallback-architecture-v3', content_role: 'template'}};
export const store = await createApiStore(process.env.SKY_SAVE_FIXTURE ? JSON.parse(readFileSync(process.env.SKY_SAVE_FIXTURE, 'utf8')) : process.env.ZODIAC_TEMPLATE_FIXTURE ? [templateRow] : [revision, live]);
if(process.env.LUNAR_WRITER_FIXTURE==='1')for(const row of lunarSavedWritingFixtures())store.rows.set(row.id,row);
let versionSequence = 0;
const nextVersion = () => new Date(Date.now() + ++versionSequence).toISOString();
const matches = (row: any, params: URLSearchParams) => [...params].every(([field, value]) => {
 if (['select', 'order', 'limit', 'offset', 'on_conflict'].includes(field)) return true;
 if (field.startsWith('sections->horoscopeEdition->window->>')) {
  const actual = row.sections?.horoscopeEdition?.window?.[field.split('->>').at(-1)!];
  return typeof actual === 'string' && (value.startsWith('lte.') ? actual <= value.slice(4) : value.startsWith('gt.') ? actual > value.slice(3) : value.startsWith('eq.') ? actual === value.slice(3) : false);
 }
 if (value === 'is.null') return row[field] == null;
 if (value.startsWith('like.')) return String(row[field] ?? '').startsWith(value.slice(5).replace(/\*$/u, ''));
 if (value.startsWith('eq.')) return String(row[field] ?? '') === value.slice(3);
 if (value.startsWith('neq.')) return String(row[field] ?? '') !== value.slice(4);
 if (value.startsWith('in.(')) return value.slice(4, -1).split(',').map(v => v.replaceAll('"', '')).includes(String(row[field]));
 throw new Error(`Unmodeled storage filter ${field}=${value}`);
});
export const editorialFixtureRows=new Map<string,any>();
const horoscopeStorageFaults={remaining:[] as string[],lost:[] as string[],failWriterReservations:0};
globalThis.fetch = async (input: any, options: any = {}) => {
 const operation = await store.publication(input, options); if (operation) return operation;
 const reader = await readerRouteResponse(input, options); if (reader) return reader;
 const url = new URL(String(input));
 if (process.env.STUDIO_SESSION_FIXTURE === '1' && url.pathname === '/auth/v1/user') {
   return options.headers?.authorization === `Bearer ${sessionFixture.token}`
     ? Response.json({id:'fixture-owner',app_metadata:{role:'admin'}})
     : Response.json({message:'Invalid JWT'},{status:401});
 }
 if (url.origin !== 'https://calendar-api.invalid') throw new Error('Fixture refuses external storage');
 if(url.pathname==='/rest/v1/rpc/checkpoint_weekly_provider_result'){
  const input=JSON.parse(options.body),row=store.rows.get(input.p_id),active=row?.source_snapshot?.horoscopeGeneration?.active;
  if(!row||row.status!=='DRAFT'||row.sections?.horoscopeEdition?.window?.period!=='weekly'
   ||active?.id!==input.p_operation_id||active?.requestHash!==input.p_request_hash||active?.config?.provider!==input.p_provider
   ||active?.responseId!==input.p_response_id||active?.state!=='running')return Response.json('obsolete');
  if(active.providerResult)return Response.json('already_saved');
  const next=structuredClone(row);next.source_snapshot.horoscopeGeneration.active.providerResult=input.p_result;next.updated_at=nextVersion();
  store.rows.set(row.id,storageOrder(next));return Response.json('saved');
 }
 if(url.pathname==='/rest/v1/rpc/checkpoint_weekly_horoscope'){
  const input=JSON.parse(options.body),row=store.rows.get(input.p_id);
  if(!row||row.updated_at!==input.p_expected_updated_at||row.status!=='DRAFT'||row.sections?.horoscopeEdition?.window?.period!=='weekly')return Response.json([]);
  const updated=storageOrder({...applyCheckpointFixture(row,input.p_changes),updated_at:nextVersion()});
  const writerReservation=updated.source_snapshot?.horoscopeGeneration?.active;
  if(horoscopeStorageFaults.failWriterReservations>0&&writerReservation&&!writerReservation.phase
    &&writerReservation.id!==row.source_snapshot?.horoscopeGeneration?.active?.id){
    horoscopeStorageFaults.failWriterReservations--;return Response.json({error:'Synthetic reservation outage'},{status:503});
  }
  store.rows.set(row.id,updated);
  const response=Response.json([{id:row.id,updated_at:updated.updated_at}]);
  const generation=updated.source_snapshot?.horoscopeGeneration,active=generation?.active;
  const stage=active?.phase==='review'?(active.state==='starting'?'reservation':active.responseId?'review-id':null)
    :generation?.active===null&&Object.keys(generation.readings??{}).length?'completion':null;
  if(stage&&horoscopeStorageFaults.remaining.includes(stage)){
    horoscopeStorageFaults.remaining=horoscopeStorageFaults.remaining.filter(value=>value!==stage);horoscopeStorageFaults.lost.push(stage);
    Object.defineProperty(response,'json',{value:async()=>{throw new DOMException('Synthetic committed checkpoint lost its acknowledgement','AbortError');}});
  }
  return response;
 }
 if(url.pathname==='/rest/v1/studio_editorial_runs'){
  const found=[...editorialFixtureRows.values()].filter(row=>matches(row,url.searchParams));
  if(!options.method||options.method==='GET')return Response.json(found);
  const patch=JSON.parse(options.body);
  if(options.method==='POST'){if(editorialFixtureRows.has(patch.id))return Response.json({error:'conflict'},{status:409});editorialFixtureRows.set(patch.id,structuredClone(patch));return Response.json([patch]);}
  if(options.method==='PATCH'){const changed=found.map(row=>({...row,...patch}));changed.forEach(row=>editorialFixtureRows.set(row.id,structuredClone(row)));return Response.json(changed);}
  throw new Error('Unsupported private run mutation');
 }
 if(process.env.HOROSCOPE_EDITORIAL_FIXTURE==='1'&&url.pathname==='/rest/v1/studio_writing_feedback')return Response.json([{id:'synthetic-seasonal-rejection',version:1,kind:'rejection',status:'active',target_keys:['horoscope/seasonal'],rejected_text:'A rejected synthetic Seasonal passage.',owner_reason:'This synthetic passage failed to develop its premise.',source_uri:'test:seasonal-owner-rejection',source_date:'2026-10-05'}]);
 if (process.env.LUNAR_WRITER_FIXTURE === '1' && url.pathname === '/rest/v1/studio_writing_feedback') return Response.json([]);
 if (url.pathname === '/rest/v1/content_publications') return Response.json(fixturePublications([...store.rows.values()]));
 if (url.pathname !== '/rest/v1/generated_interpretations') throw new Error(`Unexpected storage path ${url.pathname}`);
 const found = [...store.rows.values()].filter(row => matches(row, url.searchParams));
 if (!options.method || options.method === 'GET') {
  if (url.searchParams.get('order')?.startsWith('updated_at.desc')) found.sort((a: any, b: any) => b.updated_at.localeCompare(a.updated_at));
  const offset = Number(url.searchParams.get('offset') ?? 0);
  const selected=found.slice(offset, offset + Number(url.searchParams.get('limit') ?? found.length));
  const columns=url.searchParams.get('select');
  return Response.json(!columns||columns==='*'?selected:selected.map(row=>Object.fromEntries(Object.entries(row).filter(([key])=>columns.split(',').includes(key)))));
 }
 if (options.method === 'DELETE') { found.forEach(row => store.rows.delete(row.id)); return Response.json(found); }
 const patch = JSON.parse(String(options.body));
 if (options.method === 'PATCH') {
  const updated = found.map(row => storageOrder({ ...row, ...patch, updated_at: nextVersion() })); updated.forEach(row => store.rows.set(row.id, row));
  const columns=url.searchParams.get('select');
  const response=Response.json(!columns||columns==='*'?updated:updated.map(row=>Object.fromEntries(Object.entries(row).filter(([key])=>columns.split(',').includes(key)))));
  const generation=patch.source_snapshot?.horoscopeGeneration,active=generation?.active;
  const stage=active?.phase==='review'?(active.state==='starting'?'reservation':active.responseId?'review-id':null)
    :generation?.active===null&&Object.keys(generation.readings??{}).length?'completion':null;
  if(updated.length&&stage&&horoscopeStorageFaults.remaining.includes(stage)){
    horoscopeStorageFaults.remaining=horoscopeStorageFaults.remaining.filter(value=>value!==stage);horoscopeStorageFaults.lost.push(stage);
    Object.defineProperty(response,'json',{value:async()=>{throw new DOMException('Synthetic committed checkpoint lost its acknowledgement','AbortError');}});
  }
  return response;
 }
 if (options.method === 'POST') {
  if ([...store.rows.values()].some((r: any) => r.content_key === patch.content_key && r.mode === patch.mode && r.target_date == patch.target_date)) return Response.json({message: 'duplicate target'}, {status: 409});
  const timestamp = nextVersion();
  const created = storageOrder({ ...(patch.content_key.startsWith('horoscope/')?{created_by:null,openai_response_id:null,error:null,studio_facts:null}:{}),...patch, id: patch.content_key.startsWith('horoscope/') ? `00000000-0000-4000-8000-${String(store.rows.size).padStart(12,'0')}` : `new-${store.rows.size}`, updated_at: timestamp, created_at: timestamp }); store.rows.set(created.id, created); return Response.json([created]);
 }
 throw new Error(`Unexpected storage method ${options.method}`);
};
function storageOrder(row:any) {
 if (!row.content_key.startsWith('horoscope/')) return row;
 const ordered=(value:any):any=>Array.isArray(value)?value.map(ordered):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,ordered(value[key])])):value;
 return ordered(row);
}
export function fixtureMonthlySynthesis(facts:any){return {thesis:'The synthetic monthly concern develops across the supplied facts.',stories:facts.planetaryArcs.filter((arc:any)=>arc.developmentIds.length>=2).slice(0,2).map((arc:any)=>({planet:arc.planet,humanConcern:'A connected synthetic concern.',development:arc.developmentIds.slice(0,2).map((factId:string,i:number)=>({factId,changes:`The synthetic concern changes at step ${i+1}.`}))})),readingMovement:'Follow each connected concern and its changes.',endingChange:'The reader understands the synthetic concern differently.'};}
export const writerFixture={calls:0,reviewCalls:0,reviewRequests:new Map<string,any>(),polls:0,pendingPolls:0,rejectSeasonalVoice:false,terminalNext:false,failNext:false,unknownNext:false,nextResult:null as any,nextReviewResult:null as any,startResult:null as any,requests:new Map<string,any>()};
export function fixtureMonthlyContext(facts:any){
 const plan=fixtureMonthlySynthesis(facts);
 const mars=plan.stories.find((s:any)=>s.planet==='mars');
 const station:any=Object.values(facts.factsById).find((f:any)=>f.planet==='mercury'&&f.type==='station');
 if(!mars||!station)throw new Error('Fixture needs the Mercury station and Mars contacts.');
 mars.development.push({factId:station.id,changes:'The other participant changes condition before their repeated contact.'});
 return plan;
}
export function seedLegacyMonthlyPlanFailure(id:string){
 const row=store.rows.get(id),generation=row?.source_snapshot?.horoscopeGeneration;
 if(generation?.active?.phase!=='synthesis')throw new Error('Choose a saved synthesis request.');
 const failure={code:'invalid_synthesis',message:'The monthly plan was incomplete or contained an unsupported event. No prose request was started.',operation:structuredClone(generation.active),failedAt:new Date().toISOString(),diagnostic:{status:'completed'}};
 writerFixture.nextResult={status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(fixtureMonthlyContext(generation.active.synthesisFacts))}]}]};
 generation.lastError=failure;generation.failures=[...(generation.failures??[]),failure];generation.active=null;
 return structuredClone(row);
}
export const sessionFixture={token:''};
export async function invokeHoroscopeWriting(body:any,secret='calendar-api-fixture',headers?:Record<string,string>) {
 const req=Readable.from([JSON.stringify(body)]);Object.assign(req,{method:'POST',headers:headers??{authorization:`Bearer ${secret}`}});
 let result:any;const res={statusCode:200,setHeader(){},end(value:string){result={status:this.statusCode,payload:JSON.parse(value)};}};
 await horoscopeWriter(req as any,res as any);return result;
}
// Existing prose/fact suites finish the added stage explicitly through the API.
// Recovery/admission suites use invokeHoroscopeWriting directly to inspect each
// boundary and its total cost. Review calls are counted separately, never hidden.
export async function invokeHoroscopeWritingWithReview(body:any,secret='calendar-api-fixture',headers?:Record<string,string>){
 let result=await invokeHoroscopeWriting(body,secret,headers);
 const row=result.payload?.rows?.[0];
 if(result.status===202&&row?.source_snapshot?.horoscopeGeneration?.active?.workflow?.startsWith('horoscope-review/')){
   result=await invokeHoroscopeWriting({action:'continue',id:row.id,expectedUpdatedAt:row.updated_at},secret,headers);
   if(result.status===202){const current=result.payload.rows[0];result=await invokeHoroscopeWriting({action:'poll',id:current.id,expectedUpdatedAt:current.updated_at},secret,headers);}
 }
 return result;
}
export function installHoroscopeWriterFixture(){
 process.env.HOROSCOPE_EDITORIAL_FIXTURE='1';
 process.env.OPENAI_API_KEY='synthetic-test-only';process.env.STUDIO_MEMORY_FEEDBACK_ENABLED='false';
 const storageFetch=globalThis.fetch;
 globalThis.fetch=async(input:any,options:any={})=>{
   const url=String(input);
   if(!url.startsWith('https://api.openai.com/'))return storageFetch(input,options);
   if(url==='https://api.openai.com/v1/responses'&&options.method==='POST'){
     if(![...store.rows.values()].some(row=>row.source_snapshot?.horoscopeGeneration?.active?.requestHash))throw new Error('No durable request reservation before provider call');
     const request=JSON.parse(options.body),review=request.instructions.startsWith('SHARED SEMANTIC RHETORICAL REVIEW');
     if(review)writerFixture.reviewCalls++;else writerFixture.calls++;
     if(writerFixture.unknownNext){writerFixture.unknownNext=false;throw new Error('Fixture connection lost');}
     if(writerFixture.failNext){writerFixture.failNext=false;return Response.json({error:{code:'insufficient_quota',message:'Fixture quota'}},{status:429});}
     if(!request.background||!request.instructions||!request.text?.format?.schema)throw new Error('Missing real governed provider request');
     const sign=review?JSON.parse(request.input).evidence.engineFacts.risingSign:request.text.format.schema.required.includes('stories')?'overview':request.input.includes('AUDIENCE AND SCOPE\nOne shared reading')?'overview':request.input.match(/"risingSign":"([a-z]+)"/)?.[1]??[...request.input.matchAll(/"audience":"([a-z]+)"/g)].find(m=>!['rising','collective'].includes(m[1]))?.[1]??request.input.match(/AUDIENCE\n([a-z]+)\n/)?.[1];
     if(!sign)throw new Error('No calculated rising sign supplied');
     const id=review?`resp_review_fixture_${writerFixture.reviewCalls}`:`resp_fixture_${writerFixture.calls}`;
     (review?writerFixture.reviewRequests:writerFixture.requests).set(id,{...request,sign});
     if(writerFixture.startResult){const result=writerFixture.startResult;writerFixture.startResult=null;return Response.json({id,...result});}
     return Response.json({id,status:'queued'});
   }
   const cancel=url.endsWith('/cancel');
   const id=url.split('/').at(cancel?-2:-1)!,request=writerFixture.requests.get(id)??writerFixture.reviewRequests.get(id);
   if(!request)throw new Error('Unrecognized fixture response');writerFixture.polls++;
   if(cancel)return Response.json({id,status:'cancelled'});
   if(writerFixture.pendingPolls>0){writerFixture.pendingPolls--;return Response.json({id,status:'in_progress'});}
   if(writerFixture.nextResult){const result=writerFixture.nextResult;writerFixture.nextResult=null;return Response.json({id,...result});}
   if(writerFixture.terminalNext){writerFixture.terminalNext=false;return Response.json({id,status:'failed',error:{message:'Fixture provider could not finish this reading.'}});}
   if(request.instructions.startsWith('SHARED SEMANTIC RHETORICAL REVIEW')){
     if(writerFixture.nextReviewResult){const value=writerFixture.nextReviewResult;writerFixture.nextReviewResult=null;return Response.json({id,...value});}
     return Response.json({id,status:'completed',usage:{input_tokens:60,output_tokens:10},output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({checks:['CORRECTIO','TRICOLON','PURPLE_PROSE'].map(label=>({label,outcome:'pass',reason:'Synthetic transport fixture.'})),findings:[]})}]}]});
   }
   if(request.instructions.startsWith('SEASONAL PRIVATE EDITORIAL AUTHORITY')){
     const input=JSON.parse(request.input),required=request.text.format.schema.required;
     let value:any;
     if(required.includes('core')){
       const event=input.governedFacts.events.find((e:any)=>e.placementRef&&input.governedFacts.placements[e.placementRef].meaningRef);
       value={core:'Synthetic governed mechanism.',links:[{eventId:event.id,meaningRef:input.governedFacts.placements[event.placementRef].meaningRef,explanation:'Synthetic supported mechanism.'}],humanDomains:['Synthetic domain'],limits:['No biography'],placementSpecificity:'Synthetic placement distinction.'};
     }else if(required.includes('humanConcern')){
       const source=input.evidenceManifest.entries.find((e:any)=>e.role==='approved');
       value={humanConcern:'Synthetic concern.',startingSituation:'Synthetic underlying concern.',humanWant:'Synthetic supported desire.',developments:[{eventId:input.mechanism.links[0].eventId,whatChanges:'Synthetic development.'}],consequentialDistinction:'Synthetic distinction.',changedUnderstanding:'Synthetic new recognition.',differentResponse:'Synthetic possible response.',plausibleManifestations:[],notAssumed:['No invented story'],passageSelections:[{id:source.id,why:'Synthetic shared prose function.'}],sourceDifferences:[{id:source.id,difference:'Synthetic distinct argument.'}]};
     }else{
       value={candidateHash:input.candidateHash,manifestHash:input.manifestHash,checks:request.text.format.schema.properties.checks.items.properties.id.enum.map((check:string)=>({id:check,outcome:'pass',explanation:'Synthetic check; no quality claim.'})),findings:[],comparisonSummary:'Synthetic owner comparison.'};
       if(writerFixture.rejectSeasonalVoice&&value.checks.some((c:any)=>c.id==='overall_owner_voice')){
         value.checks.find((c:any)=>c.id==='overall_owner_voice').outcome='fail';
         const paragraph=input.candidate.body.split(/\n\s*\n/u)[0],evidence=input.evidenceManifest.entries.find((e:any)=>e.role==='approved');
         value.findings.push({checkId:'overall_owner_voice',label:'owner_voice_failure',field:'body',quote:paragraph,paragraph,explanation:'Synthetic concrete failure.',readerConsequence:'Synthetic loss of progression.',comparisons:[{evidenceId:evidence.id,quote:evidence.text.slice(0,80),reason:'Synthetic comparison.'}],responsibleStage:'prose'});
       }
     }
     return Response.json({id,status:'completed',usage:{input_tokens:100,output_tokens:50},output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(value)}]}]});
   }
   if(request.text.format.schema.required.includes('startingSituation')){
     const catalog=JSON.parse(request.input.split('GOVERNED FACT CATALOG\n')[1].split('\n\n')[0]);
     const passages=JSON.parse(request.input.split('ELIGIBLE COMPLETE OWNER PASSAGES\n')[1]);
     const plan={startingSituation:'Synthetic planning situation.',humanWant:'Finish a synthetic shared task.',developments:catalog.events.slice(0,2).map((e:any,i:number)=>({eventId:e.id,whatChanges:`Synthetic development ${i+1}.`})),changedUnderstanding:'A new synthetic fact is available.',differentResponse:'The synthetic next step changes.',passageSelections:passages.slice(0,3).map((p:any)=>({id:p.id,why:'Synthetic selection reason for sentence movement.'}))};
     return Response.json({id,status:'completed',usage:{input_tokens:100,output_tokens:50},output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(plan)}]}]});
   }
   if(request.text.format.schema.required.includes('findings'))return Response.json({id,status:'completed',usage:{input_tokens:100,output_tokens:40},output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({findings:[],comparison:'Synthetic advisory review; no prose approval.'})}]}]});
   if(request.text.format.schema.required.includes('stories')){const facts=JSON.parse(request.input.split('MONTHLY FACTS AND PLAN SCOPE\n')[1].split('\n\n')[0]);return Response.json({id,status:'completed',usage:{input_tokens:50,output_tokens:30},output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(fixtureMonthlySynthesis(facts))}]}]});}
   return Response.json({id,status:'completed',usage:{input_tokens:100,output_tokens:40},output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({headline:request.text.format.schema.properties.headline.enum?.[0]??`Fixture ${request.sign} reading`,...(request.text.format.schema.required.includes('tldr')?{tldr:'You can read the complete monthly summary fixture.\n\nYour summary ends here.'}:{}),body:`You can read the complete ${request.sign} fixture opening.\n\nYour saved fixture ends here.`})}]}]});
 };
}
if(process.env.HOROSCOPE_WRITER_FIXTURE==='1')installHoroscopeWriterFixture();
const alternativeProviders=process.env.HOROSCOPE_ALTERNATIVE_PROVIDERS_FIXTURE==='1'
 ? (await import('./horoscope-provider-fixture.mts')).installAlternativeHoroscopeProviders():null;
if (process.send) process.on('message', async ({ id, method, body, url, headers }: any) => {
 try {
  if(method==='storage-state'){
   if(body?.failWriterReservations!==undefined)horoscopeStorageFaults.failWriterReservations=body.failWriterReservations;
    if(body?.lose)horoscopeStorageFaults.remaining=[...body.lose];
    process.send!({id,result:structuredClone(horoscopeStorageFaults)});return;
  }
  if(method==='provider-state'&&alternativeProviders){
    for(const key of ['claudeDelay','claudeError','geminiError','geminiDelay','geminiInterrupted','geminiRetrievalError'] as const)if(body?.[key]!==undefined)(alternativeProviders as any)[key]=body[key];
    if(body?.missingGemini)delete process.env.GEMINI_API_KEY;
    process.send!({id,result:{geminiGets:alternativeProviders.geminiGets,requests:alternativeProviders.requests.map(({provider,request}:any)=>({provider,model:request.model}))}});return;
  }
  if(method==='legacy-gemini-request'){
    const row=store.rows.get(body.id),active=row.source_snapshot.horoscopeGeneration.active;
    if(active?.config?.provider!=='gemini')throw new Error('Fixture requires an active Gemini request');
    delete active.config.transport;delete active.providerResult;
    active.responseId='v1_synthetic_legacy';
    if(body.expired)active.startedAt=new Date(Date.now()-311000).toISOString();
    process.send!({id,result:structuredClone(row)});return;
  }
  if(method==='auth-state'){sessionFixture.token=body.token;process.send!({id,result:{ok:true}});return;}
  if(method==='document-request'){
    const handler=(await import('../../api/admin/generated-content')).default;
    const req:any=Readable.from([]);req.method='GET';req.url=url;req.headers=headers??{};
    const res:any={statusCode:200,setHeader(){},end(raw:string){this.payload=JSON.parse(raw);}};
    await handler(req,res);process.send!({id,result:{status:res.statusCode,payload:res.payload}});return;
  }
  if (method === 'writer-state') {
    for(const key of ['pendingPolls','terminalNext','unknownNext','nextResult','nextReviewResult','startResult','rejectSeasonalVoice'] as const)if(body?.[key]!==undefined)(writerFixture as any)[key]=body[key];
    process.send!({id,result:{calls:writerFixture.calls,reviewCalls:writerFixture.reviewCalls,polls:writerFixture.polls,responseIds:[...writerFixture.requests.keys()]}});return;
  }
  if (method === 'interrupted-horoscope-start') {
    const row=store.rows.get(body.id),generation=row.source_snapshot.horoscopeGeneration;
    const interrupted=generation.active??Object.values(generation.heldRequests??{})[0];
    if(!interrupted)throw new Error('Fixture requires a reserved request');
    generation.active=structuredClone(interrupted);
    generation.heldRequests={};
    generation.active.responseId=null;
    if(body.beforeDispatch)delete generation.active.requestHash;
    if(body.expired)generation.active.startedAt=new Date(Date.now()-311000).toISOString();
    process.send!({id,result:structuredClone(row)});return;
  }
  if (method === 'legacy-seasonal-request') {
    // Upgrade fixture: a request dispatched before the staged Seasonal controller.
    // Recovery still exercises the current handler; this cannot dispatch a model call.
    const row=store.rows.get(body.id),generation=row?.source_snapshot?.horoscopeGeneration??{};
    if(row?.sections?.horoscopeEdition?.window?.period!=='seasonal'||generation.active)throw new Error('Choose an idle Seasonal fixture.');
    const responseId=`resp_fixture_${++writerFixture.calls}`;
    writerFixture.requests.set(responseId,{sign:body.sign,instructions:'Legacy single-response fixture',text:{format:{schema:{required:['headline','body'],properties:{headline:{}}}}}});
    row.source_snapshot.horoscopeGeneration={...generation,active:{id:`legacy-${responseId}`,sign:body.sign,planHash:body.approvedPlanHash,
      startedAt:new Date().toISOString(),state:'running',responseId,requestHash:`legacy-${responseId}`,outputFormat:null,
      config:{model:'synthetic-legacy'},receipt:{version:'legacy-single-response',ownerApproved:false,promotionAuthorized:false}}};
    process.send!({id,result:{status:202,payload:{ok:true,rows:[structuredClone(row)],pending:true}}});return;
  }
  if (method === 'legacy-horoscope-failure') {
    const row=store.rows.get(body.id),generation=row?.source_snapshot?.horoscopeGeneration;
    if(!generation?.lastError||generation.active)throw new Error('Choose a failed fixture edition.');
    const {operation,failedAt}=generation.lastError;
    generation.lastError={operation,failedAt,message:'The writer did not complete a usable reading. Completed signs are saved. Review the plan and resume to try this sign again.'};
    delete generation.failures;
    process.send!({id,result:row});return;
  }
  if(method==='legacy-monthly-plan-failure'){process.send!({id,result:seedLegacyMonthlyPlanFailure(body.id)});return;}
  if (method === 'daily-writing') {
    const handler = (await import('../../api/admin/calendar-daily-writing')).default;
    const req:any=Readable.from([JSON.stringify(body)]);req.method='POST';req.url='/api/admin/calendar-daily-writing';req.headers={'x-content-generation-secret':'calendar-api-fixture'};
    const res:any={statusCode:200,setHeader(){},end(raw:string){this.payload=JSON.parse(raw);}};
    await handler(req,res);process.send!({id,result:{status:res.statusCode,payload:res.payload}});return;
  }
  if (method === 'lunar-writing') {
    const handler = (await import('../../api/admin/calendar-lunation-writing')).default;
    const req:any=Readable.from([JSON.stringify(body)]);req.method='POST';req.url='/api/admin/calendar-lunation-writing';req.headers={'x-content-generation-secret':'calendar-api-fixture'};
    const res:any={statusCode:200,setHeader(){},end(raw:string){this.payload=JSON.parse(raw);}};
    await handler(req,res);process.send!({id,result:{status:res.statusCode,payload:res.payload}});return;
  }
  if (method === 'writing') { process.send!({id,result:await invokeHoroscopeWriting(body,undefined,headers)});return; }
  if (method === 'reader') { const response = await readerRouteResponse('/api/content-reader',{method:'POST',body:JSON.stringify(body)}); process.send!({id,result:{status:response.status,payload:await response.json()}}); return; }
  process.send!({ id, result: method === 'rows' ? [...store.rows.values()] : await store.invoke(method, body, url) });
 }
 catch (error) { process.send!({ id, error: String(error) }); }
});
if (process.send) process.send({ ready: true });
