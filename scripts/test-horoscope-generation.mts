import {loadWeeklyOwnerEvidence} from '../src/astro-writing/weeklyOwnerEvidence.mjs';
import {assertHoroscopeRequestEvidence} from './assert-horoscope-request-evidence.mjs';
import {loadSeasonalArgumentEvidence,SEASONAL_ARGUMENT_MANIFEST} from '../src/astro-writing/seasonalArgumentEvidence.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {store,editorialFixtureRows,installHoroscopeWriterFixture,invokeHoroscopeWritingWithReview as invokeHoroscopeWriting,writerFixture} from '../tests/helpers/sky-article-save-api.mts';
import {emptyHoroscopeEdition,horoscopeEditionBody,horoscopeEditionKey,horoscopeEditionAt,canonicalHoroscopeTimeZone,horoscopeCanonicalJson} from '../apps/web/src/content/horoscopeEditions.mjs';
import {validateHoroscopeReading} from '../src/astro-writing/horoscopeValidation.mjs';
import {prepareHoroscopeBrief} from '../api/_lib/horoscope-editions';
import {prepareHoroscopeWriting} from '../src/astro-writing/horoscopeWriting.mjs';
import {retrieveOwnerContext} from '../src/astro-writing/retrieveOwnerContext.mjs';
import {loadSeasonalHoroscopeEvidence} from '../src/astro-writing/seasonalHoroscopeEvidence.mjs';
import {HOROSCOPE_EDITORIAL_AUTHORITY} from '../src/astro-writing/horoscopeDraftInput.mjs';
import {defaultHoroscopeProfile,horoscopeEditorialPrompt,HOROSCOPE_EMOTIONAL_DEVELOPMENT_GUIDANCE,HOROSCOPE_CONNECTED_READING_GUIDANCE,HOROSCOPE_PUBLICATION_TIMING_GUIDANCE,HOROSCOPE_OWNER_EDIT_GUIDANCE} from '../src/astro-writing/horoscopeWritingProfiles.mjs';
installHoroscopeWriterFixture();
const savedProfile=await store.invoke('POST',{profile:defaultHoroscopeProfile('weekly'),expectedUpdatedAt:null},'/api/admin/generated-content?writingProfiles=true');
assert.equal(savedProfile.status,200,JSON.stringify(savedProfile.payload));
const writingProfile=savedProfile.payload.profile;
const prepared=await store.invoke('GET',undefined,'/api/admin/generated-content?horoscopeBrief=true&period=weekly&date=2026-09-24&timeZone=Asia/Tokyo');
assert.equal(prepared.status,200,JSON.stringify(prepared.payload));
const {brief,signature}=prepared.payload;
let edition=emptyHoroscopeEdition(brief.window);
const created=await store.invoke('POST',{contentKey:horoscopeEditionKey(edition.window),surface:'sky',mode:'article',eventType:'horoscope-edition',provider:'manual-admin',targetDate:null,status:'DRAFT',lane:'serving',reviewState:null,headline:'Synthetic horoscope edition',body:horoscopeEditionBody(edition),sections:{horoscopeEdition:edition},facts:{horoscopeBrief:{brief,signature}},sourceSnapshot:{studioWritingProfile:writingProfile}});
assert.equal(created.status,200,JSON.stringify(created.payload));let row=created.payload.rows[0];
const action=(action:string,extra:any={})=>invokeHoroscopeWriting({action,id:row.id,expectedUpdatedAt:row.updated_at,...extra});
assert.equal((await invokeHoroscopeWriting({action:'prepare',id:row.id,expectedUpdatedAt:row.updated_at},'wrong')).status,401);
assert.equal((await action('generate',{sign:'aries',approvedPlanHash:'wrong'})).status,409);assert.equal(writerFixture.calls,0);
const plan=await action('prepare');assert.equal(plan.status,200,JSON.stringify(plan.payload));assert.equal(plan.payload.plan.readings.length,12);assert.equal(writerFixture.calls,0);
const planHash=plan.payload.plan.planHash;
assert.equal(brief.referenceDate,'2026-09-21','Weekly context is stable across selected days');
for(const entry of plan.payload.plan.readings){
 const sunIngress=entry.developments.events.find((d:any)=>d.type==='ingress'&&d.planet==='sun');
 const fullMoon=entry.developments.events.find((d:any)=>d.id.startsWith('lunation-full-moon-'));
 assert(sunIngress&&fullMoon,'Both calculated developments must reach every sign plan');
 assert.equal(sunIngress.sign,'libra');assert.equal(fullMoon.sign,'aries');
 assert.notEqual(sunIngress.house,fullMoon.house,'Events retain separate life areas');
 assert.match(sunIngress.localTiming,/Wednesday.*GMT\+9/,'Tokyo receives its own weekday, not New York Tuesday');
 assert(entry.developments.background.some((d:any)=>d.planet==='venus'&&d.meaning.sourceId&&d.domain));
 assert.doesNotMatch(entry.outline,/^Explore sun/,'A snapshot is no longer the prescribed thesis');
}
const changedBrief=structuredClone(row);changedBrief.facts.horoscopeBrief.brief.events=brief.events.filter((e:any)=>e.type!=='ingress');
assert.notEqual(prepareHoroscopeWriting(changedBrief).planHash,prepareHoroscopeWriting(row).planHash,'Fact coverage invalidates plan approval');
// Legacy signed rows retain only their actual coverage, without invented ingresses.
for(const event of changedBrief.facts.horoscopeBrief.brief.events)delete event.title;
const legacy=prepareHoroscopeWriting(changedBrief);
assert(legacy.entries.every((e:any)=>e.developments.events.some((d:any)=>d.title==='Full Moon in Aries')),'Legacy calculation IDs render as readable event names');
assert(legacy.entries.every((e:any)=>e.developments.events.every((d:any)=>d.type!=='ingress')));

// A generic "owner passages present" check missed the excluded sign readings.
// Use the actual governed corpus and inspect every dispatched provider request.
const voice=JSON.parse(fs.readFileSync(new URL('../packages/astro-knowledge/voice/tldr-astro/satori-writer/voice-index.json',import.meta.url),'utf8'));
const fullWeekly=loadWeeklyOwnerEvidence(p=>fs.readFileSync(p,'utf8'),voice);
assert.equal(fullWeekly.length,48);
const forecastSources=new Map<string,any>([...voice.entries.map((e:any)=>[e.sourceId,e]),...fullWeekly.map(e=>[e.id,e])]);
for(const p of edition.passages)forecastSources.set(p.sign,voice.entries.find((e:any)=>e.surface==='weekly-astrology'&&e.structuralFunction==='paragraph under Horoscopes for the week of Aug 4th'&&e.text.split(/\r?\n/u)[0].toLowerCase()===p.sign));
for(const reading of plan.payload.plan.readings){
 assert(reading.sourceIds.slice(0,3).every(id=>forecastSources.has(id)),'Primary sources are complete Weekly units from the canonical corpus');
 assert.equal(reading.sourceIds.length,6,'Retain topical evidence within the existing passage limit');
 assert.equal(reading.ownerEvidence.selection.eligible.filter(e=>e.proseFunction==='complete weekly sign reading').length,48);
}
const evidenceEntry=prepareHoroscopeWriting(row).entries[0];
assert.throws(()=>retrieveOwnerContext(evidenceEntry.plan,{...evidenceEntry.contextOptions,contentFamily:'horoscope',register:'second_person',primaryRegisterContentKeys:[]}),/OWNER_SURFACE_REGISTER_PASSAGES_MISSING/);
assert.throws(()=>retrieveOwnerContext(evidenceEntry.plan,{...evidenceEntry.contextOptions,contentFamily:'horoscope',register:'second_person',primaryRegisterContentKeys:evidenceEntry.contextOptions.primaryRegisterContentKeys.slice(0,2)}),/OWNER_SURFACE_REGISTER_PASSAGES_MISSING/);
const rejectedPrimary=evidenceEntry.contextOptions.examples.map((e:any)=>evidenceEntry.contextOptions.primaryRegisterContentKeys.includes(e.contentKey)?{...e,ownerApproved:false}:e);
assert.throws(()=>retrieveOwnerContext(evidenceEntry.plan,{...evidenceEntry.contextOptions,examples:rejectedPrimary,contentFamily:'horoscope',register:'second_person'}),/OWNER_SURFACE_REGISTER_PASSAGES_MISSING/);
const firstVersion=row.updated_at;
let result=await action('generate',{sign:'aries',approvedPlanHash:planHash});assert.equal(result.status,202,JSON.stringify(result.payload));row=result.payload.rows[0];
assert.equal(writerFixture.calls,1);assert(row.source_snapshot.horoscopeGeneration.active.responseId);
assert.match(row.source_snapshot.horoscopeGeneration.active.requestHash,/^[a-f0-9]{64}$/);
assert.equal((await invokeHoroscopeWriting({action:'generate',id:row.id,expectedUpdatedAt:firstVersion,sign:'aries',approvedPlanHash:planHash})).status,409);
assert.equal((await action('generate',{sign:'taurus',approvedPlanHash:planHash})).status,409);
assert.equal((await store.invoke('PATCH',{id:row.id,expectedUpdatedAt:row.updated_at,status:'LIVE'})).status,409);
assert.equal((await store.invoke('DELETE',undefined,`/api/admin/generated-content?id=${row.id}&expectedUpdatedAt=${encodeURIComponent(row.updated_at)}`)).status,409);
assert.equal(writerFixture.calls,1);
// A new request retrieves the provider response after a simulated page reload.
result=await action('poll');assert.equal(result.status,200,JSON.stringify(result.payload));row=result.payload.rows[0];assert.equal(writerFixture.calls,1);
assert.equal(row.sections.horoscopeEdition.passages[0].body,'You can read the complete aries fixture opening.\n\nYour saved fixture ends here.');
assert.equal(row.status,'DRAFT');assert.equal(row.source_snapshot.horoscopeGeneration.readings.aries.ownerApproved,false);
assert.equal((await action('generate',{sign:'aries',approvedPlanHash:planHash})).status,409);
writerFixture.failNext=true;result=await action('generate',{sign:'taurus',approvedPlanHash:planHash});assert.equal(result.status,422,JSON.stringify(result.payload));row=result.payload.rows[0];assert.equal(row.source_snapshot.horoscopeGeneration.active,null);
for(const sign of edition.passages.slice(1).map(p=>p.sign)){
 result=await action('generate',{sign,approvedPlanHash:planHash});assert.equal(result.status,202,JSON.stringify(result.payload));row=result.payload.rows[0];
 result=await action('poll');assert.equal(result.status,200,JSON.stringify(result.payload));row=result.payload.rows[0];
}
assert.equal(writerFixture.calls,13);assert.equal(row.sections.horoscopeEdition.passages.filter((p:any)=>p.body).length,12);
for(const request of writerFixture.requests.values()){
 assert(request.input.includes(HOROSCOPE_EMOTIONAL_DEVELOPMENT_GUIDANCE));
 assert(request.input.includes(HOROSCOPE_CONNECTED_READING_GUIDANCE));
 assert(request.input.includes(HOROSCOPE_PUBLICATION_TIMING_GUIDANCE));
 assert(request.input.includes(HOROSCOPE_OWNER_EDIT_GUIDANCE));
 assert(request.input.includes('FINISH THE NEW DRAFT USING THE SAVED EDITORIAL GUIDANCE'));
 const label=request.sign[0].toUpperCase()+request.sign.slice(1);
 assert.deepEqual(request.text.format.schema.properties.headline.enum,[`${label} & ${label} Rising`]);
 assert.equal(row.sections.horoscopeEdition.passages.find((p:any)=>p.sign===request.sign).headline,`${label} & ${label} Rising`);
 const developmentSection=request.input.match(/PERIOD DEVELOPMENTS — EACH FACT WITH ITS OWN MEANING AND LIFE AREA\n([^\n]+)\n\n/);
 assert(developmentSection,'Inspect the actual provider boundary, not only the plan object');
 const developments=JSON.parse(developmentSection[1]);
 assert.deepEqual(developments,plan.payload.plan.readings.find((e:any)=>e.sign===request.sign).developments);
 assert(developments.events.every((d:any)=>d.meaning.role.includes('not owner voice')));

 assert(request.input.includes(horoscopeEditorialPrompt(writingProfile.profile)),'Every sign must receive the complete saved weekly guidance, including sign specificity and flexible interpretation');
 const section=request.input.match(/COMPLETE OWNER HOROSCOPES — PRIMARY PROSE EXAMPLES\n([^\n]+)\n\n/);
 assert(section,'The actual provider prompt must contain the primary horoscope examples');
 const passages=JSON.parse(section[1]);assert.equal(passages.length,3);
 for(const passage of passages){
  const source=forecastSources.get(passage.id);
  assert.equal(passage.text,source.text,'Preserve the complete original sign reading');
  assert.equal(passage.sourceRecordSha256,createHash('sha256').update(source.text).digest('hex'));
  assert.equal(source.ownerAuthored,true);assert.equal(source.ownerApproved,true);
 }
 assert(request.input.indexOf(section[0])<request.input.indexOf('CONTENT STUDIO WRITING INSTRUCTIONS'));
 assert.deepEqual(row.source_snapshot.horoscopeGeneration.readings[request.sign].sourceIds.slice(0,3),passages.map((e:any)=>e.id));
 assert.equal(row.source_snapshot.horoscopeGeneration.readings[request.sign].version,'horoscope-writer/v20-weekly-evidence');
}
// The lunation is distinct from the Monday snapshot Moon. Houses must bind to
// the named subject, rather than matching the Sun's house or any available house.
const factIssues=(body:string,b=brief)=>validateHoroscopeReading({sign:'aries',headline:'Fixture',body},b).violations.filter((v:any)=>v.category==='horoscope_fact_boundary');
assert.deepEqual(factIssues('You can notice the Full Moon in Aries in your first house. The Sun enters Libra in your seventh house.'),[]);
assert(factIssues('You can notice the Full Moon in Taurus in your second house.').length);
assert(factIssues('You can notice the New Moon in Aries in your first house.').length);
assert(factIssues('You can notice the Full Moon in Aries in your seventh house.').length);
assert(factIssues('You can notice the Sun entering Libra in your first house.').length);
assert(factIssues('You can notice the Sun entering Libra in your seventh house.',changedBrief.facts.horoscopeBrief.brief).length);
const outOfWindow={...brief,events:brief.events.map((e:any)=>({...e,startsAt:brief.window.endsAt}))};
assert(factIssues('You can notice the Full Moon in Aries in your first house.',outOfWindow).length);
assert(factIssues('You can notice the Full Moon in Aries square Saturn.').length,'Unsupported exact aspects remain blocked');
const protectedReceipt=structuredClone(row.source_snapshot.horoscopeGeneration);
result=await store.invoke('PATCH',{id:row.id,expectedUpdatedAt:row.updated_at,sourceSnapshot:{...row.source_snapshot,horoscopeGeneration:null}});
assert.equal(result.status,200,JSON.stringify(result.payload));row=result.payload.rows[0];assert.deepEqual(row.source_snapshot.horoscopeGeneration,protectedReceipt);
const invalid={...row.sections.horoscopeEdition.passages[0],body:'You were born with the Sun in Aries. Your seventh house is activated.'};
assert.equal(validateHoroscopeReading(invalid,brief).passed,false);
// Seed an obsolete receipt exactly as a pre-v2 saved generation would have it.
// The actual publication handler reruns facts but must not drop other checks.
const legacyRow=structuredClone(row);
const currentPassage=legacyRow.sections.horoscopeEdition.passages[0];
const oldCheck=legacyRow.source_snapshot.horoscopeGeneration.readings.aries;
oldCheck.bodyHash=createHash('sha256').update(horoscopeCanonicalJson({headline:currentPassage.headline,body:currentPassage.body})).digest('hex');
delete oldCheck.lint.version;
oldCheck.lint.violations=[{category:'owner_correction',detail:'Synthetic private correction still applies.'}];
store.rows.set(row.id,legacyRow);
assert.equal((await store.invoke('PATCH',{id:row.id,expectedUpdatedAt:row.updated_at,status:'LIVE'})).status,422,'Private correction findings cannot be discarded with obsolete fact checks');
oldCheck.lint.violations=[{category:'horoscope_fact_boundary',detail:'Synthetic obsolete snapshot-Moon warning.'}];
store.rows.set(row.id,legacyRow);
const live=await store.invoke('PATCH',{id:row.id,expectedUpdatedAt:row.updated_at,status:'LIVE'});
assert.equal(live.status,200,JSON.stringify(live.payload));row=live.payload.rows[0];
assert.deepEqual(row.source_snapshot.horoscopeGeneration.readings.aries.lint.violations,oldCheck.lint.violations,'Publication preserves the historical receipt');
assert(horoscopeEditionAt([row],'weekly','2026-09-24T16:00:00Z','Asia/Tokyo'));
assert.equal(horoscopeEditionAt([row],'weekly','2026-09-24T16:00:00Z','America/New_York'),null);
// Lost provider confirmation is isolated to one sign, never automatically replayed.
result=await store.invoke('PATCH',{id:row.id,expectedUpdatedAt:row.updated_at,status:'DRAFT'});assert.equal(result.status,200);row=result.payload.rows[0];
edition=structuredClone(row.sections.horoscopeEdition);
edition.passages[0]={sign:'aries',headline:'',body:''};edition.passages[1]={sign:'taurus',headline:'',body:''};
result=await store.invoke('PATCH',{id:row.id,expectedUpdatedAt:row.updated_at,sections:{horoscopeEdition:edition},body:horoscopeEditionBody(edition)});assert.equal(result.status,200);row=result.payload.rows[0];
const beforeReservation=structuredClone(row),fixtureFetch=globalThis.fetch;
let reservations=0;
globalThis.fetch=async(input:any,options:any={})=>{
 if(options.method==='PATCH'&&String(input).startsWith('https://calendar-api.invalid/')){
  const patch=JSON.parse(options.body),active=patch.source_snapshot?.horoscopeGeneration?.active;
  if(active){assert(active.requestHash,'A reservation must already contain the completed request identity');reservations++;}
 }
 return fixtureFetch(input,options);
};
writerFixture.unknownNext=true;result=await action('generate',{sign:'aries',approvedPlanHash:planHash});assert.equal(result.status,200,JSON.stringify(result.payload));
row=result.payload.rows[0];assert.equal(reservations,1);globalThis.fetch=fixtureFetch;
assert.equal(row.source_snapshot.horoscopeGeneration.active,null);
const held=row.source_snapshot.horoscopeGeneration.heldRequests.aries;
assert(held.requestHash);assert.equal(held.responseId,null);assert.equal(held.startupDiagnostic.stage,'dispatch');
assert.equal(held.startupDiagnostic.code,'unexpected_error');assert(!JSON.stringify(held.startupDiagnostic).includes('Fixture connection lost'),'Private error text is not exposed');
const callsAfterUnknown=writerFixture.calls;
assert.equal((await action('generate',{sign:'aries',approvedPlanHash:planHash})).status,409);
assert.equal((await action('poll')).status,200);assert.equal(writerFixture.calls,callsAfterUnknown);
assert.equal((await action('reject',{sign:'all'})).status,409);
// The other sign completes while the unresolved request and earlier writing stay intact.
result=await action('generate',{sign:'taurus',approvedPlanHash:planHash});assert.equal(result.status,202);row=result.payload.rows[0];
result=await action('poll');assert.equal(result.status,200);row=result.payload.rows[0];
assert.deepEqual(row.source_snapshot.horoscopeGeneration.heldRequests.aries,held);
assert.deepEqual(row.sections.horoscopeEdition.passages.slice(2),beforeReservation.sections.horoscopeEdition.passages.slice(2));
assert.equal((await action('release',{sign:'aries'})).status,409);
result=await action('release',{sign:'aries',acknowledgeUnknownOutcome:true});assert.equal(result.status,200);row=result.payload.rows[0];
assert.equal(row.source_snapshot.horoscopeGeneration.heldRequests.aries,undefined);
assert.equal(row.source_snapshot.horoscopeGeneration.lastInterrupted.id,held.id);
assert.equal(writerFixture.calls,callsAfterUnknown+1,'Release never calls the provider');

// A failed reservation cannot leave a half-prepared operation or call the provider.
const beforeFailedReservation=structuredClone(row),callsBeforeReservation=writerFixture.calls;
globalThis.fetch=async(input:any,options:any={})=>{
 if(options.method==='PATCH'&&String(input).startsWith('https://calendar-api.invalid/'))return Response.json({message:'Fixture storage unavailable'},{status:503});
 return fixtureFetch(input,options);
};
result=await action('generate',{sign:'aries',approvedPlanHash:planHash});assert.equal(result.status,502);globalThis.fetch=fixtureFetch;
assert.deepEqual(store.rows.get(row.id),beforeFailedReservation);assert.equal(writerFixture.calls,callsBeforeReservation);

// Legacy pre-dispatch reservations recover without a paid retry or manual release.
row.source_snapshot.horoscopeGeneration.active={id:'legacy-pre-dispatch',sign:'aries',state:'starting',startedAt:new Date().toISOString(),responseId:null};
store.rows.set(row.id,structuredClone(row));
result=await action('poll');assert.equal(result.status,202);assert.equal(writerFixture.calls,callsBeforeReservation);
row=store.rows.get(row.id);row.source_snapshot.horoscopeGeneration.active.startedAt=new Date(Date.now()-311000).toISOString();store.rows.set(row.id,structuredClone(row));
const staleVersion=row.updated_at;
result=await action('poll');assert.equal(result.status,200);row=result.payload.rows[0];assert.equal(result.payload.recovery,'not_dispatched');
assert.equal(row.source_snapshot.horoscopeGeneration.active,null);assert.equal(writerFixture.calls,callsBeforeReservation);
assert.equal((await invokeHoroscopeWriting({action:'generate',id:row.id,expectedUpdatedAt:staleVersion,sign:'aries',approvedPlanHash:planHash})).status,409,'The expired invocation is fenced from dispatch');
// A crashed process with a dispatch identity must remain held instead of replaying.
row.source_snapshot.horoscopeGeneration.active={...held,id:'crashed-dispatch',startedAt:new Date(Date.now()-311000).toISOString()};store.rows.set(row.id,structuredClone(row));
result=await action('poll');assert.equal(result.status,200);row=result.payload.rows[0];assert.equal(result.payload.recovery,'uncertain');
assert.equal(row.source_snapshot.horoscopeGeneration.heldRequests.aries.id,'crashed-dispatch');assert.equal(writerFixture.calls,callsBeforeReservation);
assert.equal((await action('generate',{sign:'aries',approvedPlanHash:planHash})).status,409);
result=await action('release',{sign:'aries',acknowledgeUnknownOutcome:true});assert.equal(result.status,200);row=result.payload.rows[0];

// If only the response-ID save fails, retry storage once and retrieve the same response.
let failedResponseSave=false;
globalThis.fetch=async(input:any,options:any={})=>{
 if(options.method==='PATCH'&&String(input).startsWith('https://calendar-api.invalid/')&&JSON.parse(options.body).source_snapshot?.horoscopeGeneration?.active?.responseId&&!failedResponseSave){failedResponseSave=true;return Response.json({},{status:503});}
 return fixtureFetch(input,options);
};
result=await action('generate',{sign:'aries',approvedPlanHash:planHash});assert.equal(result.status,202,JSON.stringify(result.payload));globalThis.fetch=fixtureFetch;
row=result.payload.rows[0];assert(row.source_snapshot.horoscopeGeneration.active.responseId);assert.equal(writerFixture.calls,callsBeforeReservation+1);
result=await action('poll');assert.equal(result.status,200);row=result.payload.rows[0];assert.equal(writerFixture.calls,callsBeforeReservation+1);
// A concurrent edit wins over a late response-ID save and its recovery attempt.
row.sections.horoscopeEdition.passages[0]={sign:'aries',headline:'',body:''};
row.body=horoscopeEditionBody(row.sections.horoscopeEdition);
store.rows.set(row.id,structuredClone(row));
let newerRow:any=null;
globalThis.fetch=async(input:any,options:any={})=>{
 if(!newerRow&&options.method==='PATCH'&&String(input).startsWith('https://calendar-api.invalid/')&&JSON.parse(options.body).source_snapshot?.horoscopeGeneration?.active?.responseId){
  newerRow=structuredClone(store.rows.get(row.id));newerRow.updated_at=new Date(Date.now()+60000).toISOString();
  newerRow.summary='Concurrent owner edit is preserved.';store.rows.set(row.id,newerRow);
 }
 return fixtureFetch(input,options);
};
const callsBeforeRace=writerFixture.calls;
result=await action('generate',{sign:'aries',approvedPlanHash:planHash});assert.equal(result.status,409);globalThis.fetch=fixtureFetch;
assert.deepEqual(store.rows.get(row.id),newerRow);assert.equal(writerFixture.calls,callsBeforeRace+1);
row=store.rows.get(row.id);
for(const [zone,start] of [['Pacific/Kiritimati','2026-09-23T10:00:00.000Z'],['Asia/Kathmandu','2026-09-23T18:15:00.000Z'],['Pacific/Honolulu','2026-09-24T10:00:00.000Z']]){
 const packet=await prepareHoroscopeBrief(new URL(`http://localhost/?period=daily&date=2026-09-24&timeZone=${zone}`));assert.equal(packet.brief.window.startsAt,start);
}
assert.equal(canonicalHoroscopeTimeZone('Asia/Kathmandu'),canonicalHoroscopeTimeZone('Asia/Katmandu'));
for(const period of ['daily','seasonal']){
 const packet=await prepareHoroscopeBrief(new URL(`http://localhost/?period=${period}&date=2026-09-24&timeZone=Asia/Tokyo`));
 const other=prepareHoroscopeWriting({sections:{horoscopeEdition:emptyHoroscopeEdition(packet.brief.window)},facts:{horoscopeBrief:packet},source_snapshot:{}});
 if(period==='seasonal') {
  assert(other.entries.every((entry:any)=>entry.contextOptions.primaryRegisterContentKeys.length===3&&entry.contextOptions.requirePrimaryRegister));
  for(const entry of other.entries) assert.deepEqual(entry.sourceIds.slice(0,3).sort(),['full-moon-in-taurus','gemini-season-2025','libra-season-autumn-equinox'].map(slug=>`owner-seasonal-argument:${slug}`).sort());
  assert(other.entries.every((entry:any)=>!entry.sourceIds.some((id:string)=>[...forecastSources.values()].some((source:any)=>source.sourceId===id))),'Seasonal primary evidence uses complete seasonal readings, not weekly forecasts');
 } else {
  for(const entry of other.entries) {
   assert(entry.contextOptions.requirePrimaryRegister);
   assert.equal(entry.sourceIds[0],voice.entries.find((e:any)=>e.surface==='weekly-astrology'&&e.structuralFunction==='paragraph under Horoscopes for the week of Aug 4th'&&e.text.split(/\r?\n/u)[0].toLowerCase()===entry.sign).sourceId,'Daily writing receives the complete matching owner sign forecast');
   assert.match(entry.argumentOutline.scope_guard,/publication window is not a transit duration/i);
  }
  const profile={...defaultHoroscopeProfile('daily'),sourceGuidance:defaultHoroscopeProfile('daily').sourceGuidance+' Fixture daily instructions remain editable.'};
  const saved=await store.invoke('POST',{profile,expectedUpdatedAt:null},'/api/admin/generated-content?writingProfiles=true');assert.equal(saved.status,200);
  const daily=emptyHoroscopeEdition(packet.brief.window);
  const created=await store.invoke('POST',{contentKey:horoscopeEditionKey(daily.window),surface:'sky',mode:'article',eventType:'horoscope-edition',provider:'manual-admin',status:'DRAFT',lane:'serving',headline:'Synthetic daily edition',body:horoscopeEditionBody(daily),sections:{horoscopeEdition:daily},facts:{horoscopeBrief:packet},sourceSnapshot:{studioWritingProfile:saved.payload.profile}});
  assert.equal(created.status,200,JSON.stringify(created.payload));let dailyRow=created.payload.rows[0];
  const planned=await invokeHoroscopeWriting({action:'prepare',id:dailyRow.id,expectedUpdatedAt:dailyRow.updated_at});assert.equal(planned.status,200);
  const generated=await invokeHoroscopeWriting({action:'generate',id:dailyRow.id,expectedUpdatedAt:dailyRow.updated_at,sign:'gemini',approvedPlanHash:planned.payload.plan.planHash});
  assert.equal(generated.status,202,JSON.stringify(generated.payload));dailyRow=generated.payload.rows[0];
  const request=writerFixture.requests.get(dailyRow.source_snapshot.horoscopeGeneration.active.responseId);
  assert(request,'Inspect the actual daily provider request');
  assert(request.input.includes(horoscopeEditorialPrompt(profile)),'The full saved daily profile reaches the writer');
  assert(request.input.includes('Write a brief, nontechnical daily reading'));
  assert(request.input.includes('omit numbered houses and technical explanations'));
  assert(request.input.includes('Mention a planet or sign only when it helps the reader'));
  assert(!request.input.includes(HOROSCOPE_CONNECTED_READING_GUIDANCE),'Daily must not also require an astrology explanation');
  assert(!request.input.includes('Name the actual calculated planet and sign'));
  assert(!request.input.includes('MONTHLY SPECIFICITY CONTRACT'));
  assert(!request.input.includes('SEASONAL ARGUMENT REVIEW'));
  assert(request.input.includes(HOROSCOPE_PUBLICATION_TIMING_GUIDANCE));
  assert(request.input.includes(HOROSCOPE_OWNER_EDIT_GUIDANCE));
  assert(request.input.includes('FINISH THE NEW DRAFT USING THE SAVED EDITORIAL GUIDANCE'));
  assert.match(request.input,/weekly passages as voice references for a new focused daily reading/);
  assert.match(request.input,/not the lifetime of every influence/);
  assert.doesNotMatch(request.input,/Timing language must stay within the declared local period/);
  const primary=JSON.parse(request.input.match(/COMPLETE OWNER HOROSCOPES — PRIMARY PROSE EXAMPLES\n([^\n]+)\n\n/)![1]);
  assert.equal(primary.length,3);assert.equal(primary[0].id,(forecastSources.get('gemini') as any).sourceId);
  for(const passage of primary){const source=forecastSources.get(passage.id);assert.equal(passage.text,source.text);assert.equal(passage.sourceRecordSha256,createHash('sha256').update(source.text).digest('hex'));assert.equal(source.ownerAuthored,true);}
  const polled=await invokeHoroscopeWriting({action:'poll',id:dailyRow.id,expectedUpdatedAt:dailyRow.updated_at});assert.equal(polled.status,200);
  assert.equal(polled.payload.rows[0].status,'DRAFT');assert.equal(polled.payload.rows[0].source_snapshot.horoscopeGeneration.readings.gemini.ownerApproved,false);
 }
}
const aliasPacket=await prepareHoroscopeBrief(new URL('http://localhost/?period=daily&date=2026-09-24&timeZone=Asia/Kathmandu'));
const aliasEdition=emptyHoroscopeEdition(aliasPacket.brief.window);aliasEdition.passages=aliasEdition.passages.map(p=>({...p,headline:'Synthetic alias fixture',body:'You can read this complete timezone fixture.'}));
result=await store.invoke('POST',{contentKey:horoscopeEditionKey(aliasEdition.window),surface:'sky',mode:'article',eventType:'horoscope-edition',provider:'manual-admin',status:'DRAFT',lane:'serving',headline:'Alias fixture',body:horoscopeEditionBody(aliasEdition),sections:{horoscopeEdition:aliasEdition},facts:{horoscopeBrief:aliasPacket}});assert.equal(result.status,200,JSON.stringify(result.payload));const aliasRow=result.payload.rows[0];
result=await store.invoke('PATCH',{id:aliasRow.id,expectedUpdatedAt:aliasRow.updated_at,status:'LIVE'});assert.equal(result.status,200,JSON.stringify(result.payload));
const {readerRouteResponse}=await import('../tests/helpers/content-reader-route.mjs');
for(const timeZone of ['Asia/Kathmandu','Asia/Katmandu']){
 const response=await readerRouteResponse('/api/content-reader',{method:'POST',body:JSON.stringify({horoscope:{period:'daily',at:'2026-09-24T06:00:00.000Z',timeZone}})});assert(response);const payload=await response.json();assert.equal(payload.rows[0]?.id,aliasRow.id);
 assert(horoscopeEditionAt(payload.rows,'daily','2026-09-24T06:00:00.000Z',timeZone));
}
// Seasonal terminal responses retain diagnostics and never save partial prose.
const seasonalPacket=await prepareHoroscopeBrief(new URL('http://localhost/?period=seasonal&date=2026-09-01&timeZone=America/New_York'));
assert.equal(seasonalPacket.brief.window.seasonSign,'virgo');
assert.equal(seasonalPacket.brief.referenceDate,'2026-09-01');
const seasonalEdition=emptyHoroscopeEdition(seasonalPacket.brief.window);
// Existing twelve-sign seasons remain editable and recoverable without adding an introduction.
seasonalEdition.passages=seasonalEdition.passages.filter(p=>p.sign!=='overview');
const seasonalProfile={...defaultHoroscopeProfile('seasonal'),voiceGuidance:defaultHoroscopeProfile('seasonal').voiceGuidance+'\nSynthetic saved seasonal guidance: retain this final sentence.'};
const seasonalProfileSaved=await store.invoke('POST',{profile:seasonalProfile,expectedUpdatedAt:null},'/api/admin/generated-content?writingProfiles=true');
assert.equal(seasonalProfileSaved.status,200);
const seasonalCreated=await store.invoke('POST',{contentKey:horoscopeEditionKey(seasonalEdition.window),surface:'sky',mode:'article',eventType:'horoscope-edition',provider:'manual-admin',status:'DRAFT',lane:'serving',headline:'Synthetic seasonal recovery',body:horoscopeEditionBody(seasonalEdition),sections:{horoscopeEdition:seasonalEdition},facts:{horoscopeBrief:seasonalPacket},sourceSnapshot:{studioWritingProfile:seasonalProfileSaved.payload.profile}});
assert.equal(seasonalCreated.status,200);let seasonalRow=seasonalCreated.payload.rows[0];
const seasonalAction=(action:string,extra:any={})=>invokeHoroscopeWriting({action,id:seasonalRow.id,expectedUpdatedAt:seasonalRow.updated_at,...extra});
const seasonalPlan=await seasonalAction('prepare');assert.equal(seasonalPlan.status,200);
const usage={input_tokens:100,output_tokens:12000,output_tokens_details:{reasoning_tokens:11990}};
const partial={type:'message',content:[{type:'output_text',text:'PRIVATE partial text must never become reader copy'}]};
const cases=[
 {payload:{status:'incomplete',incomplete_details:{reason:'max_output_tokens'},usage,output:[partial]},code:'output_limit'},
 {payload:{status:'failed',error:{code:'server_error',message:'PRIVATE provider error'}},code:'provider_failed'},
 {payload:{status:'cancelled'},code:'cancelled'},
 {payload:{status:'failed',error:{code:'credit_balance_exhausted',message:'PRIVATE provider billing details'}},code:'api_credits'},
 {payload:{status:'failed',error:{code:'invalid_api_key',message:'PRIVATE credential details'}},code:'api_credentials'},
 {payload:{status:'completed',output:[{type:'message',content:[{type:'refusal',refusal:'PRIVATE refusal'}]}]},code:'refused'},
 {payload:{status:'completed',output:[partial]},code:'invalid_seasonal_plan'},
 {payload:{status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({headline:'Fixture',body:' '})}]}]},code:'invalid_seasonal_plan'},
];
const pristineSeasonal=structuredClone(store.rows.get(seasonalRow.id));
let syntheticRunSequence=700;
function freshSeasonalFixture(){
 seasonalRow={...structuredClone(pristineSeasonal),id:`00000000-0000-4000-8000-${String(++syntheticRunSequence).padStart(12,'0')}`};
 store.rows.set(seasonalRow.id,seasonalRow);
}
for(const immediate of [false,true])for(const scenario of cases){
 freshSeasonalFixture();
 const calls=writerFixture.calls;
 let result:any;
 for(let iteration=0;iteration<7;iteration++){
  const active=seasonalRow.source_snapshot.horoscopeGeneration?.active;
  const action=active?(active.state==='ready'?'continue':'poll'):'generate';
  if(immediate&&action!=='poll')writerFixture.startResult=scenario.payload;
  if(!immediate&&action==='poll')writerFixture.nextResult=scenario.payload;
  result=await seasonalAction(action,action==='generate'?{sign:'aries',approvedPlanHash:seasonalPlan.payload.plan.planHash}:{});
  assert([202,422].includes(result.status),JSON.stringify(result.payload));seasonalRow=result.payload.rows[0];
  if(result.status===422)break;
 }
 assert.equal(result.status,422);
 const generation=seasonalRow.source_snapshot.horoscopeGeneration;
 const run=editorialFixtureRows.get(generation.editorialRuns.aries.id).state;
 assert.equal(generation.active,null);assert(['provider_failed','quality_exhausted'].includes(generation.lastError.code));
 const receipts=run.artifacts.filter((a:any)=>a.kind==='model_response');
 assert.equal(receipts.at(-1).value.payload.status,scenario.payload.status);
 if(scenario.code==='output_limit'){assert.equal(receipts[0].value.payload.incomplete_details.reason,'max_output_tokens');assert.equal(receipts[0].value.usage.output_tokens_details.reasoning_tokens,11990);}
 assert.doesNotMatch(JSON.stringify(generation),/PRIVATE (?:partial text|provider error|provider billing details|credential details|refusal)/);
 assert.deepEqual(seasonalRow.sections.horoscopeEdition,seasonalEdition);assert.equal(seasonalRow.status,'DRAFT');
 const before=structuredClone(store.rows.get(seasonalRow.id));
 const inspected=await seasonalAction('inspect',{sign:'aries'});assert.equal(inspected.status,200);
 assert.deepEqual(store.rows.get(seasonalRow.id),before,'Private inspection is read-only');
 assert.equal((await seasonalAction('generate',{sign:'aries',approvedPlanHash:seasonalPlan.payload.plan.planHash})).status,409,'A terminal run cannot silently reset its budget');
 assert.equal(writerFixture.calls-calls,scenario.payload.status==='completed'?3:1);
}
freshSeasonalFixture();
// All twelve actual seasonal provider inputs carry the three matching complete units.
const seasonalSources=loadSeasonalHoroscopeEvidence((file:string)=>fs.readFileSync(file,'utf8'));
const preferredEssays=loadSeasonalArgumentEvidence((file:string)=>fs.readFileSync(file,'utf8'));
const packaged=new Set(fs.globSync(JSON.parse(fs.readFileSync('vercel.json','utf8')).functions['api/admin/horoscope-writing.ts'].includeFiles));
for(const file of [SEASONAL_ARGUMENT_MANIFEST,...preferredEssays.map(p=>p.sourcePath)])assert(packaged.has(file),file);
const callsBefore=writerFixture.calls;
for(const sign of seasonalEdition.passages.map(p=>p.sign)){
 const generated=await seasonalAction('generate',{sign,approvedPlanHash:seasonalPlan.payload.plan.planHash});
 assert.equal(generated.status,202,JSON.stringify(generated.payload));seasonalRow=generated.payload.rows[0];
 while(seasonalRow.source_snapshot.horoscopeGeneration.active){
  const active=seasonalRow.source_snapshot.horoscopeGeneration.active;
  const result=await seasonalAction(active.state==='ready'?'continue':'poll');
  assert([200,202].includes(result.status),JSON.stringify(result.payload));seasonalRow=result.payload.rows[0];
 }
}
assert.equal(writerFixture.calls-callsBefore,72,'Six synthetic calls per sign: mechanism, plan, plan review, draft and two independent reviews');
assert.equal(seasonalRow.status,'DRAFT');
for(const reading of seasonalEdition.passages){
 const request:any=[...writerFixture.requests.values()].reverse().find((r:any)=>r.sign===reading.sign&&r.input.includes('COMPACT SEASONAL DEVELOPMENT PLAN')&&r.text.format.schema.required.includes('body'));
 assert(request,`Missing seasonal provider request for ${reading.sign}`);
 assertHoroscopeRequestEvidence(request.input);
 const facts=JSON.parse(request.input.split('GOVERNED SEASONAL FACTS\n')[1].split('\n\n')[0]);
 const meaning=facts.seasonalMeaning;
 assert.equal(meaning.seasonSign,'virgo');assert.equal(meaning.oppositeSign,'pisces');
 assert.equal(meaning.risingSign,reading.sign);assert.equal(meaning.sources.length,2);
 assert.deepEqual(meaning,seasonalPlan.payload.plan.readings.find((r:any)=>r.sign===reading.sign).seasonalMeaning);
 const privateRun=editorialFixtureRows.get(seasonalRow.source_snapshot.horoscopeGeneration.editorialRuns[reading.sign].id).state;
 const receipt=privateRun.artifacts.find((a:any)=>a.kind==='call_reserved'&&a.value.stage==='prose').value.request.contextReceipt;
 const passages=JSON.parse(request.input.split('SELECTED COMPLETE OWNER PASSAGES\n')[1].split('\n\n')[0]);
 assert(passages.length>=1,'Relevant complete units, without a quota');
 for(const passage of passages){
  assert.equal(passage.text,[...preferredEssays,...seasonalSources].find(p=>p.id===passage.id)?.text);
  assert.equal(passage.textSha256,createHash('sha256').update(passage.text).digest('hex'));
  assert.equal(request.input.split(JSON.stringify(passage.text).slice(1,-1)).length-1,1);
 }
 assert(request.input.includes('Write from a recognizable situation'));
 assert(request.input.includes('No em dashes'));
 assert(request.instructions.includes(HOROSCOPE_EDITORIAL_AUTHORITY));
 assert(!request.instructions.includes('SPINE QUALITY GATES'));
 assert(!request.instructions.includes('NEGATION-PIVOT CAP'));
 assert(!request.instructions.includes('at least two short imperatives'));
 assert(request.instructions.includes('factual-safety-v1'));
 assert(request.input.includes(horoscopeEditorialPrompt(seasonalProfile)));
 assert(!request.input.includes('FINISH THE NEW DRAFT USING THE SAVED EDITORIAL GUIDANCE'));
 assert(!request.input.includes('These complete owner weekly sign readings'));
 assert.equal(receipt.fullProfileSha256,seasonalProfileSaved.payload.profile.sha256);
 assert.equal(privateRun.ownerApproved,false);
 assert.equal(seasonalRow.sections.horoscopeEdition.passages.find((p:any)=>p.sign===reading.sign).body,'');
}
// Profile edits do not rewrite existing bodies or silently replace edition snapshots.
const bodiesBefore=structuredClone(seasonalRow.sections);
const updatedSeasonal=await store.invoke('POST',{profile:{...seasonalProfile,prompt:seasonalProfile.prompt+'\nSynthetic new revision.'},expectedUpdatedAt:seasonalProfileSaved.payload.profile.updatedAt},'/api/admin/generated-content?writingProfiles=true');
assert.equal(updatedSeasonal.status,200);
assert.deepEqual(store.rows.get(seasonalRow.id).sections,bodiesBefore);
assert.deepEqual(store.rows.get(seasonalRow.id).source_snapshot.studioWritingProfile,seasonalProfileSaved.payload.profile);
const oldPlan=prepareHoroscopeWriting(seasonalRow).planHash;
const refreshed=await store.invoke('PATCH',{id:seasonalRow.id,expectedUpdatedAt:seasonalRow.updated_at,sourceSnapshot:{...seasonalRow.source_snapshot,studioWritingProfile:updatedSeasonal.payload.profile}});
assert.equal(refreshed.status,200);seasonalRow=refreshed.payload.rows[0];
assert.deepEqual(seasonalRow.sections,bodiesBefore);
assert.notEqual(prepareHoroscopeWriting(seasonalRow).planHash,oldPlan);
assert.equal(prepareHoroscopeWriting(seasonalRow).sourceHash,seasonalPlan.payload.plan.sourceHash);
console.log('PASS horoscope generation: actual handlers, governed provider request, twelve persisted drafts, reload recovery, no duplicate calls, conflicts, explicit publication, fact checks and local date-line/fractional zones.');
