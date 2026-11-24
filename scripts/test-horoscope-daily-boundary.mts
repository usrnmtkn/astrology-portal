import {withCompactVoiceInstructions} from '../src/astro-writing/compactVoiceInstructions.mjs';
import assert from 'node:assert/strict';
import {store,installHoroscopeWriterFixture,invokeHoroscopeWriting,writerFixture} from '../tests/helpers/sky-article-save-api.mts';
import {installAlternativeHoroscopeProviders} from '../tests/helpers/horoscope-provider-fixture.mts';
import {emptyHoroscopeEdition,horoscopeEditionBody,horoscopeEditionKey} from '../apps/web/src/content/horoscopeEditions.mjs';
import {defaultHoroscopeProfile} from '../src/astro-writing/horoscopeWritingProfiles.mjs';
import {DAILY_HOROSCOPE_INSTRUCTIONS} from '../src/astro-writing/dailyHoroscopeDraft.mjs';
import {prepareHoroscopeWriting} from '../src/astro-writing/horoscopeWriting.mjs';
import {assertHoroscopeRequestEvidence,horoscopeRequestSourcePassages} from './assert-horoscope-request-evidence.mjs';
import {runWeeklyHoroscopeBatch} from '../api/_lib/horoscope-batch';
import {decodeWeeklyHistoryRow} from '../api/_lib/horoscope-history-storage';

installHoroscopeWriterFixture();
const alternatives=installAlternativeHoroscopeProviders();
const saved=await store.invoke('POST',{profile:defaultHoroscopeProfile('daily'),expectedUpdatedAt:null},'/api/admin/generated-content?writingProfiles=true');
assert.equal(saved.status,200);
const providerResult=(value:any)=>({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(value)}]}]});
for(const [index,choice] of ['current','gemini','claude','current'].entries()){
 const packet=await store.invoke('GET',undefined,`/api/admin/generated-content?horoscopeBrief=true&period=daily&date=2026-10-${20+index}&timeZone=America%2FNew_York`);
 assert.equal(packet.status,200);const edition=emptyHoroscopeEdition(packet.payload.brief.window);
 const created=await store.invoke('POST',{contentKey:horoscopeEditionKey(edition.window),surface:'sky',mode:'article',eventType:'horoscope-edition',provider:'manual-admin',status:'DRAFT',lane:'serving',headline:'Synthetic Daily boundary fixture',body:horoscopeEditionBody(edition),sections:{horoscopeEdition:edition},facts:{horoscopeBrief:packet.payload},sourceSnapshot:{studioWritingProfile:saved.payload.profile}});
 assert.equal(created.status,200);let row=created.payload.rows[0];const original=structuredClone(row);
 const action=async(action:string,extra:any={})=>{
  const result=await invokeHoroscopeWriting({action,id:row.id,expectedUpdatedAt:row.updated_at,...extra});
  if(result.payload.rows?.[0])row=result.payload.rows[0];return result;
 };
 const plan=await action('prepare',{writerChoice:choice});assert.equal(plan.status,200);
 const counts={writers:writerFixture.calls,reviews:writerFixture.reviewCalls};
 const value={headline:'Aries & Aries Rising',body:index===0?'You notice your fourth house while the Moon enters Cancer.':index===2?prepareHoroscopeWriting(row).entries[0].ownerContext.primaryRegisterPassages[0].text:'You can choose whether to continue.'};
 if(index===3)writerFixture.startResult=providerResult(value);
 else writerFixture.nextResult=providerResult(value);
 const start=await action('generate',{sign:'aries',approvedPlanHash:plan.payload.plan.planHash});
 assert.equal(start.status,index===3?200:202);
 const operation=index===3?row.source_snapshot.horoscopeGeneration.candidateHolds.aries.operation:row.source_snapshot.horoscopeGeneration.active;
 const sources=operation.dailyValidationSources;assert(sources?.length);
 assert(!operation.reviewEvidence.dailyValidationSources,'Copy-check sources are not duplicated into the paid reviewer');
 const native=choice==='current'?[...writerFixture.requests.values()].at(-1):alternatives.requests.at(-1)!.request;
 const input=choice==='claude'?native.messages[0].content:native.input;
 const instructions=choice==='claude'?native.system:choice==='gemini'?native.system_instruction:native.instructions;
 assert.equal(instructions,withCompactVoiceInstructions(DAILY_HOROSCOPE_INSTRUCTIONS,saved.payload.profile.profile));
 assertHoroscopeRequestEvidence(input);
 assert.deepEqual(sources,horoscopeRequestSourcePassages(input).map(({id,sha256,text}:any)=>({id,sha256,text})),'Source-copy checks use exactly the passages delivered to the writer');
 for(const old of ['AVAILABLE OWNER LINES\n','GOVERNED RETRIEVAL ANCHOR','FORECAST COVERAGE\n','"recognition":','"response":'])assert(!input.includes(old),old);
 assert(!instructions.includes('GHOSTWRITER CRAFT GUIDANCE'));
 for(const formula of ['REVISION STANDARD:','SHARED RHETORICAL POLICY','A possible example can name an action'])assert(!instructions.includes(formula),'The shared replacement recipe cannot override the complete saved Daily guide');
 const scope=JSON.parse(input.split('REVIEWED EDITORIAL SCOPE\n')[1].split('\n')[0]);
 assert.equal(scope.direction,null);assert(!('thesis' in scope)&&!('recognition' in scope)&&!('response' in scope));
 const sourceRoles=JSON.parse(input.split('SOURCE AUTHORITY AND ROLES\n')[1].split('\n')[0]);
 assert(!sourceRoles.some((entry:any)=>entry.sourceKind==='current-approved-argument-and-close'));
 const facts=JSON.parse(input.split('CALCULATED FACTS\n')[1].split('\n')[0]);
 assert.equal(facts.signs.length,1);assert.equal(facts.signs[0].sign,'aries');
 if(index<3){
  await new Promise(resolve=>setTimeout(resolve,40));
  row=structuredClone(store.rows.get(row.id));
  const result=await action('poll');assert.equal(result.status,200,JSON.stringify(result.payload));
 }
 const generation=row.source_snapshot.horoscopeGeneration,held=generation.candidateHolds.aries;
 assert.equal(generation.active,null);assert.equal(held.code,'daily_output_boundary');
 assert.equal(held.receipt.ownerApproved,false);assert.equal(row.status,'DRAFT');
 assert.deepEqual(row.sections,original.sections,'A failed draft never enters reader fields');
 assert.equal(writerFixture.calls,counts.writers+1);assert.equal(writerFixture.reviewCalls,counts.reviews,'A known deterministic failure stops before its paid prose check');
 assert(held.receipt.lint.violations.some((v:any)=>v.category.startsWith('daily_')));
 assert.deepEqual(held.candidate,value);
 const heldBefore=structuredClone(held);await action('poll');await action('poll');
 assert.deepEqual(row.source_snapshot.horoscopeGeneration.candidateHolds.aries,heldBefore);
 assert.equal((await action('generate',{sign:'aries',approvedPlanHash:plan.payload.plan.planHash})).status,409);
 const rejected=await action('reject',{sign:'aries'});assert.equal(rejected.status,200);
 assert.deepEqual(row.source_snapshot.horoscopeGeneration.rejections.at(-1).generation.candidateHolds.aries.candidate,heldBefore.candidate);
 assert.deepEqual(row.facts,original.facts);assert.deepEqual(row.source_snapshot.studioWritingProfile,original.source_snapshot.studioWritingProfile);
 assert.equal(writerFixture.calls,counts.writers+1);assert.equal(writerFixture.reviewCalls,counts.reviews);
}
// The current Daily worker must continue the other approved signs after a
// deterministic hold without reviewing the failed candidate or an incomplete set.
{
 const packet=await store.invoke('GET',undefined,'/api/admin/generated-content?horoscopeBrief=true&period=daily&date=2026-10-24&timeZone=America%2FNew_York');
 assert.equal(packet.status,200);const edition=emptyHoroscopeEdition(packet.payload.brief.window);
 const created=await store.invoke('POST',{contentKey:horoscopeEditionKey(edition.window),surface:'sky',mode:'article',eventType:'horoscope-edition',provider:'manual-admin',status:'DRAFT',lane:'serving',headline:'Synthetic Daily batch hold',body:horoscopeEditionBody(edition),sections:{horoscopeEdition:edition},facts:{horoscopeBrief:packet.payload},sourceSnapshot:{studioWritingProfile:saved.payload.profile}});
 assert.equal(created.status,200);const id=created.payload.rows[0].id;
 const latest=()=>decodeWeeklyHistoryRow(structuredClone(store.rows.get(id)));
 const action=(action:string,extra:any={})=>invokeHoroscopeWriting({action,id,expectedUpdatedAt:latest().updated_at,...extra});
 const plan=await action('prepare');assert.equal(plan.status,200);
 const before={writers:writerFixture.calls,reviews:writerFixture.reviewCalls,batches:writerFixture.batchCalls};
 const candidate={headline:'Aries & Aries Rising',body:'The Moon enters Cancer and your fourth house tonight.'};
 writerFixture.nextResult=providerResult(candidate);
 assert.equal((await action('start-batch',{approvedPlanHash:plan.payload.plan.planHash})).status,202);
 assert.equal((await runWeeklyHoroscopeBatch(id,{maxSteps:100,wait:async()=>{}})).state,'needs_attention');
 const row=latest(),generation=row.source_snapshot.horoscopeGeneration;
 assert.equal(row.status,'DRAFT');assert.equal(generation.active,null);
 assert.equal(generation.batch.status,'needs_attention');assert.equal(generation.batch.attempted.length,12);
 assert.deepEqual(generation.candidateHolds.aries.candidate,candidate);
 assert.equal(row.sections.horoscopeEdition.passages[0].body,'');
 assert(row.sections.horoscopeEdition.passages.slice(1).every((p:any)=>p.headline&&p.body));
 assert.equal(writerFixture.calls,before.writers+12);assert.equal(writerFixture.reviewCalls,before.reviews+11);
 assert.equal(writerFixture.batchCalls,before.batches,'An incomplete Daily set cannot incur a full-set review');
 assert.equal((await runWeeklyHoroscopeBatch(id,{maxSteps:100,wait:async()=>{}})).state,'idle');
 assert.equal(writerFixture.calls,before.writers+12,'A stopped batch never retries the held sign');
}
console.log('PASS Daily boundaries: actual handlers and three provider formats, scoped request, exact candidate/receipt retention, immediate and retrieved responses, no review/retry billing, reload, rejection history, profile/fact/reader preservation, and current Daily batch continuation around a held sign. Injected providers only.');
