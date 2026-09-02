import assert from "node:assert/strict";
import {
  isDynamicNatalPlacementExactKey,
  isDynamicNatalPlacementExactRecord,
  isFallbackDashboardRecordAllowed
} from "../apps/web/src/content/fallbackArchitectureV3/dashboardExtensions.ts";

const direct = "fallback-hook/natal-you-placement-complete-final/jupiter/leo/3";
const retrograde = `${direct}/retrograde`;
const row = (contentKey) => ({
  contentKey,
  content_role: "full_copy",
  reader_only: true,
  render_policy: "reader-only-exact-lived-v1"
});

assert.equal(isDynamicNatalPlacementExactKey(direct), true);
assert.equal(isDynamicNatalPlacementExactKey(retrograde), true);
assert.equal(isDynamicNatalPlacementExactKey("fallback-hook/natal-you-placement-complete-final/sun/leo/3/retrograde"), false);
assert.equal(isDynamicNatalPlacementExactKey("fallback-hook/natal-you-placement-complete-final/jupiter/leo/13"), false);
assert.equal(isDynamicNatalPlacementExactKey("fallback-hook/unknown/jupiter/leo/3"), false);
assert.equal(isDynamicNatalPlacementExactRecord(row(retrograde)), true);
assert.equal(isDynamicNatalPlacementExactRecord({ ...row(retrograde), reader_only: false }), false);
assert.equal(isDynamicNatalPlacementExactRecord({ ...row(retrograde), content_role: "fallback_source" }), false);

const currentPackageKeys = new Set(["fallback-hook/placement-sentence/jupiter/leo"]);
assert.equal(isFallbackDashboardRecordAllowed(row(retrograde), currentPackageKeys), true);
assert.equal(isFallbackDashboardRecordAllowed({ ...row("fallback-hook/arbitrary/new-key") }, currentPackageKeys), false);
assert.equal(isFallbackDashboardRecordAllowed({ ...row("fallback-hook/placement-sentence/jupiter/leo") }, currentPackageKeys), true);

console.log("Dynamic natal exact Content Studio extension-key contract passed.");
