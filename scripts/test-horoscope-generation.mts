import {assertHoroscopeRequestEvidence} from './assert-horoscope-request-evidence.mjs';
import {loadSeasonalArgumentEvidence,SEASONAL_ARGUMENT_MANIFEST} from '../src/astro-writing/seasonalArgumentEvidence.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {store,installHoroscopeWriterFixture,invokeHoroscopeWriting,writerFixture} from '../tests/helpers/sky-article-save-api.mts';
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
const forecastSources=new Map(edition.passages.map((p:any)=>[p.sign,voice.entries.find((e:any)=>e.surface==='weekly-astrology'&&e.structuralFunction==='paragraph under Horoscopes for the week of Aug 4th'&&e.text.split(/\r?\n/u)[0].toLowerCase()===p.sign)]));
for(const reading of plan.payload.plan.readings){
 const source:any=forecastSources.get(reading.sign);assert(source,`Missing actual ${reading.sign} owner forecast`);
 assert.equal(reading.sourceIds[0],source.sourceId,'Lead with the complete matching sign forecast, not the article introduction');
 assert.equal(reading.sourceIds.length,6,'Retain topical evidence within the existing passage limit');
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
 assert.equal(passages[0].id,(forecastSources.get(request.sign) as any).sourceId);
 for(const passage of passages){
  const source=voice.entries.find((e:any)=>e.sourceId===passage.id);
  assert.equal(passage.text,source.text,'Preserve the complete original sign reading');
  assert.equal(passage.sourceRecordSha256,createHash('sha256').update(source.text).digest('hex'));
  assert.equal(source.ownerAuthored,true);assert.equal(source.ownerApproved,true);
 }
 assert(request.input.indexOf(section[0])<request.input.indexOf('CONTENT STUDIO WRITING INSTRUCTIONS'));
 assert.deepEqual(row.source_snapshot.horoscopeGeneration.readings[request.sign].sourceIds.slice(0,3),passages.map((e:any)=>e.id));
 assert.equal(row.source_snapshot.horoscopeGeneration.readings[request.sign].version,'horoscope-writer/v12');
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
// An unconfirmed POST retains its reservation and cannot silently bill twice.
result=await store.invoke('PATCH',{id:row.id,expectedUpdatedAt:row.updated_at,status:'DRAFT'});assert.equal(result.status,200);row=result.payload.rows[0];
edition=structuredClone(row.sections.horoscopeEdition);edition.passages[0]={sign:'aries',headline:'',body:''};
result=await store.invoke('PATCH',{id:row.id,expectedUpdatedAt:row.updated_at,sections:{horoscopeEdition:edition},body:horoscopeEditionBody(edition)});assert.equal(result.status,200);row=result.payload.rows[0];
writerFixture.unknownNext=true;result=await action('generate',{sign:'aries',approvedPlanHash:planHash});assert.equal(result.status,500);
row=store.rows.get(row.id);assert(row.source_snapshot.horoscopeGeneration.active.requestHash);assert.equal(row.source_snapshot.horoscopeGeneration.active.responseId,null);
const callsAfterUnknown=writerFixture.calls;
assert.equal((await action('generate',{sign:'aries',approvedPlanHash:planHash})).status,409);
assert.equal((await action('poll')).status,409);assert.equal(writerFixture.calls,callsAfterUnknown);
assert.equal((await action('release',{acknowledgeUnknownOutcome:true})).status,409);
row.source_snapshot.horoscopeGeneration.active.startedAt=new Date(Date.now()-311000).toISOString();store.rows.set(row.id,row);
assert.equal((await action('release')).status,409);
result=await action('release',{acknowledgeUnknownOutcome:true});assert.equal(result.status,200);row=result.payload.rows[0];assert.equal(row.source_snapshot.horoscopeGeneration.active,null);
assert(row.source_snapshot.horoscopeGeneration.lastInterrupted.requestHash);
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
   assert.equal(entry.sourceIds[0],(forecastSources.get(entry.sign) as any).sourceId,'Daily writing receives the complete matching owner sign forecast');
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
  assert(request.input.includes(HOROSCOPE_CONNECTED_READING_GUIDANCE));
  assert(request.input.includes(HOROSCOPE_PUBLICATION_TIMING_GUIDANCE));
  assert(request.input.includes(HOROSCOPE_OWNER_EDIT_GUIDANCE));
  assert(request.input.includes('FINISH THE NEW DRAFT USING THE SAVED EDITORIAL GUIDANCE'));
  assert.match(request.input,/weekly passages as voice references for a new focused daily reading/);
  assert.match(request.input,/not the lifetime of every influence/);
  assert.doesNotMatch(request.input,/Timing language must stay within the declared local period/);
  const primary=JSON.parse(request.input.match(/COMPLETE OWNER HOROSCOPES — PRIMARY PROSE EXAMPLES\n([^\n]+)\n\n/)![1]);
  assert.equal(primary.length,3);assert.equal(primary[0].id,(forecastSources.get('gemini') as any).sourceId);
  for(const passage of primary){const source=voice.entries.find((e:any)=>e.sourceId===passage.id);assert.equal(passage.text,source.text);assert.equal(passage.sourceRecordSha256,createHash('sha256').update(source.text).digest('hex'));assert.equal(source.ownerAuthored,true);}
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
 {payload:{status:'completed',output:[partial]},code:'invalid_reading'},
 {payload:{status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({headline:'Fixture',body:' '})}]}]},code:'invalid_reading'},
];
for(const immediate of [false,true])for(const scenario of cases){
 const calls=writerFixture.calls;
 if(immediate)writerFixture.startResult=scenario.payload;
 let failed=await seasonalAction('generate',{sign:'aries',approvedPlanHash:seasonalPlan.payload.plan.planHash});
 if(!immediate){assert.equal(failed.status,202);seasonalRow=failed.payload.rows[0];writerFixture.nextResult=scenario.payload;failed=await seasonalAction('poll');}
 assert.equal(failed.status,422,JSON.stringify(failed.payload));seasonalRow=failed.payload.rows[0];
 const generation=seasonalRow.source_snapshot.horoscopeGeneration;
 assert.equal(generation.active,null);assert.equal(generation.lastError.code,scenario.code);
 assert.equal(generation.lastError.operation.sign,'aries');assert(generation.lastError.operation.responseId);
 assert.equal(generation.lastError.diagnostic.status,scenario.payload.status);
 assert.equal(generation.lastError.diagnostic.outputCharacters,scenario.payload.output?.includes(partial)?partial.content[0].text.length:scenario.code==='invalid_reading'?JSON.stringify({headline:'Fixture',body:' '}).length:0);
 if(scenario.code==='output_limit'){assert.equal(generation.lastError.diagnostic.incompleteReason,'max_output_tokens');assert.equal(generation.lastError.diagnostic.usage.reasoningTokens,11990);}
 assert.doesNotMatch(JSON.stringify(generation.lastError),/PRIVATE/,'Do not store provider messages or partial prose in the failure receipt');
 assert.deepEqual(seasonalRow.sections.horoscopeEdition,seasonalEdition);
 assert.equal(seasonalRow.status,'DRAFT');
 if(!immediate){
  const before=structuredClone(store.rows.get(seasonalRow.id));writerFixture.nextResult=scenario.payload;
  const inspected=await seasonalAction('diagnose');assert.equal(inspected.status,200);assert.equal(inspected.payload.failure.code,scenario.code);
  assert.deepEqual(store.rows.get(seasonalRow.id),before,'Diagnosis is read-only and cannot change dates, prose, version or failure history');
  assert.equal((await invokeHoroscopeWriting({action:'diagnose',id:seasonalRow.id,expectedUpdatedAt:'stale'})).status,409);
 }
 assert.equal((await seasonalAction('poll')).status,200);assert.equal((await seasonalAction('prepare')).status,200);
 assert.equal(writerFixture.calls,calls+1,'Inspection and recovery never automatically restart failed provider calls');
}
const failures=structuredClone(seasonalRow.source_snapshot.horoscopeGeneration.failures);assert.equal(failures.length,16);
const retried=await seasonalAction('generate',{sign:'aries',approvedPlanHash:seasonalPlan.payload.plan.planHash});assert.equal(retried.status,202);seasonalRow=retried.payload.rows[0];
const recovered=await seasonalAction('poll');assert.equal(recovered.status,200);seasonalRow=recovered.payload.rows[0];
assert.deepEqual(seasonalRow.source_snapshot.horoscopeGeneration.failures,failures,'Successful retry preserves earlier failures');
assert.equal(seasonalRow.source_snapshot.horoscopeGeneration.lastError,null);
assert.equal(seasonalRow.sections.horoscopeEdition.passages.filter((p:any)=>p.body).length,1);
assert.equal(seasonalRow.status,'DRAFT');
// All twelve actual seasonal provider inputs carry the three matching complete units.
const seasonalSources=loadSeasonalHoroscopeEvidence((file:string)=>fs.readFileSync(file,'utf8'));
const preferredEssays=loadSeasonalArgumentEvidence((file:string)=>fs.readFileSync(file,'utf8'));
const packaged=new Set(fs.globSync(JSON.parse(fs.readFileSync('vercel.json','utf8')).functions['api/admin/horoscope-writing.ts'].includeFiles));
for(const file of [SEASONAL_ARGUMENT_MANIFEST,...preferredEssays.map(p=>p.sourcePath)])assert(packaged.has(file),file);
const callsBefore=writerFixture.calls;
for(const sign of seasonalEdition.passages.slice(1).map(p=>p.sign)){
 const generated=await seasonalAction('generate',{sign,approvedPlanHash:seasonalPlan.payload.plan.planHash});
 assert.equal(generated.status,202,JSON.stringify(generated.payload));seasonalRow=generated.payload.rows[0];
 const polled=await seasonalAction('poll');assert.equal(polled.status,200);seasonalRow=polled.payload.rows[0];
}
assert.equal(writerFixture.calls-callsBefore,11,'One call per missing sign, no judge or rewrite requests');
assert.equal(seasonalRow.status,'DRAFT');
for(const reading of seasonalEdition.passages){
 const request:any=[...writerFixture.requests.values()].reverse().find((r:any)=>r.sign===reading.sign&&r.input.includes('COMPLETE SEASONAL OWNER PROSE EVIDENCE'));
 assert(request,`Missing seasonal provider request for ${reading.sign}`);
 assertHoroscopeRequestEvidence(request.input);
 const meaning=JSON.parse(request.input.match(/ZODIAC SEASON AND LEARNING AXIS — INTERPRETIVE SOURCES\n([^\n]+)\n\n/)[1]);
 assert.equal(meaning.seasonSign,'virgo');assert.equal(meaning.oppositeSign,'pisces');
 assert.equal(meaning.risingSign,reading.sign);assert.equal(meaning.sources.length,2);
 assert.deepEqual(meaning,seasonalPlan.payload.plan.readings.find((r:any)=>r.sign===reading.sign).seasonalMeaning);
 assert.deepEqual(meaning,seasonalRow.source_snapshot.horoscopeGeneration.readings[reading.sign].seasonalMeaning);
 assert(!request.input.match(/CALCULATED FACTS\n([^\n]+)/)[1].includes('learning-axis'));
 assert(request.input.includes('include its supplied calendar date naturally on first mention'));
 assert(!request.input.includes('numeric dates belong in the separately rendered'));
 const passages=JSON.parse(request.input.match(/COMPLETE SEASONAL OWNER PROSE EVIDENCE\n([^\n]+)\n\n/)[1]);
 assert.equal(passages.length,6);
 assert.deepEqual(new Set(passages.slice(0,3).map((p:any)=>p.id)),new Set(preferredEssays.map(p=>p.id)));
 for(const passage of passages){
  const primary=passage.seasonalVoiceRole==='primary argument and voice';
  if(!primary)assert.equal(passage.horoscopeAudienceSign,reading.sign);
  assert.equal(passage.text,[...preferredEssays,...seasonalSources].find(p=>p.id===passage.id)?.text);
  assert.equal(passage.sourceRecordSha256,createHash('sha256').update(passage.text).digest('hex'));
  const serialized=JSON.stringify(passage.text).slice(1,-1);
  assert.equal(request.input.split(serialized).length-1,1,passage.id+' must reach the writer exactly once');
 }
 assert(request.input.includes('Write from inside a recognizable human experience.'));
 assert(request.input.includes('primary voice references'));
 assert(request.input.includes('Never use an em dash'));
 assert(request.instructions.includes(HOROSCOPE_EDITORIAL_AUTHORITY));
 assert(!request.instructions.includes('SPINE QUALITY GATES'));
 assert(!request.instructions.includes('NEGATION-PIVOT CAP'));
 assert(!request.instructions.includes('at least two short imperatives'));
 assert(request.instructions.includes('factual-safety-v1'));
 assert(request.input.includes(horoscopeEditorialPrompt(seasonalProfile)));
 assert(request.input.includes('FINISH THE NEW DRAFT USING THE SAVED EDITORIAL GUIDANCE'));
 assert(!request.input.includes('These complete owner weekly sign readings'));
 const receipt=seasonalRow.source_snapshot.horoscopeGeneration.readings[reading.sign];
 assert.deepEqual(receipt.sourceIds,passages.map((p:any)=>p.id));
 assert.equal(receipt.profileHash,createHash('sha256').update(horoscopeCanonicalJson(seasonalProfileSaved.payload.profile)).digest('hex'));
 assert.equal(receipt.ownerApproved,false);
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
