import assert from 'node:assert/strict';
import { frictionFlowFields, frictionFlowTemplateErrors, fillFrictionFlowTemplate } from '../apps/web/src/content/frictionFlowCatalog';
import { frictionFlowCopy } from '../apps/web/src/content/frictionFlowCopy';
import { frictionFlowSourceDraft } from '../apps/admin/src/frictionFlowSources';
import { installContentPublications } from '../apps/web/src/content/contentPublicationState';
import type { GeneratedContentRow } from '../apps/web/src/services/generatedContent';

assert.equal(new Set(frictionFlowFields.map(f=>f.key)).size,frictionFlowFields.length);
for (const field of frictionFlowFields) {
  const draft=frictionFlowSourceDraft(field.key);
  assert.equal(draft.status,'DRAFT');
  assert.equal(draft.reviewState,'EDITORIAL_REVIEW_REQUIRED');
  assert.equal(draft.body,field.body,'Opening preserves the complete existing writing.');
  assert.equal(draft.sourceSnapshot?.allowedSlots,field.allowedSlots);
  assert.deepEqual(frictionFlowTemplateErrors(field.key,field.body),[]);
  const slots=Object.fromEntries(field.allowedSlots.map(slot=>[slot,`fixture-${slot}`]));
  assert.equal(frictionFlowCopy()(field.name,slots),fillFrictionFlowTemplate(field.key,field.body,slots));
  assert(frictionFlowTemplateErrors(field.key,'Unknown {untrusted}.').length);
  assert(frictionFlowTemplateErrors(field.key,'{{planet}}').length);
  if(field.allowedSlots.length) assert(frictionFlowTemplateErrors(field.key,'Omitted facts.').length);
}
assert(frictionFlowTemplateErrors('cms/friction-flow/unregistered','Text.').length);
const key='cms/friction-flow/explanation/easy';
const row={id:'fixture-status',content_key:key,status:'LIVE',lane:'serving',review_state:null,body:'Complete edited status.\n\nIts final sentence remains.',updated_at:'2026-10-25T22:00:00Z'} as GeneratedContentRow;
assert.equal(frictionFlowCopy([row])('explanation/easy'),row.body);
assert.notEqual(frictionFlowCopy([{...row,status:'DRAFT'}])('explanation/easy'),row.body);
const publication={content_key:key,state:'live' as const,revision:70001,row_id:row.id,row_updated_at:row.updated_at,updated_at:row.updated_at};
installContentPublications([publication]);
assert.equal(frictionFlowCopy([row])('explanation/easy'),row.body);
for (const bad of [{...row,status:'DRAFT'},{...row,lane:'reference'},{...row,review_state:'needs-review'},{...row,updated_at:'2026-10-24T22:00:00Z'},{...row,body:'Invalid {unknown}.'}]) {
  assert.equal(frictionFlowCopy([bad as GeneratedContentRow])('explanation/easy'),'','A published source never falls back over an ineligible revision.');
}
assert.equal(frictionFlowCopy([])('explanation/easy'),'');
installContentPublications([{...publication,state:'retired',revision:70002}]);
assert.equal(frictionFlowCopy([row])('explanation/easy'),'');
installContentPublications([{...publication,row_id:null,row_updated_at:null,revision:70003}]);
assert.equal(frictionFlowCopy([row])('explanation/easy'),frictionFlowFields.find(f=>f.key===key)!.body,'Only explicit baseline restoration restores default wording.');
console.log(`${frictionFlowFields.length} Friction/Flow sources: unchanged defaults, draft factories, named variables, publication versions, retirement and baseline restoration passed.`);
