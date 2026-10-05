import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createApiStore } from "../tests/helpers/calendar-review-api.mjs";
import { compatibilityAspectFromSearch, compatibilityAspectSourceDraft, compatibilityAspectSearchText, compatibilityAspectPoints, compatibilityAspectTypes } from "../apps/admin/src/compatibilityAspectSources.ts";
import { isDynamicSynastryExactRecord } from "../apps/web/src/content/fallbackArchitectureV3/dashboardExtensions.ts";
import { createTransitSynastryRenderer } from "../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js";

assert.deepEqual(compatibilityAspectFromSearch("Ascendant trine Midheaven"), {first:"ascendant",aspect:"trine",second:"midheaven"});
assert.deepEqual(compatibilityAspectFromSearch("Moon square MC"), {first:"moon",aspect:"square",second:"midheaven"});
assert.deepEqual(compatibilityAspectFromSearch("Ascendant Midheaven"), {first:"ascendant",aspect:"",second:"midheaven"});
assert.deepEqual(compatibilityAspectFromSearch("Moon conjunct Moon"), {first:"moon",aspect:"conjunction",second:"moon"});
assert.match(compatibilityAspectSearchText("fallback-hook/synastry-pair/moon/midheaven/hard"), /moon square midheaven/);
for (const first of compatibilityAspectPoints) for (const second of compatibilityAspectPoints) for (const aspect of compatibilityAspectTypes) {
  const draft = compatibilityAspectSourceDraft({first,second,aspect});
  assert.ok(isDynamicSynastryExactRecord(draft.sections!.packageRecord as any), draft.contentKey);
}

const draft = compatibilityAspectSourceDraft({first:"ascendant",aspect:"trine",second:"midheaven"});
const key = draft.contentKey;
const you = "Synthetic {{holder2}} opening.\n\nComplete synthetic You ending.";
const they = "Synthetic {{holder1}} reverse opening.\n\nComplete synthetic Friend ending.";
const store = await createApiStore([], {uuidIds:true});
try {
  const payload = { ...draft, id:undefined, eventType:"fallback-hook", reviewStatus:"needs_review", body:you,
    sections: { ...draft.sections, packageDraft: { ...(draft.sections!.packageRecord as any), body_you:you, body_they:"" } } };
  let result = await store.invoke("POST", payload, undefined, "invalid-owner");
  assert.equal(result.status,401);
  result = await store.invoke("POST", payload);
  assert.equal(result.status,200,JSON.stringify(result));
  let row = result.payload.rows[0];
  assert.equal(row.status,"DRAFT");
  assert.equal(row.sections.packageDraft.body_you,you);
  const original = structuredClone(row);
  result = await store.invoke("PATCH",{id:row.id,expectedUpdatedAt:row.updated_at,ownerAction:"approve-package-revision"});
  assert.equal(result.status,400,JSON.stringify(result));
  assert.deepEqual(store.rows.get(row.id),original,"Incomplete publication must preserve the draft.");
  for (const token of ["{{unknown}}", "{{holder2Subject}}"] ) {
    const invalid = await store.invoke("PATCH",{id:row.id,expectedUpdatedAt:row.updated_at,
      sections:{...row.sections,packageDraft:{...row.sections.packageDraft,body_they:`Synthetic ${token} passage.`}}});
    assert.equal(invalid.status,400,JSON.stringify(invalid));
    assert.deepEqual(store.rows.get(row.id),original,"Unsupported or wrong-direction slots cannot alter the draft.");
  }
  result = await store.invoke("PATCH",{id:row.id,expectedUpdatedAt:row.updated_at,
    sections:{...row.sections,packageDraft:{...row.sections.packageDraft,body_they:they}}});
  assert.equal(result.status,200,JSON.stringify(result));
  row = result.payload.rows[0];
  result = await store.invoke("GET",undefined,"/api/admin/generated-content-inventory?"+new URLSearchParams({contentKeys:key,status:"all",visibility:"all"}));
  assert.equal(result.status,200,JSON.stringify(result));
  assert.equal(result.payload.rows[0].sections.packageDraft.body_they,they);
  result = await store.invoke("POST",{keys:[key]},"/api/content-reader");
  assert.equal(result.status,200,JSON.stringify(result));
  assert.equal(result.payload.rows.length,0,"Saved drafts are not reader content.");
  result = await store.invoke("PATCH",{id:row.id,expectedUpdatedAt:"2020-01-01T00:00:00Z",ownerAction:"approve-package-revision"});
  assert.equal(result.status,409);
  result = await store.invoke("PATCH",{id:row.id,expectedUpdatedAt:row.updated_at,ownerAction:"approve-package-revision"});
  assert.equal(result.status,200,JSON.stringify(result));
  row = result.payload.rows[0];
  assert.equal(row.status,"LIVE");
  assert.equal(row.sections.packageRecord.body_you,you);
  assert.equal(row.sections.packageRecord.body_they,they);
  result = await store.invoke("POST",{keys:[key]},"/api/content-reader");
  assert.equal(result.status,200,JSON.stringify(result));
  const record = result.payload.rows.find(item=>item.content_key===key)?.sections.packageRecord;
  assert.ok(record?.approval,"Publication retains an exact owner-action receipt.");
  const read = (file:string) => JSON.parse(readFileSync(`apps/web/src/content/fallbackArchitectureV3/${file}`,"utf8"));
  const renderer = createTransitSynastryRenderer(read("source-rows/transit-synastry-rows-v1.json"),read("templates/fallback-templates-v3.json"),{hookRows:[record],vocabularyRows:[]});
  for (const [planetA,planetB,copy,slot] of [["ascendant","midheaven",you,"{{holder2}}"],["midheaven","ascendant",they,"{{holder1}}"]]) {
    const rendered = renderer.renderSynastryAspect({planetA,planetB,aspect:"trine",otherName:"Sofia"});
    assert.equal(rendered.contentKey,key);
    assert.equal(rendered.body,copy.replaceAll(slot,"Sofia").replace(/\s+/g," "));
    assert.equal(rendered.synastryTier,"exact-owner-approved");
  }
  assert.throws(()=>renderer.renderSynastryAspect({planetA:"ascendant",planetB:"midheaven",aspect:"sextile",otherName:"Sofia"}),/SOURCE_GAP/);
  console.log("PASS: all creator identities are supported; actual API create, partial draft, reopen, stale rejection, publication, reader retrieval and both shipped-resolver directions.");
} finally { await store.close(); }
