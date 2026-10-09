import {applyCheckpointFixture} from '../tests/helpers/horoscope-checkpoint-fixture.mts';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {store,installHoroscopeWriterFixture,invokeHoroscopeWriting,writerFixture} from '../tests/helpers/sky-article-save-api.mts';
import {prepareHoroscopeBrief} from '../api/_lib/horoscope-editions';
import {emptyHoroscopeEdition,horoscopeEditionBody,horoscopeEditionKey} from '../apps/web/src/content/horoscopeEditions.mjs';
import {horoscopePendingReadings} from '../src/astro-writing/horoscopeRecovery.mjs';
import {HOROSCOPE_RHETORICAL_REVIEW,LEGACY_HOROSCOPE_RHETORICAL_REVIEW,horoscopeReviewHash} from '../src/astro-writing/horoscopeRhetoricalReview.mjs';

import {horoscopeWeeklyBatchRecovery} from '../src/astro-writing/horoscopeWeeklyBatchRecovery.mjs';
installHoroscopeWriterFixture();
const deployment=JSON.parse(fs.readFileSync('vercel.json','utf8'));
const packaged=new Set(fs.globSync(deployment.functions['api/admin/horoscope-writing.ts'].includeFiles));
for(const file of ['src/astro-writing/horoscopeRhetoricalReview.mjs','src/astro-writing/rhetoricalPatterns.cjs','src/astro-writing/rhetoricalPatternHistory.cjs'])assert(packaged.has(file),`Deployment must include ${file}`);
const packet=await prepareHoroscopeBrief(new URL('http://localhost/?period=weekly&date=2026-10-06&timeZone=America/New_York'));
const edition=emptyHoroscopeEdition(packet.brief.window);
let result=await store.invoke('POST',{contentKey:horoscopeEditionKey(edition.window),surface:'sky',mode:'article',eventType:'horoscope-edition',provider:'manual-admin',status:'DRAFT',lane:'serving',headline:'Synthetic admission edition',body:horoscopeEditionBody(edition),sections:{horoscopeEdition:edition},facts:{horoscopeBrief:packet},sourceSnapshot:{}});
assert.equal(result.status,200,JSON.stringify(result.payload));let row=result.payload.rows[0];
const action=async(action:string,extra:any={})=>{
 const result=await invokeHoroscopeWriting({action,id:row.id,expectedUpdatedAt:row.updated_at,...extra});
 if(result.payload.rows?.[0])row=result.payload.rows[0];return result;
};
result=await action('prepare');const plan=result.payload.plan;
assert.equal(plan.reviewCalls,12);assert.equal(plan.reviewVersion,HOROSCOPE_RHETORICAL_REVIEW);
const generation=()=>row.source_snapshot.horoscopeGeneration;
const providerResult=(value:any)=>({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(value)}]}]});
const draft=async(sign:string,legacy=false)=>{
 assert.equal((await action('generate',{sign,approvedPlanHash:plan.planHash})).status,202);
 if(legacy){store.rows.get(row.id).source_snapshot.horoscopeGeneration.active.reviewVersion=LEGACY_HOROSCOPE_RHETORICAL_REVIEW;row=structuredClone(store.rows.get(row.id));}
 assert.equal((await action('poll')).status,202);
 assert.equal(generation().active.phase,'review');assert.equal(generation().active.state,'ready');
 assert.equal(row.sections.horoscopeEdition.passages.find((p:any)=>p.sign===sign).body,'');
};
await draft('aries');
const ready=generation().active;
assert.equal(writerFixture.calls,1);assert.equal(writerFixture.reviewCalls,0);
await action('poll');await action('poll');
assert.equal(writerFixture.reviewCalls,0,'Reload/progress retrieval never launches review');
assert.deepEqual(generation().active,ready,'Read-only retrieval preserves the frozen request');
assert.equal(horoscopeReviewHash(ready.candidate),ready.candidateHash);
const frozen=JSON.parse(ready.reviewRequest.input);
assert.deepEqual(frozen.candidate,ready.candidate);
assert(frozen.evidence.ownerExamples.length>=3);
assert(frozen.evidence.ownerExamples.every((e:any)=>e.text.trim().length>0));
assert.deepEqual(frozen.evidence.engineFacts.window,edition.window);
assert(!ready.reviewRequest.instructions.includes('SKY PLACEMENT ARTICLE SPINE'));
assert(!ready.reviewRequest.instructions.includes('cold_rendered_prose'),'The targeted review must not import the broader article rubric');
assert(ready.reviewRequest.instructions.includes('AVOID AI WRITING PATTERNS'));
assert(ready.reviewRequest.instructions.includes('REVIEW FLAG — CHECK CONTEXT'));
const version=row.updated_at;
assert.equal((await action('continue')).status,202);
assert.equal((await invokeHoroscopeWriting({action:'continue',id:row.id,expectedUpdatedAt:version})).status,409);
assert.equal((await action('continue')).status,409);
assert.equal(writerFixture.reviewCalls,1);
const reviewId=generation().active.responseId;
assert.equal(writerFixture.reviewRequests.get(reviewId).max_output_tokens,6000);
assert.equal(writerFixture.reviewRequests.get(reviewId).model,'gpt-5.6-terra');
writerFixture.pendingPolls=1;await action('poll');
assert.equal(generation().active.responseId,reviewId);assert.equal(writerFixture.reviewCalls,1);
const beforeUnavailable=structuredClone(row);
writerFixture.nextResult=providerResult({});
assert.equal((await action('poll')).status,200);
assert.equal(generation().active,null);assert.equal(generation().candidateHolds.aries.code,'rhetorical_review_unavailable');
assert.deepEqual(generation().candidateHolds.aries.candidate,ready.candidate);
assert(horoscopeWeeklyBatchRecovery(beforeUnavailable,row,{action:'poll',sign:'aries',planHash:plan.planHash}),'A lost acknowledgement of a saved technical review hold must not pause the other signs');
for(const mutate of [
 (r:any)=>r.source_snapshot.horoscopeGeneration.candidateHolds.aries.candidate.body+=' Unrelated change.',
 (r:any)=>r.sections.horoscopeEdition.passages[1].body='Newer owner writing.',
 (r:any)=>r.source_snapshot.horoscopeGeneration.failures.pop(),
 (r:any)=>r.source_snapshot.horoscopeGeneration.lastError=null,
]){const changed=structuredClone(row);mutate(changed);assert.equal(horoscopeWeeklyBatchRecovery(beforeUnavailable,changed,{action:'poll',sign:'aries',planHash:plan.planHash}),false);}

assert.equal((await action('generate',{sign:'aries',approvedPlanHash:plan.planHash})).status,409);
assert(!horoscopePendingReadings(row.sections.horoscopeEdition,generation()).some((p:any)=>p.sign==='aries'));

await draft('taurus',true);
assert.equal(generation().active.workflow,LEGACY_HOROSCOPE_RHETORICAL_REVIEW);
const frozenLegacyInstructions=generation().active.reviewRequest.instructions;
assert(!frozenLegacyInstructions.includes('AVOID AI WRITING PATTERNS'));
await action('continue');
assert.equal(writerFixture.reviewRequests.get(generation().active.responseId).instructions,frozenLegacyInstructions);
await action('poll');
assert.equal(generation().readings.taurus.rhetoricalReview.rhetoricalBlocked,false);
assert.equal(generation().readings.taurus.rhetoricalReview.ownerApproved,false);
assert.equal(row.status,'DRAFT');assert(generation().candidateHolds.aries,'Another sign succeeding must not erase held candidates');

writerFixture.nextResult=providerResult({headline:'Gemini & Gemini Rising',body:'Saturn reminds you to honor your boundaries.'});
await draft('gemini');const candidate=generation().active.candidate;await action('continue');
const evidence={quote:candidate.body.split('\n')[0],passageReason:'The generic planetary reminder substitutes for astrological interpretation.',materialEffect:'The complete passage supplies no situation in which the boundary matters.',legitimateReading:'The fixture supplies no necessary third distinction.',plainAlternative:'The fixture describes one concrete behavior.',replacementEffect:'Removing Saturn leaves the same stock instruction; no surrounding behavior supplies its missing meaning.'};
writerFixture.nextResult=providerResult({checks:['CORRECTIO','TRICOLON','PURPLE_PROSE'].map(label=>({label,outcome:label==='PURPLE_PROSE'?'fail':'pass',reason:'Synthetic diagnosis.'})),findings:['PURPLE_PROSE','GENERIC_ASTROLOGY'].map(label=>({label,field:'body',quote:evidence.quote,paragraph:evidence.quote,reason:evidence.passageReason,readerConsequence:evidence.materialEffect,meaningTest:evidence.replacementEffect}))});
await action('poll');
assert.deepEqual(generation().candidateHolds.gemini.review.rhetoric.findings.map((f:any)=>f.label),['PURPLE_PROSE','GENERIC_ASTROLOGY']);
const beforePaid=writerFixture.calls+writerFixture.reviewCalls;
const saveCandidate=async(value:any)=>{
 const edited={...row.sections.horoscopeEdition,passages:row.sections.horoscopeEdition.passages.map((p:any)=>p.sign==='gemini'?{...p,...value}:p)};
 return store.invoke('PATCH',{id:row.id,expectedUpdatedAt:row.updated_at,sections:{horoscopeEdition:edited},body:horoscopeEditionBody(edited)});
};
assert.equal((await saveCandidate(candidate)).status,422,'Unedited blocked copy cannot be inserted through the editor');
result=await saveCandidate({...candidate,body:'You can read the owner-edited fixture here.'});assert.equal(result.status,200,JSON.stringify(result.payload));row=result.payload.rows[0];
assert(!generation().candidateHolds.gemini);assert(generation().candidateHolds.aries);
assert.equal(generation().candidateResolutions.at(-1).resolution,'owner_edited');assert.equal(row.status,'DRAFT');
assert.equal(writerFixture.calls+writerFixture.reviewCalls,beforePaid);

await draft('cancer');const beforeUnconfirmed=structuredClone(row);writerFixture.unknownNext=true;await action('continue');
assert(horoscopeWeeklyBatchRecovery(beforeUnconfirmed,row,{action:'continue',sign:'cancer',planHash:plan.planHash}),'A saved unconfirmed review hold can be reconciled without repeating it');
assert.equal(generation().candidateHolds.cancer.code,'rhetorical_review_interrupted');
const unknownCalls=writerFixture.calls+writerFixture.reviewCalls;await action('poll');
assert.equal(writerFixture.calls+writerFixture.reviewCalls,unknownCalls);

await draft('leo');await action('continue');
const persisted=store.rows.get(row.id);persisted.source_snapshot.horoscopeGeneration.active.responseId=null;
persisted.source_snapshot.horoscopeGeneration.active.startedAt=new Date(Date.now()-311000).toISOString();row=structuredClone(persisted);
await action('poll');assert.equal(generation().candidateHolds.leo.code,'rhetorical_review_interrupted');

// A stored writer from before this feature keeps its original one-call contract.
await action('generate',{sign:'virgo',approvedPlanHash:plan.planHash});
delete store.rows.get(row.id).source_snapshot.horoscopeGeneration.active.reviewVersion;
row=structuredClone(store.rows.get(row.id));const reviewsBeforeLegacy=writerFixture.reviewCalls;
assert.equal((await action('poll')).status,200);assert.equal(generation().active,null);
assert(row.sections.horoscopeEdition.passages.find((p:any)=>p.sign==='virgo').body);
assert.equal(writerFixture.reviewCalls,reviewsBeforeLegacy);

// A stored review is never rebound to a different candidate after reservation.
await draft('libra');const originalCandidate=structuredClone(generation().active.candidate);
store.rows.get(row.id).source_snapshot.horoscopeGeneration.active.candidate.body+=' Changed without a matching receipt.';
row=structuredClone(store.rows.get(row.id));const beforeMismatch=writerFixture.reviewCalls;
assert.equal((await action('continue')).status,409);assert.equal(writerFixture.reviewCalls,beforeMismatch);
store.rows.get(row.id).source_snapshot.horoscopeGeneration.active.candidate=originalCandidate;row=structuredClone(store.rows.get(row.id));
await action('continue');await action('poll');

// A failed response-ID acknowledgement retries storage, never review dispatch.
await draft('scorpio');const originalFetch=globalThis.fetch;let failedSave=false;
globalThis.fetch=async(input:any,options:any={})=>{
 if(!failedSave&&String(input).endsWith('/rpc/checkpoint_weekly_horoscope')){
  const patch=applyCheckpointFixture(store.rows.get(row.id),JSON.parse(options.body).p_changes);if(patch.source_snapshot?.horoscopeGeneration?.active?.phase==='review'&&patch.source_snapshot.horoscopeGeneration.active.responseId){failedSave=true;return Response.json({message:'Synthetic storage outage'},{status:503});}
 }
 return originalFetch(input,options);
};
const reviewBeforeSave=writerFixture.reviewCalls;
try{assert.equal((await action('continue')).status,202);}finally{globalThis.fetch=originalFetch;}
assert(failedSave);assert.equal(writerFixture.reviewCalls,reviewBeforeSave+1);assert(generation().active.responseId);
await action('poll');assert.equal(generation().active,null);

await draft('sagittarius');await action('continue');
store.rows.get(row.id).source_snapshot.horoscopeGeneration.active.startedAt=new Date(Date.now()-311000).toISOString();row=structuredClone(store.rows.get(row.id));
const beforeRelease=writerFixture.calls+writerFixture.reviewCalls;
assert.equal((await action('release',{acknowledgeUnknownOutcome:true})).status,200);
assert.equal(generation().candidateHolds.sagittarius.code,'rhetorical_review_interrupted');
assert.equal(writerFixture.calls+writerFixture.reviewCalls,beforeRelease);

// Editing a punctuation hold in the same save must not resurrect a resolved
// rhetorical hold on a different sign.
await action('generate',{sign:'capricorn',approvedPlanHash:plan.planHash});
writerFixture.nextResult=providerResult({headline:'Capricorn & Capricorn Rising',body:'You can read this synthetic response\u2014with punctuation to correct.'});
assert.equal((await action('poll')).status,422);assert.equal(generation().lastError.code,'required_punctuation');
const mixed={...row.sections.horoscopeEdition,passages:row.sections.horoscopeEdition.passages.map((p:any)=>p.sign==='cancer'?{...p,...generation().candidateHolds.cancer.candidate,body:'You can read the owner-edited Cancer fixture.'}:p.sign==='capricorn'?{...p,...generation().lastError.candidate,body:'You can read this synthetic response, with punctuation corrected.'}:p)};
result=await store.invoke('PATCH',{id:row.id,expectedUpdatedAt:row.updated_at,sections:{horoscopeEdition:mixed},body:horoscopeEditionBody(mixed)});
assert.equal(result.status,200,JSON.stringify(result.payload));row=result.payload.rows[0];
assert(!generation().candidateHolds.cancer);assert.equal(generation().lastError,null);assert(generation().candidateHolds.sagittarius);

// Original generated copy and overlapping diagnostics survive rejection history.
result=await action('reject',{sign:'aries'});assert.equal(result.status,200,JSON.stringify(result.payload));
assert(!generation().candidateHolds.aries);assert(generation().rejections.at(-1).generation.candidateHolds.aries);
result=await action('reject',{sign:'all'});assert.equal(result.status,200,JSON.stringify(result.payload));
assert.deepEqual(generation().candidateHolds,{});assert(row.sections.horoscopeEdition.passages.every((p:any)=>!p.body));
console.log('PASS horoscope rhetorical admission: durable review, exact evidence, cost boundary, overlapping labels, incomplete/unknown holds, batch continuation, editing, rejection and legacy recovery.');
