import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

import { SOURCE_PATH } from "./build-synastry-directionality-inventory.mjs";
import { buildSynastryDirectionalityHumanReview } from "./build-synastry-directionality-human-review.mjs";
import {
  DIRECTIONALITY_ACTION,
  HUMAN_REVIEW_EXPECTED_COUNTS
} from "./synastry-directionality-human-review.mjs";

const fileHash = (filePath) => crypto
  .createHash("sha256")
  .update(fs.readFileSync(filePath))
  .digest("hex");

const sourceHashBefore = fileHash(SOURCE_PATH);
const inventory = buildSynastryDirectionalityHumanReview();
const sourceHashAfter = fileHash(SOURCE_PATH);

assert.equal(sourceHashAfter, sourceHashBefore, "Human directionality review must not modify serving source copy");
assert.equal(inventory.servingChangesAuthorized, false);
assert.equal(inventory.semanticInferencePolicy, "human_reviewed");
assert.equal(inventory.summary.servingRowCount, HUMAN_REVIEW_EXPECTED_COUNTS.servingRows);
assert.equal(inventory.summary.canonicalPairCount, HUMAN_REVIEW_EXPECTED_COUNTS.canonicalPairs);
assert.deepEqual(inventory.summary.actionCounts, HUMAN_REVIEW_EXPECTED_COUNTS.actions);
assert.equal(inventory.summary.humanReviewDecisionCount, 483);
assert.equal(inventory.summary.authorReverseCount, 397);
assert.equal(inventory.summary.reciprocalNoReverseCount, 76);
assert.equal(inventory.summary.needsDirectionReviewCount, 10);

const rowsByKey = new Map(inventory.rows.map((row) => [row.contentKey, row]));
assert.equal(rowsByKey.size, 483, "Every governed row must have exactly one human directionality decision");

for (const row of inventory.rows) {
  assert.equal(row.decisionSource, "human_directionality_review_2026-09-08");
  assert([
    DIRECTIONALITY_ACTION.AUTHOR_REVERSE,
    DIRECTIONALITY_ACTION.RECIPROCAL_NO_REVERSE,
    DIRECTIONALITY_ACTION.NEEDS_DIRECTION_REVIEW
  ].includes(row.action));

  if (row.action === DIRECTIONALITY_ACTION.AUTHOR_REVERSE) {
    assert.equal(typeof row.missingSemanticDirection, "string", `${row.contentKey}: missing reverse direction`);
  } else {
    assert.equal(row.missingSemanticDirection, null, `${row.contentKey}: non-author row must not have reverse direction`);
  }
}

const expectedUnresolved = new Set([
  "fallback-hook/synastry-pair/chiron/lilith/conjunction",
  "fallback-hook/synastry-pair/chiron/lilith/hard",
  "fallback-hook/synastry-pair/chiron/lilith/soft",
  "fallback-hook/synastry-pair/chiron/south-node/conjunction",
  "fallback-hook/synastry-pair/chiron/south-node/hard",
  "fallback-hook/synastry-pair/chiron/south-node/soft",
  "fallback-hook/synastry-pair/south-node/lilith/conjunction",
  "fallback-hook/synastry-pair/south-node/lilith/hard",
  "fallback-hook/synastry-pair/south-node/lilith/soft",
  "fallback-hook/synastry-pair/venus/mars/hard"
]);
const actualUnresolved = new Set(
  inventory.rows
    .filter((row) => row.action === DIRECTIONALITY_ACTION.NEEDS_DIRECTION_REVIEW)
    .map((row) => row.contentKey)
);
assert.deepEqual(actualUnresolved, expectedUnresolved, "Special editorial review queue drifted");

for (const key of [
  "fallback-hook/synastry-pair/sun/mars/hard",
  "fallback-hook/synastry-pair/sun/mercury/hard",
  "fallback-hook/synastry-pair/venus/ascendant/soft",
  "fallback-hook/synastry-pair/neptune/midheaven/soft"
]) {
  const row = rowsByKey.get(key);
  assert.equal(row.action, DIRECTIONALITY_ACTION.AUTHOR_REVERSE, `${key}: Batch 1 reverse decision must remain intact`);
  assert.equal(typeof row.candidateNameToYou, "string", `${key}: owner-positive calibration copy must remain attached`);
}

const moonSouthNode = rowsByKey.get("fallback-hook/synastry-pair/moon/south-node/soft");
assert.equal(moonSouthNode.action, DIRECTIONALITY_ACTION.RECIPROCAL_NO_REVERSE);
assert.equal(moonSouthNode.existingSemanticDirection, "shared_reciprocal");
assert.equal(moonSouthNode.missingSemanticDirection, null);

for (const key of [
  "fallback-hook/synastry-pair/mars/descendant/soft",
  "fallback-hook/synastry-pair/chiron/descendant/conjunction"
]) {
  assert(rowsByKey.has(key), `${key}: previously omitted key must be covered by the human review`);
  assert.equal(rowsByKey.get(key).action, DIRECTIONALITY_ACTION.AUTHOR_REVERSE);
}

console.log(
  "PASS synastry human directionality review: 483 classified, 397 reverse-author, 76 reciprocal, 10 special-review."
);
