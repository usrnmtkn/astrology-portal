import assert from 'node:assert/strict';
import {horoscopeEditionBody} from '../apps/web/src/content/horoscopeEditions.mjs';
import {readHoroscopeReview} from '../src/astro-writing/horoscopeRhetoricalReview.mjs';
import {store,installHoroscopeWriterFixture,invokeHoroscopeWriting,writerFixture} from '../tests/helpers/sky-article-save-api.mts';
import {reviewCandidate,reviewValue,reviewPayload,seedCompletedReviewHold} from '../tests/helpers/horoscope-review-recovery-fixture.mts';

for(const [open,close] of [['“','”'],['‘','’'],['"','"'],["'","'"]]){
 const review=reviewValue(),original=structuredClone(review);
 review.findings[0].quote=open+'The synthetic unsupported sentence belongs here.'+close;
 const result=readHoroscopeReview(reviewPayload(review),reviewCandidate);
 assert.equal(result.rhetoricalBlocked,true,'Formatting repair cannot turn an editorial failure into a pass');
 assert.equal(result.rhetoric.findings[0].quote,'The synthetic unsupported sentence belongs here.');
 assert.equal(review.findings[0].paragraph,original.findings[0].paragraph);
}
for(const mutate of [
 (r:any)=>r.findings[0].quote='“Invented wording.”',
 (r:any)=>r.findings[0].quote='“the synthetic unsupported sentence belongs here.”',
 (r:any)=>r.findings[0].quote='“The synthetic unsupported sentence belongs here."',
 (r:any)=>r.findings[0].paragraph='Invented paragraph. The synthetic unsupported sentence belongs here.',
 (r:any)=>r.findings[0].field='headline',
 (r:any)=>r.checks[2].outcome='pass',
]){const r=reviewValue();mutate(r);assert.throws(()=>readHoroscopeReview(reviewPayload(r),reviewCandidate),/invalid_rhetorical_review/);}
const quoted={...reviewCandidate,body:'The sign said “Leave the fixture here.”'};
const exact=reviewValue();exact.findings[0].paragraph=quoted.body;exact.findings[0].quote='“Leave the fixture here.”';
assert.equal(readHoroscopeReview(reviewPayload(exact),quoted).rhetoric.findings[0].quote,exact.findings[0].quote,'Existing quotation marks remain exact');

installHoroscopeWriterFixture();
let row=await seedCompletedReviewHold(store,writerFixture);
const original=structuredClone(row);
const action=async(extra:any={})=>{const result=await invokeHoroscopeWriting({action:'recover-review',id:row.id,expectedUpdatedAt:row.updated_at,sign:'overview',...extra});if(result.payload.rows?.[0])row=result.payload.rows[0];return result;};
assert.equal((await action({expectedUpdatedAt:'stale'})).status,409);
assert.equal((await action({sign:'aries'})).status,409);
const reset=()=>{row=structuredClone(original);store.rows.set(row.id,structuredClone(row));};
for(const mutate of [
 (r:any)=>r.source_snapshot.horoscopeGeneration.active={id:'another-operation'},
 (r:any)=>r.source_snapshot.horoscopeGeneration.batch={status:'running'},
 (r:any)=>r.source_snapshot.horoscopeGeneration.candidateHolds.overview.candidate.body+=' Changed.',
 (r:any)=>{Object.assign(r.sections.horoscopeEdition.passages[0],{headline:'New owner title',body:reviewCandidate.body.replace('The synthetic unsupported sentence belongs here.','Newer owner writing.')});r.body=horoscopeEditionBody(r.sections.horoscopeEdition);},
 (r:any)=>r.source_snapshot.horoscopeGeneration.candidateHolds.overview.operation.responseId=null,
]){reset();mutate(store.rows.get(row.id));const result=await action();assert.equal(result.status,409,JSON.stringify(result.payload));}
reset();writerFixture.nextResult={status:'in_progress'};
assert.equal((await action()).status,503);assert.deepEqual(store.rows.get(row.id),original);
writerFixture.nextResult={id:'resp_wrong',...reviewPayload()};assert.equal((await action()).status,503);
const fetchFixture=globalThis.fetch;
try{
 globalThis.fetch=async(input:any,options:any)=>String(input).includes('/v1/responses/')?Response.json({error:'unavailable'},{status:404}):fetchFixture(input,options);
 assert.equal((await action()).status,503);assert.deepEqual(store.rows.get(row.id),original);
}finally{globalThis.fetch=fetchFixture;}
try{
 globalThis.fetch=async(input:any,options:any)=>{
  if(String(input).includes('/v1/responses/')){store.rows.get(row.id).updated_at='2026-10-13T10:00:00Z';return Response.json({id:'resp_saved_review_fixture',...reviewPayload()});}
  return fetchFixture(input,options);
 };
 assert.equal((await action()).status,409,'Concurrent saves are fenced when retrieval completes');
 assert.equal(store.rows.get(row.id).updated_at,'2026-10-13T10:00:00Z');
 assert.equal(store.rows.get(row.id).source_snapshot.horoscopeGeneration.candidateHolds.overview.code,'rhetorical_review_unavailable');
}finally{globalThis.fetch=fetchFixture;}
reset();
writerFixture.nextResult=reviewPayload({} as any);assert.equal((await action()).status,200);
assert.equal(row.source_snapshot.horoscopeGeneration.candidateHolds.overview.review.diagnostic.validationCode,'invalid_rhetorical_review:shape');
const failedAgain=structuredClone(row);writerFixture.nextResult=reviewPayload({} as any);await action();
assert.deepEqual(row,failedAgain,'Checking the same malformed result cannot repeatedly duplicate history');
reset();writerFixture.nextResult=reviewPayload();assert.equal((await action()).status,200);
const held=row.source_snapshot.horoscopeGeneration.candidateHolds.overview;
assert.equal(held.code,'rhetorical_pattern');assert.deepEqual(held.candidate,original.source_snapshot.horoscopeGeneration.candidateHolds.overview.candidate);
assert.equal(held.review.rhetoricalBlocked,true);assert.equal(held.review.ownerApproved,false);
assert.equal(row.status,'DRAFT');assert.equal(row.sections.horoscopeEdition.passages[0].body,'');
assert.equal(row.source_snapshot.horoscopeGeneration.failures.length,2);
assert.equal((await action()).status,409,'A confirmed semantic failure cannot be retried through retrieval');
reset();writerFixture.nextResult=reviewPayload(reviewValue(false));assert.equal((await action()).status,200);
assert.equal(row.status,'DRAFT');assert.equal(row.sections.horoscopeEdition.passages[0].body,reviewCandidate.body);
assert.deepEqual(row.source_snapshot.horoscopeGeneration.candidateHolds,{});
assert.equal(row.source_snapshot.horoscopeGeneration.readings.overview.rhetoricalReview.ownerApproved,false);
assert.deepEqual(row.source_snapshot.horoscopeGeneration.failures,original.source_snapshot.horoscopeGeneration.failures);
assert.equal((await action()).status,409,'Completed recovery is not replayed');
assert.equal(writerFixture.calls,0);assert.equal(writerFixture.reviewCalls,0,'Every recovery uses only existing response GETs');
console.log('Horoscope review formatting, exact evidence, recovery, concurrency and no-paid-retry checks passed.');
