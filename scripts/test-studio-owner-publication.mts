import {publishSavedOwnerContent, ownerPublicationStatusPath} from '../apps/admin/src/ownerPublication.js';
import assert from 'node:assert/strict';
import {contentLiveStatuses} from '../api/_lib/content-live-status.js';
import { createApiStore } from '../tests/helpers/calendar-review-api.mjs';
import { baseline, source } from '../tests/helpers/sky-review-workflow-api.mjs';
import { hasExactStudioOwnerApproval } from '../api/_lib/studio-owner-publication.js';
import { resolveSkyAspectGeneratedContent } from '../apps/web/src/services/skyAspectContent.js';
import { isReaderServableGeneratedContentRow } from '../apps/web/src/content/generatedContentEligibility.js';
import { lunarOwnerDraft, lunarOwnerKey, lunarOwnerBody } from '../tests/helpers/lunar-owner-publication.mjs';

const body = 'You always remember the request you left unanswered.\n\nA synthetic complete ending keeps the owner’s exact wording.';
const ownerId = "a0000000-0000-4000-8000-000000000001";
const store = await createApiStore([{...baseline,id:ownerId,body,sections:{},summary:''},source]);
try {
  let row=store.rows.get(ownerId)!;
  const publish=()=>store.invoke('PATCH',{id:row.id,expectedUpdatedAt:row.updated_at,ownerAction:'publish-owner-content'});
  const legacy=await store.invoke('PATCH',{id:row.id,expectedUpdatedAt:row.updated_at,status:'LIVE',lane:'serving',reviewState:null});
  assert.equal(legacy.status,409,'Automated-check path keeps its existing rules.');
  const initial=structuredClone(row);
  const result=await publish();assert.equal(result.status,200,JSON.stringify(result.payload));row=result.payload.rows[0];
  const recovered=await publishSavedOwnerContent(initial,async()=>{throw Object.assign(new Error('Lost reply after commit'),{status:503});},async()=>{const read=await store.invoke('GET',undefined,ownerPublicationStatusPath(initial));return read.payload;});
  const confirmedRetry=await publishSavedOwnerContent(initial,async()=>{throw Object.assign(new Error('Version changed after lost reply'),{status:409});},async()=>{const read=await store.invoke('GET',undefined,ownerPublicationStatusPath(initial));return read.payload;});
  assert.equal(confirmedRetry.rows[0].updated_at,row.updated_at,'A retry confirms only the exact prior successful publication.');
  assert.equal(recovered.rows[0].updated_at,row.updated_at);assert.equal(store.rows.get(row.id)?.updated_at,row.updated_at,'Recovery performs no second write.');
  assert.equal(row.status,'LIVE');assert.equal(row.body,body);assert.equal(row.review_state,null);assert.equal(row.lane,'serving');
  assert(hasExactStudioOwnerApproval(row));assert.equal(row.source_snapshot.skyAspectVoiceLint,undefined,'Owner approval must not fabricate a model/lint pass.');
  const read=await store.invoke('POST',{keys:[row.content_key]},'/api/content-reader');assert.equal(read.status,200);assert.equal(read.payload.rows[0].body,body);
  assert.equal(read.payload.rows[0].source_snapshot.studioOwnerApproval.action,'publish-owner-content');
  const content={contentKey:row.content_key,body:row.body,status:row.status,sourceSnapshot:row.source_snapshot,judgeGate:row.judge_gate,judgeScore:null};
  const rendered=resolveSkyAspectGeneratedContent({first:'chiron',second:'nodes',aspect:'sextile',firstSign:'taurus',secondSign:'aquarius',generatedContent:new Map([[row.content_key,content]])} as any);
  assert(rendered, 'The actual Sky reader must select the approved owner copy.');
  assert.equal(rendered.body,body);
  const drifted={...row,body:body+' Tampered outside publication.'};
  assert.equal(contentLiveStatuses([drifted])[0].live,false,'Status must not report a mismatched owner approval live.');
  store.rows.set(row.id,drifted);
  const tampered=await store.invoke('POST',{keys:[row.content_key]},'/api/content-reader');assert.equal(tampered.status,200);assert.equal(tampered.payload.rows.length,0,'Reader rejects a receipt for different bytes.');store.rows.set(row.id,row);
  const denied=await store.invoke('PATCH',{id:row.id,expectedUpdatedAt:row.updated_at,ownerAction:'publish-owner-content'},'/api/admin/generated-content','not-owner');assert.equal(denied.status,401);assert.equal(store.rows.get(row.id)?.body,body);
  const stale=await store.invoke('PATCH',{id:row.id,expectedUpdatedAt:initial.updated_at,ownerAction:'publish-owner-content'});assert.equal(stale.status,409);assert.equal(store.rows.get(row.id)?.body,body);
  const forged=await store.invoke('PATCH',{id:row.id,expectedUpdatedAt:row.updated_at,status:'LIVE',body:body+' Changed.',sourceSnapshot:row.source_snapshot});
  assert.equal(forged.status,409,'Supplying an old receipt cannot approve changed prose.');
  const edited=await store.invoke('PATCH',{id:row.id,expectedUpdatedAt:row.updated_at,status:'DRAFT',body:body+' Owner addition.'});assert.equal(edited.status,200);row=edited.payload.rows[0];assert(!hasExactStudioOwnerApproval(row));
  await assert.rejects(()=>publishSavedOwnerContent(initial,async()=>{throw Object.assign(new Error('Unconfirmed publication'),{status:503});},async()=>({ok:true,rows:[store.rows.get(row.id)]})),/Unconfirmed publication/);
  const again=await publish();assert.equal(again.status,200,JSON.stringify(again.payload));row=again.payload.rows[0];assert(hasExactStudioOwnerApproval(row));
  const liveBefore=structuredClone(row);
  const rejectedLive=await store.invoke('PATCH',{id:row.id,expectedUpdatedAt:row.updated_at,ownerAction:'save-and-publish-owner-content',body:'An orb of 2 degrees belongs outside this card.'});
  assert.equal(rejectedLive.status,409);assert.deepEqual(store.rows.get(row.id),liveBefore,'A failed live publication keeps the previous live wording unchanged.');
  const nextBody='The author chooses another complete paragraph. The final author sentence is preserved.';
  const combined=await store.invoke('PATCH',{id:row.id,expectedUpdatedAt:row.updated_at,ownerAction:'save-and-publish-owner-content',body:nextBody,headline:row.headline,summary:row.summary,sections:row.sections});
  assert.equal(combined.status,200,JSON.stringify(combined.payload));row=combined.payload.rows[0];assert.equal(row.status,'LIVE');assert.equal(row.body,nextBody);assert(hasExactStudioOwnerApproval(row));assert.equal(row.source_snapshot.studioWritingCheck,null);
  const publishedVersion=row.source_snapshot.studioOwnerApproval.savedVersion;
  const retired=await store.invoke('POST',{action:'retire',id:row.id,contentKey:row.content_key,expectedUpdatedAt:row.updated_at},'/api/admin/content-publication');
  assert.equal(retired.status,200,JSON.stringify(retired.payload));
  const retiredRead=await store.invoke('GET',undefined,ownerPublicationStatusPath({...row,updated_at:publishedVersion}));
  assert.equal(retiredRead.payload.publicationReceipt.currentPublicationState,'retired');
  await assert.rejects(()=>publishSavedOwnerContent({...row,updated_at:publishedVersion},async()=>{throw new Error('Retired publication');},async()=>retiredRead.payload),/Retired publication/);
  for(const unsafe of ['Timing has an orb of 2 degrees.','Read the review queue for provenance.']) {
    const saved=await store.invoke('PATCH',{id:row.id,expectedUpdatedAt:row.updated_at,status:'DRAFT',body:unsafe});assert.equal(saved.status,200);row=saved.payload.rows[0];
    assert.equal((await publish()).status,409);assert.equal(store.rows.get(row.id)?.status,'DRAFT');
  }
  const reference=await store.invoke('PATCH',{id:source.id,expectedUpdatedAt:source.updated_at,ownerAction:'publish-owner-content'});assert.equal(reference.status,409);
  const missingVersion=await store.invoke('PATCH',{id:row.id,expectedUpdatedAt:undefined,ownerAction:'publish-owner-content'});assert.equal(missingVersion.status,400);
  const mixed=await store.invoke('PATCH',{id:row.id,expectedUpdatedAt:row.updated_at,ownerAction:'publish-owner-content',body:'Concurrent replacement.'});assert.equal(mixed.status,409);
  console.log('PASS owner publication: real handler, exact server approval, actual reader selection, unchanged prose, no fabricated judge result, stale/forged/mixed requests, re-publication and reader/source boundaries. No model calls.');
} finally {await store.close();}

const lunar = await createApiStore([lunarOwnerDraft()]);
try {
  const draft = lunar.rows.get(lunarOwnerDraft().id)!;
  const read = () => lunar.invoke('POST', {keys: [lunarOwnerKey]}, '/api/content-reader');
  assert.equal((await read()).payload.rows.length, 0, 'Unpublished lunar drafts stay private.');
  const published = await lunar.invoke('PATCH', {id: draft.id, expectedUpdatedAt: draft.updated_at,
    ownerAction: 'publish-owner-content'});
  assert.equal(published.status, 200, JSON.stringify(published.payload));
  const live = published.payload.rows[0];
  assert.equal(live.source_snapshot.lunationPublicationCheck.lint.validationProfile, 'legacy');
  assert.equal(live.source_snapshot.lunationWorkspace.lint.validationProfile, 'legacy');
  assert(hasExactStudioOwnerApproval(live));
  const metadataBefore = JSON.stringify(live.source_snapshot);
  const served = await read();
  assert.equal(served.status, 200);
  assert.equal(served.payload.rows.length, 1, 'Current lunar validation metadata must not hide published owner copy.');
  assert.equal(served.payload.rows[0].body, lunarOwnerBody);
  assert.equal(contentLiveStatuses([live])[0].live, true);
  assert.equal(JSON.stringify(live.source_snapshot), metadataBefore, 'Eligibility cannot mutate saved validation evidence.');

  for (const path of ['lunationPublicationCheck', 'lunationWorkspace']) {
    for (const marker of ['legacy', 'unsafe', 'directional', 'editorial-only', 'superseded', 'reference-only', 'raw_quarantine']) {
      const changed = structuredClone(live);
      changed.source_snapshot[path].lint.note = marker;
      assert.equal(isReaderServableGeneratedContentRow(changed), false, `Preserve ${path} ${marker} rejection.`);
    }
    for (const value of ['legacy-unsafe', 'unsafe', {label: 'legacy'}]) {
      const changed = structuredClone(live);
      changed.source_snapshot[path].lint.validationProfile = value;
      assert.equal(isReaderServableGeneratedContentRow(changed), false, 'Only the exact known profile label is exempt.');
    }
  }
  for (const patch of [
    {flags: ['REFERENCE_ONLY_NEVER_SERVE_VERBATIM']},
    {provider: 'local-normalized-dashboard-source'},
    {source_snapshot: {...live.source_snapshot, content_role: 'source_material'}},
    {source_snapshot: {...live.source_snapshot, review_status: 'needs_review'}},
    {source_snapshot: {...live.source_snapshot, origin: 'legacy'}},
    {facts: {source: 'legacy'}}
  ]) {
    lunar.rows.set(live.id, {...live, ...patch});
    assert.equal((await read()).payload.rows.length, 0, 'Unsafe or unapproved rows remain absent from the actual reader API.');
  }
  for (const content_key of ['cms/lunation-article/invalid', 'sky.aspect.sun.sextile.moon.aries.gemini', 'studio-lunation/2026-09-26/full-moon/aries']) {
    assert.equal(isReaderServableGeneratedContentRow({...live, content_key}), false, 'Other content families gain no profile exception.');
  }
  for (const patch of [{status: 'DRAFT'}, {status: 'ARCHIVED'}, {lane: 'reference'}, {review_state: 'needs-review'}]) {
    assert.equal(isReaderServableGeneratedContentRow({...live, ...patch}), false, 'The label exception only applies to published serving rows.');
  }
  lunar.rows.set(live.id, {...live, body: live.body + ' Unsigned edit.'});
  assert.equal((await read()).payload.rows.length, 0, 'The exact owner approval still protects reader bytes.');
  lunar.rows.set(live.id, live);
  const retired = await lunar.invoke('POST', {action: 'retire', id: live.id, contentKey: lunarOwnerKey,
    expectedUpdatedAt: live.updated_at}, '/api/admin/content-publication');
  assert.equal(retired.status, 200, JSON.stringify(retired.payload));
  const afterRetirement = await read();
  assert.equal(afterRetirement.payload.rows.length, 0, 'Retirement remains authoritative.');
  assert(afterRetirement.payload.publications.find((item: any) => item.content_key === lunarOwnerKey).revision
    > served.payload.publications.find((item: any) => item.content_key === lunarOwnerKey).revision,
  'The SQL retirement must advance the already-observed fixture ledger revision.');
  console.log('PASS lunar owner publication: actual publish/read/retire handlers, exact copy, technical lint labels, unsafe metadata and approval boundaries.');
} finally {await lunar.close();}
