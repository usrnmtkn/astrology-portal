import assert from 'node:assert/strict';
import {store,installHoroscopeWriterFixture,writerFixture} from '../tests/helpers/sky-article-save-api.mts';
import {emptyHoroscopeEdition,horoscopeEditionBody,horoscopeEditionKey} from '../apps/web/src/content/horoscopeEditions.mjs';
import {defaultHoroscopeProfile} from '../src/astro-writing/horoscopeWritingProfiles.mjs';
import {DAILY_BATCH_EDITORIAL} from '../src/astro-writing/dailyBatchEditorial.mjs';
import {runHoroscopeWriting} from '../api/admin/horoscope-writing';
import {decodeWeeklyHistoryRow} from '../api/_lib/horoscope-history-storage';
import {runWeeklyHoroscopeBatch} from '../api/_lib/horoscope-batch';
import {dailyBatchFixtureResult} from '../tests/helpers/daily-editorial-result.mts';
import {horoscopeEditorRow} from '../api/_lib/horoscope-editor-payload';
import {dailyEditorialContent,dailyReviewCurrent} from '../src/astro-writing/dailyBatchEditorial.mjs';
import {Readable} from 'node:stream';
import batchCron from '../api/cron/run-horoscope-batches';
import {readerRouteResponse} from '../tests/helpers/content-reader-route.mjs';

installHoroscopeWriterFixture();
const latest=(id:string)=>decodeWeeklyHistoryRow(structuredClone(store.rows.get(id)));
const action=(id:string,action:string,extra:any={})=>runHoroscopeWriting({action,id,expectedUpdatedAt:latest(id).updated_at,...extra},'synthetic-owner');
const worker=(id:string,maxSteps=100)=>runWeeklyHoroscopeBatch(id,{maxSteps,wait:async()=>{}});
const output=(value:any)=>({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(value)}]}]});
const prepare=async(id:string)=>{const r=await action(id,'prepare');assert.equal(r.status,200,JSON.stringify(r.payload));return r.payload.plan.planHash;};
const profile={...defaultHoroscopeProfile('daily'),voiceGuidance:'Complete synthetic Daily voice guidance. Keep a supported observation.',
  sourceGuidance:'Complete synthetic source opening. Complete synthetic source development. Complete synthetic source ending.'};
const savedProfile=await store.invoke('POST',{profile,expectedUpdatedAt:null},'/api/admin/generated-content?writingProfiles=true');
assert.equal(savedProfile.status,200);
async function create(date:string,complete=false,period='daily'){
  const facts=await store.invoke('GET',undefined,'/api/admin/generated-content?horoscopeBrief=true&period='+period+'&date='+date+'&timeZone=America%2FNew_York');
  assert.equal(facts.status,200,JSON.stringify(facts.payload));
  const {brief,signature}=facts.payload,edition=emptyHoroscopeEdition(brief.window);
  if(complete)for(const p of edition.passages){p.headline='Synthetic '+p.sign;p.body='Shared opening sentence. A complete synthetic '+p.sign+' observation. Shared complete ending.';}
  const r=await store.invoke('POST',{contentKey:horoscopeEditionKey(edition.window),surface:'sky',mode:'article',eventType:'horoscope-edition',
    provider:'manual-admin',status:'DRAFT',lane:'serving',headline:'Synthetic Daily review edition',body:horoscopeEditionBody(edition),
    sections:{horoscopeEdition:edition},facts:{horoscopeBrief:{brief,signature}},sourceSnapshot:{horoscopeOutlines:{}}});
  assert.equal(r.status,200,JSON.stringify(r.payload));return r.payload.rows[0].id;
}
const id=await create('2026-10-28');
const prepared=await action(id,'prepare');assert.equal(prepared.status,200,JSON.stringify(prepared.payload));
assert.equal(prepared.payload.plan.batchEditorialVersion,DAILY_BATCH_EDITORIAL,'A new Daily approval must disclose the complete-set review');
assert.equal(prepared.payload.plan.batchReviewCalls,1);
assert.equal(prepared.payload.plan.maximumPaidCalls,25);
assert.equal(writerFixture.calls,0);assert.equal(writerFixture.batchCalls,0);
console.log('PASS Daily batch plan: full-set review version and25-call budget before spend.');

const profileBefore=structuredClone(savedProfile.payload.profile);
assert.equal((await action(id,'start-batch',{approvedPlanHash:'invented'})).status,409);
assert.equal((await action(id,'start-batch',{approvedPlanHash:prepared.payload.plan.planHash})).status,202);
assert.equal(latest(id).source_snapshot.horoscopeGeneration.batch.editorialVersion,DAILY_BATCH_EDITORIAL);
assert.equal(writerFixture.batchCalls,0,'There is no paid Daily shared planner');
await worker(id,1);
assert(latest(id).source_snapshot.horoscopeGeneration.active,'The saved batch advances without browser generation calls');
assert.equal((await action(id,'pause-batch')).status,200);
const pausedCalls=writerFixture.calls;assert.equal((await worker(id)).state,'idle');assert.equal(writerFixture.calls,pausedCalls);
assert.equal((await action(id,'resume-batch')).status,200);
assert.equal((await worker(id)).state,'complete');
let row=latest(id),gate=row.source_snapshot.horoscopeGeneration.dailyEditorial;
assert.equal(writerFixture.calls,12);assert.equal(writerFixture.reviewCalls,12);assert.equal(writerFixture.batchCalls,1,'Exactly25 requests, with one final whole-set review');
assert.equal(gate.review.status,'passed');assert.equal(row.status,'DRAFT');
assert.equal(gate.review.ownerApproved,false);assert.equal(gate.review.promotionAuthorized,false);
assert.equal(row.source_snapshot.horoscopeGeneration.batch.status,'complete');
assert.equal(row.sections.horoscopeEdition.passages.filter((p:any)=>p.body.trim()&&p.headline.trim()).length,12);
const request=[...writerFixture.batchRequests.values()][0],reviewInput=JSON.parse(request.input);
assert.deepEqual(reviewInput.readings,row.sections.horoscopeEdition.passages);
assert.deepEqual(reviewInput.profile,profile);
assert.equal(reviewInput.facts.length,12);assert.equal(new Set(reviewInput.facts.map((f:any)=>f.sign)).size,12);
assert(reviewInput.ownerExamples.length>0);
assert(reviewInput.ownerExamples.every((e:any)=>e.text.trim()&&e.references.length));
assert.equal(gate.review.contentHash,dailyEditorialContent(row));assert(dailyReviewCurrent(row));
const history=row.source_snapshot.horoscopeGeneration.dailyEditorialHistory;
assert.equal(history.length,1);assert.equal(history[0].operation.requestHash,gate.review.requestHash);
assert.equal(history[0].providerResponse.status,'completed','Actual returned result is retained privately');
assert(!JSON.stringify(horoscopeEditorRow(row)).includes('"providerResponse"'));
assert(!JSON.stringify(horoscopeEditorRow(row)).includes('"request":'));
const calls=writerFixture.calls+writerFixture.reviewCalls+writerFixture.batchCalls;
await worker(id);await action(id,'poll-daily');
assert.equal(writerFixture.calls+writerFixture.reviewCalls+writerFixture.batchCalls,calls,'Completion and polling never repeat a paid request');
const profiles=await store.invoke('GET',undefined,'/api/admin/generated-content?writingProfiles=true');
assert.deepEqual(profiles.payload.profiles.find((p:any)=>p.profile.period==='daily'),profileBefore,'Generation and review never edit approved source settings');
assert(!(await action(id,'validate-publication')).payload.publication.issues.some((i:any)=>i.category==='daily_batch_editorial'));

// A manual full-set check sends no writers, returns real quotations, and keeps
// every original draft while displaying the semantic findings.
const manual=await create('2026-10-29',true),manualHash=await prepare(manual);
const original=structuredClone(latest(manual).sections);
const beforeManual=writerFixture.calls;
assert.equal((await action(manual,'review-daily',{approvedPlanHash:manualHash})).status,202);
row=latest(manual);
const pendingInput=row.source_snapshot.horoscopeGeneration.dailyEditorial.pending.input;
const failed=dailyBatchFixtureResult(pendingInput);
failed.checks={interpretations:'fail',openings:'fail',endings:'fail'};
failed.findings=['interpretations','openings','endings'].map(category=>({category,
  reason:'Synthetic repeated meaning or construction across two actual readings.',
  evidence:pendingInput.readings.slice(0,2).map((p:any)=>({sign:p.sign,quote:category==='openings'?'Shared opening sentence.':category==='endings'?'Shared complete ending.':p.body}))}));
writerFixture.nextBatchResult=output(failed);
assert.equal((await action(manual,'poll-daily')).status,200);
row=latest(manual);gate=row.source_snapshot.horoscopeGeneration.dailyEditorial;
assert.equal(gate.review.status,'failed');assert.equal(gate.review.findings.length,3);
assert.deepEqual(row.sections,original);assert.equal(writerFixture.calls,beforeManual);
assert.equal(horoscopeEditorRow(row).source_snapshot.horoscopeGeneration.dailyEditorial.review.matchesCurrent,true);
const issues=(await action(manual,'validate-publication')).payload.publication;
assert(issues.issues.some((i:any)=>i.category==='daily_batch_editorial'));assert.equal(issues.canOverride,false);

// Saving one owner edit invalidates the old check; one explicit recheck reads
// that exact saved text without rewriting or regenerating any sign.
const edited=structuredClone(row.sections);edited.horoscopeEdition.passages[0].body+=' This exact owner edit is retained.';
const saved=await store.invoke('PATCH',{id:manual,expectedUpdatedAt:row.updated_at,status:'DRAFT',
  body:horoscopeEditionBody(edited.horoscopeEdition),sections:edited},'/api/admin/generated-content?horoscopeEditor=true');
assert.equal(saved.status,200,JSON.stringify(saved.payload));
row=latest(manual);assert.equal(dailyReviewCurrent(row),false);
assert.equal(horoscopeEditorRow(row).source_snapshot.horoscopeGeneration.dailyEditorial.review.matchesCurrent,false);
assert.equal((await action(manual,'review-daily',{approvedPlanHash:await prepare(manual)})).status,202);
await action(manual,'poll-daily');row=latest(manual);assert(dailyReviewCurrent(row));
assert.equal(row.sections.horoscopeEdition.passages[0].body,edited.horoscopeEdition.passages[0].body);
assert.equal(writerFixture.calls,beforeManual);

// Invalid evidence remains unavailable, with its exact provider result kept
// in private history instead of a fabricated pass or an automatic paid retry.
const invalid=await create('2026-10-30',true);
await action(invalid,'review-daily',{approvedPlanHash:await prepare(invalid)});
const bad=dailyBatchFixtureResult(latest(invalid).source_snapshot.horoscopeGeneration.dailyEditorial.pending.input);
bad.assessments[0].openingQuote='Invented opening.';
writerFixture.nextBatchResult=output(bad);await action(invalid,'poll-daily');
row=latest(invalid);gate=row.source_snapshot.horoscopeGeneration.dailyEditorial;
assert.equal(gate.review.status,'unavailable');assert.match(gate.review.error,/opening quote for aries/);
assert.equal(row.source_snapshot.horoscopeGeneration.dailyEditorialHistory[0].providerResponse.output[0].content[0].text,JSON.stringify(bad));
const afterInvalid=writerFixture.batchCalls;await action(invalid,'poll-daily');assert.equal(writerFixture.batchCalls,afterInvalid);

// Rejecting a malformed quote does not permit a new request from a stale
// version, a concurrent review action, an incomplete set, or another period.
const incomplete=await create('2026-10-31');
const incompleteHash=await prepare(incomplete),beforeIncomplete=writerFixture.batchCalls;
assert.equal((await action(incomplete,'review-daily',{approvedPlanHash:incompleteHash})).status,409);
assert.equal(writerFixture.batchCalls,beforeIncomplete);
const concurrent=await create('2026-11-01',true),concurrentHash=await prepare(concurrent);
const version=latest(concurrent).updated_at;
assert.equal((await action(concurrent,'review-daily',{approvedPlanHash:concurrentHash})).status,202);
const beforeConcurrent=writerFixture.batchCalls;
assert.equal((await action(concurrent,'review-daily',{approvedPlanHash:concurrentHash})).status,409);
assert.equal((await runHoroscopeWriting({action:'review-daily',id:concurrent,expectedUpdatedAt:version,approvedPlanHash:concurrentHash},'synthetic-owner')).status,409);
assert.equal(writerFixture.batchCalls,beforeConcurrent);await action(concurrent,'poll-daily');
// Unknown sends remain reserved, are never retried by progress checks, and
// need an aged explicit release acknowledging possible billing.
const unknown=await create('2026-11-02',true),unknownHash=await prepare(unknown);
writerFixture.batchUnknownNext=true;
assert((await action(unknown,'review-daily',{approvedPlanHash:unknownHash})).status>=500);
const unknownCalls=writerFixture.batchCalls;
assert(latest(unknown).source_snapshot.horoscopeGeneration.dailyEditorial.pending);
assert.equal((await action(unknown,'poll-daily')).status,202);
assert.equal((await action(unknown,'review-daily',{approvedPlanHash:unknownHash})).status,409);
assert.equal((await action(unknown,'release-daily',{acknowledgeUnknownOutcome:true})).status,409);
row=latest(unknown);row.source_snapshot.horoscopeGeneration.dailyEditorial.pending.startedAt=new Date(Date.now()-311000).toISOString();store.rows.set(unknown,row);
assert.equal((await action(unknown,'poll-daily')).status,409);
assert.equal((await action(unknown,'release-daily')).status,409);
assert.equal((await action(unknown,'release-daily',{acknowledgeUnknownOutcome:true})).status,200);
assert.equal(writerFixture.batchCalls,unknownCalls);

// Two concurrent owner actions share one CAS reservation and one billed call.
const race=await create('2026-11-03',true),raceHash=await prepare(race),raceVersion=latest(race).updated_at,raceCalls=writerFixture.batchCalls;
const raced=await Promise.all([1,2].map(()=>runHoroscopeWriting({action:'review-daily',id:race,expectedUpdatedAt:raceVersion,approvedPlanHash:raceHash},'synthetic-owner')));
assert.deepEqual(raced.map(r=>r.status).sort(),[202,409]);assert.equal(writerFixture.batchCalls,raceCalls+1);
writerFixture.batchPendingPolls=1;assert.equal((await action(race,'poll-daily')).status,202);
assert.equal(writerFixture.batchCalls,raceCalls+1);await action(race,'poll-daily');

// A valid response for older text cannot replace or certify a newer owner edit.
const stale=await create('2026-11-04',true);await action(stale,'review-daily',{approvedPlanHash:await prepare(stale)});
row=latest(stale);const newer=structuredClone(row.sections);newer.horoscopeEdition.passages[0].body+=' An exact newer owner sentence.';
assert.equal((await store.invoke('PATCH',{id:stale,expectedUpdatedAt:row.updated_at,status:'DRAFT',sections:newer,body:horoscopeEditionBody(newer.horoscopeEdition)})).status,200);
await action(stale,'poll-daily');row=latest(stale);
assert.equal(row.source_snapshot.horoscopeGeneration.dailyEditorial.review.status,'stale');assert.deepEqual(row.sections,newer);

// Final findings stop the automatic batch without rewriting or paid retries.
const stopped=await create('2026-11-05');await action(stopped,'start-batch',{approvedPlanHash:await prepare(stopped)});
await worker(stopped,48);row=latest(stopped);
assert.equal(row.sections.horoscopeEdition.passages.filter((p:any)=>p.body.trim()).length,12);
const stoppedReadings=structuredClone(row.sections),autoFailure=dailyBatchFixtureResult({readings:row.sections.horoscopeEdition.passages});
autoFailure.checks.endings='fail';
autoFailure.findings=[{category:'endings',reason:'The same interchangeable ending repeats.',
  evidence:row.sections.horoscopeEdition.passages.slice(0,2).map((p:any)=>({sign:p.sign,quote:'Your saved fixture ends here.'}))}];
writerFixture.nextBatchResult=output(autoFailure);
assert.equal((await worker(stopped)).state,'needs_attention');
assert.deepEqual(latest(stopped).sections,stoppedReadings);
const stoppedCalls=writerFixture.batchCalls;await worker(stopped);assert.equal(writerFixture.batchCalls,stoppedCalls);
assert.equal(latest(stopped).source_snapshot.horoscopeGeneration.dailyEditorial.review.status,'failed');
row=latest(stopped);
assert.equal((await store.invoke('PATCH',{id:stopped,expectedUpdatedAt:row.updated_at,ownerAction:'publish-owner-content',horoscopeValidationOverride:true})).status,422);
await action(stopped,'review-daily',{approvedPlanHash:await prepare(stopped)});await action(stopped,'poll-daily');
assert.equal(latest(stopped).source_snapshot.horoscopeGeneration.batch.status,'complete');
assert.equal(latest(stopped).source_snapshot.horoscopeGeneration.batch.error,null);
assert.deepEqual(latest(stopped).sections,stoppedReadings,'An explicit passing recheck resolves the batch without changing its prose');

// A lost acknowledgement is read back before sending, not treated as license
// to dispatch again. Failed reservations stop before the provider boundary.
const ack=await create('2026-11-06',true),ackHash=await prepare(ack),baseFetch=globalThis.fetch;
let lost=false;
globalThis.fetch=async(input:any,options:any={})=>{
  const response=await baseFetch(input,options);
  if(!lost&&String(input).includes('/generated_interpretations?')&&options.method==='PATCH'&&String(options.body).includes('"state":"starting"')){
    lost=true;Object.defineProperty(response,'json',{value:async()=>{throw new Error('Synthetic lost storage acknowledgement');}});
  }
  return response;
};
const beforeAck=writerFixture.batchCalls;
try{assert.equal((await action(ack,'review-daily',{approvedPlanHash:ackHash})).status,202);}finally{globalThis.fetch=baseFetch;}
assert(lost);assert.equal(writerFixture.batchCalls,beforeAck+1);await action(ack,'poll-daily');
const denied=await create('2026-11-07',true),deniedHash=await prepare(denied),beforeDenied=writerFixture.batchCalls;
globalThis.fetch=async(input:any,options:any={})=>String(input).includes('/generated_interpretations?')&&options.method==='PATCH'
  ?Response.json({error:'Synthetic reservation unavailable'},{status:503}):baseFetch(input,options);
try{assert((await action(denied,'review-daily',{approvedPlanHash:deniedHash})).status>=500);}finally{globalThis.fetch=baseFetch;}
assert.equal(writerFixture.batchCalls,beforeDenied);

for(const [offset,payload]of [
  [8,{status:'completed',output:[{type:'message',content:[{type:'refusal',refusal:'Synthetic refusal'}]}]}],
  [9,{status:'incomplete',output:[]}],
  [10,output({checks:{},findings:[]})]
] as const){
  const testId=await create('2026-11-'+String(offset).padStart(2,'0'),true),beforeText=structuredClone(latest(testId).sections);
  await action(testId,'review-daily',{approvedPlanHash:await prepare(testId)});
  writerFixture.nextBatchResult=payload;await action(testId,'poll-daily');
  assert.equal(latest(testId).source_snapshot.horoscopeGeneration.dailyEditorial.review.status,'unavailable');
  assert.equal(latest(testId).status,'DRAFT');assert.deepEqual(latest(testId).sections,beforeText);
}

// Legacy single-sign requests retain their two-stage approval. They never
// acquire a whole-set review merely by retrieval after a deployment.
const legacy=await create('2026-11-11'),beforeLegacy=writerFixture.batchCalls;
assert.equal((await action(legacy,'generate',{sign:'aries',approvedPlanHash:await prepare(legacy)})).status,202);
assert.equal((await action(legacy,'start-batch',{approvedPlanHash:await prepare(legacy)})).status,409);
await action(legacy,'poll');await action(legacy,'continue');await action(legacy,'poll');
assert.equal((await worker(legacy)).state,'idle');assert.equal(writerFixture.batchCalls,beforeLegacy);
assert(!latest(legacy).source_snapshot.horoscopeGeneration.dailyEditorial);

for(const period of ['weekly','monthly','seasonal']){
  const other=await create('2027-02-03',true,period),snapshot=structuredClone(latest(other));
  assert.equal((await action(other,'review-daily',{approvedPlanHash:'not-applicable'})).status,400);
  assert.deepEqual(latest(other),snapshot,'A wrong-period review has no profile/content side effects');
}

// The cron discovers Daily approvals and requires the same internal auth.
const cronId=await create('2026-11-12');await action(cronId,'start-batch',{approvedPlanHash:await prepare(cronId)});
process.env.CRON_SECRET='synthetic-daily-cron';
const cron=async(secret:string)=>{
  const req:any=Readable.from([]);req.method='GET';req.headers={authorization:'Bearer '+secret};
  const res:any={statusCode:200,setHeader(){},end(raw:string){this.payload=JSON.parse(raw);}};await batchCron(req,res);return res;
};
assert.equal((await cron('wrong')).statusCode,401);
// Other synthetic rows are already complete, paused or not enrolled.
assert.equal((await cron('synthetic-daily-cron')).statusCode,200);
assert.equal(latest(cronId).source_snapshot.horoscopeGeneration.batch.status,'complete');

// Exact owner approval remains separate from review. A valid current review
// reaches the isolated reader verbatim, while failed review cannot be bypassed.
row=latest(invalid);
assert.equal((await store.invoke('PATCH',{id:invalid,expectedUpdatedAt:row.updated_at,ownerAction:'publish-owner-content',horoscopeValidationOverride:true})).status,422);
row=latest(manual);
const published=await store.invoke('PATCH',{id:manual,expectedUpdatedAt:row.updated_at,ownerAction:'publish-owner-content'});
assert.equal(published.status,200,JSON.stringify(published.payload));
const reader=await readerRouteResponse('/api/content-reader',{method:'POST',body:JSON.stringify({ids:[manual]})});
assert.equal((await reader.json()).rows[0].body,row.body,'Passing review plus explicit owner publication preserves complete text');
console.log('PASS Daily actual handlers: automatic25-stage approval, full evidence and source isolation, pause/resume/cron, exact findings, stale edits, explicit rechecks, concurrent CAS, unknown/failed reservations, legacy contracts and owner-only publication. Synthetic providers only.');
