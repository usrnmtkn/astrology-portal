import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {store,installHoroscopeWriterFixture,invokeHoroscopeWriting,writerFixture} from '../tests/helpers/sky-article-save-api.mts';
import {prepareHoroscopeBrief} from '../api/_lib/horoscope-editions';
import {emptyHoroscopeEdition,horoscopeEditionBody,horoscopeEditionKey} from '../apps/web/src/content/horoscopeEditions.mjs';
import {defaultHoroscopeProfile,validateHoroscopeProfile,horoscopeEditorialPrompt,horoscopeEditorialPreview,HOROSCOPE_RUN_PROMPT_VARIABLES} from '../src/astro-writing/horoscopeWritingProfiles.mjs';
import {horoscopeProfileEvidence} from '../src/astro-writing/horoscopePromptVariables.mjs';
import {assertHoroscopeRequestEvidence} from './assert-horoscope-request-evidence.mjs';
import {SEASONAL_SOURCE_PRIORITY} from '../src/astro-writing/horoscopeEditorialConstraints.mjs';

const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const comparison='Complete synthetic comparison opening.\n\nComplete synthetic comparison ending.';
const comparisonBlock=`ACTIVE COMPLETE OWNER-DESIGNATED COMPARISONS\nEXAMPLE: Synthetic source\nComplete prose SHA-256: ${hash(comparison)}\nBEGIN COMPLETE PROSE synthetic-example\n${comparison}\nEND COMPLETE PROSE synthetic-example\n\n`;
const correction='OWNER CORRECTION: SYNTHETIC MEANING\nPreserve the synthetic distinction and its complete reason.';
const template=['Write {{period}}.','VOICE\n{{voiceGuidance}}','STRUCTURE\n{{structure}}','SOURCE GUIDANCE\n{{sourceGuidance}}',...HOROSCOPE_RUN_PROMPT_VARIABLES.map(name=>`${name}\n{{${name}}}`)].join('\n\n');
const initial={...defaultHoroscopeProfile('monthly'),prompt:template};
validateHoroscopeProfile(initial);
assert(horoscopeEditorialPreview(initial).includes('[governedFacts: supplied when the writing run is prepared]'));
assert.throws(()=>horoscopeEditorialPrompt(initial),/must supply/);
assert.throws(()=>validateHoroscopeProfile({...initial,prompt:template+'\n{{invented}}'}),/unknown variable/);
assert.throws(()=>validateHoroscopeProfile({...initial,prompt:template+'\n{{governedFacts}}'}),/Use.*once/);
assert.throws(()=>validateHoroscopeProfile({...initial,voiceGuidance:'{{governedFacts}}'}),/Prompt variables belong/);
assert.throws(()=>validateHoroscopeProfile({...initial,prompt:template.replace('{{period}}','monthly')}),/Keep.*period/);
const literal=Object.fromEntries(HOROSCOPE_RUN_PROMPT_VARIABLES.map(name=>[name,'Literal source {{notAnInstruction}}.']));
assert(horoscopeEditorialPrompt(initial,literal).includes('{{notAnInstruction}}'),'Source braces are not recursively expanded');
assert.equal(horoscopeProfileEvidence(comparisonBlock+correction).comparisons,comparisonBlock);
assert.throws(()=>horoscopeProfileEvidence(correction+'\n'+comparisonBlock),/boundaries remain separate/);
assert.throws(()=>horoscopeProfileEvidence(comparisonBlock.replace(comparison,comparison+' changed')),/could not be verified/);
assert.throws(()=>horoscopeProfileEvidence(comparisonBlock.replace('END COMPLETE PROSE','BROKEN END COMPLETE PROSE')),/could not be verified/);
installHoroscopeWriterFixture();
for(const period of ['daily','weekly','monthly','seasonal'] as const){
 const profile={...defaultHoroscopeProfile(period),sourceGuidance:'Source directions remain.\n\n'+comparisonBlock+correction,prompt:template};
 const saved=await store.invoke('POST',{profile,expectedUpdatedAt:null},'/api/admin/generated-content?writingProfiles=true');assert.equal(saved.status,200,JSON.stringify(saved.payload));
 assert.deepEqual(saved.payload.profile.profile,profile);
 const packet=await prepareHoroscopeBrief(new URL(`http://localhost/?period=${period}&date=2026-10-16&timeZone=America/New_York`));
 const edition=emptyHoroscopeEdition(packet.brief.window);
 let r=await store.invoke('POST',{contentKey:horoscopeEditionKey(edition.window),surface:'sky',mode:'article',eventType:'horoscope-edition',provider:'manual-admin',status:'DRAFT',lane:'serving',headline:'Synthetic prompt variable test',body:horoscopeEditionBody(edition),sections:{horoscopeEdition:edition},facts:{horoscopeBrief:packet},sourceSnapshot:{studioWritingProfile:saved.payload.profile}});
 assert.equal(r.status,200,JSON.stringify(r.payload));let row=r.payload.rows[0];
 const action=(action:string,extra:any={})=>invokeHoroscopeWriting({action,id:row.id,expectedUpdatedAt:row.updated_at,...extra});
 for(const sign of period==='monthly'?['overview']:period==='seasonal'?['aries','overview']:['aries']){
  r=await action('prepare');assert.equal(r.status,200,JSON.stringify(r.payload));row=r.payload.rows[0];
  r=await action('generate',{sign,approvedPlanHash:r.payload.plan.planHash});assert.equal(r.status,202,JSON.stringify(r.payload));row=r.payload.rows[0];
  if(period==='monthly'){
   r=await action('poll');assert.equal(r.status,202);row=r.payload.rows[0];
   r=await action('continue');assert.equal(r.status,202,JSON.stringify(r.payload));row=r.payload.rows[0];
  }
  const request=writerFixture.requests.get(row.source_snapshot.horoscopeGeneration.active.responseId);
  assert(request);
  assertHoroscopeRequestEvidence(request.input,['primaryOwnerVoiceSources','supportingOwnerVoiceSources']);
  if(period==='seasonal')assert.equal(request.input.split(SEASONAL_SOURCE_PRIORITY).length-1,1,'Seasonal source priority remains intact');
  for(const name of HOROSCOPE_RUN_PROMPT_VARIABLES)assert(!request.input.includes(`{{${name}}}`));
  assert(!request.input.includes('supplied when the writing run is prepared'),'Preview labels never reach the provider');
  const sources=(name:string)=>JSON.parse(request.input.match(new RegExp(`(?:^|\\n)${name}\\n([^\\n]+)\\n\\n`))[1]);
  const primary=sources('primaryOwnerVoiceSources'),supporting=sources('supportingOwnerVoiceSources');
  assert.equal(primary.length,period==='monthly'?4:3);
  for(const p of [...primary,...supporting]){
   assert(p.text.trim());assert(p.id);assert.equal(p.sourceRecordSha256,hash(p.text));
   assert.equal(request.input.split(JSON.stringify(p.text).slice(1,-1)).length-1,1,'Each complete owner passage is supplied once');
  }
  assert.equal(request.input.split(comparison).length-1,1,'Complete comparison appears once');
  assert.equal(request.input.split(correction).length-1,1,'Saved scoped correction appears once');
  assert(request.input.includes('SELECTED OWNER CORRECTIONS\n['));
  const facts=sources('CALCULATED FACTS');assert.equal(facts.window.period,period);
  if(sign==='overview')assert(!facts.risingSign&&!facts.house&&!facts.signs);
  else assert.equal(facts.risingSign,sign);
  assert.deepEqual(row.source_snapshot.studioWritingProfile.profile,profile,'Assembly never changes saved instructions');
  r=await action('poll');assert.equal(r.status,200,JSON.stringify(r.payload));row=r.payload.rows[0];
  assert.equal(row.status,'DRAFT');assert.equal(row.source_snapshot.horoscopeGeneration.readings[sign].version,'horoscope-writer/v17');
 }
}
console.log('PASS horoscope run variables: actual-handler save and generation across all periods, complete exact evidence once, scoped comparisons/corrections, audience-safe facts, strict expansion and unchanged saved profiles. Injected provider only.');
