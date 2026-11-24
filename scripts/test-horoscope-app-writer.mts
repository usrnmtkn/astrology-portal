import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {store,installHoroscopeWriterFixture,invokeHoroscopeWriting,explicitWritingFeedbackFixture} from '../tests/helpers/sky-article-save-api.mts';
import {installAlternativeHoroscopeProviders} from '../tests/helpers/horoscope-provider-fixture.mts';
import {decodeWeeklyHistoryRow} from '../api/_lib/horoscope-history-storage';
import {emptyHoroscopeEdition,horoscopeEditionBody,horoscopeEditionKey,HOROSCOPE_SIGNS} from '../apps/web/src/content/horoscopeEditions.mjs';
import {defaultHoroscopeProfile,HOROSCOPE_PROFILE_PREFIX,validateHoroscopeProfile} from '../src/astro-writing/horoscopeWritingProfiles.mjs';
import {prepareHoroscopeWriting,writeHoroscopeSign} from '../src/astro-writing/horoscopeWriting.mjs';
import {horoscopePreviousReadings} from '../src/astro-writing/horoscopePreviousReadings.mjs';
import {COMPACT_VOICE_COMPOSITION_CHECK} from '../src/astro-writing/compactVoiceInstructions.mjs';
import {usesWeeklyFromSamples,WEEKLY_FROM_SAMPLES_AUTHORITY} from '../src/astro-writing/weeklyFromSamples.mjs';
import {COMPACT_REFERENCE_LEARNING} from '../src/astro-writing/compactReferenceLearning.mjs';
import {selectExplicitWritingFeedback,hydrateExplicitWritingFeedback} from '../src/astro-writing/explicitWritingFeedback.mjs';
import {horoscopeWriterConfig} from '../src/astro-writing/horoscopeWriterModels.mjs';
import {HOROSCOPE_VOICE_REVIEW} from '../src/astro-writing/horoscopeVoiceStandard.mjs';

// The optional private fixture exercises the same handler with complete saved
// profiles. It is data only: no key loading, paid execution or alternate path.
const privateFixture=process.env.HOROSCOPE_APP_PROFILE_FIXTURE?JSON.parse(readFileSync(process.env.HOROSCOPE_APP_PROFILE_FIXTURE,'utf8')):null;
const hash=(text:string)=>createHash('sha256').update(text).digest('hex');
const synthetic=HOROSCOPE_SIGNS.map(sign=>`Complete synthetic ${sign} source opening.\n\nIts complete ${sign} ending. 🌙`).join('\n\n');
const fixtures=privateFixture?.profiles??['daily','weekly'].map(period=>({period,
  beforeProfile:{...defaultHoroscopeProfile(period),voiceGuidance:'Original editorial direction.\nRETAINED SAVED-GUIDE SOURCE EXAMPLES\nComplete archived original passage.\n\nIts exact original ending.',sourceGuidance:synthetic},
  profile:{...defaultHoroscopeProfile(period),voiceGuidance:`Current complete ${period} Voice, with exact punctuation and spacing.  `,sourceGuidance:synthetic},
  examples:HOROSCOPE_SIGNS.map(sign=>({text:`Complete synthetic ${sign} source opening.\n\nIts complete ${sign} ending. 🌙`}))}));
installHoroscopeWriterFixture();installAlternativeHoroscopeProviders();
if(privateFixture?.feedback){
  explicitWritingFeedbackFixture.rows=structuredClone(privateFixture.feedback);
  process.env.STUDIO_MEMORY_FEEDBACK_ENABLED='true';
}
for(const row of privateFixture?.untouchedRows??[])store.rows.set(row.id,structuredClone(row));
const endpoint='/api/admin/generated-content?writingProfiles=true';
for(const period of ['monthly','seasonal'])if(![...store.rows.values()].some(row=>row.content_key===HOROSCOPE_PROFILE_PREFIX+period)){
  assert.equal((await store.invoke('POST',{profile:defaultHoroscopeProfile(period),expectedUpdatedAt:null},endpoint)).status,200);
}
const untouched=[...store.rows.values()].filter(row=>['monthly','seasonal'].some(period=>row.content_key===HOROSCOPE_PROFILE_PREFIX+period)).map(row=>structuredClone(row));
const requests:any[]=[],artifacts:any[]=[];
const unsigned=(input:string)=>{
  const label='OWNER-APPROVED WRITING PLAN — SCOPE\n',start=input.lastIndexOf(label),end=input.indexOf('\n',start+label.length);
  assert(start>=0);const finish=end<0?input.length:end;
  const {approvedOutlineHash,...scope}=JSON.parse(input.slice(start+label.length,finish));
  return input.slice(0,start)+'WRITING PLAN FOR REVIEW — SCOPE\n'+JSON.stringify(scope)+input.slice(finish);
};
const intercepted=globalThis.fetch;
globalThis.fetch=async(input:any,options:any={})=>{
  const url=String(input);
  if(options.method==='POST'&&['https://api.openai.com/v1/responses','https://api.anthropic.com/v1/messages','https://generativelanguage.googleapis.com/v1beta/interactions'].includes(url)){
    const value=JSON.parse(options.body),choice=url.includes('anthropic')?'claude':url.includes('googleapis')?'gemini':'current';
    const schema=choice==='claude'?value.output_config.format.schema:choice==='gemini'?value.response_format.schema:value.text.format.schema;
    if(schema.properties?.body)requests.push({choice,native:value,instructions:choice==='claude'?value.system:choice==='gemini'?value.system_instruction:value.instructions,input:choice==='claude'?value.messages[0].content:value.input});
  }
  return intercepted(input,options);
};
let captures=0;
for(const fixture of fixtures){
  const {period}=fixture;
  if(fixture.beforeRow)store.rows.set(fixture.beforeRow.id,structuredClone(fixture.beforeRow));
  else assert.equal((await store.invoke('POST',{profile:fixture.beforeProfile,expectedUpdatedAt:null},endpoint)).status,200);
  const old=(await store.invoke('GET',undefined,endpoint)).payload.profiles.find((p:any)=>p.profile.period===period);
  const profile=validateHoroscopeProfile(fixture.profile);
  assert(!profile.prompt.includes('COMPACT VOICE INSTRUCTIONS V1'),'The normal saved guide has no test opt-in');
  const oldEditions:any[]=[];
  // Create editions before saving the repair, including the normal Daily
  // Claude choice. Prepare/Generate must carry the saved choice forward.
  for(const [i,choice] of ['claude','current','gemini'].entries()){
    const date=period==='daily'?`2026-10-${29-i}`:`2026-11-${16+7*i}`;
    const packet=await store.invoke('GET',undefined,`/api/admin/generated-content?horoscopeBrief=true&period=${period}&date=${date}&timeZone=America%2FNew_York`);
    assert.equal(packet.status,200);const edition=emptyHoroscopeEdition(packet.payload.brief.window);
    const preserved=edition.passages.at(-1);preserved.headline='Existing exact saved title';preserved.body='Complete exact saved reading.\n\nIts existing ending stays intact.';
    const created=await store.invoke('POST',{contentKey:horoscopeEditionKey(edition.window),surface:'sky',mode:'article',eventType:'horoscope-edition',provider:'manual-admin',status:'DRAFT',lane:'serving',headline:'Normal app writer fixture',body:horoscopeEditionBody(edition),sections:{horoscopeEdition:edition},facts:{horoscopeBrief:packet.payload},sourceSnapshot:{studioWritingProfile:old}});
    assert.equal(created.status,200);const row=created.payload.rows[0];
    const planned=await invokeHoroscopeWriting({action:'prepare',id:row.id,expectedUpdatedAt:row.updated_at,writerChoice:choice});
    assert.equal(planned.status,200);oldEditions.push({id:row.id,choice,plan:planned.payload.plan,original:structuredClone(store.rows.get(row.id))});
  }
  const saved=await store.invoke('POST',{profile,expectedUpdatedAt:old.updatedAt},endpoint);assert.equal(saved.status,200,JSON.stringify(saved.payload));
  const current=saved.payload.profile,profileRow=structuredClone(store.rows.get(current.id));
  assert.equal(current.revision,old.revision+1);assert.deepEqual(profileRow.source_snapshot.previousWritingProfile,old);
  assert.deepEqual(profileRow.sections.writingProfile,profile);
  assert.equal((await store.invoke('POST',{profile:{...profile,voiceGuidance:'Stale competing edit.'},expectedUpdatedAt:old.updatedAt},endpoint)).status,409);
  assert.deepEqual(store.rows.get(current.id),profileRow);
  for(const setup of oldEditions){
    const read=()=>decodeWeeklyHistoryRow(structuredClone(store.rows.get(setup.id)));
    const action=(action:string,extra:any={})=>invokeHoroscopeWriting({action,id:setup.id,expectedUpdatedAt:read().updated_at,...extra});
    const start=requests.length;
    assert.equal((await action('generate',{sign:'aries',approvedPlanHash:setup.plan.planHash})).status,409);assert.equal(requests.length,start);
    const planned=await action('prepare');assert.equal(planned.status,200,JSON.stringify(planned.payload));
    assert.deepEqual(read().source_snapshot.studioWritingProfile,current);
    assert.deepEqual(read().sections,setup.original.sections);assert.deepEqual(read().facts,setup.original.facts);
    const snapshot=JSON.stringify([...store.rows]);
    const exported=await action('export');assert.equal(exported.status,200,JSON.stringify(exported.payload));
    assert.equal(JSON.stringify([...store.rows]),snapshot,'Copy all is read-only after the actual saved-guide refresh');
    const explicitFeedback=selectExplicitWritingFeedback(explicitWritingFeedbackFixture.rows,planned.payload.plan.feedback.targetKeys,{enabled:planned.payload.plan.feedback.enabled});
    assert.deepEqual(explicitFeedback.receipt,planned.payload.plan.feedback);
    const prepared=prepareHoroscopeWriting(read(),{feedbackReceipt:explicitFeedback.receipt,explicitFeedback,writerSelection:setup.choice==='current'?null:horoscopeWriterConfig(setup.choice,period)});
    assert.equal(prepared.planHash,planned.payload.plan.planHash);
    const fromSamples=usesWeeklyFromSamples(profile);
    const completeRequests:any[]=[];
    for(const sign of HOROSCOPE_SIGNS){
      let request:any;const stop=new Error('Offline capture: never dispatch');
      await assert.rejects(writeHoroscopeSign({...prepared,previousReadings:horoscopePreviousReadings(read(),sign)},sign,{approvedPlanHash:prepared.planHash,approvalReference:'fixture:offline-app',writerClient:async(value:any)=>{request=hydrateExplicitWritingFeedback(value,explicitFeedback.receipt,explicitFeedback.rows);throw stop;}}),error=>error===stop);
      const unit=exported.payload.writingExport.units.find((u:any)=>u.label===sign),text=exported.payload.writingExport.text.slice(unit.start,unit.end);
      const configuration=prepared.entries.find((entry:any)=>entry.sign===sign).configurationEvidence;
      assert.equal(planned.payload.plan.readings.find((entry:any)=>entry.sign===sign).configurationEvidence.risingSign,sign,'The plan preview API includes the requested sign’s configuration research.');
      assert.equal(request.input.split(JSON.stringify(configuration)).length-1,1,'The exact same configuration research reaches the writer once.');
      assert.equal(text.split(JSON.stringify(configuration)).length-1,1,'Copy all retains the same complete configuration research.');
      assert(text.includes(`### Writing instructions\n\n${request.instructions}\n\n### Writing material\n\n${fromSamples?request.input:unsigned(request.input)}`),'Copy all and generation must carry the exact same complete material');
      assert.equal(request.instructions.split(profile.voiceGuidance).length-1,fromSamples?0:1);
      assert.equal(request.instructions.split(COMPACT_VOICE_COMPOSITION_CHECK).length-1,1);
      assert.equal(request.reviewEvidence.voiceReviewContract,HOROSCOPE_VOICE_REVIEW,'The actual writer carries the full-reading check contract into its existing review.');
      assert.equal(request.instructions.split(COMPACT_REFERENCE_LEARNING).length-1,fromSamples?0:1,'Both actual compact writers receive the same current public-audience boundary once');
      assert.equal(request.input.includes(profile.voiceGuidance),fromSamples);
      if(fromSamples)assert.equal(request.instructions,WEEKLY_FROM_SAMPLES_AUTHORITY);
      assert(!request.instructions.includes('Complete archived original passage.'));
      for(const example of fixture.examples){
        assert.equal(hash(example.text),example.sha256??hash(example.text));
        assert.equal(request.input.split(example.text).length-1,1,'Every active complete comparison reaches each app reading exactly once');
        assert(!request.instructions.includes(example.text));
      }
      captures++;
      completeRequests.push({sign,...request});
    }
    assert.equal((await action('generate',{sign:'aries',approvedPlanHash:planned.payload.plan.planHash})).status,202);
    for(let step=0;read().source_snapshot.horoscopeGeneration.active;step++){
      assert(step<50);await new Promise(resolve=>setTimeout(resolve,20));
      assert([200,202].includes((await action(read().source_snapshot.horoscopeGeneration.active.state==='ready'?'continue':'poll')).status));
    }
    const actual=requests.slice(start);assert.equal(actual.length,1,'One configured writer dispatch, with no new rewrite pass');
    assert.equal(actual[0].choice,setup.choice,'Preparing a saved guide cannot silently switch writers');
    assert.equal(actual[0].instructions.includes(profile.voiceGuidance),!fromSamples);
    assert.equal(actual[0].input,completeRequests.find(request=>request.sign==='aries').input,'The actual native request matches the complete saved-guide capture');
    assert.deepEqual(read().sections.horoscopeEdition.passages.at(-1),setup.original.sections.horoscopeEdition.passages.at(-1));
    assert.equal(read().status,'DRAFT');assert.equal(read().source_snapshot.horoscopeGeneration.readings.aries.ownerApproved,false);
    assert.equal(read().source_snapshot.horoscopeGeneration.readings.aries.rhetoricalReview.coverage.voiceMatch,'evaluated_advisory');
    assert.equal(read().source_snapshot.horoscopeGeneration.readings.aries.rhetoricalReview.coverage.voiceCalibration,'unverified');
    assert.deepEqual(store.rows.get(current.id),profileRow,'Generation cannot mutate the saved guide or its archived predecessor');
    artifacts.push({period,choice:setup.choice,profile:current,profileRow,plan:planned.payload.plan,writingExport:exported.payload.writingExport,completeRequests,request:actual[0],result:read()});
  }
}
for(const row of untouched)assert.deepEqual(store.rows.get(row.id),row,'Monthly and Seasonal fields, receipts and rows stay exact');
if(process.env.HOROSCOPE_APP_CAPTURE)writeFileSync(process.env.HOROSCOPE_APP_CAPTURE,JSON.stringify({paidCalls:0,captures,artifacts},null,2),{mode:0o600});
console.log(`PASS actual app writers: save/refresh/export/generate/reload, six configured provider runs, ${captures} complete sign requests, exact examples and predecessor archives, stale-plan protection, unchanged other periods. Zero paid calls; literary quality remains unverified.`);
await store.close();
