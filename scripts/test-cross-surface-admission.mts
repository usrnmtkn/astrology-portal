import assert from "node:assert/strict";
import {
  isDynamicHouseTransitRecord,
  isDynamicLunationMacroRecord,
  isDynamicSkyPlacementArticleRecord,
  isDynamicSynastryExactRecord,
  isDynamicBondEffectExactRecord,
  isFallbackDashboardRecordAllowed
} from "../apps/web/src/content/fallbackArchitectureV3/dashboardExtensions.ts";
import { packagePublicationAdmissionIssue, isRegisteredLunarJournalKey } from "../api/_lib/content-studio-package-admission.ts";
import lunarJournalIndex from '../apps/web/src/features/calendar/data/lunar-journal.index.json' with {type:'json'};
import {bondEffectExactSourceDraft} from '../apps/admin/src/bondEffectExactDraft.ts';

for(const planet of ['sun','moon','mercury','venus','mars','jupiter','saturn','uranus','neptune','pluto','chiron','lilith','north-node','south-node'])for(const aspect of ['conjunction','opposition','square','trine','sextile']){
  const key=`fallback-hook/bond-effect-${aspect}/${planet}`;
  const draft=bondEffectExactSourceDraft(key)!;
  assert(draft);assert.equal(draft.status,'DRAFT');
  assert(isDynamicBondEffectExactRecord(draft.sections!.packageRecord as any));
  assert.equal(packagePublicationAdmissionIssue({status:'LIVE',provider:'tldrastro-fallback-architecture-v3',content_key:key,sections:draft.sections}),null);
}
for(const key of ['fallback-hook/bond-effect-sextile/unknown','fallback-hook/bond-effect-sextile/ascendant','fallback-hook/bond-effect-quincunx/sun','fallback-hook/bond-effect-hard/lilith','fallback-hook/bond-effect-sextile/lilith/extra'])assert.equal(bondEffectExactSourceDraft(key),null);

for(const entry of lunarJournalIndex){
  assert(isRegisteredLunarJournalKey(entry.contentKey));
  assert.equal(packagePublicationAdmissionIssue({status:'LIVE',provider:'tldrastro-fallback-architecture-v3',content_key:entry.contentKey,sections:{packageRecord:{contentKey:entry.contentKey,content_role:'full_copy'}}}),null);
}
for(const key of ['authored/lunar-journal/season/aries','authored/lunar-journal/season/unknown/20250320t090100z','authored/lunar-journal/season/aries/20990320t090100z']){
  assert.equal(isRegisteredLunarJournalKey(key),false);
  assert.match(packagePublicationAdmissionIssue({status:'LIVE',provider:'tldrastro-fallback-architecture-v3',content_key:key,sections:{packageRecord:{contentKey:key,content_role:'full_copy'}}})!,/supported reader route/);
}

const record = (contentKey: string) => ({ contentKey, content_role: "full_copy" });
for (const key of [
  "authored/transit-house-intro/moon/1",
  "authored/transit-house-sign/uranus/12/pisces",
  "authored/transit-house/lilith/10"
]) assert.ok(isDynamicHouseTransitRecord(record(key)), key);
for (const key of [
  "authored/transit-house-intro/moon/0",
  "authored/transit-house-sign/moon/13/aries",
  "authored/transit-house-sign/moon/1/unknown",
  "authored/transit-house-intro/unknown/1",
  "authored/transit-house/moon/1/unregistered",
  "authored/transit-house-sign/moon/1/aries/extra"
]) assert.equal(isDynamicHouseTransitRecord(record(key)), false, key);
for (const key of [
  "fallback-hook/synastry-pair/sun/venus/square",
  "fallback-hook/synastry-pair/sun/sun/conjunction",
  "fallback-hook/synastry-pair/descendant/north-node/trine"
]) assert.ok(isDynamicSynastryExactRecord(record(key)), key);
for (const key of [
  "fallback-hook/synastry-pair/unknown/venus/square",
  "fallback-hook/synastry-pair/sun/venus/hard",
  "fallback-hook/synastry-pair/sun/venus/quincunx",
  "fallback-hook/synastry-pair/sun/venus/square/extra"
]) assert.equal(isDynamicSynastryExactRecord(record(key)), false, key);

for (const key of ["authored/transit-house-intro/moon/1", "fallback-hook/synastry-pair/sun/venus/square"]) {
  assert.ok(isFallbackDashboardRecordAllowed(record(key), new Set()));
  assert.equal(isFallbackDashboardRecordAllowed({ ...record(key), content_role: "source_material" }, new Set()), false);
  const row = { status: "LIVE", provider: "tldrastro-fallback-architecture-v3", content_key: key, sections: { packageRecord: record(key) } };
  assert.equal(packagePublicationAdmissionIssue(row), null);
  assert.match(packagePublicationAdmissionIssue({
    ...row, content_key: "authored/unknown/new", sections: { packageRecord: record("authored/unknown/new") }
  })!, /supported reader route/);
  assert.match(packagePublicationAdmissionIssue({
    ...row, sections: { packageRecord: record("authored/other/key") }
  })!, /different content keys/);
  assert.equal(packagePublicationAdmissionIssue({ ...row, status: "DRAFT", content_key: "authored/unknown/new" }), null);
}
const moonTaurus = {
  contentKey: "sky-placement/article/moon/taurus",
  content_role: "fallback_hook",
  studio_content_type: "continuous-placement"
};
assert.ok(isDynamicSkyPlacementArticleRecord(moonTaurus));
assert.equal(isDynamicSkyPlacementArticleRecord({ ...moonTaurus, studio_content_type: "card" }), false);
assert.ok(isFallbackDashboardRecordAllowed(moonTaurus, new Set()));
assert.equal(packagePublicationAdmissionIssue({
  status: "LIVE",
  provider: "tldrastro-fallback-architecture-v3",
  content_key: moonTaurus.contentKey,
  sections: { packageRecord: moonTaurus }
}), null);
assert.equal(packagePublicationAdmissionIssue({
  status: "LIVE",
  provider: "tldrastro-fallback-architecture-v3",
  content_key: "authored/calendar-season-transition/virgo/libra",
  sections: { packageRecord: { contentKey: "authored/calendar-season-transition/virgo/libra", content_role: "full_copy" } }
}), null);
for (const phase of ['new-moon', 'full-moon']) for (const sign of ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces']) {
  const contentKey = `authored/sky-lunation-macro/${phase}/${sign}`;
  const record = { contentKey, content_role: 'authored_card' };
  assert.ok(isDynamicLunationMacroRecord(record));
  assert.ok(isFallbackDashboardRecordAllowed(record, new Set()));
  assert.equal(packagePublicationAdmissionIssue({ status: 'LIVE', provider: 'tldrastro-fallback-architecture-v3', content_key: contentKey, sections: { packageRecord: record } }), null);
}
for (const contentKey of ['authored/sky-lunation-macro/new-moon/unknown', 'authored/sky-lunation-macro/quarter-moon/aquarius', 'authored/sky-lunation-macro/new-moon/aquarius/extra', 'authored/unknown/new-moon/aquarius']) {
  assert.equal(isDynamicLunationMacroRecord({ contentKey, content_role: 'authored_card' }), false);
}
assert.equal(isFallbackDashboardRecordAllowed({ contentKey: 'authored/sky-lunation-macro/new-moon/aquarius', content_role: 'source_material' }, new Set()), false);
console.log("PASS: bounded House Transit, exact synastry and all 24 lunation identities, invalid key/role refusal and publication key protection.");

const {missingFriendsSource}=await import('../apps/admin/src/missingFriendsSource.ts');
const forward='fallback-hook/synastry-pair/sun/imum-coeli/sextile';
const reverse='fallback-hook/synastry-pair/imum-coeli/sun/sextile';
const pending={id:'synthetic-reverse',content_key:reverse,status:'LIVE',sections:{packageDraft:{body_you:'Owner pending reverse copy.'}}} as any;
const unchanged=JSON.stringify(pending);
const opened=await missingFriendsSource(forward,async key=>{assert.equal(key,reverse);return {rows:[pending]};});
assert(opened && 'row' in opened);assert.equal(opened.row,pending);assert.equal(JSON.stringify(pending),unchanged);
const created=await missingFriendsSource(forward,async()=>({rows:[]}));
assert(created && 'draft' in created);assert.equal(created.draft.contentKey,forward);assert.equal(created.draft.status,'DRAFT');
await assert.rejects(()=>missingFriendsSource(forward,async()=>({rows:[{...pending,content_key:'unrelated'}]})),/could not be verified/);
for(const key of ['fallback-hook/bond-effect-sextile/unknown','fallback-hook/synastry-pair/sun/unknown/sextile']){
 assert.equal(await missingFriendsSource(key,async()=>{throw new Error('Invalid identities must not request another source.');}),null);
}
console.log('PASS: missing Friends activation creation preserves saved reverse-order owner drafts and rejects mismatched source responses.');
