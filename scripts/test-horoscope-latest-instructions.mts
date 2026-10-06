import assert from 'node:assert/strict';
import {store,editorialFixtureRows,installHoroscopeWriterFixture,invokeHoroscopeWriting,writerFixture} from '../tests/helpers/sky-article-save-api.mts';
import {prepareHoroscopeBrief} from '../api/_lib/horoscope-editions';
import {emptyHoroscopeEdition,horoscopeEditionBody,horoscopeEditionKey} from '../apps/web/src/content/horoscopeEditions.mjs';
import {defaultHoroscopeProfile,horoscopeEditorialPrompt} from '../src/astro-writing/horoscopeWritingProfiles.mjs';
import {prepareHoroscopeWriting,writeHoroscopeSign} from '../src/astro-writing/horoscopeWriting.mjs';

installHoroscopeWriterFixture();
const endpoint='/api/admin/generated-content?writingProfiles=true';
for(const period of ['daily','weekly','monthly','seasonal'] as const){
 const saveProfile=async(previous:any,label:string)=>{
  const result=await store.invoke('POST',{profile:{...defaultHoroscopeProfile(period),voiceGuidance:label},expectedUpdatedAt:previous?.updatedAt??null},endpoint);
  assert.equal(result.status,200,JSON.stringify(result.payload));return result.payload.profile;
 };
 const first=await saveProfile(null,`Original ${period} guidance.`);
 const packet=await prepareHoroscopeBrief(new URL(`http://localhost/?period=${period}&date=2026-10-01&timeZone=America/New_York`));
 const edition=emptyHoroscopeEdition(packet.brief.window);
 const preserved=edition.passages.at(-1)!;
 if(period!=='monthly'){preserved.headline='Existing exact title';preserved.body='Existing exact opening.\n\nExisting exact final sentence.';}
 const created=await store.invoke('POST',{contentKey:horoscopeEditionKey(edition.window),surface:'sky',mode:'article',eventType:'horoscope-edition',provider:'manual-admin',status:'DRAFT',lane:'serving',headline:'Automatic instructions fixture',body:horoscopeEditionBody(edition),sections:{horoscopeEdition:edition},facts:{horoscopeBrief:packet},sourceSnapshot:{studioWritingProfile:first,horoscopeOutlines:{},horoscopeGeneration:{readings:{historical:{profileHash:'original immutable receipt'}},rejections:[]}}});
 assert.equal(created.status,200,JSON.stringify(created.payload));let row=created.payload.rows[0];
 const action=(action:string,extra:any={})=>invokeHoroscopeWriting({action,id:row.id,expectedUpdatedAt:row.updated_at,...extra});
 const original=structuredClone(row);
 const initial=await action('prepare');assert.equal(initial.status,200);
 const second=await saveProfile(first,`Latest ${period} guidance, complete and exact.`);
 assert.deepEqual(store.rows.get(row.id),original,'Saving a profile alone never mutates an edition');
 const calls=writerFixture.calls;
 const sign=edition.passages[0].sign;
 assert.equal((await action('generate',{sign,approvedPlanHash:initial.payload.plan.planHash})).status,409,'A stale plan cannot start paid generation');
 assert.equal(writerFixture.calls,calls);
 const refreshed=await action('prepare');assert.equal(refreshed.status,200,JSON.stringify(refreshed.payload));
 row=refreshed.payload.rows[0];
 assert.deepEqual(row.source_snapshot.studioWritingProfile,second,'Preparing an older edition automatically adopts the saved instructions');
 assert.notEqual(row.updated_at,original.updated_at);
 assert.deepEqual(row.sections,original.sections);assert.equal(row.body,original.body);
 assert.deepEqual(row.source_snapshot.horoscopeGeneration,original.source_snapshot.horoscopeGeneration);
 assert.deepEqual(row.facts,original.facts);
 assert.notEqual(refreshed.payload.plan.planHash,initial.payload.plan.planHash);
 assert.equal((await invokeHoroscopeWriting({action:'prepare',id:row.id,expectedUpdatedAt:original.updated_at})).status,409);
 const repeated=await action('prepare');assert.equal(repeated.status,200);assert.equal(repeated.payload.rows[0].updated_at,row.updated_at,'No write when already current');
 const started=await action('generate',{sign,approvedPlanHash:refreshed.payload.plan.planHash});assert.equal(started.status,202,JSON.stringify(started.payload));row=started.payload.rows[0];
 const active=structuredClone(row.source_snapshot.horoscopeGeneration.active);
 assert((period==='monthly'?active.draftRequest:period==='seasonal'?editorialFixtureRows.get(active.id).state.input.template:writerFixture.requests.get(active.responseId)).input.includes(horoscopeEditorialPrompt(second.profile)));
 const third=await saveProfile(second,`Future ${period} guidance.`);
 const pinned=await action('prepare');assert.equal(pinned.status,200);
 assert.equal(pinned.payload.rows[0].updated_at,row.updated_at);
 assert.deepEqual(store.rows.get(row.id).source_snapshot.horoscopeGeneration.active,active);
 assert.deepEqual(store.rows.get(row.id).source_snapshot.studioWritingProfile,second,'An in-flight request retains its original instructions');
 if(period==='seasonal'){
  while(row.source_snapshot.horoscopeGeneration.active){const a=row.source_snapshot.horoscopeGeneration.active;const step=await action(a.state==='ready'?'continue':'poll');assert([200,202].includes(step.status),JSON.stringify(step.payload));row=step.payload.rows[0];}
  const run=editorialFixtureRows.get(active.id).state;assert.equal(run.status,'accepted');assert.equal(writerFixture.calls,calls+6);
  assert(run.input.template.input.includes(horoscopeEditorialPrompt(second.profile)));assert(!run.input.template.input.includes(horoscopeEditorialPrompt(third.profile)));
  assert.deepEqual(row.sections,original.sections,'Seasonal inspection candidates do not alter saved reader content');continue;
 }
 if(period==='monthly'){let step=await action('poll');assert.equal(step.status,202);row=step.payload.rows[0];step=await action('continue');assert.equal(step.status,202);row=step.payload.rows[0];assert(writerFixture.requests.get(row.source_snapshot.horoscopeGeneration.active.responseId).input.includes(horoscopeEditorialPrompt(second.profile)));}
 const completed=await action('poll');assert.equal(completed.status,200,JSON.stringify(completed.payload));row=completed.payload.rows[0];
 assert.equal(writerFixture.calls,calls+(period==='monthly'?2:period==='seasonal'?3:1),'Polling never regenerates');
 assert.equal(row.source_snapshot.horoscopeGeneration.readings[sign].profileHash,active.receipt.profileHash);
 if(period!=='monthly')assert.deepEqual(row.sections.horoscopeEdition.passages.at(-1),preserved);
 const rejected=await action('reject',{sign});assert.equal(rejected.status,200);row=rejected.payload.rows[0];
 assert.deepEqual(row.source_snapshot.studioWritingProfile,third);
 assert.deepEqual(row.source_snapshot.horoscopeGeneration.rejections.at(-1).writingProfile,second);
 const beforeFailure=structuredClone(row),fetch=globalThis.fetch;
 globalThis.fetch=async(input:any,options:any)=>String(input).includes('studio-writing-profile')?new Response('{}',{status:503}):fetch(input,options);
 try{assert.equal((await action('prepare')).status,502);assert.deepEqual(store.rows.get(row.id),beforeFailure);assert.equal(writerFixture.calls,calls+(period==='monthly'?2:period==='seasonal'?3:1));}
 finally{globalThis.fetch=fetch;}
 await saveProfile(third,`Next ${period} guidance.`);
 let raced=false;
 globalThis.fetch=async(input:any,options:any)=>{
  if(!raced&&options?.method==='PATCH'&&new URL(String(input)).searchParams.get('id')===`eq.${row.id}`){
   raced=true;store.rows.set(row.id,{...structuredClone(row),headline:'Newer owner edit',updated_at:new Date(Date.parse(row.updated_at)+1000).toISOString()});
  }
  return fetch(input,options);
 };
 try{
  assert.equal((await action('prepare')).status,409);assert(raced);
  assert.equal(store.rows.get(row.id).headline,'Newer owner edit');
  assert.deepEqual(store.rows.get(row.id).source_snapshot.studioWritingProfile,third);
  assert.equal(writerFixture.calls,calls+(period==='monthly'?2:period==='seasonal'?3:1));
 }finally{globalThis.fetch=fetch;}
}
// A long-form profile edit must not change the Weekly plan or assembled request.
// Use synthetic editorial markers and stop at the provider boundary; no prose
// or model-quality assertion is involved.
const profilesBefore=(await store.invoke('GET',undefined,endpoint)).payload.profiles;
const weeklyProfile=profilesBefore.find((p:any)=>p.profile.period==='weekly');
const weeklyFacts=await prepareHoroscopeBrief(new URL('http://localhost/?period=weekly&date=2026-11-02&timeZone=America/New_York'));
const weeklyEdition=emptyHoroscopeEdition(weeklyFacts.brief.window);
const weeklyCreated=await store.invoke('POST',{contentKey:horoscopeEditionKey(weeklyEdition.window),surface:'sky',mode:'article',eventType:'horoscope-edition',provider:'manual-admin',status:'DRAFT',lane:'serving',headline:'Weekly isolation fixture',body:horoscopeEditionBody(weeklyEdition),sections:{horoscopeEdition:weeklyEdition},facts:{horoscopeBrief:weeklyFacts},sourceSnapshot:{studioWritingProfile:weeklyProfile,horoscopeOutlines:{},horoscopeGeneration:{readings:{},rejections:[]}}});
assert.equal(weeklyCreated.status,200,JSON.stringify(weeklyCreated.payload));
const weeklyRow=weeklyCreated.payload.rows[0];
const prepareWeekly=()=>invokeHoroscopeWriting({action:'prepare',id:weeklyRow.id,expectedUpdatedAt:weeklyRow.updated_at});
const planBefore=await prepareWeekly();assert.equal(planBefore.status,200);
const captureRequest=async(row:any)=>{
 const prepared=prepareHoroscopeWriting(row);
 const stop=new Error('Stop at the unbilled provider boundary');let request:any;
 await assert.rejects(writeHoroscopeSign(prepared,'gemini',{approvedPlanHash:prepared.planHash,approvalReference:'fixture:weekly-period-isolation',writerClient:async(value:any)=>{request=structuredClone(value);throw stop;}}),error=>error===stop);
 assert(request);return request;
};
const requestBefore=await captureRequest(weeklyRow);
for(const period of ['monthly','seasonal']){
 const previous=profilesBefore.find((p:any)=>p.profile.period===period);
 const profile={...previous.profile,voiceGuidance:`ONLY ${period} voice expansion.`,structure:`ONLY ${period} article structure.`,sourceGuidance:`ONLY ${period} source guidance.`,prompt:previous.profile.prompt+`\nONLY ${period} prompt expansion.`};
 const saved=await store.invoke('POST',{profile,expectedUpdatedAt:previous.updatedAt},endpoint);
 assert.equal(saved.status,200,JSON.stringify(saved.payload));
 const profiles=(await store.invoke('GET',undefined,endpoint)).payload.profiles;
 for(const untouched of ['daily','weekly'])assert.deepEqual(profiles.find((p:any)=>p.profile.period===untouched),profilesBefore.find((p:any)=>p.profile.period===untouched));
 const planned=await prepareWeekly();assert.equal(planned.status,200);
 assert.deepEqual(planned.payload.plan,planBefore.payload.plan,'Long-form changes cannot invalidate the Weekly plan');
 assert.deepEqual(store.rows.get(weeklyRow.id),weeklyRow,'Preparing Weekly must not adopt another period’s profile');
 assert.deepEqual(await captureRequest(planned.payload.rows[0]),requestBefore,'Weekly facts, sources, instructions, schema and complete provider input must remain identical');
}
assert(requestBefore.input.includes(horoscopeEditorialPrompt(weeklyProfile.profile)));
assert(!requestBefore.input.includes('ONLY monthly'));
assert(!requestBefore.input.includes('ONLY seasonal'));
assert.deepEqual(requestBefore.schema.required,['headline','body'],'Weekly retains its sign-reading output, without the Monthly TLDR field');
console.log('PASS automatic horoscope instructions: all four periods, exact latest provider input, preserved copy/history, stale plans, pinned running requests, recovery, storage failure and unchanged Weekly requests after Monthly/Seasonal edits. No billed calls.');
