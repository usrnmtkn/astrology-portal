import {publishSavedOwnerContent, ownerPublicationStatusPath} from '../apps/admin/src/ownerPublication.js';
import assert from 'node:assert/strict';
import { createApiStore } from '../tests/helpers/calendar-review-api.mjs';
import { baseline, source } from '../tests/helpers/sky-review-workflow-api.mjs';
import { hasExactStudioOwnerApproval } from '../api/_lib/studio-owner-publication.js';
import { resolveSkyAspectGeneratedContent } from '../apps/web/src/services/skyAspectContent.js';

const body = 'You always remember the request you left unanswered.\n\nA synthetic complete ending keeps the owner’s exact wording.';
const store = await createApiStore([{...baseline,body,sections:{},summary:''},source]);
try {
  let row=store.rows.get(baseline.id)!;
  const publish=()=>store.invoke('PATCH',{id:row.id,expectedUpdatedAt:row.updated_at,ownerAction:'publish-owner-content'});
  const legacy=await store.invoke('PATCH',{id:row.id,expectedUpdatedAt:row.updated_at,status:'LIVE',lane:'serving',reviewState:null});
  assert.equal(legacy.status,409,'Automated-check path keeps its existing rules.');
  const initial=structuredClone(row);
  const result=await publish();assert.equal(result.status,200,JSON.stringify(result.payload));row=result.payload.rows[0];
  const recovered=await publishSavedOwnerContent(initial,async()=>{throw Object.assign(new Error('Lost reply after commit'),{status:503});},async()=>{const read=await store.invoke('GET',undefined,ownerPublicationStatusPath(initial));return read.payload;});
  assert.equal(recovered.rows[0].updated_at,row.updated_at);assert.equal(store.rows.get(row.id)?.updated_at,row.updated_at,'Recovery performs no second write.');
  assert.equal(row.status,'LIVE');assert.equal(row.body,body);assert.equal(row.review_state,null);assert.equal(row.lane,'serving');
  assert(hasExactStudioOwnerApproval(row));assert.equal(row.source_snapshot.skyAspectVoiceLint,undefined,'Owner approval must not fabricate a model/lint pass.');
  const read=await store.invoke('POST',{keys:[row.content_key]},'/api/content-reader');assert.equal(read.status,200);assert.equal(read.payload.rows[0].body,body);
  assert.equal(read.payload.rows[0].source_snapshot.studioOwnerApproval.action,'publish-owner-content');
  const content={contentKey:row.content_key,body:row.body,status:row.status,sourceSnapshot:row.source_snapshot,judgeGate:row.judge_gate,judgeScore:null};
  const rendered=resolveSkyAspectGeneratedContent({first:'chiron',second:'nodes',aspect:'sextile',firstSign:'taurus',secondSign:'aquarius',generatedContent:new Map([[row.content_key,content]])} as any);
  assert(rendered, 'The actual Sky reader must select the approved owner copy.');
  assert.equal(rendered.body,body);
  store.rows.set(row.id,{...row,body:body+' Tampered outside publication.'});
  const tampered=await store.invoke('POST',{keys:[row.content_key]},'/api/content-reader');assert.equal(tampered.status,200);assert.equal(tampered.payload.rows.length,0,'Reader rejects a receipt for different bytes.');store.rows.set(row.id,row);
  const denied=await store.invoke('PATCH',{id:row.id,expectedUpdatedAt:row.updated_at,ownerAction:'publish-owner-content'},'/api/admin/generated-content','not-owner');assert.equal(denied.status,401);assert.equal(store.rows.get(row.id)?.body,body);
  const stale=await store.invoke('PATCH',{id:row.id,expectedUpdatedAt:initial.updated_at,ownerAction:'publish-owner-content'});assert.equal(stale.status,409);assert.equal(store.rows.get(row.id)?.body,body);
  const forged=await store.invoke('PATCH',{id:row.id,expectedUpdatedAt:row.updated_at,status:'LIVE',body:body+' Changed.',sourceSnapshot:row.source_snapshot});
  assert.equal(forged.status,409,'Supplying an old receipt cannot approve changed prose.');
  const edited=await store.invoke('PATCH',{id:row.id,expectedUpdatedAt:row.updated_at,status:'DRAFT',body:body+' Owner addition.'});assert.equal(edited.status,200);row=edited.payload.rows[0];assert(!hasExactStudioOwnerApproval(row));
  await assert.rejects(()=>publishSavedOwnerContent(initial,async()=>{throw Object.assign(new Error('Unconfirmed publication'),{status:503});},async()=>({ok:true,rows:[store.rows.get(row.id)]})),/Unconfirmed publication/);
  const again=await publish();assert.equal(again.status,200,JSON.stringify(again.payload));row=again.payload.rows[0];assert(hasExactStudioOwnerApproval(row));
  for(const unsafe of ['Timing has an orb of 2 degrees.','Read the review queue for provenance.']) {
    const saved=await store.invoke('PATCH',{id:row.id,expectedUpdatedAt:row.updated_at,status:'DRAFT',body:unsafe});assert.equal(saved.status,200);row=saved.payload.rows[0];
    assert.equal((await publish()).status,409);assert.equal(store.rows.get(row.id)?.status,'DRAFT');
  }
  const reference=await store.invoke('PATCH',{id:source.id,expectedUpdatedAt:source.updated_at,ownerAction:'publish-owner-content'});assert.equal(reference.status,409);
  const missingVersion=await store.invoke('PATCH',{id:row.id,expectedUpdatedAt:undefined,ownerAction:'publish-owner-content'});assert.equal(missingVersion.status,400);
  const mixed=await store.invoke('PATCH',{id:row.id,expectedUpdatedAt:row.updated_at,ownerAction:'publish-owner-content',body:'Concurrent replacement.'});assert.equal(mixed.status,409);
  console.log('PASS owner publication: real handler, exact server approval, actual reader selection, unchanged prose, no fabricated judge result, stale/forged/mixed requests, re-publication and reader/source boundaries. No model calls.');
} finally {await store.close();}
