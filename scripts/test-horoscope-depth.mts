import {assertHoroscopeRequestEvidence} from './assert-horoscope-request-evidence.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import SwissEph from 'swisseph-wasm';
import {store,installHoroscopeWriterFixture,invokeHoroscopeWriting,writerFixture} from '../tests/helpers/sky-article-save-api.mts';
import {prepareHoroscopeBrief} from '../api/_lib/horoscope-editions';
import {prepareHoroscopeWriting} from '../src/astro-writing/horoscopeWriting.mjs';
import {horoscopeAspectFindings} from '../src/astro-writing/horoscopeAspectClaims.mjs';
import {seasonalDateFindings} from '../src/astro-writing/horoscopeSeasonalDates.mjs';
import {horoscopePunctuationFindings,HOROSCOPE_PUNCTUATION_RULE} from '../src/astro-writing/horoscopeEditorialConstraints.mjs';
import {emptyHoroscopeEdition,horoscopeEditionBody,horoscopeEditionKey,HOROSCOPE_SIGNS} from '../apps/web/src/content/horoscopeEditions.mjs';

installHoroscopeWriterFixture();
const swe=new SwissEph();await swe.initSwissEph();
const ids:any={Sun:swe.SE_SUN,Moon:swe.SE_MOON,Mercury:swe.SE_MERCURY,Venus:swe.SE_VENUS,Mars:swe.SE_MARS,Jupiter:swe.SE_JUPITER,Saturn:swe.SE_SATURN,Uranus:swe.SE_URANUS,Neptune:swe.SE_NEPTUNE,Pluto:swe.SE_PLUTO};
const direct=(planet:string,at:string)=>{const d=new Date(at);return swe.calc_ut(swe.julday(d.getUTCFullYear(),d.getUTCMonth()+1,d.getUTCDate(),d.getUTCHours()+d.getUTCMinutes()/60+(d.getUTCSeconds()+d.getUTCMilliseconds()/1000)/3600),ids[planet],swe.SEFLG_SWIEPH|swe.SEFLG_SPEED);};
const angles:any={conjunction:0,sextile:60,square:90,trine:120,opposition:180};
const separation=(a:number,b:number)=>Math.min(Math.abs(a-b),360-Math.abs(a-b));
let configurations=0;
for(const [date,timeZone] of [['2026-10-01','America/New_York'],['2027-03-02','Australia/Sydney']]){
 const packet=await prepareHoroscopeBrief(new URL(`http://localhost/?period=seasonal&date=${date}&timeZone=${timeZone}`));
 const brief:any=packet.brief,relations=brief.relationalContext;
 assert.equal(brief.provenance.actualEphemeris,'swiss');assert(relations.snapshots.length>2);
 assert(relations.coverage.includes('historical recurrences and earlier cycle passes are not calculated'));
 for(const snapshot of relations.snapshots){
  const vectors=new Map(snapshot.positions.map((p:any)=>[p.planet,direct(p.planet,snapshot.at)]));
  for(const p of snapshot.positions){
   const vector:any=vectors.get(p.planet);assert(Math.abs(p.longitude-vector[0])<1e-7,JSON.stringify({p,vector:[...vector],at:snapshot.at}));assert(Math.abs(p.speed-vector[3])<1e-7);
   assert.equal(p.sign.toLowerCase(),HOROSCOPE_SIGNS[Math.floor(vector[0]/30)]);
  }
  for(const a of snapshot.aspects){
   const av:any=vectors.get(a.planets[0]),bv:any=vectors.get(a.planets[1]);
   const orb=Math.abs(separation(av[0],bv[0])-angles[a.aspect]);assert(Math.abs(a.orb-orb)<1e-7);assert(orb<=3);
   const later=new Date(Date.parse(snapshot.at)+3600000).toISOString();
   const nextOrb=Math.abs(separation(direct(a.planets[0],later)[0],direct(a.planets[1],later)[0])-angles[a.aspect]);
   assert.equal(a.phase,orb<=0.01?'exact':nextOrb<orb?'applying':'separating');
  }
  for(const c of snapshot.configurations){configurations++;assert.equal(c.type,'T-square');assert.equal(new Set(c.planets).size,3);assert.equal(c.aspects.filter((a:any)=>a.aspect==='opposition').length,1);assert.equal(c.aspects.filter((a:any)=>a.aspect==='square'&&a.planets.includes(c.apex)).length,2);for(const a of c.aspects)assert(snapshot.aspects.includes(a));
   assert.deepEqual(horoscopeAspectFindings(`You can consider the T-square between ${c.planets.join(' and ')}.`,brief),[]);
   assert(horoscopeAspectFindings(`You can consider the T-square between ${c.planets.join(' and ')}.`,{...brief,relationalContext:undefined}).length);
   const localDate=new Intl.DateTimeFormat('en-US',{timeZone,month:'long',day:'numeric'}).format(new Date(snapshot.at));
   const claim=`On ${localDate}, the T-square between ${c.planets.join(' and ')} develops.`;
   assert.deepEqual(seasonalDateFindings(claim,brief),[]);
   assert(seasonalDateFindings(claim,{...brief,relationalContext:{...relations,snapshots:relations.snapshots.map((s:any)=>({...s,configurations:[]}))}}).length);
  }
 }
 const edition=emptyHoroscopeEdition(brief.window);
 const prepared=prepareHoroscopeWriting({sections:{horoscopeEdition:edition},facts:{horoscopeBrief:packet},source_snapshot:{}});
 for(const entry of prepared.entries){
  for(const snap of entry.developments.relationships.snapshots){
   for(const p of snap.positions)assert.equal(p.house,entry.sign==='overview'?null:(HOROSCOPE_SIGNS.indexOf(p.sign.toLowerCase())-HOROSCOPE_SIGNS.indexOf(entry.sign)+12)%12+1);
  }
 }
 const moon=relations.snapshots.find((s:any)=>s.rulers.some((r:any)=>r.role==='lunation'));assert(moon);
 assert(moon.aspects.some((a:any)=>a.planets.includes('Moon')));
 const sampledMoon=moon.aspects.find((a:any)=>a.planets.includes('Moon'));
 const sampledClaim=`The ${sampledMoon.aspect} between ${sampledMoon.planets.join(' and ')} is exact.`;
 assert(horoscopeAspectFindings(sampledClaim,{...brief,events:[]}).length,'A sampled aspect cannot establish an exact event');
 const created=await store.invoke('POST',{contentKey:horoscopeEditionKey(edition.window),surface:'sky',mode:'article',eventType:'horoscope-edition',provider:'manual-admin',status:'DRAFT',lane:'serving',headline:'Depth fixture',body:horoscopeEditionBody(edition),sections:{horoscopeEdition:edition},facts:{horoscopeBrief:packet},sourceSnapshot:{}});
 assert.equal(created.status,200,JSON.stringify(created.payload));let row=created.payload.rows[0];
 const plan=await invokeHoroscopeWriting({action:'prepare',id:row.id,expectedUpdatedAt:row.updated_at});assert.equal(plan.status,200);
 const generated=await invokeHoroscopeWriting({action:'generate',id:row.id,expectedUpdatedAt:row.updated_at,sign:'aquarius',approvedPlanHash:plan.payload.plan.planHash});assert.equal(generated.status,202);row=generated.payload.rows[0];
 const input=writerFixture.requests.get(row.source_snapshot.horoscopeGeneration.active.responseId).input;
 const routed=JSON.parse(input.match(/PERIOD DEVELOPMENTS[^\n]*\n([^\n]+)\n\n/)![1]);
 assert.deepEqual(routed.relationships,prepared.entries.find((e:any)=>e.sign==='aquarius').developments.relationships);
 const facts=JSON.parse(input.match(/CALCULATED FACTS\n([^\n]+)\n\n/)![1]);assert(!facts.relationalContext,'Do not pay for duplicate relational packets');
 assert(input.includes('Develop their relationships rather than touring isolated planetary topics'));assertHoroscopeRequestEvidence(input);assert(input.includes(HOROSCOPE_PUNCTUATION_RULE));
 const polled=await invokeHoroscopeWriting({action:'poll',id:row.id,expectedUpdatedAt:row.updated_at});assert.equal(polled.status,200);row=polled.payload.rows[0];
 const shared=await invokeHoroscopeWriting({action:'generate',id:row.id,expectedUpdatedAt:row.updated_at,sign:'overview',approvedPlanHash:plan.payload.plan.planHash});assert.equal(shared.status,202);row=shared.payload.rows[0];
 const sharedInput=writerFixture.requests.get(row.source_snapshot.horoscopeGeneration.active.responseId).input;
 const essays=JSON.parse(sharedInput.match(/COMPLETE SEASONAL OWNER PROSE EVIDENCE\n([^\n]+)\n\n/)![1]);
 assert.equal(essays.length,3);
 for(const essay of essays){
  assert.equal(essay.seasonalVoiceRole,'primary argument and voice');
  assert.equal(sharedInput.split(JSON.stringify(essay.text).slice(1,-1)).length-1,1);
  assert.equal(essay.text,fs.readFileSync(essay.sourcePath,'utf8').slice(essay.provenance.start,essay.provenance.end));
 }
 assert(sharedInput.includes('Write from inside a recognizable human experience.'));assertHoroscopeRequestEvidence(sharedInput);
 assert(sharedInput.includes('One shared reading for people of all signs.'));
 assert.equal((await invokeHoroscopeWriting({action:'poll',id:row.id,expectedUpdatedAt:row.updated_at})).status,200);
}
assert(configurations>0,'Real calculations exercise the configuration path');
for(const dash of ['\u2014','&mdash;','&#8212;','&#x2014;','&#X0002014;'])for(const field of ['headline','body'])assert.equal(horoscopePunctuationFindings({[field]:`Fixture ${dash} text`}).length,1);
assert.equal(horoscopePunctuationFindings({headline:'Fixture',body:'You can edit (and keep the rest).'}).length,0);

const packet=await prepareHoroscopeBrief(new URL('http://localhost/?period=weekly&date=2026-10-01&timeZone=America/New_York'));
const edition=emptyHoroscopeEdition(packet.brief.window);
let result=await store.invoke('POST',{contentKey:horoscopeEditionKey(edition.window),surface:'sky',mode:'article',eventType:'horoscope-edition',provider:'manual-admin',status:'DRAFT',lane:'serving',headline:'Punctuation fixture',body:horoscopeEditionBody(edition),sections:{horoscopeEdition:edition},facts:{horoscopeBrief:packet},sourceSnapshot:{}});
assert.equal(result.status,200,JSON.stringify(result.payload));let row=result.payload.rows[0];
const action=(action:string,extra:any={})=>invokeHoroscopeWriting({action,id:row.id,expectedUpdatedAt:row.updated_at,...extra});
const completed=(sign:string)=>({status:'completed',usage:{input_tokens:100,output_tokens:40},output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({headline:`${sign} & ${sign} Rising`,body:'You can read this fixture\u2014and correct its punctuation.'})}]}]});
for(const [sign,immediate] of [['aries',false],['taurus',true]] as const){
 const before=writerFixture.calls;const plan=await action('prepare');assert.equal(plan.status,200);
 if(immediate)writerFixture.startResult=completed('Taurus');
 result=await action('generate',{sign,approvedPlanHash:plan.payload.plan.planHash});
 if(!immediate){assert.equal(result.status,202);row=result.payload.rows[0];writerFixture.nextResult=completed('Aries');result=await action('poll');}
 assert.equal(result.status,422,JSON.stringify(result.payload));row=result.payload.rows[0];
 assert.equal(row.source_snapshot.horoscopeGeneration.active,null);assert.equal(row.source_snapshot.horoscopeGeneration.lastError.code,'required_punctuation');
 assert(row.source_snapshot.horoscopeGeneration.lastError.candidate.body.includes('\u2014'));assert(row.source_snapshot.horoscopeGeneration.lastError.receipt.usage);
 assert.equal(row.sections.horoscopeEdition.passages.find((p:any)=>p.sign===sign).body,'');assert.equal(writerFixture.calls,before+1);
 assert(writerFixture.requests.get(row.source_snapshot.horoscopeGeneration.lastError.operation.responseId).input.includes(HOROSCOPE_PUNCTUATION_RULE));
 const candidate={...row.sections.horoscopeEdition,passages:row.sections.horoscopeEdition.passages.map((p:any)=>p.sign===sign?{...p,...row.source_snapshot.horoscopeGeneration.lastError.candidate}:p)};
 const save=(ed:any,version=row.updated_at)=>store.invoke('PATCH',{id:row.id,expectedUpdatedAt:version,sections:{horoscopeEdition:ed},body:horoscopeEditionBody(ed)});
 assert.equal((await save(candidate)).status,422);assert.equal((await save(candidate,'2000-01-01T00:00:00Z')).status,409);
 candidate.passages.find((p:any)=>p.sign===sign).body='You can read this fixture and correct its punctuation.';
 result=await save(candidate);assert.equal(result.status,200,JSON.stringify(result.payload));row=result.payload.rows[0];assert.equal(writerFixture.calls,before+1);
 assert.equal(row.source_snapshot.horoscopeGeneration.lastError,null);
 assert(row.source_snapshot.horoscopeGeneration.failures.at(-1).candidate.body.includes('\u2014'));
}
// Legacy/import/manual content cannot bypass publication by lacking generation metadata.
const legacy=structuredClone(row);delete legacy.source_snapshot.horoscopeGeneration;
legacy.sections.horoscopeEdition.passages=legacy.sections.horoscopeEdition.passages.map((p:any)=>({...p,headline:'Fixture',body:'You can review this fixture\u2014before publishing.'}));
legacy.body=horoscopeEditionBody(legacy.sections.horoscopeEdition);store.rows.set(legacy.id,legacy);
assert.equal((await store.invoke('PATCH',{id:legacy.id,expectedUpdatedAt:legacy.updated_at,status:'LIVE'})).status,422);
assert.equal(store.rows.get(legacy.id).body,legacy.body);
const packaged=new Set(fs.globSync(JSON.parse(fs.readFileSync('vercel.json','utf8')).functions['api/admin/horoscope-writing.ts'].includeFiles));
assert(packaged.has('src/astro-writing/horoscopeEditorialConstraints.mjs'));
console.log('PASS seasonal depth: multi-date direct Swiss positions, orbs, phases, simultaneous configurations, all audience houses; strict punctuation in queued/immediate/manual/publish paths; preserved response, editable recovery, no duplicate calls.');
