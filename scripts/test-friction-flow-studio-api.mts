import assert from 'node:assert/strict';
import { studioApiStore } from '../tests/helpers/studio-api-store';
import { studioSourceDraft } from '../apps/admin/src/studioSourceDraft';
import { frictionFlowFields } from '../apps/web/src/content/frictionFlowCatalog';
import { frictionFlowCopy } from '../apps/web/src/content/frictionFlowCopy';
import { installContentPublications } from '../apps/web/src/content/contentPublicationState';
const store=await studioApiStore([],{uuidIds:true});
try {
  const {id:_id,...starter}=studioSourceDraft(frictionFlowFields[0].key);
  for (const forbidden of [
    {...starter,contentKey:'cms/friction-flow/unregistered'},
    {...starter,contentKey:'relationship/person-forecast'},
    {...starter,sourceSnapshot:{...starter.sourceSnapshot,sampleOnly:true}},
    {...starter,sourceSnapshot:{contentSystem:'personalized-report'}}
  ]) {
    const refused=await store.call({method:'POST',body:{...forbidden,status:'LIVE',reviewState:null,eventType:'cms-surface-override'}});
    assert.notEqual(refused.status,200,'Only registered shared UI sources can use the new relationship publication path.');
  }
  for (const field of frictionFlowFields) {
    const {id: _id, ...draft}=studioSourceDraft(field.key);
    const body=`QA complete ${field.name}.\n\n${field.body}\n\nQA complete final sentence.`;
    const created=await store.call({method:'POST',body:{...draft,eventType:'cms-surface-override',sourceSnapshot:draft.sourceSnapshot,body}});
    assert.equal(created.status,200,JSON.stringify(created.payload));
    let row=created.payload.rows[0];
    assert.equal(row.status,'DRAFT');
    const readDraft=await store.call({method:'POST',url:'/api/content-reader',body:{keys:[field.key]}});
    assert.equal(readDraft.payload.rows.length,0);
    const reopened=await store.call({method:'GET',url:'/api/admin/generated-content?contentKey='+encodeURIComponent(field.key)+'&status=all'});
    assert.equal(reopened.payload.rows[0].body,body);
    const published=await store.call({method:'PATCH',body:{id:row.id,expectedUpdatedAt:row.updated_at,ownerAction:'publish-owner-content'}});
    assert.equal(published.status,200,JSON.stringify(published.payload));
    row=published.payload.rows[0];
    assert.equal(row.status,'LIVE');
    const read=await store.call({method:'POST',url:'/api/content-reader',body:{keys:[field.key]}});
    assert.equal(read.status,200); assert.equal(read.payload.rows[0].body,body);
    installContentPublications(read.payload.publications);
    const slots=Object.fromEntries(field.allowedSlots.map(name=>[name,`QA-${name}`]));
    const expected=body.replace(/\{(\w+)\}/gu,(_,name)=>slots[name]);
    assert.equal(frictionFlowCopy(read.payload.rows)(field.name,slots),expected,'Actual reader route delivers the whole saved revision.');
    const invalid=await store.call({method:'PATCH',body:{id:row.id,expectedUpdatedAt:row.updated_at,ownerAction:'save-and-publish-owner-content',body:'Invalid {untrusted}.',sourceSnapshot:{...draft.sourceSnapshot,allowedSlots:['untrusted']}}});
    assert.notEqual(invalid.status,200,'Metadata cannot widen the canonical variable contract.');
    const afterInvalid=await store.call({method:'POST',url:'/api/content-reader',body:{keys:[field.key]}});
    assert.equal(afterInvalid.payload.rows[0].body,body);
    const stale=await store.call({method:'PATCH',body:{id:row.id,expectedUpdatedAt:'2020-01-01T00:00:00Z',body:'Stale overwrite.'}});
    assert.equal(stale.status,409);
    const revision=`QA revised source. ${body}`;
    const republished=await store.call({method:'PATCH',body:{id:row.id,expectedUpdatedAt:row.updated_at,ownerAction:'save-and-publish-owner-content',body:revision}});
    assert.equal(republished.status,200,JSON.stringify(republished.payload));
    row=republished.payload.rows[0];
    const reread=await store.call({method:'POST',url:'/api/content-reader',body:{keys:[field.key]}});
    assert.equal(reread.payload.rows[0].body,revision,'An existing published source remains editable and republishes exactly.');
    const retired=await store.call({method:'POST',url:'/api/admin/content-publication',body:{contentKey:field.key,id:row.id,expectedUpdatedAt:row.updated_at,action:'retire'}});
    assert.equal(retired.status,200,JSON.stringify(retired.payload));
    const removed=await store.call({method:'POST',url:'/api/content-reader',body:{keys:[field.key]}});
    assert.equal(removed.payload.rows.length,0);
    installContentPublications(removed.payload.publications);
    assert.equal(frictionFlowCopy(removed.payload.rows)(field.name,slots),'','Retirement does not silently resurrect the app default.');
  }
  console.log(`${frictionFlowFields.length} Friction/Flow sources: actual handler draft/create/reopen/publish/reader, complete text, stale edits and canonical variable protection passed in isolated storage.`);
} finally { store.close(); }
