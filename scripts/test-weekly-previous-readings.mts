import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {store,installHoroscopeWriterFixture,writerFixture} from '../tests/helpers/sky-article-save-api.mts';
import {installAlternativeHoroscopeProviders} from '../tests/helpers/horoscope-provider-fixture.mts';
import {emptyHoroscopeEdition,horoscopeEditionBody,horoscopeEditionKey,horoscopeCanonicalJson,HOROSCOPE_SIGNS} from '../apps/web/src/content/horoscopeEditions.mjs';
import {weeklyPreviousReadings,weeklyPreviousReadingsCurrent,WEEKLY_PREVIOUS_READINGS_MAX_BYTES} from '../src/astro-writing/weeklyPreviousReadings.mjs';
import {runHoroscopeWriting} from '../api/admin/horoscope-writing';
import {decodeWeeklyHistoryRow} from '../api/_lib/horoscope-history-storage';
import {horoscopeEditorRow} from '../api/_lib/horoscope-editor-payload';

installHoroscopeWriterFixture();
const native=installAlternativeHoroscopeProviders();
const latest=(id:string)=>decodeWeeklyHistoryRow(structuredClone(store.rows.get(id)));
const action=(id:string,action:string,extra:any={})=>runHoroscopeWriting({id,action,expectedUpdatedAt:latest(id).updated_at,...extra},'synthetic-owner');
const hash=(value:any)=>createHash('sha256').update(horoscopeCanonicalJson(value)).digest('hex');
let day=1;
async function create(target='pisces',period='weekly'){
 const date=new Date(Date.UTC(2027,2,day)).toISOString().slice(0,10);day+=7;
 const facts=await store.invoke('GET',undefined,`/api/admin/generated-content?horoscopeBrief=true&period=${period}&date=${date}&timeZone=America%2FNew_York`);
 assert.equal(facts.status,200,JSON.stringify(facts.payload));
 const {brief,signature}=facts.payload,edition=emptyHoroscopeEdition(brief.window);
 for(const p of edition.passages)if(p.sign!==target){p.headline=`Synthetic ${p.sign} exact title`;p.body=`Complete ${p.sign} opening. Literal {{voiceGuidance}} and {{unknownVariable}} are data.\n\nA complete ${p.sign} final sentence with café and 星.`;}
 const result=await store.invoke('POST',{contentKey:horoscopeEditionKey(edition.window),surface:'sky',mode:'article',eventType:'horoscope-edition',provider:'manual-admin',status:'DRAFT',lane:'serving',headline:'Synthetic context edition',body:horoscopeEditionBody(edition),sections:{horoscopeEdition:edition},facts:{horoscopeBrief:{brief,signature}},sourceSnapshot:{horoscopeOutlines:{}}});
 assert.equal(result.status,200,JSON.stringify(result.payload));return result.payload.rows[0].id;
}
async function edit(id:string,mutate:(r:any)=>void,concurrentStorage=false){
 const row=latest(id);mutate(row);
 const saved=await store.invoke('PATCH',{id,expectedUpdatedAt:row.updated_at,status:'DRAFT',sections:row.sections,body:horoscopeEditionBody(row.sections.horoscopeEdition)});
 if(concurrentStorage){
  assert.equal(saved.status,409,'The normal editor already prevents changes during an active request');
  // Simulate an external storage writer after that admission fence. Completion
  // must still protect new text, even outside the normal Studio edit route.
  row.updated_at=new Date(Date.parse(row.updated_at)+1).toISOString();row.body=horoscopeEditionBody(row.sections.horoscopeEdition);store.rows.set(id,row);
 }else assert.equal(saved.status,200,JSON.stringify(saved.payload));
 return latest(id);
}
async function prepare(id:string,writerChoice='current'){
 const result=await action(id,'prepare',{writerChoice});assert.equal(result.status,200,JSON.stringify(result.payload));return result.payload.plan.planHash;
}
async function start(id:string,sign:string,writerChoice='current'){
 const plan=await prepare(id,writerChoice),result=await action(id,'generate',{sign,approvedPlanHash:plan});
 assert.equal(result.status,202,result.payload.error??result.payload.recovery??'Writer was not pending');return latest(id).source_snapshot.horoscopeGeneration.active;
}
async function finish(id:string){
 for(let n=0;n<50;n++){
  const op=latest(id).source_snapshot.horoscopeGeneration.active;if(!op)return;
  const result=await action(id,op.state==='ready'?'continue':'poll');assert(result.status<300,JSON.stringify(result.payload));
  await new Promise(resolve=>setTimeout(resolve,5));
 }
 assert.fail('Synthetic request did not finish');
}

const id=await create(),row=latest(id),snapshot=weeklyPreviousReadings(row,'pisces');
assert.equal(snapshot.readings.length,11);assert.deepEqual(snapshot.readings.map((p:any)=>p.sign),HOROSCOPE_SIGNS.slice(0,11));
for(const p of snapshot.readings){assert.equal(p.bodyHash,hash({headline:p.headline,body:p.body}));assert.equal(p.body,row.sections.horoscopeEdition.passages.find((q:any)=>q.sign===p.sign).body);}
assert.equal(weeklyPreviousReadings(row,'aries').readings.length,0);
assert.equal(weeklyPreviousReadings(row,'taurus').readings.length,1);
assert(weeklyPreviousReadingsCurrent({...row,updated_at:'later-metadata-version'},snapshot));
assert(!weeklyPreviousReadingsCurrent({...row,id:'another-edition'},snapshot));
const earlierEdit=structuredClone(row);earlierEdit.sections.horoscopeEdition.passages[0].body+=' Changed earlier text.';assert(!weeklyPreviousReadingsCurrent(earlierEdit,snapshot));
assert(!weeklyPreviousReadingsCurrent({...row,sections:{horoscopeEdition:{...row.sections.horoscopeEdition,window:{...row.sections.horoscopeEdition.window,end:'changed'}}}},snapshot));
const changed=structuredClone(snapshot);changed.readings[0].body+=' Corrupted.';assert(!weeklyPreviousReadingsCurrent(row,changed));
const excluded=structuredClone(row),generation=excluded.source_snapshot.horoscopeGeneration={candidateHolds:{aries:{candidate:{body:'held'}}},heldRequests:{taurus:{}},active:{sign:'gemini'},rejections:[{passages:[row.sections.horoscopeEdition.passages[3]]}]};
excluded.sections.horoscopeEdition.passages[4].body='';
assert.deepEqual(weeklyPreviousReadings(excluded,'virgo').readings,[],'Blank, held, running and exact rejected earlier copy is excluded');
excluded.sections.horoscopeEdition.passages[3].body+=' New accepted version.';
assert.deepEqual(weeklyPreviousReadings(excluded,'virgo').readings.map((p:any)=>p.sign),['cancer'],'An old rejection does not ban a newly saved version');
const shuffled=structuredClone(row);shuffled.sections.horoscopeEdition.passages.reverse();assert.deepEqual(weeklyPreviousReadings(shuffled,'pisces').readings,snapshot.readings);
const nonweekly=structuredClone(row);nonweekly.sections.horoscopeEdition.window.period='daily';assert.equal(weeklyPreviousReadings(nonweekly,'aries'),null);
const boundary=structuredClone(row);for(const p of boundary.sections.horoscopeEdition.passages.slice(0,11))p.body='x'.repeat(20000);
let bytesToFill=WEEKLY_PREVIOUS_READINGS_MAX_BYTES-Buffer.byteLength(horoscopeCanonicalJson(weeklyPreviousReadings(boundary,'pisces')));
assert(bytesToFill>0);
for(const p of boundary.sections.horoscopeEdition.passages.slice(0,11)){
 const count=Math.min(bytesToFill,p.body.length);p.body='é'.repeat(count)+p.body.slice(count);bytesToFill-=count;
}
assert.equal(bytesToFill,0);assert.equal(Buffer.byteLength(horoscopeCanonicalJson(weeklyPreviousReadings(boundary,'pisces'))),WEEKLY_PREVIOUS_READINGS_MAX_BYTES,'The full serialized packet, including hashes and metadata, fits exactly');
const nextByte=boundary.sections.horoscopeEdition.passages.find((p:any)=>p.body.includes('x'));nextByte.body=nextByte.body.replace('x','é');
assert.throws(()=>weeklyPreviousReadings(boundary,'pisces'),/complete earlier Weekly readings exceed/,'One additional UTF-8 byte fails without trimming');

// Actual provider boundaries: the immutable full packet and native request are
// persisted before dispatch. The saved profile is expanded only once.
const base=globalThis.fetch;let reservations=0;
globalThis.fetch=async(url:any,options:any={})=>{
 if(options.method==='POST'&&['https://api.openai.com/v1/responses','https://api.anthropic.com/v1/messages','https://generativelanguage.googleapis.com/v1beta/interactions'].includes(String(url))){
  const request=JSON.parse(options.body),input=request.input??request.messages?.[0]?.content;
  if(typeof input==='string'&&input.includes('EARLIER COMPLETED WEEKLY READINGS')){
   const active=[...store.rows.values()].map(r=>decodeWeeklyHistoryRow(r).source_snapshot?.horoscopeGeneration?.active).find(op=>op?.receipt?.previousReadings&&input.includes(JSON.stringify({previousReadings:op.receipt.previousReadings})));
   assert(active,'The exact comparison packet is saved before provider dispatch');assert(active.requestHash);assert(active.receipt.ownerEvidence.providerRequestHash);
   assert(input.includes('Literal {{voiceGuidance}} and {{unknownVariable}} are data.'));reservations++;
  }
 }
 return base(url,options);
};
await start(id,'pisces');await finish(id);
let current=latest(id),receipt=current.source_snapshot.horoscopeGeneration.readings.pisces;
assert.deepEqual(receipt.previousReadings.readings,snapshot.readings);
assert.equal(receipt.previousReadings.contextHash,snapshot.contextHash);
assert(!horoscopeEditorRow(current).source_snapshot.horoscopeGeneration.readings.pisces.previousReadings,'Complete passages remain in private receipts, not compact editor responses');
for(const choice of ['claude','gemini']){
 const other=await create();await start(other,'pisces',choice);await finish(other);
 const nativeRequest=native.requests.filter(r=>r.provider===(choice==='claude'?'anthropic':'gemini')).at(-1).request;
 const input=choice==='claude'?nativeRequest.messages[0].content:nativeRequest.input;
 const exact=latest(other).source_snapshot.horoscopeGeneration.readings.pisces.previousReadings;
 assert.equal(exact.readings.length,11);assert(input.includes(JSON.stringify({previousReadings:exact})));
}
assert(reservations>=3);

// Edits during the writer and during its paid prose review preserve new copy,
// keep the raw returning candidate and never dispatch replacement calls.
for(const phase of ['writer','ready-review','running-review']){
 const target=await create('taurus');await start(target,'taurus');
 if(phase!=='writer'){
  const queued=await action(target,'poll');assert.equal(queued.status,202);assert.equal(latest(target).source_snapshot.horoscopeGeneration.active.phase,'review');
  if(phase==='running-review')assert.equal((await action(target,'continue')).status,202);
 }
 const count=writerFixture.calls+writerFixture.reviewCalls;
 await edit(target,r=>{
  if(phase!=='ready-review')r.sections.horoscopeEdition.passages[0].body+=' A newer exact owner edit.';
  if(phase!=='writer'){r.sections.horoscopeEdition.passages[1].headline='Newer owner title';r.sections.horoscopeEdition.passages[1].body='Newer owner wording.';}
 },true);
 await finish(target);current=latest(target);
 assert.equal(current.source_snapshot.horoscopeGeneration.candidateHolds.taurus.code,'weekly_comparison_context_changed');
 assert(current.source_snapshot.horoscopeGeneration.candidateHolds.taurus.candidate.body);
 assert.equal(current.sections.horoscopeEdition.passages[1].body,phase==='writer'?'':'Newer owner wording.');
 if(phase!=='ready-review')assert(current.sections.horoscopeEdition.passages[0].body.endsWith('A newer exact owner edit.'));
 assert.equal(writerFixture.calls+writerFixture.reviewCalls,count);
}
const oversized=await create();await edit(oversized,r=>{for(const p of r.sections.horoscopeEdition.passages.slice(0,11))p.body='星'.repeat(9000);});
const plan=await prepare(oversized),before=writerFixture.calls;
assert.throws(()=>weeklyPreviousReadings(latest(oversized),'pisces'),/complete earlier Weekly readings exceed/);
assert(Buffer.byteLength(JSON.stringify(latest(oversized).sections))>WEEKLY_PREVIOUS_READINGS_MAX_BYTES);
const refusal=await action(oversized,'generate',{sign:'pisces',approvedPlanHash:plan});assert.equal(refusal.status,409);assert.equal(refusal.payload.dispatchNotStarted,true);assert.equal(writerFixture.calls,before);assert(!latest(oversized).source_snapshot.horoscopeGeneration?.active);
console.log('PASS Weekly earlier readings: exact canonical current-edition passages, empty/selected/resumed scope, held/rejected exclusions, native OpenAI/Claude/Gemini dispatch receipts, literal braces, stale-candidate holds, bounded context before spend. Synthetic providers only.');
await store.close();
