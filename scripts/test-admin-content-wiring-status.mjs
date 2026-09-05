import assert from "node:assert/strict";
import {
  contentWiringStatus,
  isPublishedButUnwired
} from "../apps/admin/src/contentWiringStatus.ts";

const approvedMoonHouse = {
  content_key: "sky.planetary.moon.house_10",
  status: "LIVE",
  lane: "serving",
  review_state: null
};

assert.deepEqual(contentWiringStatus(approvedMoonHouse), {
  detail: "This row is published, but no live reader call site requests this key family. Runtime integration was never completed.",
  label: "Needs connection",
  reason: "unfinished",
  state: "not-connected"
});
assert.equal(isPublishedButUnwired(approvedMoonHouse), true);

const retired = contentWiringStatus({
  content_key: "fallback-hook/natal-moon-phase-lived/balsamic",
  status: "ARCHIVED",
  lane: "reference",
  review_state: "retired-unwired-balsamic-moon-phase"
});
assert.equal(retired.reason, "retired");
assert.equal(retired.label, "Not serving");

const sourceOnly = contentWiringStatus({
  content_key: "fallback-hook/aspect-lived/sextile",
  status: "REVIEWED",
  lane: "reference",
  review_state: "source-material-generic-aspect-baseline",
  sections: { packageRecord: { content_role: "source_material" } }
});
assert.equal(sourceOnly.reason, "source-material");
assert.equal(sourceOnly.label, "Source only");

const connected = contentWiringStatus({
  content_key: "sky.placement.jupiter.leo",
  status: "LIVE",
  lane: "serving"
});
assert.equal(connected.reason, "connected");
assert.equal(connected.label, "Used by app");

const needsDestination = contentWiringStatus({
  content_key: "article/manual/unplaced",
  status: "LIVE",
  lane: "serving",
  mode: "article"
});
assert.equal(needsDestination.reason, "unfinished");
assert.equal(needsDestination.label, "Needs destination");

const unknown = contentWiringStatus({
  content_key: "fallback-hook/unknown-family/example",
  status: "LIVE",
  lane: "serving"
});
assert.equal(unknown.reason, "unknown");
assert.equal(unknown.label, "Connection unknown");

console.log("Admin content wiring labels distinguish connected, unfinished, retired, source-only, and unaudited rows.");
