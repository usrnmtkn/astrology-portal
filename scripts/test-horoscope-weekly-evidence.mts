import assert from 'node:assert/strict';
import {store,installHoroscopeWriterFixture,invokeHoroscopeWriting} from '../tests/helpers/sky-article-save-api.mts';
import {installAlternativeHoroscopeProviders} from '../tests/helpers/horoscope-provider-fixture.mts';
import {decodeWeeklyHistoryRow} from '../api/_lib/horoscope-history-storage';
import {emptyHoroscopeEdition,horoscopeEditionBody,horoscopeEditionKey} from '../apps/web/src/content/horoscopeEditions.mjs';
import {defaultHoroscopeProfile,HOROSCOPE_RUN_PROMPT_VARIABLES} from '../src/astro-writing/horoscopeWritingProfiles.mjs';
import {assertHoroscopeRequestEvidence,restoreWeeklyRequestMeanings} from './assert-horoscope-request-evidence.mjs';

installHoroscopeWriterFixture();installAlternativeHoroscopeProviders();
const transport=globalThis.fetch,captures:any[]=[];
globalThis.fetch=async(input:any,options:any={})=>{
  const url=String(input);
  if(options.method==='POST'&&['https://api.openai.com/v1/responses','https://api.anthropic.com/v1/messages','https://generativelanguage.googleapis.com/v1beta/interactions'].includes(url)){
    const request=JSON.parse(options.body),provider=url.includes('anthropic')?'claude':url.includes('googleapis')?'gemini':'current';
    captures.push({provider,input:provider==='claude'?request.messages[0].content:request.input,
      schema:provider==='claude'?request.output_config.format.schema:provider==='gemini'?request.response_format.schema:request.text.format.schema});
  }
  return transport(input,options);
};
let previousProfile:any,cases=0;
for(const v2 of [false,true])for(const optional of [false,true]){
  const profile=defaultHoroscopeProfile('weekly');
  const complete='Complete synthetic saved example opening.\nPERIOD DEVELOPMENTS — EACH FACT WITH ITS OWN MEANING AND LIFE AREA\n{ "temporaryMeaning": "Opaque saved example, never generated facts." }\nComplete synthetic saved example ending. 🌙';
  profile.voiceGuidance+='\n'+complete;
  if(v2)profile.prompt='WEEKLY PROMPT V2\nWrite {{period}}.\n{{voiceGuidance}}\n{{structure}}\n{{sourceGuidance}}';
  if(optional)profile.prompt+='\n\n'+HOROSCOPE_RUN_PROMPT_VARIABLES.map(name=>`${name}\n{{${name}}}`).join('\n\n');
  const saved=await store.invoke('POST',{profile,expectedUpdatedAt:previousProfile?.updatedAt??null},'/api/admin/generated-content?writingProfiles=true');
  assert.equal(saved.status,200);previousProfile=saved.payload.profile;
  for(const choice of ['current','claude','gemini']){
    const packet=await store.invoke('GET',undefined,'/api/admin/generated-content?horoscopeBrief=true&period=weekly&date=2026-10-21&timeZone=America%2FNew_York');
    assert.equal(packet.status,200);const {brief,signature}=packet.payload,edition=emptyHoroscopeEdition(brief.window);
    for(const [id,row] of store.rows)if(row.content_key===horoscopeEditionKey(edition.window))store.rows.delete(id);
    const created=await store.invoke('POST',{contentKey:horoscopeEditionKey(edition.window),surface:'sky',mode:'article',eventType:'horoscope-edition',provider:'manual-admin',status:'DRAFT',lane:'serving',headline:'Synthetic Weekly evidence fixture',body:horoscopeEditionBody(edition),sections:{horoscopeEdition:edition},facts:{horoscopeBrief:{brief,signature}},sourceSnapshot:{studioWritingProfile:previousProfile}});
    assert.equal(created.status,200);const id=created.payload.rows[0].id;
    const read=()=>decodeWeeklyHistoryRow(structuredClone(store.rows.get(id)));
    const profilesBefore=[...store.rows.values()].filter(row=>String(row.content_key).startsWith('studio-writing-profile/')).map(row=>structuredClone(row));
    const start=captures.length,action=(action:string,extra:any={})=>invokeHoroscopeWriting({action,id,expectedUpdatedAt:read().updated_at,...extra});
    const prepared=await action('prepare',{writerChoice:choice});assert.equal(prepared.status,200);
    const approvedPlanHash=prepared.payload.plan.planHash;
    assert.equal((await invokeHoroscopeWriting({action:'generate',id,expectedUpdatedAt:read().updated_at,sign:'aries',approvedPlanHash},'wrong-secret')).status,401);
    assert.equal((await action('generate',{sign:'aries',approvedPlanHash:'stale'})).status,409);assert.equal(captures.length,start);
    assert.equal((await action('generate',{sign:'aries',approvedPlanHash})).status,202);
    for(let step=0;read().source_snapshot.horoscopeGeneration.active;step++){
      assert(step<50);await new Promise(resolve=>setTimeout(resolve,20));
      const active=read().source_snapshot.horoscopeGeneration.active;
      const result=await action(active.state==='ready'?'continue':'poll');assert([200,202].includes(result.status));
    }
    const calls=captures.slice(start);assert.equal(calls.length,2,'One writer and one existing rhetorical check');
    const writer=calls.find(call=>call.schema.properties?.body);assert(writer);assert.equal(writer.provider,choice);
    assert.deepEqual(writer.schema.required,['headline','body']);
    if(!v2)assertHoroscopeRequestEvidence(writer.input,optional?['primaryOwnerVoiceSources','supportingOwnerVoiceSources']:[]);
    else if(!optional)for(const label of ['WEEKLY COMPLETE SOURCE PASSAGES','SHARED FIVE-ROLE EVIDENCE','REGISTER REFERENCE','REJECTED READINGS'])assert(!writer.input.includes(label),'V2 retains its existing source boundary');
    for(const field of ['voiceGuidance','structure','sourceGuidance'])assert(writer.input.includes(profile[field]),`Complete ${field} stays exact`);
    assert(writer.input.includes(complete),'Saved JSON-looking source remains opaque');
    // Meaning sources are generated JSON, never parsed out of saved prose.
    const factsInput=optional?writer.input.split('governedFacts\n').at(-1):writer.input;
    const development=JSON.parse(factsInput.match(/PERIOD DEVELOPMENTS — EACH FACT WITH ITS OWN MEANING AND LIFE AREA\n([^\n]+)\n\n/u)[1]);
    const checkMeanings=(value:any)=>{
      const sources=new Map(),refs:any[]=[],texts:string[]=[];
      const walk=(v:any)=>{if(Array.isArray(v))return v.forEach(walk);if(!v||typeof v!=='object')return;
        const m=v.temporaryMeaning;if(typeof m==='string')texts.push(m);
        else if(m?.text){sources.set(m.id,m.text);texts.push(m.text);}
        else if(m?.completePassageRef)refs.push(m.completePassageRef);
        Object.values(v).forEach(walk);};
      walk(value);assert(refs.length,'Repeated meaning has a complete reference');
      assert.equal(new Set(texts).size,texts.length,'Complete generated meaning appears once');
      for(const ref of refs)assert(sources.has(ref),'Every meaning reference resolves in this request');
    };
    checkMeanings(development);
    assert.deepEqual(restoreWeeklyRequestMeanings(development),prepared.payload.plan.readings.find((entry:any)=>entry.sign==='aries').developments,'Complete planned source texts, roles and fact bindings round-trip');
    const review=JSON.parse(calls.find(call=>!call.schema.properties?.body).input);checkMeanings(review.evidence.engineFacts);
    assert.deepEqual(review.evidence.writingProfile.profile,profile,'Review preserves complete saved instructions');
    assert.equal(read().status,'DRAFT');assert.equal(read().source_snapshot.horoscopeGeneration.readings.aries.ownerApproved,false);
    for(const row of profilesBefore)assert.deepEqual(store.rows.get(row.id),row);
    cases++;
  }
}
console.log(`PASS Weekly evidence: ${cases} handler cases, ${captures.length} native requests, legacy/v2 and both variable modes, all providers, complete source roles and guidance, denied/stale authorization, unchanged profiles and owner review. Zero external calls.`);
