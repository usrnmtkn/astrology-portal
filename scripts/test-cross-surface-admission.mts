import assert from "node:assert/strict";
import {
  isDynamicHouseTransitRecord,
  isDynamicSkyPlacementArticleRecord,
  isDynamicSynastryExactRecord,
  isFallbackDashboardRecordAllowed
} from "../apps/web/src/content/fallbackArchitectureV3/dashboardExtensions.ts";
import { packagePublicationAdmissionIssue } from "../api/_lib/content-studio-package-admission.ts";

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
console.log("PASS: bounded House Transit and exact synastry admission, distinct chart holders, and publication key protection.");
