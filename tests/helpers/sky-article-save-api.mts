import horoscopeWriter from '../../api/admin/horoscope-writing';
import {Readable} from 'node:stream';
import {readFileSync} from 'node:fs';
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
globalThis.fetch = async (input: any, options: any = {}) => {
 const operation = await store.publication(input, options); if (operation) return operation;
 const reader = await readerRouteResponse(input, options); if (reader) return reader;
 const url = new URL(String(input));
 if (url.origin !== 'https://calendar-api.invalid') throw new Error('Fixture refuses external storage');
 if (process.env.LUNAR_WRITER_FIXTURE === '1' && url.pathname === '/rest/v1/studio_writing_feedback') return Response.json([]);
 if (url.pathname === '/rest/v1/content_publications') return Response.json(fixturePublications([...store.rows.values()]));
 if (url.pathname !== '/rest/v1/generated_interpretations') throw new Error(`Unexpected storage path ${url.pathname}`);
 const found = [...store.rows.values()].filter(row => matches(row, url.searchParams));
 if (!options.method || options.method === 'GET') {
  if (url.searchParams.get('order')?.startsWith('updated_at.desc')) found.sort((a: any, b: any) => b.updated_at.localeCompare(a.updated_at));
  const offset = Number(url.searchParams.get('offset') ?? 0);
  return Response.json(found.slice(offset, offset + Number(url.searchParams.get('limit') ?? found.length)));
 }
 if (options.method === 'DELETE') { found.forEach(row => store.rows.delete(row.id)); return Response.json(found); }
 const patch = JSON.parse(String(options.body));
 if (options.method === 'PATCH') {
  const updated = found.map(row => storageOrder({ ...row, ...patch, updated_at: nextVersion() })); updated.forEach(row => store.rows.set(row.id, row)); return Response.json(updated);
 }
 if (options.method === 'POST') {
  if ([...store.rows.values()].some((r: any) => r.content_key === patch.content_key && r.mode === patch.mode && r.target_date == patch.target_date)) return Response.json({message: 'duplicate target'}, {status: 409});
  const timestamp = nextVersion();
  const created = storageOrder({ ...patch, id: patch.content_key.startsWith('horoscope/') ? `00000000-0000-4000-8000-${String(store.rows.size).padStart(12,'0')}` : `new-${store.rows.size}`, updated_at: timestamp, created_at: timestamp }); store.rows.set(created.id, created); return Response.json([created]);
 }
 throw new Error(`Unexpected storage method ${options.method}`);
};
function storageOrder(row:any) {
 if (!row.content_key.startsWith('horoscope/')) return row;
 const ordered=(value:any):any=>Array.isArray(value)?value.map(ordered):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,ordered(value[key])])):value;
 return ordered(row);
}
export function fixtureMonthlySynthesis(facts:any){return {thesis:'The synthetic monthly concern develops across the supplied facts.',stories:facts.planetaryArcs.filter((arc:any)=>arc.developmentIds.length>=2).slice(0,2).map((arc:any)=>({planet:arc.planet,humanConcern:'A connected synthetic concern.',development:arc.developmentIds.slice(0,2).map((factId:string,i:number)=>({factId,changes:`The synthetic concern changes at step ${i+1}.`}))})),readingMovement:'Follow each connected concern and its changes.',endingChange:'The reader understands the synthetic concern differently.'};}
export const writerFixture={calls:0,polls:0,pendingPolls:0,terminalNext:false,failNext:false,unknownNext:false,nextResult:null as any,startResult:null as any,requests:new Map<string,any>()};
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
export async function invokeHoroscopeWriting(body:any,secret='calendar-api-fixture') {
 const req=Readable.from([JSON.stringify(body)]);Object.assign(req,{method:'POST',headers:{authorization:`Bearer ${secret}`}});
 let result:any;const res={statusCode:200,setHeader(){},end(value:string){result={status:this.statusCode,payload:JSON.parse(value)};}};
 await horoscopeWriter(req as any,res as any);return result;
}
export function installHoroscopeWriterFixture(){
 process.env.OPENAI_API_KEY='synthetic-test-only';process.env.STUDIO_MEMORY_FEEDBACK_ENABLED='false';
 const storageFetch=globalThis.fetch;
 globalThis.fetch=async(input:any,options:any={})=>{
   const url=String(input);
   if(!url.startsWith('https://api.openai.com/'))return storageFetch(input,options);
   if(url==='https://api.openai.com/v1/responses'&&options.method==='POST'){
     if(![...store.rows.values()].some(row=>row.source_snapshot?.horoscopeGeneration?.active?.requestHash))throw new Error('No durable request reservation before provider call');
     writerFixture.calls++;
     if(writerFixture.unknownNext){writerFixture.unknownNext=false;throw new Error('Fixture connection lost');}
     if(writerFixture.failNext){writerFixture.failNext=false;return Response.json({error:{code:'insufficient_quota',message:'Fixture quota'}},{status:429});}
     const request=JSON.parse(options.body);
     if(!request.background||!request.instructions||!request.text?.format?.schema)throw new Error('Missing real governed provider request');
     const sign=request.text.format.schema.required.includes('stories')?'overview':request.input.includes('AUDIENCE AND SCOPE\nOne shared reading')?'overview':request.input.match(/"risingSign":"([a-z]+)"/)?.[1];
     if(!sign)throw new Error('No calculated rising sign supplied');
     const id=`resp_fixture_${writerFixture.calls}`;
     writerFixture.requests.set(id,{...request,sign});
     if(writerFixture.startResult){const result=writerFixture.startResult;writerFixture.startResult=null;return Response.json({id,...result});}
     return Response.json({id,status:'queued'});
   }
   const id=url.split('/').at(-1)!,request=writerFixture.requests.get(id);
   if(!request)throw new Error('Unrecognized fixture response');writerFixture.polls++;
   if(writerFixture.pendingPolls>0){writerFixture.pendingPolls--;return Response.json({id,status:'in_progress'});}
   if(writerFixture.nextResult){const result=writerFixture.nextResult;writerFixture.nextResult=null;return Response.json({id,...result});}
   if(writerFixture.terminalNext){writerFixture.terminalNext=false;return Response.json({id,status:'failed',error:{message:'Fixture provider could not finish this reading.'}});}
   if(request.text.format.schema.required.includes('stories')){const facts=JSON.parse(request.input.split('MONTHLY FACTS AND PLAN SCOPE\n')[1].split('\n\n')[0]);return Response.json({id,status:'completed',usage:{input_tokens:50,output_tokens:30},output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(fixtureMonthlySynthesis(facts))}]}]});}
   return Response.json({id,status:'completed',usage:{input_tokens:100,output_tokens:40},output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({headline:request.text.format.schema.properties.headline.enum?.[0]??`Fixture ${request.sign} reading`,...(request.text.format.schema.required.includes('tldr')?{tldr:'You can read the complete monthly summary fixture.\n\nYour summary ends here.'}:{}),body:`You can read the complete ${request.sign} fixture opening.\n\nYour saved fixture ends here.`})}]}]});
 };
}
if(process.env.HOROSCOPE_WRITER_FIXTURE==='1')installHoroscopeWriterFixture();
if (process.send) process.on('message', async ({ id, method, body, url }: any) => {
 try {
  if (method === 'writer-state') {
    for(const key of ['pendingPolls','terminalNext','unknownNext','nextResult','startResult'] as const)if(body?.[key]!==undefined)(writerFixture as any)[key]=body[key];
    process.send!({id,result:{calls:writerFixture.calls,polls:writerFixture.polls,responseIds:[...writerFixture.requests.keys()]}});return;
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
  if (method === 'lunar-writing') {
    const handler = (await import('../../api/admin/calendar-lunation-writing')).default;
    const req:any=Readable.from([JSON.stringify(body)]);req.method='POST';req.url='/api/admin/calendar-lunation-writing';req.headers={'x-content-generation-secret':'calendar-api-fixture'};
    const res:any={statusCode:200,setHeader(){},end(raw:string){this.payload=JSON.parse(raw);}};
    await handler(req,res);process.send!({id,result:{status:res.statusCode,payload:res.payload}});return;
  }
  if (method === 'writing') { process.send!({id,result:await invokeHoroscopeWriting(body)});return; }
  if (method === 'reader') { const response = await readerRouteResponse('/api/content-reader',{method:'POST',body:JSON.stringify(body)}); process.send!({id,result:{status:response.status,payload:await response.json()}}); return; }
  process.send!({ id, result: method === 'rows' ? [...store.rows.values()] : await store.invoke(method, body, url) });
 }
 catch (error) { process.send!({ id, error: String(error) }); }
});
if (process.send) process.send({ ready: true });
