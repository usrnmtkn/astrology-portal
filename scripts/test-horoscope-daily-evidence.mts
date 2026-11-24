import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {store,installHoroscopeWriterFixture,invokeHoroscopeWriting,writerFixture} from '../tests/helpers/sky-article-save-api.mts';
import {installAlternativeHoroscopeProviders} from '../tests/helpers/horoscope-provider-fixture.mts';
import {emptyHoroscopeEdition,horoscopeEditionBody,horoscopeEditionKey} from '../apps/web/src/content/horoscopeEditions.mjs';
import {defaultHoroscopeProfile,HOROSCOPE_RUN_PROMPT_VARIABLES} from '../src/astro-writing/horoscopeWritingProfiles.mjs';
import {prepareHoroscopeWriting,writeHoroscopeSign,horoscopeWritingVersionFor} from '../src/astro-writing/horoscopeWriting.mjs';
import {dailyWriterSourceSelection} from '../src/astro-writing/dailyHoroscopeEvidence.mjs';
import {enableCompactVoiceInstructions} from '../src/astro-writing/compactVoiceInstructions.mjs';
import {assertHoroscopeRequestEvidence,resolveHoroscopeRequestPassage,horoscopeRequestSourcePassages,horoscopeRequestPassageMetadata} from './assert-horoscope-request-evidence.mjs';

installHoroscopeWriterFixture();
const alternatives=installAlternativeHoroscopeProviders();
const hash=(text:string)=>createHash('sha256').update(text).digest('hex');
const section=(input:string,label:string)=>JSON.parse(input.match(new RegExp(`${label}\\n([^\\n]+)\\n\\n`,'u'))![1]);
let previousProfile:any;
for(const optional of [false,true]){
 const profile={...defaultHoroscopeProfile('daily')};
 if(optional)profile.prompt+='\n\n'+HOROSCOPE_RUN_PROMPT_VARIABLES.map(name=>`${name}\n{{${name}}}`).join('\n\n');
 if(optional)profile.prompt=enableCompactVoiceInstructions(profile.prompt);
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
  const sources=horoscopeRequestSourcePassages(input);
  const sourceById=new Map(sources.map((p:any)=>[p.id,p]));
  assert.equal(sourceById.size,sources.length);
  for(const source of sources){assert.equal(source.sha256,hash(source.text));assert(input.includes(source.text),'The writer reads the exact prose with original paragraph breaks');}
  const prepared=prepareHoroscopeWriting(row),context=prepared.entries.find((e:any)=>e.sign==='aries').ownerContext;
  const selected=dailyWriterSourceSelection(context);
  assert.deepEqual(row.source_snapshot.horoscopeGeneration.active.reviewEvidence.ownerExamples,selected.sameFamilyExamples,'The existing prose check sees the same selected complete voice sources as the writer');
  assert.deepEqual(row.source_snapshot.horoscopeGeneration.active.reviewEvidence.writerSourceSelection,selected.writerSourceSelection,'Review preserves the original omission audit');
  assert(selected.sameFamilyExamples.every((p:any)=>!['article paragraph','published article opening excerpt','published article body excerpt'].includes(p.structuralFunction)),'Topical article fragments cannot become Daily voice demonstrations');
  for(const label of ['primaryRegisterPassages','sameFamilyExamples','relevantOwnerPassages','registerGoldExamples']){
   for(const passage of selected[label])assert(sources.some((p:any)=>p.text===passage.text),'Every selected complete original source survives transport');
  }
  assert.equal(new Set(selected.primaryRegisterPassages.map((p:any)=>p.sourceArticleSha256)).size,selected.primaryRegisterPassages.length,'Automatic primary examples cannot repeat one source article');
  assert(selected.writerSourceSelection.omitted.length>0,'This governed fixture exercises same-article overconcentration');
  for(const omitted of selected.writerSourceSelection.omitted){
   const original=context.sameFamilyExamples.find((p:any)=>p.id===omitted.id);assert(original);assert.equal(hash(original.text),omitted.sha256);
   assert(!sources.some((p:any)=>p.text===original.text),'Redundant historical voice units stay whole in preparation, outside the writer');
  }
  const sourceRoles=section(input,'SOURCE AUTHORITY AND ROLES');
  const meanings=sourceRoles.filter((entry:any)=>entry.role==='meaning');
  const currentDevelopment=prepared.entries.find((entry:any)=>entry.sign==='aries').developments;
  const dated=section(input,'PERIOD DEVELOPMENTS — EACH FACT WITH ITS OWN MEANING AND LIFE AREA');
  const ongoing=section(input,'OPTIONAL ONGOING CONDITIONS — NOT EVENT COVERAGE');
  assert(!Object.hasOwn(dated,'background'),'Ongoing placements cannot appear as dated-development assignments');
  assert.deepEqual(ongoing.background,currentDevelopment.background.filter((entry:any)=>entry.planet!=='moon'),'Every complete public background binding and meaning remains available');
  assert(meanings.length>0);
  for(const meaning of meanings){
   const hasEvent=meaning.currentBindings.some((binding:any)=>currentDevelopment.events.some((event:any)=>event.id===binding.developmentId));
   assert.equal(meaning.coverage,hasEvent?'day-event-meaning':'optional-ongoing-context');
   assert.equal(meaning.sourceKind,'reviewed-doctrine');assert.equal(meaning.eligibleForWriterRegister,false);
   assert(meaning.currentBindings.length>0);
   for(const binding of meaning.currentBindings){
    const development=prepared.entries.find((entry:any)=>entry.sign==='aries').developments;
    const source=[...development.events,...development.background].find((entry:any)=>entry.id===binding.developmentId);
    assert(source);assert((source.placements??[source]).some((entry:any)=>entry.planet===binding.planet&&entry.sign===binding.sign&&entry.house===binding.house&&entry.meaning.sourceId===meaning.sourceId&&entry.meaning.temporaryMeaning===sourceById.get(meaning.completePassageRef).text));
    assert(!(binding.planet==='moon'&&(source.type==='reference-position'||source.type==='ingress')),'Ordinary Moon meanings stay optional rather than becoming the shared Daily subject');
   }
  }
  const receipt=row.source_snapshot.horoscopeGeneration.active.reviewEvidence.writerMeaningSelection;
  assert.equal(receipt.version,'daily-current-meaning/v2');assert.equal(receipt.currentMeanings.length,meanings.length);
  for(const entry of context.sharedEvidencePacket.roles.meaning)assert(receipt.originalAnchorMeanings.some((source:any)=>source.id===entry.id&&source.sha256===hash(entry.text)),'Original full anchor meanings stay in retrieval and hash audit');
  assert(!sourceRoles.some((e:any)=>['scene','phrase','argument'].includes(e.role)));
  assert(!input.includes('SHARED FIVE-ROLE EVIDENCE\n'),'Private evidence diagnostics are not a second prose brief');
  assert(!input.includes('authored/compat-deep/'),'Daily cannot inherit natal compatibility scenarios through the shared scene catalogue');
  const voiceTexts=new Set(context.sameFamilyExamples.concat(context.registerGoldExamples).map((p:any)=>p.text));
  for(const p of context.sceneExamples.concat(context.phraseExamples))if(!voiceTexts.has(p.text))assert(!sources.some((s:any)=>s.text===p.text),'Legacy scene and phrase bodies stay out of the prose request');
  const primary=section(input,optional?'primaryOwnerVoiceSources':'RETRIEVED HISTORICAL OWNER READINGS — VOICE SUPPORT');
  assert.deepEqual(primary.map((p:any)=>({...horoscopeRequestPassageMetadata(input,p),text:resolveHoroscopeRequestPassage(input,p),completePassageRef:undefined})),
    selected.primaryRegisterPassages.map((p:any)=>({...p,completePassageRef:undefined})),'Selected primary ordering, complete text, source identities, hashes and authority remain intact');
  const instructions=choice==='current'?native.instructions:choice==='claude'?native.system:native.system_instruction;
  assert.equal(instructions.split(profile.voiceGuidance).length-1,1,'Every actual provider receives complete saved Voice in its native instruction field without opt-in');
  assert(!input.includes(profile.voiceGuidance));
  for(const source of sources)assert(!instructions.includes(source.text),'Complete retrieved sources remain user data');
  assert(input.includes(profile.structure));
  assert.deepEqual(row.source_snapshot.studioWritingProfile,previousProfile);
  assert.deepEqual(row.sections,original.sections,'Dispatch cannot edit saved reader prose');
  assert.equal(row.status,'DRAFT');assert.equal(row.source_snapshot.horoscopeGeneration.active.receipt.ownerApproved,false);
  const componentMeanings=section(input,'DAILY PLANET AND SIGN DEFINITIONS — MEANING ONLY');
  const sourceDefinitions=prepared.sources.filter((s:any)=>/primitives\/(?:planets|signs)[.]json$/u.test(s.path));
  assert.equal(sourceDefinitions.length,2,'Both existing KB definition files are pinned in the plan source hash');
  for(const definition of componentMeanings.records){
   assert(context&&prepared.entries[0].developments.events.concat(prepared.entries[0].developments.background).some((d:any)=>(d.placements??[d]).some((p:any)=>p.planet===definition.planet&&p.sign===definition.sign)));
   assert(definition.signDefinition.sourceRecordSha256);assert.equal(definition.signDefinition.sourceId,definition.sign);
   assert(!Object.hasOwn(definition,'house'),'The sign definition cannot supply a house');
  }
  assert.equal(row.source_snapshot.horoscopeGeneration.active.receipt.version,'horoscope-writer/v59-source-led-voice-review');
 }
}
// Exercise all audiences with the actual governed corpus, without changing
// retrieval or requiring twelve paid calls. Stop before the injected provider.
const facts=await store.invoke('GET',undefined,'/api/admin/generated-content?horoscopeBrief=true&period=daily&date=2026-10-21&timeZone=Asia%2FTokyo');
const edition=emptyHoroscopeEdition(facts.payload.brief.window);
const prepared=prepareHoroscopeWriting({sections:{horoscopeEdition:edition},facts:{horoscopeBrief:facts.payload},source_snapshot:{studioWritingProfile:previousProfile}});
const before=structuredClone(prepared.entries.map((e:any)=>e.ownerContext));
for(const entry of prepared.entries){
 const query=entry.contextOptions.retrievalQuery;
 assert.equal(query.surface,'daily');assert.equal(query.audienceSign,entry.sign);
 assert(query.bindings.every((binding:any)=>entry.developments.events.concat(entry.developments.background).some((development:any)=>(development.placements??[development]).some((source:any)=>source.planet===binding.planet&&source.sign===binding.sign&&source.house===binding.house&&source.domain===binding.domain))));
 assert.equal(entry.ownerContext.relevantOwnerPassages.length,0,'No shared Moon-sign article quota competes with current life-area relevance');
 assert(entry.ownerContext.primaryRegisterPassages.every((passage:any)=>passage.structuralFunction==='complete weekly sign reading'),'Daily adapts complete governed readings, preserving their full reasoning and ending');
}
for(const sign of edition.passages.map((p:any)=>p.sign)){
 const stop=new Error('Unbilled capture');let request:any;
 await assert.rejects(writeHoroscopeSign(prepared,sign,{approvedPlanHash:prepared.planHash,approvalReference:'fixture:daily-complete-evidence',writerClient:async(value:any)=>{request=value;throw stop;}}),error=>error===stop);
 assertHoroscopeRequestEvidence(request.input,['primaryOwnerVoiceSources','supportingOwnerVoiceSources']);
}
assert.deepEqual(prepared.entries.map((e:any)=>e.ownerContext),before,'Daily serialization never mutates selected evidence or audit receipts');
assert.equal(horoscopeWritingVersionFor('weekly'),'horoscope-writer/v49-source-led-voice-review');
assert.equal(horoscopeWritingVersionFor('monthly'),'horoscope-writer/v24-monthly-evidence-refs');
assert.equal(horoscopeWritingVersionFor('seasonal'),'horoscope-writer/v23-seasonal-evidence-refs');
console.log('PASS Daily evidence: actual handler, all three intercepted providers, both profile-variable modes, all twelve audiences, complete source/hash/metadata preservation, resolvable references, authorization and unchanged saved prose. Zero paid calls.');
