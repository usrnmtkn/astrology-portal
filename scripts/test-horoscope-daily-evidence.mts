import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {store,installHoroscopeWriterFixture,invokeHoroscopeWriting,writerFixture} from '../tests/helpers/sky-article-save-api.mts';
import {installAlternativeHoroscopeProviders} from '../tests/helpers/horoscope-provider-fixture.mts';
import {emptyHoroscopeEdition,horoscopeEditionBody,horoscopeEditionKey} from '../apps/web/src/content/horoscopeEditions.mjs';
import {defaultHoroscopeProfile,HOROSCOPE_RUN_PROMPT_VARIABLES} from '../src/astro-writing/horoscopeWritingProfiles.mjs';
import {prepareHoroscopeWriting,writeHoroscopeSign,horoscopeWritingVersionFor} from '../src/astro-writing/horoscopeWriting.mjs';
import {assertHoroscopeRequestEvidence,resolveHoroscopeRequestPassage} from './assert-horoscope-request-evidence.mjs';

installHoroscopeWriterFixture();
const alternatives=installAlternativeHoroscopeProviders();
const hash=(text:string)=>createHash('sha256').update(text).digest('hex');
const section=(input:string,label:string)=>JSON.parse(input.match(new RegExp(`${label}\\n([^\\n]+)\\n\\n`,'u'))![1]);
let previousProfile:any;
for(const optional of [false,true]){
 const profile={...defaultHoroscopeProfile('daily')};
 if(optional)profile.prompt+='\n\n'+HOROSCOPE_RUN_PROMPT_VARIABLES.map(name=>`${name}\n{{${name}}}`).join('\n\n');
 const saved=await store.invoke('POST',{profile,expectedUpdatedAt:previousProfile?.updatedAt??null},'/api/admin/generated-content?writingProfiles=true');
 assert.equal(saved.status,200);previousProfile=saved.payload.profile;
 for(const [index,choice] of ['current','claude','gemini'].entries()){
  const date=`2026-10-${10+index+(optional?3:0)}`;
  const packet=await store.invoke('GET',undefined,`/api/admin/generated-content?horoscopeBrief=true&period=daily&date=${date}&timeZone=America%2FNew_York`);
  assert.equal(packet.status,200);const {brief,signature}=packet.payload,edition=emptyHoroscopeEdition(brief.window);
  const created=await store.invoke('POST',{contentKey:horoscopeEditionKey(edition.window),surface:'sky',mode:'article',eventType:'horoscope-edition',provider:'manual-admin',status:'DRAFT',lane:'serving',headline:'Synthetic Daily evidence fixture',body:horoscopeEditionBody(edition),sections:{horoscopeEdition:edition},facts:{horoscopeBrief:{brief,signature}},sourceSnapshot:{studioWritingProfile:previousProfile}});
  assert.equal(created.status,200);let row=created.payload.rows[0];
  const original=structuredClone(row),calls=writerFixture.calls;
  const action=(action:string,extra:any={})=>invokeHoroscopeWriting({action,id:row.id,expectedUpdatedAt:row.updated_at,...extra});
  const plan=await action('prepare',{writerChoice:choice});assert.equal(plan.status,200);row=plan.payload.rows[0];
  assert.equal((await invokeHoroscopeWriting({action:'generate',id:row.id,expectedUpdatedAt:row.updated_at,sign:'aries',approvedPlanHash:plan.payload.plan.planHash},'wrong-secret')).status,401);
  assert.equal(writerFixture.calls,calls);
  const started=await action('generate',{sign:'aries',approvedPlanHash:plan.payload.plan.planHash});assert.equal(started.status,202);row=started.payload.rows[0];
  await new Promise(resolve=>setTimeout(resolve,25));
  const native=choice==='current'?[...writerFixture.requests.values()].at(-1):alternatives.requests.at(-1)!.request;
  const input=choice==='claude'?native.messages[0].content:native.input;
  assertHoroscopeRequestEvidence(input,optional?['primaryOwnerVoiceSources','supportingOwnerVoiceSources']:[]);
  const sources=section(input,'DAILY COMPLETE SOURCE PASSAGES');
  const sourceById=new Map(sources.map((p:any)=>[p.id,p]));
  assert.equal(sourceById.size,sources.length);
  for(const source of sources)assert.equal(source.sha256,hash(source.text));
  const prepared=prepareHoroscopeWriting(row),context=prepared.entries.find((e:any)=>e.sign==='aries').ownerContext;
  for(const label of ['primaryRegisterPassages','sameFamilyExamples','relevantOwnerPassages','registerGoldExamples','phraseExamples']){
   for(const passage of context[label])assert(sources.some((p:any)=>p.text===passage.text),'Every selected complete original source survives transport');
  }
  const primary=section(input,optional?'primaryOwnerVoiceSources':'COMPLETE OWNER HOROSCOPES — PRIMARY PROSE EXAMPLES');
  assert.deepEqual(primary.map((p:any)=>({...p,text:resolveHoroscopeRequestPassage(input,p),completePassageRef:undefined})),
    context.primaryRegisterPassages.map((p:any)=>({...p,completePassageRef:undefined})),'Primary ordering, complete text, source identities, hashes and authority remain intact');
  assert(input.includes(profile.voiceGuidance));assert(input.includes(profile.structure));
  assert.deepEqual(row.source_snapshot.studioWritingProfile,previousProfile);
  assert.deepEqual(row.sections,original.sections,'Dispatch cannot edit saved reader prose');
  assert.equal(row.status,'DRAFT');assert.equal(row.source_snapshot.horoscopeGeneration.active.receipt.ownerApproved,false);
  assert.equal(row.source_snapshot.horoscopeGeneration.active.receipt.version,'horoscope-writer/v22-daily-evidence-refs');
 }
}
// Exercise all audiences with the actual governed corpus, without changing
// selection or requiring twelve paid calls. Stop before the injected provider.
const facts=await store.invoke('GET',undefined,'/api/admin/generated-content?horoscopeBrief=true&period=daily&date=2026-10-21&timeZone=Asia%2FTokyo');
const edition=emptyHoroscopeEdition(facts.payload.brief.window);
const prepared=prepareHoroscopeWriting({sections:{horoscopeEdition:edition},facts:{horoscopeBrief:facts.payload},source_snapshot:{studioWritingProfile:previousProfile}});
const before=structuredClone(prepared.entries.map((e:any)=>e.ownerContext));
for(const sign of edition.passages.map((p:any)=>p.sign)){
 const stop=new Error('Unbilled capture');let request:any;
 await assert.rejects(writeHoroscopeSign(prepared,sign,{approvedPlanHash:prepared.planHash,approvalReference:'fixture:daily-complete-evidence',writerClient:async(value:any)=>{request=value;throw stop;}}),error=>error===stop);
 assertHoroscopeRequestEvidence(request.input,['primaryOwnerVoiceSources','supportingOwnerVoiceSources']);
}
assert.deepEqual(prepared.entries.map((e:any)=>e.ownerContext),before,'Daily serialization never mutates selected evidence or audit receipts');
assert.equal(horoscopeWritingVersionFor('weekly'),'horoscope-writer/v25-weekly-evidence-refs');
assert.equal(horoscopeWritingVersionFor('monthly'),'horoscope-writer/v24-monthly-evidence-refs');
assert.equal(horoscopeWritingVersionFor('seasonal'),'horoscope-writer/v23-seasonal-evidence-refs');
console.log('PASS Daily evidence: actual handler, all three intercepted providers, both profile-variable modes, all twelve audiences, complete source/hash/metadata preservation, resolvable references, authorization and unchanged saved prose. Zero paid calls.');
