import assert from "node:assert/strict";
import fs from "node:fs";

const source = JSON.parse(fs.readFileSync(
  new URL("../apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json", import.meta.url),
  "utf8"
));
const rows = Object.values(source).flatMap((value) => Array.isArray(value) ? value : []);
const bundled = JSON.parse(fs.readFileSync(
  new URL("../apps/web/src/content/fallbackArchitectureV3/bundled-deferred-core-rows-v3.json", import.meta.url),
  "utf8"
));

function assertGovernanceRecords(records, label) {
  const row = records.find((candidate) => candidate.contentKey === "fallback-hook/natal-moon-phase-lived/balsamic");

  assert.ok(row, `The retired balsamic record must remain available as historical source material in ${label}.`);
  assert.equal(row.review_status, "superseded");
  assert.equal(row.distribution_lane, "reference");
  assert.equal(row.content_role, "source_material");
  assert.equal(row.reader_only, false);
  assert.equal(row.render_policy, "reference-only-never-serve-verbatim");
  assert.equal(row.owner_approved, false);
  assert.equal(row.retirement?.disposition, "historical-source-material");

  for (const contentKey of [
    "fallback-hook/aspect-lived/sextile",
    "fallback-hook/aspect-lived/quincunx"
  ]) {
    const baseline = records.find((candidate) => candidate.contentKey === contentKey);
    assert.ok(baseline, `${contentKey} must remain available as an authoring baseline in ${label}.`);
    assert.equal(baseline.review_status, "reviewed");
    assert.equal(baseline.distribution_lane, "reference");
    assert.equal(baseline.content_role, "source_material");
    assert.equal(baseline.reader_only, false);
    assert.equal(baseline.render_policy, "reference-only-generic-aspect-baseline-v1");
    assert.equal(baseline.owner_approved, true);
    assert.equal(baseline.source_material?.purpose, "baseline-for-exact-pair-authoring");
    assert.equal(baseline.source_material?.neverServeVerbatim, true);
  }
}

assertGovernanceRecords(rows, "canonical source rows");
assertGovernanceRecords(bundled.hookRows, "the shipped deferred bundle");

console.log("Unwired fallback governance test passed in canonical and shipped rows: balsamic copy is retired and generic aspect doctrine is source material only.");
