import assert from 'node:assert/strict';
import {store,installHoroscopeWriterFixture,invokeHoroscopeWriting,writerFixture} from '../tests/helpers/sky-article-save-api.mts';
import {emptyHoroscopeEdition,horoscopeEditionBody,horoscopeEditionKey} from '../apps/web/src/content/horoscopeEditions.mjs';
import {runWeeklyHoroscopeBatch} from '../api/_lib/horoscope-batch';
import {runHoroscopeWriting} from '../api/admin/horoscope-writing';

installHoroscopeWriterFixture();
for(const period of ['daily','weekly','monthly','seasonal']){
 const result=await store.invoke('GET',undefined,`/api/admin/generated-content?horoscopeBrief=true&period=${period}&date=2026-10-29&timeZone=America%2FNew_York`);
 assert.equal(result.status,200,JSON.stringify(result.payload));
 const edition=emptyHoroscopeEdition(result.payload.brief.window);
 const saved=await store.invoke('POST',{contentKey:horoscopeEditionKey(edition.window),surface:'sky',mode:'article',eventType:'horoscope-edition',provider:'manual-admin',status:'DRAFT',lane:'serving',headline:'Synthetic export edition',body:horoscopeEditionBody(edition),sections:{horoscopeEdition:edition},facts:{horoscopeBrief:result.payload},sourceSnapshot:{}});
 assert.equal(saved.status,200,JSON.stringify(saved.payload));const row=saved.payload.rows[0];
 const before=JSON.stringify([...store.rows]);
 assert.equal((await invokeHoroscopeWriting({action:'export',id:row.id,expectedUpdatedAt:row.updated_at},'wrong')).status,401);
 const exported=await invokeHoroscopeWriting({action:'export',id:row.id,expectedUpdatedAt:row.updated_at});
 assert.equal(exported.status,200,JSON.stringify(exported.payload));
 const value=exported.payload.writingExport;
 assert.equal(value.units.length,value.requestCount);assert.equal(value.units.at(-1).end,value.text.length);
 assert.equal(value.requestCount,edition.passages.length);
 for(const passage of edition.passages)assert(value.text.includes(`## ${passage.sign}\n`),`${period} ${passage.sign}`);
 assert(value.text.includes('### Writing instructions'));
 assert(value.text.includes('### Output format'));
 assert(value.text.includes('America/New_York'));
 assert(!value.text.includes('Authenticated owner selected Generate'));
 assert(!value.text.includes('calendar-api-fixture'));
 assert.deepEqual({calls:value.providerCalls,saved:value.saved,published:value.published},{calls:0,saved:false,published:false});
 assert.equal(JSON.stringify([...store.rows]),before,'Export cannot save an approval, alter a profile or reserve a writer');
 assert.equal((await invokeHoroscopeWriting({action:'export',id:row.id,expectedUpdatedAt:'stale'})).status,409);
 if(period==='weekly'){
  const plan=await invokeHoroscopeWriting({action:'prepare',id:row.id,expectedUpdatedAt:row.updated_at});assert.equal(plan.status,200);
  let current=structuredClone(store.rows.get(row.id));
  assert.equal((await runHoroscopeWriting({action:'start-batch',id:row.id,expectedUpdatedAt:current.updated_at,approvedPlanHash:plan.payload.plan.planHash},'synthetic-owner')).status,202);
  await runWeeklyHoroscopeBatch(row.id,{maxSteps:2,wait:async()=>{}});
  current=structuredClone(store.rows.get(row.id));
  const concern=current.source_snapshot.horoscopeGeneration.weeklyEditorial.plan.concerns[0].coreConcern;
  const aries=current.sections.horoscopeEdition.passages[0];aries.headline='Synthetic saved Aries';aries.body='Complete synthetic earlier reading opening.\n\nIts complete final sentence remains comparison data.';
  current.body=horoscopeEditionBody(current.sections.horoscopeEdition);current.updated_at=new Date(Date.parse(current.updated_at)+1).toISOString();store.rows.set(row.id,current);
  const snapshot=JSON.stringify([...store.rows]),calls=writerFixture.batchCalls;
  const withPlan=await invokeHoroscopeWriting({action:'export',id:row.id,expectedUpdatedAt:current.updated_at});assert.equal(withPlan.status,200,JSON.stringify(withPlan.payload));
  assert(withPlan.payload.writingExport.text.includes(concern),'An already generated shared plan is included');
  assert(withPlan.payload.writingExport.text.includes(JSON.stringify(aries.body).slice(1,-1)),'Complete earlier readings retain their comparison-only role');
  assert(withPlan.payload.writingExport.text.includes('EARLIER COMPLETED WEEKLY READINGS — COMPARISON DATA'));
  assert.equal(writerFixture.batchCalls,calls);assert.equal(JSON.stringify([...store.rows]),snapshot);
 }
}
assert.equal(writerFixture.calls,0);assert.equal(writerFixture.reviewCalls,0);assert.equal(writerFixture.batchCalls,1,'Only the deliberately prepared synthetic shared plan; no exporter call');
console.log('PASS read-only horoscope writing exports: all four periods, all sign/overview units, current complete input and schema, no fabricated approval, stale refusal, no storage mutation or provider calls.');
await store.close();
