import assert from 'node:assert/strict';
import fs from 'node:fs';
import {store,editorialFixtureRows,installHoroscopeWriterFixture,invokeHoroscopeWriting} from '../tests/helpers/sky-article-save-api.mts';
import {installAlternativeHoroscopeProviders} from '../tests/helpers/horoscope-provider-fixture.mts';
import {decodeWeeklyHistoryRow} from '../api/_lib/horoscope-history-storage';
import {emptyHoroscopeEdition,horoscopeEditionBody,horoscopeEditionKey} from '../apps/web/src/content/horoscopeEditions.mjs';
import {defaultHoroscopeProfile,HOROSCOPE_RUN_PROMPT_VARIABLES} from '../src/astro-writing/horoscopeWritingProfiles.mjs';
import {assertHoroscopeRequestEvidence} from './assert-horoscope-request-evidence.mjs';

installHoroscopeWriterFixture();installAlternativeHoroscopeProviders();
const packaged=new Set(fs.globSync(JSON.parse(fs.readFileSync('vercel.json','utf8')).functions['api/admin/horoscope-writing.ts'].includeFiles));
for(const path of ['src/astro-writing/monthlyRequestEvidence.mjs','src/astro-writing/seasonalRequestEvidence.mjs'])assert(packaged.has(path));
const complete='Synthetic preferred revision opening.\n\nA complete middle paragraph with “quotes” and 🪐.\n\nSynthetic preferred revision final sentence.';
const transport=globalThis.fetch,captures:any[]=[];
let rowId='';
globalThis.fetch=async(input:any,options:any={})=>{
  const url=String(input);
  if(options.method==='POST'&&['https://api.openai.com/v1/responses','https://api.anthropic.com/v1/messages','https://generativelanguage.googleapis.com/v1beta/interactions'].includes(url)){
    const request=JSON.parse(options.body),provider=url.includes('anthropic')?'anthropic':url.includes('googleapis')?'gemini':'openai';
    const schema=provider==='anthropic'?request.output_config.format.schema:provider==='gemini'?request.response_format.schema:request.text.format.schema;
    const input=provider==='anthropic'?request.messages[0].content:request.input;
    const active=decodeWeeklyHistoryRow(structuredClone(store.rows.get(rowId)))?.source_snapshot?.horoscopeGeneration?.active;
    captures.push({input,provider,schema,stage:active?.workflow?.startsWith('horoscope-review/')?'review':active?.phase,request});
  }
  return transport(input,options);
};
let cases=0;const previousProfiles=new Map();
for(const period of ['monthly','seasonal'])for(const optional of period==='seasonal'?[false,true]:[false]){
  const profile=defaultHoroscopeProfile(period);
  if(period==='seasonal')profile.voiceGuidance+=`\nBEGIN COMPLETE OWNER PREFERRED REVISION\n${complete}\nEND COMPLETE OWNER PREFERRED REVISION`;
  if(optional)profile.prompt+='\n\n'+HOROSCOPE_RUN_PROMPT_VARIABLES.map(name=>`${name}\n{{${name}}}`).join('\n\n');
  const saved=await store.invoke('POST',{profile,expectedUpdatedAt:previousProfiles.get(period)?.updatedAt??null},'/api/admin/generated-content?writingProfiles=true');
  assert.equal(saved.status,200);const savedProfile=saved.payload.profile;
  previousProfiles.set(period,savedProfile);
  for(const choice of ['current','claude','gemini']){
    const packet=await store.invoke('GET',undefined,`/api/admin/generated-content?horoscopeBrief=true&period=${period}&date=2026-10-21&timeZone=America%2FNew_York`);
    assert.equal(packet.status,200);const {brief,signature}=packet.payload,edition=emptyHoroscopeEdition(brief.window);
    for(const [id,existing] of store.rows)if(existing.content_key===horoscopeEditionKey(edition.window))store.rows.delete(id);
    const created=await store.invoke('POST',{contentKey:horoscopeEditionKey(edition.window),surface:'sky',mode:'article',eventType:'horoscope-edition',provider:'manual-admin',status:'DRAFT',lane:'serving',headline:'Synthetic period evidence fixture',body:horoscopeEditionBody(edition),sections:{horoscopeEdition:edition},facts:{horoscopeBrief:{brief,signature}},sourceSnapshot:{studioWritingProfile:savedProfile}});
    assert.equal(created.status,200);rowId=created.payload.rows[0].id;
    const read=()=>decodeWeeklyHistoryRow(structuredClone(store.rows.get(rowId))),start=captures.length;
    const original=structuredClone(read().sections),profilesBefore=[...store.rows.values()].filter(r=>String(r.content_key).startsWith('studio-writing-profile/')).map(r=>structuredClone(r));
    const action=(action:string,extra:any={})=>invokeHoroscopeWriting({action,id:rowId,expectedUpdatedAt:read().updated_at,...extra});
    const prepared=await action('prepare',{writerChoice:choice});assert.equal(prepared.status,200);
    const sign=period==='monthly'?'overview':'aries',approvedPlanHash=prepared.payload.plan.planHash;
    assert.equal((await invokeHoroscopeWriting({action:'generate',id:rowId,expectedUpdatedAt:read().updated_at,sign,approvedPlanHash},'wrong-secret')).status,401);
    assert.equal((await action('generate',{sign,approvedPlanHash:'stale'})).status,409);assert.equal(captures.length,start);
    assert.equal((await action('generate',{sign,approvedPlanHash})).status,202);
    for(let steps=0;read().source_snapshot.horoscopeGeneration?.active;steps++){
      assert(steps<70,'Durable stage flow completes');await new Promise(resolve=>setTimeout(resolve,20));
      const active=read().source_snapshot.horoscopeGeneration.active;
      const result=await action(active.state==='ready'?'continue':'poll');assert([200,202].includes(result.status),`${period}/${choice}: ${result.status}`);
    }
    await new Promise(resolve=>setTimeout(resolve,25));
    const calls=captures.slice(start),writer=calls.find(c=>c.schema.properties?.body);
    assert(writer);assert.equal(calls.filter(c=>c.schema.properties?.body).length,1);
    assert.equal(calls.length,period==='monthly'?3:6,'No new writing/review calls');
    assertHoroscopeRequestEvidence(writer.input,optional?['primaryOwnerVoiceSources','supportingOwnerVoiceSources']:[]);
    assert(writer.input.includes(profile.voiceGuidance));assert(writer.input.includes(profile.structure));
    if(period==='seasonal'){
      assert.equal(writer.input.split(complete).length-1,1);assert(!writer.input.includes(JSON.stringify(complete).slice(1,-1)));
      assert(writer.input.includes('profilePassageRef'));
      for(const c of calls.filter(c=>['mechanism','plan','plan_review','meaning'].includes(c.stage))){
        const data=JSON.parse(c.input),manifest=data.evidenceManifest;
        assert.deepEqual(manifest.query.seasonMeaning,{serializedJsonRef:'governedFacts.seasonalMeaning'});
        for(const source of data.governedFacts.seasonalMeaning.sources){
          const encoded=JSON.stringify(source.body).slice(1,-1);assert.equal(c.input.split(encoded).length-1,1,'Each complete meaning source appears once');
        }
      }
      assert.deepEqual(read().sections,original,'Synthetic acceptance cannot write or approve reader prose');
      const run=[...editorialFixtureRows.values()].at(-1)!.state;
      assert.equal(run.status,'accepted');assert.equal(run.ownerApproved,false);
    }else{
      assert.deepEqual(writer.schema.required,['headline','tldr','body']);
      assert.equal(read().source_snapshot.horoscopeGeneration.readings.overview.ownerApproved,false);
    }
    assert.equal(read().status,'DRAFT');
    for(const p of profilesBefore)assert.deepEqual(store.rows.get(p.id),p,'Saved profile rows remain exact');
    cases++;
  }
}
assert.equal(cases,9);
console.log(`PASS period evidence: ${cases} actual-handler cases, ${captures.length} intercepted native requests, all three providers, Seasonal variable modes, complete source/hash/role delivery, denied/stale authorization, unchanged profiles and owner approval boundaries. Zero live calls.`);
