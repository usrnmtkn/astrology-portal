import assert from 'node:assert/strict';
import {store} from '../tests/helpers/sky-article-save-api.mts';
import {deleteHoroscopeEdition} from '../apps/admin/src/horoscopeEditionDeletion';
import {emptyHoroscopeEdition,horoscopeEditionKey,horoscopeEditionBody} from '../apps/web/src/content/horoscopeEditions.mjs';
import {readerRouteResponse} from '../tests/helpers/content-reader-route.mjs';

async function create(period:string,date:string){
 const facts=await store.invoke('GET',undefined,`/api/admin/generated-content?horoscopeBrief=true&period=${period}&date=${date}&timeZone=America%2FNew_York`);
 assert.equal(facts.status,200,JSON.stringify(facts.payload));
 const {brief,signature}=facts.payload,edition=emptyHoroscopeEdition(brief.window);
 for(const p of edition.passages){p.headline='Synthetic '+p.sign;p.body='You can read this complete synthetic '+p.sign+' opening. Your exact complete ending remains intact.';}
 const result=await store.invoke('POST',{contentKey:horoscopeEditionKey(edition.window),surface:'sky',mode:'article',eventType:'horoscope-edition',provider:'manual-admin',status:'DRAFT',lane:'serving',headline:'Synthetic deletion edition',body:horoscopeEditionBody(edition),sections:{horoscopeEdition:edition},facts:{horoscopeBrief:{brief,signature}},sourceSnapshot:{}});
 assert.equal(result.status,200,JSON.stringify(result.payload));return result.payload.rows[0];
}
const originals=structuredClone([...store.rows.values()]);
const row=await create('daily','2026-10-28');
let calls:any[]=[],confirmation='';
const request=async(url:string,body?:unknown,method='GET')=>{
 calls.push({url,body,method});const result=await store.invoke(method,body,url);
 if(result.status>=400)throw Object.assign(new Error(result.payload.error),{status:result.status});return result.payload;
};
assert.equal(await deleteHoroscopeEdition(row,request,text=>{confirmation=text;return false;}),false);
assert.match(confirmation,/Daily.*October 28, 2026/);assert.match(confirmation,/all 12 saved readings/);assert.match(confirmation,/cannot be undone/);
assert.equal(calls.length,0);assert(store.rows.has(row.id));
assert.equal((await store.invoke('DELETE',undefined,'/api/admin/generated-content?'+new URLSearchParams({id:row.id,expectedUpdatedAt:row.updated_at}),'wrong')).status,401);
assert.equal(await deleteHoroscopeEdition(row,request,()=>true),true);
assert.equal(calls.length,1);assert.equal(calls[0].method,'DELETE');assert.equal(calls[0].body,undefined);
assert.equal(new URL(calls[0].url,'http://localhost').searchParams.get('expectedUpdatedAt'),row.updated_at);
assert(!store.rows.has(row.id));

// Every period supports exact-version deletion of its archived edition.
for(const [period,date]of [['weekly','2026-11-02'],['monthly','2026-11-02'],['seasonal','2026-11-02']]){
 const draft=await create(period,date),result=await store.invoke('PATCH',{id:draft.id,expectedUpdatedAt:draft.updated_at,status:'ARCHIVED'});
 assert.equal(result.status,200);calls=[];
 assert.equal(await deleteHoroscopeEdition(result.payload.rows[0],request,()=>true),true);assert.equal(calls.length,1);
}
const stale=await create('daily','2026-10-29');
const newer=await store.invoke('PATCH',{id:stale.id,expectedUpdatedAt:stale.updated_at,summary:'Exact newer owner metadata.'});
assert.equal(newer.status,200);calls=[];
await assert.rejects(deleteHoroscopeEdition(stale,request,()=>true),/changed/);
assert.equal(calls.length,1,'A stale version is never retried');assert.deepEqual(store.rows.get(stale.id),newer.payload.rows[0]);
for(const generation of [
 {active:{id:'synthetic-active'}},{batch:{status:'running'}},
 {weeklyEditorial:{pending:{id:'synthetic-weekly-review'}}},
 {dailyEditorial:{version:'daily-batch-editorial/v1',pending:{id:'synthetic-daily-review'}}}
]){
 const held=structuredClone(newer.payload.rows[0]);held.source_snapshot.horoscopeGeneration=generation;store.rows.set(held.id,held);
 calls=[];await assert.rejects(deleteHoroscopeEdition(held,request,()=>true),/Finish or explicitly release/);
 assert.equal(calls.length,1);assert.deepEqual(store.rows.get(held.id),held);
}
store.rows.set(stale.id,newer.payload.rows[0]);
const racing=await create('daily','2026-11-01'),baseFetch=globalThis.fetch;
const raced={...structuredClone(racing),updated_at:new Date(Date.parse(racing.updated_at)+1000).toISOString(),summary:'Exact owner change made between read and DELETE.'};
let intercepted=false;
globalThis.fetch=async(input:any,options:any={})=>{
 if(options.method==='DELETE'&&new URL(String(input)).searchParams.get('id')==='eq.'+racing.id){intercepted=true;store.rows.set(racing.id,raced);}
 return baseFetch(input,options);
};
try{await assert.rejects(deleteHoroscopeEdition(racing,request,()=>true),/changed/);}finally{globalThis.fetch=baseFetch;}
assert(intercepted);assert.deepEqual(store.rows.get(racing.id),raced,'The DELETE predicate preserves a change made after the handler read');

// A lost successful reply needs only a readback. A connection failure with a
// surviving row stays an error; neither path automatically dispatches again.
const lost=await create('daily','2026-10-30');calls=[];
const lostReply=async(url:string,body?:unknown,method='GET')=>{
 const result=await request(url,body,method);
 if(method==='DELETE')throw Object.assign(new Error('Synthetic unreadable successful reply.'),{status:200});return result;
};
assert.equal(await deleteHoroscopeEdition(lost,lostReply,()=>true),true);
assert.deepEqual(calls.map(c=>c.method),['DELETE','GET']);
const remaining=await create('daily','2026-10-31');calls=[];
const unavailable=async(url:string,body?:unknown,method='GET')=>{
 if(method==='DELETE'){calls.push({method});throw Object.assign(new Error('Synthetic storage unavailable.'),{status:503});}
 return request(url,body,method);
};
await assert.rejects(deleteHoroscopeEdition(remaining,unavailable,()=>true),/Synthetic storage unavailable/);
assert.deepEqual(calls.map(c=>c.method),['DELETE','GET']);assert(store.rows.has(remaining.id));
const live=await create('weekly','2026-11-16'),published=await store.invoke('PATCH',{id:live.id,expectedUpdatedAt:live.updated_at,status:'LIVE'});
assert.equal(published.status,200,JSON.stringify(published.payload));calls=[];
await assert.rejects(deleteHoroscopeEdition(published.payload.rows[0],request,()=>true),/Archive the published/);assert.equal(calls.length,0);
assert.equal((await store.invoke('DELETE',undefined,'/api/admin/generated-content?'+new URLSearchParams({id:live.id,expectedUpdatedAt:published.payload.rows[0].updated_at}))).status,409);
const revisionEdition=structuredClone(live.sections.horoscopeEdition);revisionEdition.passages[0].body+=' Exact private revision ending.';
const revised=await store.invoke('PATCH',{id:live.id,expectedUpdatedAt:published.payload.rows[0].updated_at,sections:{horoscopeEdition:revisionEdition},body:horoscopeEditionBody(revisionEdition)});
assert.equal(revised.status,200,JSON.stringify(revised.payload));assert.notEqual(revised.payload.rows[0].id,live.id);
assert.equal(await deleteHoroscopeEdition(revised.payload.rows[0],request,message=>{assert.match(message,/Weekly draft revision/);return true;}),true);
assert.deepEqual(store.rows.get(live.id),published.payload.rows[0]);
const response=await readerRouteResponse('/api/content-reader',{method:'POST',body:JSON.stringify({ids:[live.id]})});
assert.equal((await response.json()).rows[0].body,live.body);
for(const original of originals)assert.deepEqual(store.rows.get(original.id),original,'Unrelated source/example rows remain exact');

console.log('PASS horoscope deletion API/client contract: confirmation, four periods, exact versions, active/pending/published protection, concurrent edits, lost replies and unchanged sources/readers. No PostgreSQL or model calls.');
