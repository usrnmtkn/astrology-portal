import assert from 'node:assert/strict';
import {store,installHoroscopeWriterFixture,invokeHoroscopeWriting,writerFixture} from '../tests/helpers/sky-article-save-api.mts';
import {emptyHoroscopeEdition,horoscopeEditionBody,horoscopeEditionKey,horoscopeEditionAt} from '../apps/web/src/content/horoscopeEditions.mjs';
import {validateHoroscopeReading} from '../src/astro-writing/horoscopeValidation.mjs';
import {prepareHoroscopeBrief} from '../api/_lib/horoscope-editions';
installHoroscopeWriterFixture();
const prepared=await store.invoke('GET',undefined,'/api/admin/generated-content?horoscopeBrief=true&period=weekly&date=2026-09-24&timeZone=Asia/Tokyo');
assert.equal(prepared.status,200,JSON.stringify(prepared.payload));
const {brief,signature}=prepared.payload;
let edition=emptyHoroscopeEdition(brief.window);
const created=await store.invoke('POST',{contentKey:horoscopeEditionKey(edition.window),surface:'sky',mode:'article',eventType:'horoscope-edition',provider:'manual-admin',targetDate:null,status:'DRAFT',lane:'serving',reviewState:null,headline:'Synthetic horoscope edition',body:horoscopeEditionBody(edition),sections:{horoscopeEdition:edition},facts:{horoscopeBrief:{brief,signature}},sourceSnapshot:{}});
assert.equal(created.status,200,JSON.stringify(created.payload));let row=created.payload.rows[0];
const action=(action:string,extra:any={})=>invokeHoroscopeWriting({action,id:row.id,expectedUpdatedAt:row.updated_at,...extra});
assert.equal((await invokeHoroscopeWriting({action:'prepare',id:row.id,expectedUpdatedAt:row.updated_at},'wrong')).status,401);
assert.equal((await action('generate',{sign:'aries',approvedPlanHash:'wrong'})).status,409);assert.equal(writerFixture.calls,0);
const plan=await action('prepare');assert.equal(plan.status,200,JSON.stringify(plan.payload));assert.equal(plan.payload.plan.readings.length,12);assert.equal(writerFixture.calls,0);
const planHash=plan.payload.plan.planHash;
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
console.log('PASS horoscope generation: actual handlers, governed provider request, twelve persisted drafts, reload recovery, no duplicate calls, conflicts, explicit publication, fact checks and local date-line/fractional zones.');
