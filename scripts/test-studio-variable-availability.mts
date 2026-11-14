import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createApiStore } from '../tests/helpers/calendar-review-api.mjs';
import { lunationPublicationDraft } from '../tests/helpers/lunation-publication.mjs';
import { templateVariableReferences } from '../apps/admin/src/templateVariableReference';
import { templateVariableSourceKeyPrefixes } from '../apps/admin/src/templateVariableSources';
import { studioVariableExportRows, studioVariableExportCsv } from '../apps/admin/src/studioVariableExport';
import { servingPackageRecords } from '../api/_lib/serving-package-records';
import {requestStudioJson} from '../apps/admin/src/generatedContentClient';
import {compositionPreviewExampleValues} from '../apps/admin/src/compositionMap';

for (const [planetTitle, planetRef, planetRefCap] of [
  ['Sun', 'the Sun', 'The Sun'], ['North Node', 'the North Node', 'The North Node'],
  ['Saturn', 'Saturn', 'Saturn'], ['ASC', 'ASC', 'ASC']
]) {
  const values = compositionPreviewExampleValues({natalPlacement:{planetTitle, signTitle:'Virgo', houseOrdinal:'4th'}});
  assert.deepEqual([values.planetRef, values.planetRefCap, values.signTitle, values.houseOrdinal], [planetRef, planetRefCap, 'Virgo', '4th']);
}

const key = 'fallback-hook/house-meaning/4';
const original = structuredClone(servingPackageRecords.get(key)!);
const fixture = { ...lunationPublicationDraft(), id: 'house-variable-fixture', content_key: key,
  surface: 'natal', event_type: 'fallback-hook', block_type: 'fallback_hook', body: original.body_you,
  sections: {packageRecord: original, packageOriginalRecord: structuredClone(original), packageDraft: structuredClone(original)} };
const refs = templateVariableReferences({ Body: original.body_you }, original, true);
const topic = refs.find(ref => ref.name === 'planetTopic');
assert(topic, 'A supported variable must be discoverable before it is used');
assert.deepEqual(templateVariableSourceKeyPrefixes(topic), ['fallback-vocab/planet-topic/']);
assert(!refs.some(ref => ref.name === 'entryDate'), 'Unrelated calculated facts must not be offered');
assert(!templateVariableReferences({}, {contentKey:'fallback-hook/placement-house-sentence/saturn/4'}, true).some(ref => ref.name === 'planetTopic'), 'Raw prose hooks must not claim unsupported nested substitution');

const store = await createApiStore([fixture]);
const before = JSON.stringify([...store.rows.values()]);
try {
  for (const field of ['body_you', 'body_they']) {
    const changed = {...original, [field]: 'Synthetic {{planetTitle}} in {{houseOrdinal}}: {{planetTopic}}.'};
    const saved = await store.invoke('PATCH', {id:fixture.id, expectedUpdatedAt:store.rows.get(fixture.id).updated_at,
      sections:{...fixture.sections, packageDraft:changed}});
    assert.equal(saved.status, 200, JSON.stringify(saved.payload));
    assert.equal(saved.payload.rows[0].sections.packageDraft[field], changed[field]);
    assert.equal(saved.payload.rows[0].sections.packageOriginalRecord.body_you, original.body_you);
  }
  const rejected = await store.invoke('PATCH', {id:fixture.id, sections:{...fixture.sections,
    packageDraft:{...original,body_you:'Synthetic {{unknownVariable}}.'}}});
  assert.equal(rejected.status, 400);
  const wrongContext = await store.invoke('PATCH', {id:fixture.id, sections:{...fixture.sections,
    packageDraft:{...original,body_you:'Synthetic {{entryDate}}.'}}});
  assert.equal(wrongContext.status, 400);
  assert.equal((await store.invoke('GET', undefined, '/api/admin/generated-content?variables=export', 'wrong')).status,401);
  assert.equal((await store.invoke('GET', undefined, '/api/admin/generated-content?variables=export&cursor=bad')).status,400);
  assert.equal((await store.invoke('GET', undefined, '/api/admin/generated-content?variables=export&sourceKey=unknown')).status,400);
  const source = await store.invoke('GET', undefined, '/api/admin/generated-content?variables=export&sourceKey=fallback-vocab%2Fplanet-topic%2Fsaturn');
  assert.equal(source.status,200);
  assert.equal(source.payload.ok,true,'Export responses must satisfy the Studio client envelope');
  assert(source.payload.rows.some((row:any)=>row.token==='{{planetTopic}}'&&row.content==='structure and limits'));
  assert(source.payload.rows.every((row:any)=>row.sourceKey==='fallback-vocab/planet-topic/saturn'));
  const storageFetch=globalThis.fetch;
  try{
    globalThis.fetch=(async(input:any,options:any)=>{
      if(String(input).startsWith('/api/admin/generated-content?variables=export')){
        const result=await store.invoke('GET',undefined,String(input));
        return Response.json(result.payload,{status:result.status});
      }
      return storageFetch(input,options);
    }) as typeof fetch;
    const response=await requestStudioJson('/api/admin/generated-content?variables=export&cursor=0','calendar-api-fixture');
    assert(Array.isArray(response.rows),'The actual Studio client can consume the actual handler response');
  }finally{globalThis.fetch=storageFetch;}
  const unchanged = JSON.stringify([...store.rows.values()]);
  let cursor: string|null='0', total=0;
  do {
    const result = await store.invoke('GET', undefined, `/api/admin/generated-content?variables=export&cursor=${cursor}`);
    assert.equal(result.status,200,JSON.stringify(result.payload));
    assert.equal(result.payload.schema,'studio-variable-export/v1');
    assert(Buffer.byteLength(JSON.stringify(result.payload)) < 4_000_000, 'Export pages fit the function response limit');
    total+=result.payload.rows.length;cursor=result.payload.nextCursor;
  } while(cursor!==null);
  assert(total>1000);
  assert.equal(JSON.stringify([...store.rows.values()]),unchanged,'Export is read-only');
} finally { await store.close(); }
assert.notEqual(JSON.stringify([...store.rows.values()]),before,'The save fixture actually exercised persistence');

const variable:any={id:'fixture',name:'planetTopic',token:'{{planetTopic}}',kind:'editable',description:'Planet topic',source:'Planet vocabulary',
  usages:[{key,surface:'Natal',label:'House meaning'}],sources:[{key:'fallback-vocab/planet-topic/saturn',field:'body',label:'Saturn'}]};
const sourceKey=variable.sources[0].key;
const exported=studioVariableExportRows([variable],new Map([[sourceKey,{body:'Package exact value.',body_they:'Package They value.'}]]),[
  {content_key:sourceKey,status:'DRAFT',updated_at:'2026-11-13T12:00:00Z',sections:{packageDraft:{body:'Exact saved draft.\n\nFinal sentence.'}}}
]);
assert(exported.some(row=>row.version==='Saved draft'&&row.content==='Exact saved draft.\n\nFinal sentence.'));
assert(exported.some(row=>row.audience==='You'&&row.content==='Package exact value.'));
assert(!JSON.stringify(exported).includes('packageDraft'));
assert(studioVariableExportCsv([{...exported[0],content:'=1+1'}]).includes("'=1+1"));
console.log(`PASS: discoverable supported variables, actual-handler You/They saves, unknown/context rejection, export authorization, pagination, read-only storage and complete source text.`);
