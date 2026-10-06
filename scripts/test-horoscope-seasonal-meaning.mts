import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {resolveSeasonalMeaning,seasonalMeaningForRising,SEASONAL_MEANING_BANK} from '../src/astro-writing/seasonalHoroscopeMeaning.mjs';
import {seasonalDateFindings} from '../src/astro-writing/horoscopeSeasonalDates.mjs';
import {validateHoroscopeReading} from '../src/astro-writing/horoscopeValidation.mjs';
import {HOROSCOPE_SIGNS,emptyHoroscopeEdition,horoscopeEditionKey,horoscopeEditionBody} from '../apps/web/src/content/horoscopeEditions.mjs';
import {store,editorialFixtureRows,installHoroscopeWriterFixture,invokeHoroscopeWriting,writerFixture} from '../tests/helpers/sky-article-save-api.mts';
const packaged=new Set(fs.globSync(JSON.parse(fs.readFileSync('vercel.json','utf8')).functions['api/admin/horoscope-writing.ts'].includeFiles));
assert(packaged.has(SEASONAL_MEANING_BANK),'The deployed writer must include the actual source bank.');
const bank=JSON.parse(fs.readFileSync(SEASONAL_MEANING_BANK,'utf8'));
const original=JSON.stringify(bank);
const houses=JSON.parse(fs.readFileSync('packages/astro-knowledge/data/primitives/houses.json','utf8')).entries;
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
for(const seasonSign of HOROSCOPE_SIGNS){
 const brief={window:{period:'seasonal',seasonSign},positions:[{planet:'Sun',sign:seasonSign}]};
 const meaning=resolveSeasonalMeaning(brief,bank);
 assert.equal(meaning.sources.length,2);assert.equal(meaning.seasonSign,seasonSign);
 for(const source of meaning.sources){
  assert.equal(source.bodySha256,hash(source.body));assert.equal(source.wordCount,source.body.trim().split(/\s+/u).length);
  const [collection,id]=source.provenance.sourceId.split('/').slice(-2);
  assert.equal(source.body,bank.collections.find((c:any)=>c.id===collection).entries.find((e:any)=>e.id===id).body);
 }
 for(const rising of HOROSCOPE_SIGNS){
  const bound=seasonalMeaningForRising(meaning,rising,houses);
  assert.equal(bound.seasonSign,seasonSign);assert.equal(bound.areas[0].house,(HOROSCOPE_SIGNS.indexOf(seasonSign)-HOROSCOPE_SIGNS.indexOf(rising)+12)%12+1);
  assert.equal(bound.areas[1].house,(bound.areas[0].house+5)%12+1);assert.deepEqual(bound.sources,meaning.sources);
 }
}
assert.equal(JSON.stringify(bank),original);
assert.equal(resolveSeasonalMeaning({window:{period:'weekly'}},null),null);
assert.throws(()=>resolveSeasonalMeaning({window:{period:'seasonal',seasonSign:'libra'},positions:[{planet:'Sun',sign:'virgo'}]},bank),/must agree/);

installHoroscopeWriterFixture();
const packet=await store.invoke('GET',undefined,'/api/admin/generated-content?horoscopeBrief=true&period=seasonal&date=2026-09-24&timeZone=America/New_York');
assert.equal(packet.status,200);const {brief,signature}=packet.payload;
const edition=emptyHoroscopeEdition(brief.window);
const created=await store.invoke('POST',{contentKey:horoscopeEditionKey(edition.window),surface:'sky',mode:'article',eventType:'horoscope-edition',provider:'manual-admin',status:'DRAFT',lane:'serving',headline:'Synthetic seasonal sources',body:horoscopeEditionBody(edition),sections:{horoscopeEdition:edition},facts:{horoscopeBrief:{brief,signature}}});
assert.equal(created.status,200);let row=created.payload.rows[0];
const act=(action:string,extra:any={})=>invokeHoroscopeWriting({action,id:row.id,expectedUpdatedAt:row.updated_at,...extra});
const baseline=await act('prepare');assert.equal(baseline.status,200);
const key='fallback-hook/zodiac-season-polar-axis/libra';
const source={id:'synthetic-axis-source',content_key:key,status:'DRAFT',updated_at:'2026-09-30T00:00:00Z',sections:{packageDraft:{body:'Complete synthetic axis opening.\n\nComplete synthetic axis ending.'}}};
store.rows.set(source.id,source);
store.rows.set('synthetic-archived-axis',{...source,id:'synthetic-archived-axis',status:'ARCHIVED',updated_at:'2026-10-01T00:00:00Z',sections:{packageDraft:{body:'Archived source must not be selected.'}}});
store.rows.set('synthetic-live-axis',{...source,id:'synthetic-live-axis',status:'LIVE',updated_at:'2026-10-01T00:00:00Z',sections:{packageRecord:{body:'Live source must not replace the editable draft.'}}});
const changed=await act('prepare');assert.equal(changed.status,200);
assert.notEqual(changed.payload.plan.planHash,baseline.payload.plan.planHash);
assert.notEqual(changed.payload.plan.sourceHash,baseline.payload.plan.sourceHash);
const selected=changed.payload.plan.readings[0].seasonalMeaning.sources[1];
assert.equal(selected.body,source.sections.packageDraft.body);assert.equal(selected.provenance.rowId,source.id);
assert.equal(selected.provenance.updatedAt,source.updated_at);
assert.equal((await act('generate',{sign:'aries',approvedPlanHash:baseline.payload.plan.planHash})).status,409);
assert.equal(writerFixture.calls,0);
const originalSource=structuredClone(source);
source.sections.packageDraft.body='';
const missing=await act('prepare');assert.equal(missing.status,409);assert.match(missing.payload.error,/Complete the shared learning-axis source/);
assert.equal(writerFixture.calls,0);source.sections.packageDraft.body=originalSource.sections.packageDraft.body;
let generated=await act('generate',{sign:'aries',approvedPlanHash:changed.payload.plan.planHash});assert.equal(generated.status,202);row=generated.payload.rows[0];
// A saved response retains the source snapshot from its request, even after a later source edit.
source.updated_at='2026-10-01T01:00:00Z';source.sections.packageDraft.body='Later synthetic source, for future plans.';
while(row.source_snapshot.horoscopeGeneration.active){generated=await act(row.source_snapshot.horoscopeGeneration.active.state==='ready'?'continue':'poll');assert([200,202].includes(generated.status),JSON.stringify(generated.payload));row=generated.payload.rows[0];}
const privateRun=editorialFixtureRows.get(row.source_snapshot.horoscopeGeneration.editorialRuns.aries.id).state;
assert.equal(privateRun.input.template.seasonalPreparation.engineFacts.seasonalMeaning.sources[1].body,originalSource.sections.packageDraft.body);
assert.equal(row.status,'DRAFT');assert.equal(writerFixture.calls,6);
assert.equal(row.sections.horoscopeEdition.passages.find((p:any)=>p.sign==='aries').body,'');
const request:any=[...writerFixture.requests.values()][0];assert(request.input.includes(originalSource.sections.packageDraft.body.replaceAll('\n','\\n')));
const actualFetch=globalThis.fetch;
globalThis.fetch=async(input:any,init:any)=>String(input).includes('content_key=in.')?Response.json({error:'fixture read failure'},{status:503}):actualFetch(input,init);
assert.equal((await act('prepare')).status,502);assert.equal(writerFixture.calls,6);globalThis.fetch=actualFetch;

// Explicit synthetic instants test date-line conversion, event association and year boundaries.
const dateBrief={window:{period:'seasonal',timeZone:'America/New_York',startsAt:'2026-09-01T00:00:00Z',endsAt:'2026-10-20T00:00:00Z'},positions:[{planet:'Sun',sign:'libra'}],events:[
 {id:'lunation-full-moon-fixture',type:'lunation',sign:'aries',startsAt:'2026-10-03T01:00:00Z'},
 {id:'ingress-fixture',type:'ingress',planet:'Venus',sign:'libra',startsAt:'2026-10-09T12:00:00Z'}]};
assert.deepEqual(seasonalDateFindings('Your focus changes around the October 2 Aries Full Moon.',dateBrief),[]);
assert(seasonalDateFindings('On October 9, the Aries Full Moon brings focus.',dateBrief).length);
assert(seasonalDateFindings('On October 3, the Aries Full Moon brings focus.',dateBrief).length);
const sydney={...dateBrief,window:{...dateBrief.window,timeZone:'Australia/Sydney'}};
assert.deepEqual(seasonalDateFindings('On October 3, the Full Moon in Aries brings focus.',sydney),[]);
assert.deepEqual(seasonalDateFindings('Venus enters Libra on October 9.',sydney),[]);
assert(seasonalDateFindings('Venus enters Libra on October 9, 2025.',sydney).length);
assert.deepEqual(seasonalDateFindings('Venus enters Libra on October 9, 2026.',sydney),[]);
const factErrors=(body:string,b:any=dateBrief)=>validateHoroscopeReading({sign:'aries',headline:'Aries & Aries Rising',body},b).violations.filter((v:any)=>v.category==='horoscope_fact_boundary');
assert.equal(factErrors('Your focus changes around the October 2 Aries Full Moon.').length,0);
assert(factErrors('Your focus changes at 12:30 on October 2.').length);
assert(factErrors('Your focus changes on October 2.',{...dateBrief,window:{...dateBrief.window,period:'weekly'}}).length);
console.log('PASS seasonal meaning: all 144 season/audience mappings, exact whole sources, saved-source precedence, source conflicts, empty/failure safety, immutable generation receipt, calendar dates and time zones.');
