import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import batchCron from '../api/cron/run-horoscope-batches';
import {store,installHoroscopeWriterFixture,invokeHoroscopeWriting,writerFixture} from '../tests/helpers/sky-article-save-api.mts';
import {installAlternativeHoroscopeProviders} from '../tests/helpers/horoscope-provider-fixture.mts';
import {emptyHoroscopeEdition,horoscopeEditionBody,horoscopeEditionKey} from '../apps/web/src/content/horoscopeEditions.mjs';
import {runHoroscopeWriting} from '../api/admin/horoscope-writing';
import {runWeeklyHoroscopeBatch} from '../api/_lib/horoscope-batch';
import {horoscopeEditorRow} from '../api/_lib/horoscope-editor-payload';
import {decodeWeeklyHistoryRow} from '../api/_lib/horoscope-history-storage';

installHoroscopeWriterFixture();
const transport=installAlternativeHoroscopeProviders();
const latest=(id:string)=>decodeWeeklyHistoryRow(structuredClone(store.rows.get(id)));
const action=(id:string,action:string,extra:any={})=>runHoroscopeWriting({action,id,expectedUpdatedAt:latest(id).updated_at,...extra},'synthetic-owner');
async function create(date:string){
 const facts=await store.invoke('GET',undefined,`/api/admin/generated-content?horoscopeBrief=true&period=weekly&date=${date}&timeZone=America%2FNew_York`);
 assert.equal(facts.status,200,JSON.stringify(facts.payload));
 const {brief,signature}=facts.payload,edition=emptyHoroscopeEdition(brief.window);
 const result=await store.invoke('POST',{contentKey:horoscopeEditionKey(edition.window),surface:'sky',mode:'article',eventType:'horoscope-edition',provider:'manual-admin',status:'DRAFT',lane:'serving',headline:'Synthetic batch edition',body:horoscopeEditionBody(edition),sections:{horoscopeEdition:edition},facts:{horoscopeBrief:{brief,signature}},sourceSnapshot:{horoscopeOutlines:{}}});
 assert.equal(result.status,200,JSON.stringify(result.payload));return result.payload.rows[0].id;
}
async function approve(id:string){
 const plan=await action(id,'prepare',{writerChoice:'gemini'});assert.equal(plan.status,200,JSON.stringify(plan.payload));
 const start=await action(id,'start-batch',{approvedPlanHash:plan.payload.plan.planHash});assert.equal(start.status,202,JSON.stringify(start.payload));return plan.payload.plan.planHash;
}
const worker=(id:string,maxSteps=100)=>runWeeklyHoroscopeBatch(id,{maxSteps,wait:async()=>{}});
const id=await create('2026-10-05');
// Reproduce an old edition's nested history before running the real handlers.
// Generation, editor retrieval, manual saves and reload must see the full text;
// database checkpoint writes must keep it encoded throughout all twelve signs.
const retainedHistory={code:'synthetic_previous_failure',message:'Saved historical evidence',
  diagnostic:{previous:Array.from({length:42},(_,i)=>({index:i,request:'Synthetic exact history. '.repeat(44000)}))}};
const seeded=latest(id);seeded.source_snapshot.horoscopeGeneration={failures:[retainedHistory]};store.rows.set(id,seeded);
assert.equal((await action(id,'start-batch',{approvedPlanHash:'invented'})).status,409);
await approve(id);
// No browser advance call: stop a worker after the writer has been reserved,
// then construct a fresh worker. Stored authorization covers all twelve signs.
await worker(id,1);
assert(Buffer.byteLength(JSON.stringify(store.rows.get(id)))<2_000_000,'Database row stays small after legacy history conversion');
assert.deepEqual(latest(id).source_snapshot.horoscopeGeneration.failures,[retainedHistory]);
assert(latest(id).source_snapshot.horoscopeGeneration.active);
assert.equal((await action(id,'pause-batch')).status,200);
const calls=transport.requests.length;
assert.equal((await worker(id)).state,'idle');assert.equal(transport.requests.length,calls);
assert.equal((await action(id,'resume-batch')).status,200);
const result=await worker(id);
assert.equal(result.state,'complete',JSON.stringify(result));
let row=latest(id),generation=row.source_snapshot.horoscopeGeneration;
assert.equal(generation.batch.status,'complete');assert.equal(generation.batch.attempted.length,12);
assert(row.sections.horoscopeEdition.passages.every((p:any)=>p.body.trim()&&p.headline.trim()));
assert.equal(transport.requests.length,12);assert.equal(writerFixture.reviewCalls,12);
assert.equal(row.status,'DRAFT');assert.equal(row.published_at??null,null);
assert.deepEqual(generation.failures,[retainedHistory],'Every original history field survives the complete batch');
assert(Buffer.byteLength(JSON.stringify(store.rows.get(id)))<2_000_000);
await worker(id);assert.equal(transport.requests.length,12,'Completed batches never dispatch again');
assert.equal((await invokeHoroscopeWriting({action:'start-batch',id,expectedUpdatedAt:row.updated_at,batchId:'forged'})).status,400);
// Multi-megabyte history never crosses the editor transport or its save request.
const history='Synthetic private history. '.repeat(2_000_000);
row.source_snapshot.privateAudit={history};store.rows.set(id,row);
const projected=horoscopeEditorRow(row);
assert(Buffer.byteLength(JSON.stringify(projected))<1_000_000);
assert(!JSON.stringify(projected).includes(history.slice(0,1000)));
const edited=structuredClone(projected.sections);edited.horoscopeEdition.passages[0].body+=' A saved manual edit.';
const patch={id,expectedUpdatedAt:row.updated_at,headline:row.headline,status:'DRAFT',body:horoscopeEditionBody(edited.horoscopeEdition),sections:edited,sourceSnapshot:{horoscopeOutlines:{}}};
assert(Buffer.byteLength(JSON.stringify(patch))<100_000);
const saved=await store.invoke('PATCH',patch,'/api/admin/generated-content?horoscopeEditor=true');
assert.equal(saved.status,200,JSON.stringify(saved.payload).slice(0,1000));
assert.equal(latest(id).source_snapshot.privateAudit.history,history);
assert(Buffer.byteLength(JSON.stringify(saved.payload))<1_000_000);
assert.equal((await store.invoke('PATCH',patch)).status,409);
// Remove synthetic bulk only inside the fixture to keep subsequent assertions cheap.
row=latest(id);delete row.source_snapshot.privateAudit;store.rows.set(id,row);
// A hold on one reading cannot prevent rejecting a different saved candidate.
row=latest(id);generation=row.source_snapshot.horoscopeGeneration;
generation.heldRequests={sagittarius:{id:'synthetic-held',sign:'sagittarius',state:'starting',startedAt:'2026-01-01T00:00:00Z',requestHash:'uncertain'}};
const held=structuredClone(generation.heldRequests);
store.rows.set(id,row);
const rejected=await action(id,'reject',{sign:'scorpio'});
assert.equal(rejected.status,200,JSON.stringify(rejected.payload).slice(0,300));
assert.deepEqual(latest(id).source_snapshot.horoscopeGeneration.heldRequests,held);
// Lease fences overlapping invocations and survives a killed worker.
const recovery=await create('2026-11-09');await approve(recovery);
row=latest(recovery);generation=row.source_snapshot.horoscopeGeneration;
generation.batch.lease={id:'another-worker',until:new Date(Date.now()+100000).toISOString()};store.rows.set(recovery,row);
assert.equal((await worker(recovery)).state,'leased');
generation.batch.lease.until='2026-01-01T00:00:00Z';store.rows.set(recovery,row);
await worker(recovery,1);assert(latest(recovery).source_snapshot.horoscopeGeneration.active);
// External generation cannot take over a running approved batch.
assert.equal((await action(recovery,'generate',{sign:'taurus'})).status,409);
// A plan changed outside this runner pauses explicitly instead of spinning.
row=latest(recovery);generation=row.source_snapshot.horoscopeGeneration;
// Finish the currently dispatched sign, then change the saved approval hash.
await worker(recovery,2);
row=latest(recovery);generation=row.source_snapshot.horoscopeGeneration;
generation.batch.planHash='changed-plan';store.rows.set(recovery,row);
assert.equal((await worker(recovery)).state,'paused');
assert.match(latest(recovery).source_snapshot.horoscopeGeneration.batch.error,/plan|sources/i);

// A pending request cannot hold all other signs indefinitely.
const slow=await create('2026-12-07');await approve(slow);await worker(slow,1);
row=latest(slow);generation=row.source_snapshot.horoscopeGeneration;
generation.active.startedAt=new Date(Date.now()-21*60*1000).toISOString();store.rows.set(slow,row);
writerFixture.pendingPolls=1;
await worker(slow,1);
assert(latest(slow).source_snapshot.horoscopeGeneration.heldRequests.aries);
writerFixture.pendingPolls=0;
const beforeSlow=transport.requests.length;
assert.equal((await worker(slow)).state,'needs_attention');
assert.equal(transport.requests.length-beforeSlow,11,'Timed-out Aries cannot be sent again');
assert.equal(latest(slow).sections.horoscopeEdition.passages.filter((p:any)=>p.body).length,11);

// Lost acknowledgement after the first review reservation is not a paid call.
const lost=await create('2027-01-04');await approve(lost);await worker(lost,2);
assert.equal((await action(lost,'pause-batch')).status,200);
const beforeReview=writerFixture.reviewCalls,baseFetch=globalThis.fetch;
let dropped=false;
globalThis.fetch=async(input:any,options:any={})=>{
 const url=String(input);
 if(!dropped&&url.endsWith('/rpc/checkpoint_weekly_horoscope')&&String(options.body).includes('reserved')){
  dropped=true;await baseFetch(input,options);throw new Error('Synthetic lost reservation acknowledgement');
 }
 if(dropped&&url.includes('generated_interpretations?'))return Response.json({error:'Synthetic readback unavailable'},{status:503});
 return baseFetch(input,options);
};
const failedReservation=await action(lost,'continue');
globalThis.fetch=baseFetch;
assert(failedReservation.status>=500);assert(dropped);assert.equal(writerFixture.reviewCalls,beforeReview);
row=latest(lost);assert.equal(row.source_snapshot.horoscopeGeneration.active.state,'reserved');
row.source_snapshot.horoscopeGeneration.active.startedAt=new Date(Date.now()-311000).toISOString();store.rows.set(lost,row);
assert.equal((await action(lost,'poll')).status,202);
assert.equal(latest(lost).source_snapshot.horoscopeGeneration.active.state,'ready');
assert.equal((await action(lost,'continue')).status,202);assert.equal(writerFixture.reviewCalls,beforeReview+1);
assert.equal((await action(lost,'poll')).status,200);
assert(latest(lost).sections.horoscopeEdition.passages[0].body);
// The deployed cron entrypoint authenticates and discovers the saved queue.
process.env.CRON_SECRET='synthetic-batch-cron';
const cron=async(secret:string)=>{
 const req:any=Readable.from([]);req.method='GET';req.headers={authorization:`Bearer ${secret}`};
 const res:any={statusCode:200,setHeader(){},end(raw:string){this.payload=JSON.parse(raw);}};
 await batchCron(req,res);return res;
};
assert.equal((await cron('wrong')).statusCode,401);
row=latest(id);row.source_snapshot.horoscopeGeneration.batch.status='running';store.rows.set(id,row);
const beforeCron=transport.requests.length,resultCron=await cron('synthetic-batch-cron');
assert.equal(resultCron.statusCode,200);assert.equal(resultCron.payload.state,'needs_attention');
assert.equal(transport.requests.length,beforeCron);
// Choosing another model after a pause requires a fresh batch approval, not an
// endless resume of a plan that no longer matches the selected writer.
const changedWriter=await create('2027-02-01');await approve(changedWriter);
await action(changedWriter,'pause-batch');
assert.equal((await action(changedWriter,'prepare',{writerChoice:'current'})).status,200);
assert.equal(latest(changedWriter).source_snapshot.horoscopeGeneration.batch.status,'cancelled');
assert.equal((await action(changedWriter,'resume-batch')).status,409);
console.log('PASS durable Weekly batch: twelve Gemini drafts and twelve checks without browser advancement; pause/resume, lease recovery, request bounds, compact edits, exact history, independent holds. No external requests.');
