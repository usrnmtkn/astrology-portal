#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  HELD_CALENDAR_EXACT_STUDIO_PACKAGE,
  HELD_CALENDAR_EXACT_STUDIO_PROMPT_PREFIX,
  buildHeldCalendarExactAspectRows
} from "./stage-held-calendar-exact-aspects.mjs";

const staged = buildHeldCalendarExactAspectRows({ aspect: "trine" });

assert.equal(staged.aspect, "trine");
assert.equal(staged.servingExactCount, 215, "The approved exact Calendar corpus changed unexpectedly.");
assert.ok(staged.rows.length > 0, "Held trine review staging must contain at least one row.");
assert.ok(
  staged.rows.some((row) => row.content_key === "sky.aspect.sun.trine.lilith"),
  "Sun trine Lilith must be surfaced as a held owner-decision row."
);

const servingKeys = new Set(staged.skippedServing.map((row) => row.contentKey));
for (const row of staged.rows) {
  assert.match(row.content_key, /^sky\.aspect\.[a-z-]+\.trine\.[a-z-]+$/u);
  assert.equal(servingKeys.has(row.content_key), false, `${row.content_key} must not duplicate an already-serving exact row.`);
  assert.equal(row.status, "DRAFT");
  assert.equal(row.lane, "reference");
  assert.equal(row.review_state, "needs-owner-decision");
  assert.equal(row.event_type, "sky-aspect-held-owner-review");
  assert.equal(row.prompt_version, `${HELD_CALENDAR_EXACT_STUDIO_PROMPT_PREFIX}-trine`);
  assert.equal(row.source_snapshot.contentStudioHeldExactAspect, true);
  assert.equal(row.source_snapshot.authorityClass, "unverified");
  assert.equal(row.source_snapshot.governanceState, "needs-owner-decision");
  assert.deepEqual(row.source_snapshot.surfacePermission, ["doctrine-only"]);

  const studio = row.sections.packageRecord;
  assert.equal(studio.source_package, HELD_CALENDAR_EXACT_STUDIO_PACKAGE);
  assert.equal(studio.studio_content_type, "aspect");
  assert.deepEqual(studio.studio_editable_fields.map((field) => field.path), ["Body"]);
  assert.equal(studio.Body, row.body);
  assert.equal(studio.owner_approved, false);
  assert.equal(studio.serving_enabled, false);
  assert.equal(studio.studio_version_status, "draft");
  assert.equal(studio.studio_provenance.reviewStatus, "needs-owner-decision");
  assert.equal(studio.studio_provenance.authorityClass, "unverified");
  assert.deepEqual(studio.studio_provenance.surfacePermission, ["doctrine-only"]);
}

assert.equal(
  staged.rows.some((row) => row.status === "LIVE" || row.sections.packageRecord.serving_enabled === true),
  false,
  "Held owner-decision staging must never create reader-serving rows."
);

console.log(JSON.stringify({
  ok: true,
  heldTrines: staged.rows.length,
  skippedAlreadyServing: staged.skippedServing.length,
  servingExactCount: staged.servingExactCount,
  includesSunTrineLilith: true,
  readerServingChanged: false
}, null, 2));
