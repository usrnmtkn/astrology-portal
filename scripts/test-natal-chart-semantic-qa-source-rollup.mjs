#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

const INVENTORY_PATH = "artifacts/natal-chart-content-qa-inventory-2026-08-12.json";
const RESULTS_PATH = "packages/astro-knowledge/review/natal-chart-content-qa-semantic-results-2026-08-12.json";
const SCHEDULE_PATH = "packages/astro-knowledge/review/natal-chart-content-qa-scheduled-work-coverage-2026-08-12.json";
const ROLLUP_PATH = "packages/astro-knowledge/review/natal-chart-content-qa-source-rollup-2026-08-12.json";

const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const inventory = readJson(INVENTORY_PATH);
const results = readJson(RESULTS_PATH);
const schedule = readJson(SCHEDULE_PATH);
const rollup = readJson(ROLLUP_PATH);

assert.equal(rollup.inputs.inventorySha256, sha256(fs.readFileSync(INVENTORY_PATH)), "Inventory drifted after rollup.");
assert.equal(rollup.inputs.semanticResultsSha256, sha256(fs.readFileSync(RESULTS_PATH)), "Semantic results drifted after rollup.");
assert.equal(rollup.inputs.scheduledWorkSha256, sha256(JSON.stringify(schedule)), "Scheduled-work evidence drifted after rollup.");
assert.deepEqual(rollup.governance, {
  advisoryOnly: true,
  copyChanges: false,
  approvalChanges: false,
  servingChanges: false,
  autoPublish: false,
  writerPromotion: false,
});

const flaggedResults = results.results.filter((result) => result.verdict === "EDIT" || result.verdict === "CUT");
assert.equal(flaggedResults.length, 4816);
assert.equal(rollup.summary.flaggedPassages, 4816);
assert.equal(rollup.rows.length, 603);
assert.equal(rollup.summary.distinctSourceRowsAndFrames, 603);
assert.equal(new Set(rollup.rows.map((row) => row.sourceKey)).size, 603);
assert.equal(rollup.rows.some((row) => row.sourceKind === "unresolved-dependency"), false);

const allowedNormalizedSeams = new Set([
  "unbridged-shift",
  "competing-messages",
  "assembled-list",
  "contradiction",
  "unsupported-claim",
]);
assert.equal(rollup.summary.otherNamedPassagesNormalized, 1841);
assert.equal(Object.values(rollup.summary.normalizedOtherNamedCounts).reduce((sum, count) => sum + count, 0), 1841);
assert.ok(Object.keys(rollup.summary.normalizedOtherNamedCounts).every((name) => allowedNormalizedSeams.has(name)));

const inventoryById = new Map(inventory.reviewQueue.map((item) => [item.reviewId, item]));
const attributedFlags = new Set();
for (const row of rollup.rows) {
  assert.ok(row.flaggedPassages > 0);
  assert.ok(row.judgedPassages >= row.flaggedPassages);
  assert.equal(row.flagRatePct, Number(((row.flaggedPassages / row.judgedPassages) * 100).toFixed(2)));
  assert.ok(["a-pass-2-scheduled", "b-authorized-broader-batch", "c-newly-discovered"].includes(row.scheduleClass));
  assert.equal(row.newScopeRequired, row.scheduleClass === "c-newly-discovered");
  assert.ok(inventoryById.has(row.worstExample.reviewId));
  assert.equal(inventoryById.get(row.worstExample.reviewId).renderedText, row.worstExample.renderedText);
  assert.ok(row.worstExample.verdict === "EDIT" || row.worstExample.verdict === "CUT");
  for (const coverage of ["a", "b", "c"]) assert.ok(Number.isInteger(row.coveragePassageCounts[coverage]));
  for (const reviewId of [row.worstExample.reviewId]) attributedFlags.add(reviewId);
}

for (const result of flaggedResults) {
  const sourceKeys = new Set(inventoryById.get(result.reviewId).occurrences.flatMap((occurrence) => occurrence.sourceKeys));
  assert.ok(sourceKeys.size > 0, `${result.reviewId} has no composition dependencies.`);
  assert.ok([...sourceKeys].some((sourceKey) => rollup.rows.some((row) => row.sourceKey === sourceKey)), `${result.reviewId} is not represented in rollup rows.`);
}

assert.deepEqual(rollup.rulerComposition, {
  rulerComposedEmptyHouseRenders: 3168,
  rulerComposedFlagged: 1425,
  rulerComposedFlagRatePct: 44.98,
  rulerComposedEdit: 1411,
  rulerComposedCut: 14,
  nonRulerEmptyHouseRenders: 0,
  nonRulerFlagged: 0,
  nonRulerFlagRatePct: null,
  comparisonAvailable: false,
  bySurface: {
    you: { judged: 1584, flagged: 676, edit: 667, cut: 9, flagRatePct: 42.68 },
    friend: { judged: 1584, flagged: 749, edit: 744, cut: 5, flagRatePct: 47.29 },
  },
  finding: rollup.rulerComposition.finding,
  recommendation: rollup.rulerComposition.recommendation,
  changesAuthorized: false,
});

console.log("Natal semantic QA source rollup passed: 4,816 flags map to 603 source rows/frames with stable evidence, normalized seams, conservative schedule coverage, and ruler-composition extent.");
