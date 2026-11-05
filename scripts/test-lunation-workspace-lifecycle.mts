import assert from 'node:assert/strict';
import {rows,invoke,providerFixture,storageFixture} from '../tests/helpers/lunation-writing-api.mts';

const id='00000000-0000-4000-8000-00000000aa01';
const original={id,content_key:'studio-lunation/1900-01-01/new-moon/aries',mode:'article',target_date:null,
  status:'DRAFT',lane:'reference',review_state:'owner-review-required',updated_at:'2026-01-01T00:00:00.000Z',
  headline:'Synthetic complete draft',summary:'Synthetic saved summary.',body:'Synthetic complete opening.\n\nSynthetic final sentence.',
  sections:{preserved:{ordered:['first','second']}},facts:{lunationArticle:{event:{id:'synthetic-event',title:'Synthetic Moon',startsAt:'1900-01-01T00:00:00Z'}}},
  source_snapshot:{lunationWriting:{direction:'Synthetic direction.',planHash:'synthetic-plan',preview:{argument:{thesis:'Synthetic plan.'}},
    active:null as null|{responseId:string;startedAt:string},rejections:[{id:'synthetic-rejection',headline:'Previous synthetic title',body:'Previous complete synthetic body.',reason:'Synthetic reason.'}]}}};
const providerCalls=providerFixture.calls;
const fixtureFetch=globalThis.fetch;
const previousApiKey=process.env.OPENAI_API_KEY;
delete process.env.OPENAI_API_KEY;
const reset=(patch:Record<string,unknown>={})=>{const row={...structuredClone(original),...patch};rows.set(id,row);return row;};
const action=(name:string,version=rows.get(id)?.updated_at,extra:Record<string,unknown>={})=>invoke('POST',{action:name,id,expectedUpdatedAt:version,...extra});
const preserved=(row:any)=>Object.fromEntries(Object.entries(row).filter(([key])=>!['status','updated_at'].includes(key)));
try{
  reset();
  const archived=await action('archive');
  assert.equal(archived.status,200,JSON.stringify(archived.payload));
  const saved=archived.payload.rows[0];
  assert.equal(saved.status,'ARCHIVED');assert.equal(saved.lane,'reference');
  assert.notEqual(saved.updated_at,original.updated_at);
  assert.deepEqual(preserved(saved),preserved(original),'Archive preserves complete copy, facts, sections, plan and rejection history.');
  const reopened=await invoke('GET',undefined,`/api/admin/lunation-writing?id=${id}`);
  assert.equal(reopened.status,200);assert.deepEqual(reopened.payload.rows,[saved]);
  assert((await invoke('GET')).payload.rows.some((row:any)=>row.id===id&&row.status==='ARCHIVED'),'The normal workspace list can discover archived drafts.');
  for(const name of ['save','stage','review','generate','poll','release','reject','export']){
    const before=structuredClone(rows.get(id));
    assert.equal((await action(name)).status,404,'Archived drafts must be restored before ordinary writing or publishing actions.');
    assert.deepEqual(rows.get(id),before);
  }
  const beforeStale=structuredClone(rows.get(id));
  assert.equal((await action('restore',original.updated_at)).status,409);
  assert.deepEqual(rows.get(id),beforeStale);
  assert.equal((await action('archive')).status,409,'Archive is not an implicit restore or repeated write.');
  const restored=await action('restore');assert.equal(restored.status,200,JSON.stringify(restored.payload));
  assert.equal(restored.payload.rows[0].status,'DRAFT');assert.equal(restored.payload.rows[0].lane,'reference');
  assert.deepEqual(preserved(restored.payload.rows[0]),preserved(original));
  assert.equal((await action('restore')).status,409);
  assert.equal((await invoke('POST',{action:'archive',id})).status,400);
  assert.equal((await action('archive',rows.get(id).updated_at,{body:'An archive cannot edit writing.'})).status,400);
  const beforeUnauthorized=structuredClone(rows.get(id));
  assert.equal((await invoke('POST',{action:'archive',id,expectedUpdatedAt:rows.get(id).updated_at},undefined,'wrong')).status,401);
  assert.deepEqual(rows.get(id),beforeUnauthorized);
  for(const patch of [{content_key:'cms/lunation-article/1900-01-01/new-moon/aries'},{mode:'studio-draft'},{lane:'serving'},{status:'LIVE'},{status:'REVIEWED'}]){
    const before=structuredClone(reset(patch));
    assert.equal((await action('archive')).status,404);
    assert.deepEqual(rows.get(id),before,'Lifecycle cannot reach a reader, another family, or a non-reference row.');
  }
  for(const status of ['DRAFT','ARCHIVED']){
    const row=reset({status});
    row.source_snapshot.lunationWriting.active={responseId:'synthetic-in-flight',startedAt:'2026-01-01T00:00:00Z'};
    const before=structuredClone(row);
    assert.equal((await action(status==='DRAFT'?'archive':'restore')).status,409);
    assert.deepEqual(rows.get(id),before,'A running request cannot be hidden or released by lifecycle actions.');
  }
  reset();
  storageFixture.beforePatch=()=>rows.set(id,{...rows.get(id),body:'Synthetic newer owner writing.',updated_at:'2040-01-01T00:00:00.000Z'});
  assert.equal((await action('archive')).status,409);
  assert.equal(rows.get(id).body,'Synthetic newer owner writing.');assert.equal(rows.get(id).status,'DRAFT');
  const empty=structuredClone(reset({body:'',summary:''}));
  assert.equal((await action('archive')).status,200,'A saved plan can be archived before any writing is added.');
  assert.equal((await action('restore')).status,200);
  assert.deepEqual(preserved(rows.get(id)),preserved(empty),'Restoring an empty draft preserves its saved plan and history.');
  reset();
  globalThis.fetch=async(input:any,options:any={})=>{
    const response=await fixtureFetch(input,options);
    if(options.method!=='PATCH')return response;
    const saved=await response.json();
    return Response.json(saved.map((row:any)=>({...row,body:'Synthetic corrupted save receipt.'})),{status:response.status});
  };
  assert.equal((await action('archive')).status,502,'A changed-copy response cannot be acknowledged as a successful archive.');
  assert.equal(rows.get(id).body,original.body);assert.equal(rows.get(id).status,'ARCHIVED');
  assert.equal(providerFixture.calls,providerCalls,'Archive and restore never call a writer or require provider credentials.');
  console.log('PASS lunar workspace lifecycle: actual-handler archive/reopen/restore, complete preservation, auth, scope, active requests and conditional-write races.');
}finally{
  rows.delete(id);storageFixture.beforePatch=null;globalThis.fetch=fixtureFetch;
  if(previousApiKey===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=previousApiKey;
}
