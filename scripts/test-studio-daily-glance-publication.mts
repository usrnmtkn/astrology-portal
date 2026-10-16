import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createApiStore} from '../tests/helpers/calendar-review-api.mjs';
import {servingPackageRecords} from '../api/_lib/content-live-status.js';
import {DAILY_GLANCE_PERSON_SLOT_KEYS, fillDailyGlancePersonSlots} from '../apps/web/src/content/fallbackArchitectureV3/resolver/dailyGlanceVoice.mjs';
import {fillDailyGlancePersonSlots as fillBrowserSlots} from '../apps/web/src/content/fallbackArchitectureV3/resolver/dailyGlanceVoice.browser.ts';
import {dailyGlanceFriendPreviewSlots} from '../apps/admin/src/dailyGlanceFriendPreview.ts';

for (const family of ['headline','body']) test(`Daily ${family} publishes newly introduced supported Friend variables and exact owner wording`,async()=>{
  const key=`fallback-hook/daily-${family}/soft/mars`;
  const record={...structuredClone(servingPackageRecords.get(key)!),body_you:'Original complete You copy.',body_they:'They can choose a useful pace.',review_status:'needs_review'};
  assert(record.content_role,'Expected a registered reader source.');
  const initial={id:`daily-${family}-qa`,content_key:key,provider:'tldrastro-fallback-architecture-v3',
    status:'DRAFT',surface:'you',mode:'feed',block_type:'fallback_hook',event_type:'fallback-hook',
    lane:'reference',review_state:'needs-review',target_date:null,headline:'Synthetic Daily source',summary:'',body:record.body_you,
    updated_at:'2026-10-15T12:00:00Z',sections:{packageRecord:record},facts:{fallbackArchitectureV3:true},source_snapshot:{sourcePackage:'tldrastro-fallback-architecture-v3',review_status:'needs_review'}};
  const store=await createApiStore([initial]);
  try{
    const you='The engine starts—retain this complete owner sentence.';
    const they='The profile includes '+[...DAILY_GLANCE_PERSON_SLOT_KEYS].map(name=>`{{${name}}}`).join(', ')+'.\n\nExact owner final sentence—retained.';
    const change=(bodyThey=they,bodyYou=you,version=initial.updated_at)=>store.invoke('PATCH',{id:initial.id,expectedUpdatedAt:version,
      ownerAuthoredWording:true,reviewStatus:'needs_review',sections:{packageDraft:{...record,body_you:bodyYou,body_they:bodyThey}}});
    for(const unknown of ['{{Name}}','{{unknownPerson}}','{{ personPreferredName }}']){
      assert.equal((await change(`The profile includes ${unknown}.`)).status,400,unknown);
      assert.deepEqual(store.rows.get(initial.id),initial,'A refused token cannot mutate the saved source.');
    }
    assert.equal((await change(they,'The profile includes {{personPreferredName}}.')).status,400,'Friend slots must not be licensed for an unbound You field.');
    const saved=await change();assert.equal(saved.status,200,JSON.stringify(saved.payload));
    const draft=saved.payload.rows[0];assert.equal(draft.status,'DRAFT');
    const publication=await store.invoke('PATCH',{id:draft.id,expectedUpdatedAt:draft.updated_at,ownerAction:'approve-package-revision'});
    assert.equal(publication.status,200,JSON.stringify(publication.payload));
    const reader=await store.invoke('POST',{keys:[key]},'/api/content-reader');
    assert.equal(reader.status,200);assert.equal(reader.payload.rows.length,1);
    const published=reader.payload.rows[0].sections.packageRecord;
    assert.equal(published.body_you,you);assert.equal(published.body_they,they);
    const slots=dailyGlanceFriendPreviewSlots('Alex','they');
    for(const fill of [fillDailyGlancePersonSlots,fillBrowserSlots]){
      const complete=fill(published.body_they,slots);
      assert(!complete.includes('{{'));assert(complete.includes('Alex'));assert(complete.endsWith('Exact owner final sentence—retained.'));
    }
    const before=structuredClone(store.rows.get(initial.id));
    assert.equal((await change(they,you,initial.updated_at)).status,409);
    assert.deepEqual(store.rows.get(initial.id),before,'A stale author tab cannot overwrite the published source.');
  }finally{await store.close();}
});
