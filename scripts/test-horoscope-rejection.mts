import assert from 'node:assert/strict';
import fs,{globSync} from 'node:fs';
import {createHash,createHmac} from 'node:crypto';
import {store,installHoroscopeWriterFixture,invokeHoroscopeWritingWithReview as invokeHoroscopeWriting,writerFixture} from '../tests/helpers/sky-article-save-api.mts';
import {emptyHoroscopeEdition,horoscopeEditionKey,horoscopeEditionBody,horoscopeCanonicalJson} from '../apps/web/src/content/horoscopeEditions.mjs';
import {defaultHoroscopeProfile} from '../src/astro-writing/horoscopeWritingProfiles.mjs';
installHoroscopeWriterFixture();
const deployment=JSON.parse(fs.readFileSync('vercel.json','utf8'));
const packaged=new Set(globSync(deployment.functions['api/admin/horoscope-writing.ts'].includeFiles));
assert(globSync('node_modules/swisseph-wasm/wasm/*').every(file=>packaged.has(file)),'Draft reset must deploy its Swiss calculation assets');
assert(globSync(deployment.functions['api/**/*.ts'].includeFiles).every(file=>packaged.has(file)),'Keep the existing writing runtime assets');
for(const period of ['daily','weekly','seasonal'] as const){
 const prepared=await store.invoke('GET',undefined,`/api/admin/generated-content?horoscopeBrief=true&period=${period}&date=2026-09-24&timeZone=Asia/Tokyo`);
 assert.equal(prepared.status,200,JSON.stringify(prepared.payload));
 const packet={brief:prepared.payload.brief,signature:prepared.payload.signature};
 // A correctly signed legacy brief has narrower event coverage.
 packet.brief.events=packet.brief.events.filter((e:any)=>e.type!=='ingress'&&(period!=='weekly'||e.type!=='aspect'));
 packet.signature=createHmac('sha256',process.env.SUPABASE_SERVICE_ROLE_KEY!).update('horoscope-brief/v1\n'+horoscopeCanonicalJson(packet.brief)).digest('hex');
 const edition=emptyHoroscopeEdition(packet.brief.window);
 edition.passages=edition.passages.map(p=>({...p,headline:`Fixture ${p.sign}`,body:`Fixture ${p.sign} complete opening.\n\nFixture complete ending.`}));
 const receipts=Object.fromEntries(edition.passages.map(p=>[p.sign,{bodyHash:'old-fixture',lint:{violations:[{detail:'Previous fixture diagnostic'}]}}]));
 const created=await store.invoke('POST',{contentKey:horoscopeEditionKey(edition.window),surface:'sky',mode:'article',eventType:'horoscope-edition',provider:'manual-admin',status:'DRAFT',lane:'serving',headline:'Rejection fixture',body:horoscopeEditionBody(edition),sections:{horoscopeEdition:edition},facts:{horoscopeBrief:packet},sourceSnapshot:{horoscopeOutlines:{aries:'Previous private outline',taurus:'Keep this outline'},horoscopeGeneration:{readings:receipts},editorialImport:{originalSource:'PRIVATE ORIGINAL IMPORT'}}});
 assert.equal(created.status,200,JSON.stringify(created.payload));let row=created.payload.rows[0];
 if(period==='weekly'){
  row.source_snapshot.retainedEvidence='Synthetic retained history. '.repeat(650000);
  row.review_state='needs_review';row.reviewed_at='2026-01-01T00:00:00Z';store.rows.set(row.id,row);
 }
 const original=structuredClone(row),calls=writerFixture.calls;
 const checkpointBodies:any[]=[];const originalTransport=globalThis.fetch;let loseRejectionAck=period==='weekly';
 globalThis.fetch=async(input:any,options:any)=>{
  if(period==='weekly'&&options?.method==='PATCH'&&String(input).includes('updated_at='))throw new Error('Full Weekly document PATCH is not a reliable rejection transport');
  if(String(input).includes('/rpc/checkpoint_weekly_horoscope'))checkpointBodies.push(JSON.parse(options.body));
  const response=await originalTransport(input,options);
  if(loseRejectionAck&&String(input).includes('/rpc/checkpoint_weekly_horoscope')){
   loseRejectionAck=false;
   Object.defineProperty(response,'json',{value:async()=>{throw new DOMException('Synthetic lost rejection acknowledgement','AbortError');}});
  }
  return response;
 };
 const action=(sign:string,extra:any={})=>invokeHoroscopeWriting({action:'reject',id:row.id,expectedUpdatedAt:row.updated_at,sign,...extra});
 assert.equal((await invokeHoroscopeWriting({action:'reject',id:row.id,expectedUpdatedAt:row.updated_at,sign:'all'},'wrong')).status,401);
 assert.equal((await action('invalid')).status,400);
 assert.equal((await action('all',{expectedUpdatedAt:'old'})).status,409);
 store.rows.set(row.id,{...row,status:'LIVE'});assert.equal((await action('all')).status,409);store.rows.set(row.id,row);
 store.rows.set(row.id,{...row,source_snapshot:{...row.source_snapshot,horoscopeGeneration:{...row.source_snapshot.horoscopeGeneration,active:{id:'fixture-running'}}}});
 assert.equal((await action('all')).status,409);store.rows.set(row.id,row);
 const profile=defaultHoroscopeProfile(period);profile.voiceGuidance+=' Fixture latest instructions.';
 const profileResult=await store.invoke('POST',{profile,expectedUpdatedAt:null},'/api/admin/generated-content?writingProfiles=true');assert.equal(profileResult.status,200);
 const result=await action('aries');assert.equal(result.status,200,JSON.stringify(result.payload));row=result.payload.rows[0];
 assert.equal(writerFixture.calls,calls,'Rejection must not call the provider');
 assert.deepEqual(row.sections.horoscopeEdition.passages.find((p:any)=>p.sign==='aries'),{sign:'aries',headline:'',body:''});
 assert.deepEqual(row.sections.horoscopeEdition.passages.filter((p:any)=>p.sign!=='aries'),edition.passages.filter(p=>p.sign!=='aries'));
 assert.deepEqual(row.facts,original.facts,'One rejection preserves the other readings’ governed facts');
 assert.deepEqual(row.source_snapshot.studioWritingProfile,profileResult.payload.profile);
 assert.deepEqual(row.source_snapshot.horoscopeOutlines,{taurus:'Keep this outline'});
 assert.equal(row.source_snapshot.horoscopeGeneration.readings.aries,undefined);
 assert.deepEqual(row.source_snapshot.horoscopeGeneration.readings.taurus,receipts.taurus);
 let history=row.source_snapshot.horoscopeGeneration.rejections;
 assert.deepEqual(history[0].passages,[edition.passages.find(p=>p.sign==='aries')]);
 assert.equal(history[0].passagesHash,createHash('sha256').update(horoscopeCanonicalJson(history[0].passages)).digest('hex'));
 assert.deepEqual(history[0].facts,original.facts);assert.deepEqual(history[0].generation.readings,receipts);
 assert.deepEqual(history[0].editorialImport,original.source_snapshot.editorialImport);
 assert.equal((await action('aries')).status,409);
 const checkpointTransport=globalThis.fetch;globalThis.fetch=originalTransport;
 const protectedSave=await store.invoke('PATCH',{id:row.id,expectedUpdatedAt:row.updated_at,sourceSnapshot:{...row.source_snapshot,horoscopeGeneration:null}});
 assert.equal(protectedSave.status,200);row=protectedSave.payload.rows[0];assert.deepEqual(row.source_snapshot.horoscopeGeneration.rejections,history,'Generic saves cannot erase rejection history');
 globalThis.fetch=checkpointTransport;
 const plan=await invokeHoroscopeWriting({action:'prepare',id:row.id,expectedUpdatedAt:row.updated_at});assert.equal(plan.status,200);
 const generation=await invokeHoroscopeWriting({action:'generate',id:row.id,expectedUpdatedAt:row.updated_at,sign:'aries',approvedPlanHash:plan.payload.plan.planHash});assert.equal(generation.status,202,JSON.stringify(generation.payload));row=generation.payload.rows[0];
 assert.equal((await action('all')).status,409,'An active replacement cannot be discarded');
 const advance=async(action:string,expectedStatus:number)=>{const result=await invokeHoroscopeWriting({action,id:row.id,expectedUpdatedAt:row.updated_at});assert.equal(result.status,expectedStatus,JSON.stringify(result.payload));row=result.payload.rows[0];};
 await advance('poll',period==='seasonal'?202:200);
 if(period==='seasonal'){
  while(row.source_snapshot.horoscopeGeneration.active){const active=row.source_snapshot.horoscopeGeneration.active;const r=await invokeHoroscopeWriting({action:active.state==='ready'?'continue':'poll',id:row.id,expectedUpdatedAt:row.updated_at});assert([200,202].includes(r.status),JSON.stringify(r.payload));row=r.payload.rows[0];}
  const prose=[...writerFixture.requests.values()].findLast((r:any)=>r.sign==='aries'&&r.input.includes('COMPACT SEASONAL DEVELOPMENT PLAN'));
  assert(prose.input.includes('Fixture latest instructions.'),'Private replacement writer uses latest saved instructions');
  assert.equal(row.sections.horoscopeEdition.passages.find((p:any)=>p.sign==='aries').body,'','Private candidate cannot replace a rejected reader draft');
 }else{
  assert([...writerFixture.requests.values()].at(-1).input.includes('Fixture latest instructions.'),'Replacement requests use the latest saved instructions');
  assert(row.sections.horoscopeEdition.passages.find((p:any)=>p.sign==='aries').body.includes('complete aries fixture opening'));
 }
 const beforeAll=structuredClone(row),beforeVersion=row.updated_at;
 const reset=await action('all');assert.equal(reset.status,200,JSON.stringify(reset.payload));row=reset.payload.rows[0];
 assert.equal(writerFixture.calls,calls+(period==='seasonal'?6:1),'Resetting all drafts adds no billed call');
 assert(row.sections.horoscopeEdition.passages.every((p:any)=>!p.body&&!p.headline));
 assert.deepEqual(row.sections.horoscopeEdition.window,edition.window);
 assert.deepEqual(row.source_snapshot.studioWritingProfile,profileResult.payload.profile);
 assert.deepEqual(row.source_snapshot.horoscopeGeneration.readings,{});
 assert.deepEqual(row.source_snapshot.horoscopeOutlines,{});
 assert.equal(row.source_snapshot.editorialImport,null);
 history=row.source_snapshot.horoscopeGeneration.rejections;assert.equal(history.length,2);
 assert.deepEqual(history[1].passages,beforeAll.sections.horoscopeEdition.passages);
 assert.deepEqual(history[1].generation.readings,beforeAll.source_snapshot.horoscopeGeneration.readings);
 assert.equal(history[1].generation.rejections,undefined,'History does not recursively duplicate itself');
 assert.equal((await action('all',{expectedUpdatedAt:beforeVersion})).status,409,'Replaying a rejection cannot clear replacement drafts');
 assert.equal((await action('all')).status,409);
 const freshPlan=await invokeHoroscopeWriting({action:'prepare',id:row.id,expectedUpdatedAt:row.updated_at});assert.equal(freshPlan.status,200);
 assert.notEqual(freshPlan.payload.plan.planHash,plan.payload.plan.planHash,'Reset requires a fresh plan approval');
 if(period!=='daily')assert(row.facts.horoscopeBrief.brief.events.some((e:any)=>e.type==='ingress'),'All-draft reset refreshes old event coverage');
 if(period==='weekly'){
  assert(row.facts.horoscopeBrief.brief.events.some((e:any)=>e.type==='aspect'),'Regenerating a legacy Weekly edition acquires major planetary aspects');
  assert.deepEqual(history[1].facts,beforeAll.facts,'Historical facts stay exact when the next plan gains aspects');
 }
 if(period==='weekly'){
  assert.equal(row.source_snapshot.retainedEvidence,original.source_snapshot.retainedEvidence);
  assert.equal(row.review_state,null);assert.equal(row.reviewed_at,null);
  assert(checkpointBodies.length>0);assert(checkpointBodies.every(body=>!JSON.stringify(body).includes(original.source_snapshot.retainedEvidence)));
 }
 globalThis.fetch=originalTransport;
 // A concurrent edit between read and checkpoint wins over the reset.
 store.rows.set(row.id,beforeAll);row=beforeAll;
 const transport=globalThis.fetch;
 globalThis.fetch=async(input:any,options:any)=>{
  if(options?.method==='PATCH'&&String(input).includes('updated_at=')||String(input).includes('/rpc/checkpoint_weekly_horoscope'))store.rows.set(row.id,{...row,updated_at:new Date(Date.now()+10000).toISOString()});
  return transport(input,options);
 };
 try{assert.equal((await action('all')).status,409);assert.deepEqual(store.rows.get(row.id).sections,beforeAll.sections);}finally{globalThis.fetch=transport;}
}
console.log('Horoscope rejection: exact history, one/all reset, refreshed instructions/facts, conflict and active-request protection passed.');
