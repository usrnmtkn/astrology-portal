import {projectReaderRow} from '../apps/web/src/content/readerRowProjection.mjs';
import assert from 'node:assert/strict';
import {store,installHoroscopeWriterFixture,writerFixture,weeklyBatchFixtureResult} from '../tests/helpers/sky-article-save-api.mts';
import {emptyHoroscopeEdition,horoscopeEditionBody,horoscopeEditionKey,HOROSCOPE_SIGNS} from '../apps/web/src/content/horoscopeEditions.mjs';
import {runHoroscopeWriting} from '../api/admin/horoscope-writing';
import {runWeeklyHoroscopeBatch} from '../api/_lib/horoscope-batch';
import {decodeWeeklyHistoryRow} from '../api/_lib/horoscope-history-storage';
import {horoscopeEditorRow} from '../api/_lib/horoscope-editor-payload';
import {validateWeeklyEditorialResult,weeklyReviewCurrent,WEEKLY_PLAN_INSTRUCTIONS,WEEKLY_BATCH_REVIEW_INSTRUCTIONS} from '../src/astro-writing/weeklyBatchEditorial.mjs';
import {loadWeeklyPriorEditions} from '../api/_lib/weekly-prior-editions';
import {defaultHoroscopeProfile} from '../src/astro-writing/horoscopeWritingProfiles.mjs';
installHoroscopeWriterFixture();
const profile={...defaultHoroscopeProfile('weekly'),
 voiceGuidance:'Synthetic current Weekly correction: use ordinary words and explain the actual circumstance.',
 structure:'Synthetic current Weekly structure: give openings room to establish a situation. No hook is compulsory.',
 sourceGuidance:'Complete synthetic approved example opening.\n\nComplete synthetic approved example development.\n\nComplete synthetic approved example ending.'};
const profileSave=await store.invoke('POST',{profile,expectedUpdatedAt:null},'/api/admin/generated-content?writingProfiles=true');
assert.equal(profileSave.status,200);const savedProfileRow=structuredClone(store.rows.get(profileSave.payload.profile.id));
const current=(id:string)=>decodeWeeklyHistoryRow(structuredClone(store.rows.get(id)));
const action=(id:string,action:string,extra:any={})=>runHoroscopeWriting({action,id,expectedUpdatedAt:current(id).updated_at,...extra},'synthetic-owner');
async function create(date:string,complete=true,period='weekly',timeZone='America/New_York'){
 const result=await store.invoke('GET',undefined,`/api/admin/generated-content?horoscopeBrief=true&period=${period}&date=${date}&timeZone=${encodeURIComponent(timeZone)}`);
 assert.equal(result.status,200);const {brief,signature}=result.payload,edition=emptyHoroscopeEdition(brief.window);
 if(complete)for(const p of edition.passages){p.headline=`Synthetic ${p.sign}`;p.body=`A complete ${date} ${p.sign} passage. A private concern gets explained in full. The old ending remains intact.`;}
 const saved=await store.invoke('POST',{contentKey:horoscopeEditionKey(edition.window),surface:'sky',mode:'article',eventType:'horoscope-edition',provider:'manual-admin',status:'DRAFT',lane:'serving',headline:'Synthetic Weekly comparison case',body:horoscopeEditionBody(edition),sections:{horoscopeEdition:edition},facts:{horoscopeBrief:{brief,signature}},sourceSnapshot:{horoscopeOutlines:{}}});
 assert.equal(saved.status,200);return saved.payload.rows[0].id;
}
const prior1=await create('2026-11-02'),prior2=await create('2026-11-09');
const future=await create('2026-11-23'),otherZone=await create('2026-11-09',true,'weekly','Europe/London'),daily=await create('2026-11-09',true,'daily');
const id=await create('2026-11-16',false),oldRows=[prior1,prior2,future,otherZone,daily].map(current);
const prepare=await action(id,'prepare');assert.equal(prepare.status,200,JSON.stringify(prepare.payload));
const snapshot=current(id).source_snapshot.weeklyComparison;
assert.deepEqual(snapshot.editions.map((e:any)=>e.id),[prior2,prior1],'Only prior Weekly windows in the same zone, latest window first');
assert.deepEqual(snapshot.editions[0].readings.map(({sign,headline,body}:any)=>({sign,headline,body})),oldRows[1].sections.horoscopeEdition.passages,'No excerpting, normalization or author-text changes');
const original=JSON.stringify(snapshot);
const versionRow={...structuredClone(current(prior2)),id:'synthetic-version-only',mode:'studio-draft',event_type:'horoscope-edition-revision',status:'ARCHIVED',lane:'reference',updated_at:'2099-01-01T00:00:00.000Z'};
store.rows.set(versionRow.id,versionRow);assert.deepEqual((await loadWeeklyPriorEditions(current(id))).editions,snapshot.editions,'Version archives are not separate Weekly editions');

assert.equal((await action(id,'start-batch',{approvedPlanHash:prepare.payload.plan.planHash})).status,202);
await runWeeklyHoroscopeBatch(id,{maxSteps:1,wait:async()=>{}});
const planner=[...writerFixture.batchRequests.values()].at(-1)!;
const planInput=JSON.parse(planner.input);assert.deepEqual(planInput.priorWeeks,JSON.parse(original));
assert.deepEqual(planInput.profile,profile,'The shared planner receives the complete current saved Voice, Structure and Sources');
assert(planner.instructions.includes('A date or a new planet name pasted into an evergreen lesson is insufficient'));
assert(planner.instructions.includes('outward confidence versus private truth'));
assert(planner.instructions.includes('Several connected sentences may be needed'));
assert(planner.instructions.includes('abstract psychological verdict'));
// Data injection stays inside a comparison-only packet, never the system instructions.
assert(!planner.instructions.includes(oldRows[1].sections.horoscopeEdition.passages[0].body));
const plan=weeklyBatchFixtureResult(planInput);
for(const key of ['astrologicalReason','weekDifference','development']){
 const bad=structuredClone(plan);delete bad.concerns[0][key];assert.throws(()=>validateWeeklyEditorialResult(bad,{phase:'planning',input:planInput}),/incomplete/);
}
// Changing an earlier edition after approval cannot silently change the paid plan.
const edited=current(prior2);edited.sections.horoscopeEdition.passages[0].body+=' A later owner edit.';store.rows.set(prior2,edited);
await runWeeklyHoroscopeBatch(id,{maxSteps:100,wait:async()=>{}});
let row=current(id);assert.equal(row.source_snapshot.horoscopeGeneration.batch.status,'complete');
const reviewer=[...writerFixture.batchRequests.values()].at(-1)!,reviewInput=JSON.parse(reviewer.input);
assert.deepEqual(reviewInput.priorWeeks,JSON.parse(original),'Planner and final reviewer share the frozen complete snapshot');
assert.deepEqual(reviewInput.profile,profile,'The complete current saved profile also reaches the full-set reviewer');
for(const request of writerFixture.requests.values()){
 assert(!request.input.includes('\"priorQuote\":'),'Historical citation fields are not writer voice or meaning inputs');
 assert(request.input.includes('weekDifference is comparison-only analysis'));
 for(const field of ['voiceGuidance','structure','sourceGuidance'] as const)assert(request.input.includes(profile[field]),`Complete ${field} reaches the actual writer`);
 assert(request.instructions.includes('An opening may need several connected sentences'));
 assert(request.input.includes('without requiring a psychological revelation'));
 assert(!request.input.includes('Let the ending follow from the recognition developed in this reading'));
}
assert.equal(writerFixture.batchCalls,2);assert.equal(writerFixture.calls,12);assert.equal(writerFixture.reviewCalls,12,'No extra judge, retry or rewrite calls');
assert(reviewer.instructions.includes('Do not return a bare all-pass checklist'));
assert(reviewer.instructions.includes('A quiet or gradual opening is not a defect'));
assert(reviewer.instructions.includes('what the reader cannot understand about the situation or consequence'));
assert(reviewer.instructions.includes('something looks good but is not what the reader wants'));
assert.deepEqual(store.rows.get(profileSave.payload.profile.id),savedProfileRow,'Planning, writing and reviewing never rewrite saved rules or examples');
const result=weeklyBatchFixtureResult(reviewInput);assert.equal(validateWeeklyEditorialResult(result,{phase:'batch-review',input:reviewInput}).status,'passed');
const legacyInput={...reviewInput};delete legacyInput.priorWeeks;
const legacy={checks:Object.fromEntries(['interpretations','phrases','endings','house_grounding','unsupported_history','technical_filler'].map(key=>[key,'pass'])),findings:[]};
assert.equal(validateWeeklyEditorialResult(legacy,{phase:'batch-review',input:legacyInput}).status,'passed','A previously sent request keeps its old receipt contract');
const missing=structuredClone(result);delete missing.assessments;assert.throws(()=>validateWeeklyEditorialResult(missing,{phase:'batch-review',input:reviewInput}),/Incomplete/);
const invented=structuredClone(result);invented.assessments[0].priorQuote='An invented former reading.';assert.throws(()=>validateWeeklyEditorialResult(invented,{phase:'batch-review',input:reviewInput}),/prior reading/);
const factless=structuredClone(result);factless.assessments[0].eventIds=['outside-current-facts'];assert.throws(()=>validateWeeklyEditorialResult(factless,{phase:'batch-review',input:reviewInput}),/current facts/);
const repeated=structuredClone(result);repeated.checks.cross_week_repetition='fail';repeated.findings=[{category:'cross_week_repetition',reason:'The current mechanism repeats a prior conclusion despite the changed date.',evidence:[{sign:'leo',quote:row.sections.horoscopeEdition.passages[4].body}],priorEvidence:[{editionId:prior2,sign:'leo',quote:snapshot.editions[0].readings[4].body}]}];
assert.equal(validateWeeklyEditorialResult(repeated,{phase:'batch-review',input:reviewInput}).status,'failed');
repeated.findings[0].priorEvidence[0].editionId=future;assert.throws(()=>validateWeeklyEditorialResult(repeated,{phase:'batch-review',input:reviewInput}),/not supplied/);
const projected=projectReaderRow({...row,status:'LIVE'});assert.deepEqual(projected.sections.horoscopeEdition,row.sections.horoscopeEdition,'Reader projection retains the complete current edition');
const reader=JSON.stringify(projected);assert(!reader.includes('weeklyComparison'));assert(!reader.includes(snapshot.editions[0].readings[0].body),'Prior private readings never become reader transport fields');
const view=horoscopeEditorRow(row);assert(!('editions' in view.source_snapshot.weeklyComparison));assert(weeklyReviewCurrent(view),'Redacted editor uses the same identity binding without private history bodies');
const oldComparison=current(id).source_snapshot.weeklyComparison;
for(const date of ['2026-10-05','2026-10-12','2026-10-19','2026-10-26'])await create(date);
const limited=await loadWeeklyPriorEditions(current(id));assert.equal(limited.editions.length,4);assert.deepEqual(limited.editions.slice(0,2).map((e:any)=>e.id),[prior2,prior1]);assert.deepEqual(current(id).source_snapshot.weeklyComparison,oldComparison,'A read cannot replace the frozen snapshot');
const beforeHash=prepare.payload.plan.planHash;
const refreshed=await action(id,'prepare');assert.equal(refreshed.status,200);assert.notEqual(refreshed.payload.plan.planHash,beforeHash);assert(!weeklyReviewCurrent(current(id)),'An updated historical snapshot invalidates the old verdict');
for(const [i,prior] of [prior1,future,otherZone,daily].entries())assert.deepEqual(current(prior),oldRows[[0,2,3,4][i]],'Comparison never writes a previous edition');
// Storage failure stops the free preparation before any paid request.
const fetch=globalThis.fetch,beforeCalls=writerFixture.batchCalls;
globalThis.fetch=async(url:any,options:any)=>String(url).includes('sections-%3EhoroscopeEdition')&&String(url).includes('offset=')?Response.json({}, {status:503}):fetch(url,options);
try{await assert.rejects(loadWeeklyPriorEditions(current(id)),/could not be checked/);}finally{globalThis.fetch=fetch;}
assert.equal(writerFixture.batchCalls,beforeCalls);
for(const text of [WEEKLY_PLAN_INSTRUCTIONS,WEEKLY_BATCH_REVIEW_INSTRUCTIONS])assert(text.includes('Existing owner examples stay unchanged'));
assert.deepEqual(current(id).sections.horoscopeEdition.passages.map((p:any)=>p.sign),HOROSCOPE_SIGNS);
console.log('PASS Weekly cross-week repair: exact historical text and scope, frozen snapshots, actual shared requests, fact-bound concerns, twelve evidenced assessments, quote validation, stale verdicts, no prior writes and 26 bounded synthetic calls. This does not measure live prose quality.');
await store.close();
