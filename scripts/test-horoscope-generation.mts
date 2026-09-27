import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {store,installHoroscopeWriterFixture,invokeHoroscopeWriting,writerFixture} from '../tests/helpers/sky-article-save-api.mts';
import {emptyHoroscopeEdition,horoscopeEditionBody,horoscopeEditionKey,horoscopeEditionAt,canonicalHoroscopeTimeZone} from '../apps/web/src/content/horoscopeEditions.mjs';
import {validateHoroscopeReading} from '../src/astro-writing/horoscopeValidation.mjs';
import {prepareHoroscopeBrief} from '../api/_lib/horoscope-editions';
import {prepareHoroscopeWriting} from '../src/astro-writing/horoscopeWriting.mjs';
import {retrieveOwnerContext} from '../src/astro-writing/retrieveOwnerContext.mjs';
import {defaultHoroscopeProfile,horoscopeEditorialPrompt} from '../src/astro-writing/horoscopeWritingProfiles.mjs';
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
 assert.equal(row.source_snapshot.horoscopeGeneration.readings[request.sign].version,'horoscope-writer/v2');
}
const protectedReceipt=structuredClone(row.source_snapshot.horoscopeGeneration);
result=await store.invoke('PATCH',{id:row.id,expectedUpdatedAt:row.updated_at,sourceSnapshot:{horoscopeGeneration:null}});
assert.equal(result.status,200,JSON.stringify(result.payload));row=result.payload.rows[0];assert.deepEqual(row.source_snapshot.horoscopeGeneration,protectedReceipt);
const invalid={...row.sections.horoscopeEdition.passages[0],body:'You were born with the Sun in Aries. Your seventh house is activated.'};
assert.equal(validateHoroscopeReading(invalid,brief).passed,false);
const live=await store.invoke('PATCH',{id:row.id,expectedUpdatedAt:row.updated_at,status:'LIVE'});assert.equal(live.status,200,JSON.stringify(live.payload));row=live.payload.rows[0];
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
 assert(other.entries.every((entry:any)=>entry.contextOptions.primaryRegisterContentKeys.length===0&&!entry.contextOptions.requirePrimaryRegister));
 assert(other.entries.every((entry:any)=>!entry.sourceIds.some((id:string)=>[...forecastSources.values()].some((source:any)=>source.sourceId===id))),'The weekly repair must not change daily or seasonal register selection');
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
console.log('PASS horoscope generation: actual handlers, governed provider request, twelve persisted drafts, reload recovery, no duplicate calls, conflicts, explicit publication, fact checks and local date-line/fractional zones.');
