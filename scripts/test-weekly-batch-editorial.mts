import assert from 'node:assert/strict';
import {store,installHoroscopeWriterFixture,writerFixture} from '../tests/helpers/sky-article-save-api.mts';
import {emptyHoroscopeEdition,horoscopeEditionBody,horoscopeEditionKey} from '../apps/web/src/content/horoscopeEditions.mjs';
import {runHoroscopeWriting} from '../api/admin/horoscope-writing';
import {runWeeklyHoroscopeBatch} from '../api/_lib/horoscope-batch';
import {horoscopeEditorRow} from '../api/_lib/horoscope-editor-payload';
import {decodeWeeklyHistoryRow} from '../api/_lib/horoscope-history-storage';
import {WEEKLY_REVIEW_CHECKS,validateWeeklyEditorialResult,weeklyEditorialContent,weeklyLexicalSignals,weeklyReviewCurrent} from '../src/astro-writing/weeklyBatchEditorial.mjs';
import {readerRouteResponse} from '../tests/helpers/content-reader-route.mjs';
import {installAlternativeHoroscopeProviders} from '../tests/helpers/horoscope-provider-fixture.mts';
import {defaultHoroscopeProfile} from '../src/astro-writing/horoscopeWritingProfiles.mjs';
import {HOROSCOPE_SIGNS} from '../apps/web/src/content/horoscopeEditions.mjs';
installHoroscopeWriterFixture();
const savedProfile=await store.invoke('POST',{profile:{...defaultHoroscopeProfile('weekly'),voiceGuidance:'Synthetic complete approved rules. Every sign needs its own concern.',sourceGuidance:'Complete synthetic example opening. A full synthetic example middle. Complete synthetic example final sentence.'},expectedUpdatedAt:null},'/api/admin/generated-content?writingProfiles=true');assert.equal(savedProfile.status,200);
const latest=(id:string)=>decodeWeeklyHistoryRow(structuredClone(store.rows.get(id)));
const action=(id:string,action:string,extra:any={})=>runHoroscopeWriting({id,action,expectedUpdatedAt:latest(id).updated_at,...extra},'synthetic-owner');
const worker=(id:string,maxSteps=100)=>runWeeklyHoroscopeBatch(id,{maxSteps,wait:async()=>{}});
const output=(value:any)=>({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(value)}]}]});
const review=(findings:any[]=[])=>({checks:Object.fromEntries(WEEKLY_REVIEW_CHECKS.map(name=>[name,findings.some(f=>f.category===name)?'fail':'pass'])),findings});
async function create(date:string,complete=false){
 const facts=await store.invoke('GET',undefined,`/api/admin/generated-content?horoscopeBrief=true&period=weekly&date=${date}&timeZone=America%2FNew_York`);
 assert.equal(facts.status,200);const {brief,signature}=facts.payload,edition=emptyHoroscopeEdition(brief.window);
 if(complete)edition.passages.forEach((p:any)=>{p.headline=`Synthetic ${p.sign} reading`;p.body=`The ${p.sign} plan has its own subject. You should say what you want.`;});
 const result=await store.invoke('POST',{contentKey:horoscopeEditionKey(edition.window),surface:'sky',mode:'article',eventType:'horoscope-edition',provider:'manual-admin',status:'DRAFT',lane:'serving',headline:'Synthetic gate edition',body:horoscopeEditionBody(edition),sections:{horoscopeEdition:edition},facts:{horoscopeBrief:{brief,signature}},sourceSnapshot:{horoscopeOutlines:{}}});
 assert.equal(result.status,200);return result.payload.rows[0].id;
}
async function prepare(id:string){const result=await action(id,'prepare');assert.equal(result.status,200,JSON.stringify(result.payload));return result.payload.plan.planHash;}
const id=await create('2026-11-02'),hash=await prepare(id);
assert.equal((await action(id,'start-batch',{approvedPlanHash:hash})).status,202);
await worker(id,1);
assert.equal(writerFixture.calls,0,'Planning precedes every draft');
assert.equal(writerFixture.batchCalls,1);
assert.equal(latest(id).source_snapshot.horoscopeGeneration.weeklyEditorial.pending.phase,'planning');
assert.equal((await action(id,'plan-weekly',{approvedPlanHash:hash})).status,409,'Cannot double reserve shared work');
assert.equal((await action(id,'generate',{sign:'aries',approvedPlanHash:hash})).status,409);
await worker(id,2);assert(latest(id).source_snapshot.horoscopeGeneration.active);
await action(id,'pause-batch');const resumeHash=await prepare(id);await action(id,'start-batch',{approvedPlanHash:resumeHash});
assert.equal(latest(id).source_snapshot.horoscopeGeneration.batch.editorialVersion,'weekly-batch-editorial/v1','A fresh approval around a gated active sign retains the final comparison');
await worker(id);
let row=latest(id),gate=row.source_snapshot.horoscopeGeneration.weeklyEditorial;
assert.equal(gate.plan.concerns.length,12);assert.equal(gate.plan.status,'passed');assert.equal(gate.review.status,'passed');
assert.equal(writerFixture.calls,12);assert.equal(writerFixture.reviewCalls,12);assert.equal(writerFixture.batchCalls,2,'Exactly 26 requests for a complete batch');
assert.equal(row.status,'DRAFT');assert.equal(gate.review.ownerApproved,false);
const requests=[...writerFixture.batchRequests.values()];
assert.equal(JSON.parse(requests[0].input).facts.length,12);
assert.deepEqual(JSON.parse(requests[1].input).existingReadings,row.sections.horoscopeEdition.passages,'Judge sees every complete reading');
assert.deepEqual(JSON.parse(requests[1].input).profile,row.source_snapshot.studioWritingProfile.profile,'Judge sees the entire saved profile');
for(const request of writerFixture.requests.values()){
 assert(request.input.includes(`SHARED WEEKLY CONCERNS\n${JSON.stringify(gate.plan.concerns)}`));
 assert(request.input.includes(`CURRENT SIGN CONCERN\n${JSON.stringify(gate.plan.concerns.find((c:any)=>c.sign===request.sign))}`));
 const snapshot=row.source_snapshot.horoscopeGeneration.readings[request.sign].previousReadings;
 assert.deepEqual(snapshot.readings.map((p:any)=>p.sign),HOROSCOPE_SIGNS.slice(0,HOROSCOPE_SIGNS.indexOf(request.sign)));
 assert(request.input.includes(JSON.stringify({previousReadings:snapshot})),'The actual writer receives the saved exact snapshot');
 assert.deepEqual(snapshot.readings.map(({sign,headline,body}:any)=>({sign,headline,body})),passagesBefore(request.sign));
}
function passagesBefore(sign:string){return row.sections.horoscopeEdition.passages.slice(0,HOROSCOPE_SIGNS.indexOf(sign));}
const calls=writerFixture.calls+writerFixture.reviewCalls+writerFixture.batchCalls;
await worker(id);await action(id,'poll-weekly');assert.equal(writerFixture.calls+writerFixture.reviewCalls+writerFixture.batchCalls,calls);
// Semantic paraphrases and repeated endings are explicit judge findings. Transport
// tests inject verdicts; they do not claim a synthetic response measures quality.
const passages=row.sections.horoscopeEdition.passages;
const evidence=passages.slice(0,3).map((p:any)=>({sign:p.sign,quote:p.body.split('\n')[0]}));
const findings=[{category:'interpretations',reason:'Three readings offer the same interchangeable lesson despite different signs.',evidence},
 {category:'phrases',reason:'The same explanatory sentence is repeated.',evidence:passages.slice(0,2).map((p:any)=>({sign:p.sign,quote:'Your saved fixture ends here.'}))},
 {category:'endings',reason:'The endings give the same instruction.',evidence:passages.slice(0,2).map((p:any)=>({sign:p.sign,quote:'Your saved fixture ends here.'}))}];
const before=structuredClone(row.sections);
writerFixture.nextBatchResult=output(review(findings));
writerFixture.batchPendingPolls=1;
assert.equal((await action(id,'review-weekly',{approvedPlanHash:hash})).status,202);
const sharedReviewCalls=writerFixture.batchCalls;
assert.equal((await action(id,'poll-weekly')).status,202);
assert.equal(writerFixture.batchCalls,sharedReviewCalls,'Retrieving an unfinished shared review never dispatches another request');
assert.deepEqual(latest(id).sections,before);
assert.equal((await action(id,'poll-weekly')).status,200);
row=latest(id);assert.deepEqual(row.sections,before,'A failed review cannot rewrite prose');
assert.equal(row.source_snapshot.horoscopeGeneration.weeklyEditorial.review.status,'failed');
assert.equal(horoscopeEditorRow(row).source_snapshot.horoscopeGeneration.weeklyEditorial.review.matchesCurrent,true);
assert.equal(horoscopeEditorRow(row).source_snapshot.horoscopeGeneration.weeklyEditorial.review.findings.length,3);
const publication=await action(id,'validate-publication');assert.equal(publication.payload.publication.ready,false);assert.equal(publication.payload.publication.canOverride,false);
const publish=await store.invoke('PATCH',{id,expectedUpdatedAt:row.updated_at,ownerAction:'publish-owner-content',horoscopeValidationOverride:true});assert.equal(publish.status,422,'An owner fact-parser override cannot bypass the batch gate');
// Arbitrary evidence, incomplete checks and unsupported plan facts fail closed.
const input=JSON.parse(requests[1].input);
assert.throws(()=>validateWeeklyEditorialResult(review([{...findings[0],evidence:[{sign:'aries',quote:'Invented biography'}]}]),{phase:'batch-review',input}),/not supplied/);
assert.throws(()=>validateWeeklyEditorialResult(review([{...findings[0],evidence:[evidence[0]]}]),{phase:'batch-review',input}),/two signs/);
assert.throws(()=>validateWeeklyEditorialResult(review([{category:'endings',reason:'Synthetic wrong location',evidence}]),{phase:'batch-review',input}),/actual ending/);
assert.throws(()=>validateWeeklyEditorialResult({checks:{interpretations:'pass'},findings:[]},{phase:'batch-review',input}),/Incomplete/);
const planInput=JSON.parse(requests[0].input),badPlan={concerns:structuredClone(gate.plan.concerns),checks:{distinct_concerns:'pass',house_grounding:'pass',unsupported_history:'pass'},findings:[]};
badPlan.concerns[0].eventIds=['fabricated'];assert.throws(()=>validateWeeklyEditorialResult(badPlan,{phase:'planning',input:planInput}),/unsupported facts/);
badPlan.concerns=structuredClone(gate.plan.concerns);badPlan.concerns[1].coreConcern=badPlan.concerns[0].coreConcern;assert.throws(()=>validateWeeklyEditorialResult(badPlan,{phase:'planning',input:planInput}),/repeat/);
const lexical=weeklyLexicalSignals(passages);assert(lexical.endings.length>0);assert.equal(validateWeeklyEditorialResult(review(),{phase:'batch-review',input}).status,'passed','Lexical leads cannot convict legitimate repeated astrology words');
// Explicit recheck passes; any later exact text, rules, fact or plan change invalidates it.
await action(id,'review-weekly',{approvedPlanHash:hash});await action(id,'poll-weekly');row=latest(id);assert(weeklyReviewCurrent(row));
for(const mutate of [(r:any)=>r.sections.horoscopeEdition.passages[0].body+=' Changed.',(r:any)=>r.source_snapshot.studioWritingProfile.profile.voiceGuidance+=' New rule.',(r:any)=>r.facts.horoscopeBrief.signature+='x',(r:any)=>r.source_snapshot.horoscopeGeneration.weeklyEditorial.plan.requestHash+='x']){
 const changed=structuredClone(row);mutate(changed);assert.notEqual(weeklyEditorialContent(changed),weeklyEditorialContent(row));assert.equal(weeklyReviewCurrent(changed),false);
}
const edited=structuredClone(row.sections);edited.horoscopeEdition.passages[0].body+=' An exact saved owner edit.';
assert.equal((await store.invoke('PATCH',{id,expectedUpdatedAt:row.updated_at,status:'DRAFT',body:horoscopeEditionBody(edited.horoscopeEdition),sections:edited})).status,200);
assert.equal((await action(id,'validate-publication')).payload.publication.ready,false);
// A stale request cannot apply to a new save or silently dispatch a replacement.
const staleStart=await action(id,'review-weekly',{approvedPlanHash:await prepare(id)});assert.equal(staleStart.status,202,JSON.stringify(staleStart.payload));row=latest(id);
const pendingVersion=row.updated_at,newer=structuredClone(row.sections);newer.horoscopeEdition.passages[0].body+=' Newer edit.';
const newerSave=await store.invoke('PATCH',{id,expectedUpdatedAt:row.updated_at,status:'DRAFT',sections:newer,body:horoscopeEditionBody(newer.horoscopeEdition)});assert.equal(newerSave.status,200,JSON.stringify(newerSave.payload));
const stalePoll=await action(id,'poll-weekly');assert.equal(stalePoll.status,200,JSON.stringify(stalePoll.payload));assert.equal(latest(id).source_snapshot.horoscopeGeneration.weeklyEditorial.review.status,'stale');
assert.equal((await runHoroscopeWriting({action:'review-weekly',id,expectedUpdatedAt:pendingVersion,approvedPlanHash:hash},'synthetic-owner')).status,409);
// Malformed verdict preserves the drafts and cannot be treated as pass.
writerFixture.nextBatchResult=output({checks:{},findings:[]});await action(id,'review-weekly',{approvedPlanHash:await prepare(id)});await action(id,'poll-weekly');assert.equal(latest(id).source_snapshot.horoscopeGeneration.weeklyEditorial.review.status,'unavailable');
// Unknown send is durably held; progress is free; release is explicit and aged.
const unknown=await create('2026-11-09'),unknownHash=await prepare(unknown);writerFixture.batchUnknownNext=true;
const unknownStart=await action(unknown,'plan-weekly',{approvedPlanHash:unknownHash});assert(unknownStart.status>=500);
const unknownCalls=writerFixture.batchCalls;assert(latest(unknown).source_snapshot.horoscopeGeneration.weeklyEditorial.pending);
assert.equal((await action(unknown,'poll-weekly')).status,202);assert.equal((await action(unknown,'plan-weekly',{approvedPlanHash:unknownHash})).status,409);
assert.equal((await action(unknown,'release-weekly',{acknowledgeUnknownOutcome:true})).status,409);
row=latest(unknown);row.source_snapshot.horoscopeGeneration.weeklyEditorial.pending.startedAt=new Date(Date.now()-311000).toISOString();store.rows.set(unknown,row);
assert.equal((await action(unknown,'release-weekly')).status,409);assert.equal((await action(unknown,'release-weekly',{acknowledgeUnknownOutcome:true})).status,200);assert.equal(writerFixture.batchCalls,unknownCalls);
// A failed plan stops before any prose; incomplete sets cannot be reviewed.
const rejected=await create('2026-11-16'),rejectedHash=await prepare(rejected),beforeDrafts=writerFixture.calls;
await action(rejected,'start-batch',{approvedPlanHash:rejectedHash});await worker(rejected,1);writerFixture.nextBatchResult=output({concerns:[],checks:{},findings:[]});
assert.equal((await worker(rejected)).state,'needs_attention');assert.equal(writerFixture.calls,beforeDrafts);
assert.equal((await action(rejected,'review-weekly',{approvedPlanHash:rejectedHash})).status,409);
// Manual complete legacy sets can opt into a one-call comparison without prose generation.
const manual=await create('2026-11-23',true),manualHash=await prepare(manual);const manualText=structuredClone(latest(manual).sections);
const raceVersion=latest(manual).updated_at,raceCalls=writerFixture.batchCalls;
const race=await Promise.all([1,2].map(()=>runHoroscopeWriting({action:'review-weekly',id:manual,expectedUpdatedAt:raceVersion,approvedPlanHash:manualHash},'synthetic-owner')));assert.deepEqual(race.map(r=>r.status).sort(),[202,409]);assert.equal(writerFixture.batchCalls,raceCalls+1,'Concurrent approvals dispatch one shared request');
await action(manual,'poll-weekly');assert.deepEqual(latest(manual).sections,manualText);assert.equal(writerFixture.calls,beforeDrafts);
row=latest(manual);const published=await store.invoke('PATCH',{id:manual,expectedUpdatedAt:row.updated_at,ownerAction:'publish-owner-content'});assert.equal(published.status,200,JSON.stringify(published.payload));assert.equal(published.payload.rows[0].status,'LIVE');
const reader=await readerRouteResponse('/api/content-reader',{method:'POST',body:JSON.stringify({ids:[manual]})});assert.equal((await reader.json()).rows[0].body,row.body,'A current passing check plus explicit owner approval reaches the reader intact');
// Native Claude codecs must also retain the shared concerns and existing prose.
const nativeTransport=installAlternativeHoroscopeProviders();
const native=await create('2026-11-30',true);row=latest(native);row.sections.horoscopeEdition.passages[11]={...row.sections.horoscopeEdition.passages[11],headline:'',body:''};row.body=horoscopeEditionBody(row.sections.horoscopeEdition);store.rows.set(native,row);
const nativeExisting=structuredClone(row.sections.horoscopeEdition.passages.slice(0,11));
const nativePlan=await action(native,'prepare',{writerChoice:'claude'});assert.equal(nativePlan.status,200);await action(native,'start-batch',{approvedPlanHash:nativePlan.payload.plan.planHash});assert.equal((await runWeeklyHoroscopeBatch(native,{maxSteps:100,wait:()=>new Promise(resolve=>setTimeout(resolve,5))})).state,'complete');
assert.equal(nativeTransport.requests.length,1);assert(nativeTransport.requests[0].request.messages[0].content.includes('SHARED WEEKLY CONCERNS\n'));assert(nativeTransport.requests[0].request.messages[0].content.includes('CURRENT SIGN CONCERN\n'));
assert(nativeTransport.requests[0].request.messages[0].content.includes(JSON.stringify({previousReadings:latest(native).source_snapshot.horoscopeGeneration.readings.pisces.previousReadings})));
assert.deepEqual(latest(native).sections.horoscopeEdition.passages.slice(0,11),nativeExisting);
// Existing in-flight batches keep their pinned request and paid-stage budget.
const legacy=await create('2026-12-07'),legacyHash=await prepare(legacy),beforeShared=writerFixture.batchCalls;
assert.equal((await action(legacy,'generate',{sign:'aries',approvedPlanHash:legacyHash})).status,202);
assert.equal((await action(legacy,'start-batch',{approvedPlanHash:legacyHash})).status,202);
assert.equal(latest(legacy).source_snapshot.horoscopeGeneration.batch.editorialVersion,undefined);
assert.equal((await worker(legacy)).state,'complete');assert.equal(writerFixture.batchCalls,beforeShared,'Never add paid stages to a pinned legacy run');
// A concurrent free retrieval may win the shared result checkpoint. The worker
// reconciles that version change without pausing or repeating a paid request.
const contended=await create('2026-12-14');row=latest(contended);row.sections.horoscopeEdition.passages.reverse();store.rows.set(contended,row);
const contendedHash=await prepare(contended),beforeOrderedWriters=writerFixture.requests.size;
await action(contended,'start-batch',{approvedPlanHash:contendedHash});await worker(contended,1);
const sharedId=latest(contended).source_snapshot.horoscopeGeneration.weeklyEditorial.pending.responseId;
const beforeContention=writerFixture.batchCalls,normalFetch=globalThis.fetch;let raced=false;
globalThis.fetch=async(url:any,options:any={})=>{
 const response=await normalFetch(url,options);
 if(!raced&&String(url).endsWith(`/responses/${sharedId}`)){
  raced=true;assert.equal((await action(contended,'poll-weekly')).status,200);
 }
 return response;
};
try{assert.equal((await worker(contended,1)).state,'changed');}finally{globalThis.fetch=normalFetch;}
assert(raced);assert.equal(latest(contended).source_snapshot.horoscopeGeneration.batch.status,'running');
assert.equal(latest(contended).source_snapshot.horoscopeGeneration.weeklyEditorial.plan.status,'passed');assert.equal(writerFixture.batchCalls,beforeContention);
assert.equal((await worker(contended)).state,'complete');
assert.deepEqual([...writerFixture.requests.values()].slice(beforeOrderedWriters).map((request:any)=>request.sign),HOROSCOPE_SIGNS,'The batch drafts in zodiac order even when saved passages are reordered');
console.log('PASS Weekly batch editorial gate: plan all twelve before prose, full profile/facts delivery, 26 bounded requests, exact quotes, failed/stale/malformed checks, manual edits, publication, free recovery and unknown-outcome release. Synthetic models only.');
await store.close();
