import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {studioApiStore} from '../tests/helpers/studio-api-store';
import {natalPlacementReaderSectionCopy} from '../apps/web/src/content/natalPlacementReaderSections';
import {natalSourceFields} from '../apps/admin/src/NatalPlacementSourceEditor';
import {renderNatalPlacementPreviewState, normalizeNatalPlacementPreviewInput} from '../api/admin/natal-placement-preview';
import {createFallbackRenderer} from '../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js';
import {createFallbackRenderer as browserRenderer} from '../apps/web/src/content/fallbackArchitectureV3/resolver/renderFallback.browser';
import {renderNatalPlacement as nodeRenderer} from '../apps/web/src/content/fallbackArchitectureV3/resolver/renderFallback.mjs';
import {natalPlacementOwnerCopy} from '../apps/web/src/content/fallbackArchitectureV3/resolver/natalPlacementVariables.mjs';

const sources = JSON.parse(readFileSync('apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json','utf8'));
const templates = JSON.parse(readFileSync('apps/web/src/content/fallbackArchitectureV3/templates/fallback-templates-v3.json','utf8'));
const sha = (text: string) => createHash('sha256').update(text).digest('hex');
const approved = process.env.NATAL_APPROVED_FRIEND_COPY_FILE ? JSON.parse(readFileSync(process.env.NATAL_APPROVED_FRIEND_COPY_FILE,'utf8')) : null;
const snapshot: {rows:any[];publications:any[]} = {rows:[],publications:[]};
for (const [planet,sign,house] of [['chiron','taurus',12],['lilith','virgo',4]] as const) {
  const key = `fallback-hook/natal-you-placement-complete-final/${planet}/${sign}/${house}`;
  const source = sources.hookRows.find((record: any) => record.contentKey === key);
  const original = structuredClone(source);
  const originalYou = source.body;
  const passage = approved?.passages.find((entry:any)=>entry.title.toLowerCase().startsWith(planet));
  const friend = passage?.text ?? '{{ownerName}} first complete Friend paragraph.\n\nTheir final complete Friend paragraph.';
  if (passage) assert.equal(sha(friend),passage.sha256);
  const stamp = '2026-10-25T12:00:00.000Z';
  const seed = {id:`fixture-${planet}`,content_key:key,surface:'you',mode:'in_depth',status:'LIVE',lane:'serving',review_state:null,
    provider:'tldrastro-fallback-architecture-v3',body:originalYou,headline:source.headline ?? '',summary:'',updated_at:stamp,
    facts:{fallbackArchitectureV3:true,review_status:'approved'},sections:{packageRecord:source},
    source_snapshot:{contentType:'fallback-system',review_status:'approved'}};
  assert.equal(natalSourceFields(seed).body_they,'','The editor must expose the missing Friend field.');
  assert.deepEqual(natalSourceFields({...seed,sections:{}}),{body:originalYou,body_they:''});
  const store = await studioApiStore([seed]);
  try {
    const change = (body: object) => store.call({method:'PATCH',url:'/api/admin/generated-content',body});
    const invalid = await change({id:seed.id,expectedUpdatedAt:stamp,sections:{packageDraft:{body_they:'{{unknownPerson}} unsupported variable.'}}});
    assert.equal(invalid.status,400);
    const saved = await change({id:seed.id,expectedUpdatedAt:stamp,sections:{packageDraft:{body_they:friend}}});
    assert.equal(saved.status,200,JSON.stringify(saved.payload));
    const draft = saved.payload.rows[0];
    assert.equal(draft.sections.packageDraft.body_they,friend);
    assert.equal(draft.sections.packageRecord.body,originalYou);
    assert.equal(draft.sections.packageRecord.body_they_approval,undefined);
    const reopened = await store.call({method:'GET',url:`/api/admin/generated-content?id=${seed.id}`});
    assert.equal(reopened.payload.rows[0].sections.packageDraft.body_they,friend);
    assert.equal((await change({id:seed.id,expectedUpdatedAt:stamp,sections:{packageDraft:{body_they:'Stale replacement.'}}})).status,409);
    const published = await change({id:seed.id,expectedUpdatedAt:draft.updated_at,ownerAction:'approve-package-revision'});
    assert.equal(published.status,200,JSON.stringify(published.payload));
    const live = published.payload.rows[0];
    assert.equal(live.status,'LIVE'); assert.equal(live.review_state,null);
    const record = live.sections.packageRecord;
    assert.equal(record.body,originalYou);
    assert.deepEqual(live.sections.packageOriginalRecord,original);
    assert.equal(record.body_they,friend);
    assert.equal(record.body_they_review_status,'approved');
    assert.equal(record.body_they_approval.approvalLevel,'exact_owner_approved');
    assert.equal(record.body_they_approval.payloadSha256,sha(friend));
    const read = await store.call({method:'POST',url:'/api/content-reader',body:{keys:[key],surfaces:['you','natal']}});
    assert.equal(read.status,200);
    assert.equal(read.payload.rows[0].sections.packageRecord.body_they,friend);
    snapshot.rows.push(live);
    snapshot.publications.push(...await store.call({method:'publications'}));
    const rows = {...sources,hookRows:sources.hookRows.map((row: any)=>row.contentKey===key?record:row)};
    for (const create of [createFallbackRenderer,browserRenderer]) {
      const renderer=create(templates,rows);
      for (const name of ['Nikki','Robin','$&']) {
        const rendered=renderer.renderNatalPlacement({planet,sign,house,voice:name});
        assert.equal(rendered.templateKey,key);
        assert.equal(rendered.parts.length,1);
        assert.equal(rendered.body,friend.replaceAll('{{ownerName}}',()=>name));
        assert.equal(natalPlacementOwnerCopy(friend,name),rendered.body);
        assert.equal(natalPlacementReaderSectionCopy(rendered.body,key,true),rendered.body);
        assert.equal(natalPlacementReaderSectionCopy(originalYou,key),originalYou.replace(/\s+/gu,' ').trim());
      }
      assert.equal(renderer.renderNatalPlacement({planet,sign,house,voice:'you'}).body,originalYou);
      assert.notEqual(renderer.renderNatalPlacement({planet,sign,house:house===12?11:3,voice:'Robin'}).body,friend);
      assert.notEqual(renderer.renderNatalPlacement({planet,sign,house,voice:'Robin',isRetrograde:true}).templateKey,key);
    }
    const state=renderNatalPlacementPreviewState(normalizeNatalPlacementPreviewInput({planet,sign,house:String(house),audience:'they',overrides:[{
      id:live.id,status:live.status,lane:live.lane,provider:live.provider,updatedAt:live.updated_at,packageRow:record
    }]}));
    assert.equal(state.rendered.templateKey,key);
    assert.doesNotMatch(state.rendered.body,/\{\{/u);
    assert.equal(nodeRenderer({planet,sign,house,voice:'you'}).body,originalYou);
    // Saving another proposal cannot modify the exact published Friend source.
    const next=await change({id:live.id,expectedUpdatedAt:live.updated_at,sections:{packageDraft:{body_they:friend+' Proposed draft only.'}}});
    assert.equal(next.status,200); assert.equal(next.payload.rows[0].sections.packageRecord.body_they,friend);
  } finally {store.close();}
}
if (process.env.NATAL_FRIEND_SNAPSHOT_OUT) writeFileSync(process.env.NATAL_FRIEND_SNAPSHOT_OUT,JSON.stringify(snapshot,null,2),{mode:0o600});
console.log('Complete natal Friend save/reopen, variable validation, stale-write refusal, explicit approval receipt, reader transport, browser/dist names, motion isolation and unchanged You passed.');
