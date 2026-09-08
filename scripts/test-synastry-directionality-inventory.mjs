import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

import {
  ALLOWED_ACTIONS,
  EXPECTED_COUNTS,
  SOURCE_PATH,
  buildSynastryDirectionalityInventory
} from "./build-synastry-directionality-inventory.mjs";

const fileHash = (filePath) => crypto
  .createHash("sha256")
  .update(fs.readFileSync(filePath))
  .digest("hex");

const sourceHashBefore = fileHash(SOURCE_PATH);
const inventory = buildSynastryDirectionalityInventory({ enforceExpectedCounts: true });
const sourceHashAfter = fileHash(SOURCE_PATH);

assert.equal(sourceHashAfter, sourceHashBefore, "Inventory build must not modify the serving source file");
assert.equal(inventory.servingChangesAuthorized, false);
assert.equal(inventory.semanticInferencePolicy, "human_only");
assert.equal(inventory.summary.servingRowCount, EXPECTED_COUNTS.servingRows);
assert.equal(inventory.summary.canonicalPairCount, EXPECTED_COUNTS.canonicalPairs);
assert.deepEqual(inventory.summary.readerTierCounts, EXPECTED_COUNTS.tiers);
assert.equal(inventory.summary.aspectFamilyCounts.conjunction, 161);
assert.equal(inventory.summary.aspectFamilyCounts.hard, 161);
assert.equal(inventory.summary.aspectFamilyCounts.soft, 161);
assert.equal(inventory.summary.actionCounts.AUTHOR_REVERSE, 4);
assert.equal(inventory.summary.actionCounts.NEEDS_DIRECTION_REVIEW, 479);
assert.equal(inventory.summary.seededDecisionCount, 5);
assert.equal(inventory.summary.reciprocalCandidateCount, 1);

const rowsByKey = new Map(inventory.rows.map((row) => [row.contentKey, row]));
assert.equal(rowsByKey.size, inventory.rows.length, "Every inventory row must have a unique serving key");

for (const row of inventory.rows) {
  assert(ALLOWED_ACTIONS.has(row.action), `Unexpected action ${row.action} for ${row.contentKey}`);
  assert.notEqual(row.readerTier, null, `Every inventory row must be governed reader-eligible: ${row.contentKey}`);
  assert.notEqual(row.action, "RECIPROCAL_NO_REVERSE", "Reciprocity must never be auto-approved by the inventory builder");
}

const familiesByPair = new Map();
for (const row of inventory.rows) {
  const families = familiesByPair.get(row.unorderedPairKey) ?? new Set();
  families.add(row.aspectFamily);
  familiesByPair.set(row.unorderedPairKey, families);
}
assert.equal(familiesByPair.size, 161);
for (const [pair, families] of familiesByPair) {
  assert.deepEqual(
    [...families].sort(),
    ["conjunction", "hard", "soft"],
    `Canonical pair ${pair} must retain the three serving aspect families`
  );
}

const expectedSeeds = new Map([
  [
    "fallback-hook/synastry-pair/sun/mars/hard",
    { existing: "mars_to_sun", missing: "sun_to_mars", action: "AUTHOR_REVERSE" }
  ],
  [
    "fallback-hook/synastry-pair/sun/mercury/hard",
    { existing: "mercury_to_sun", missing: "sun_to_mercury", action: "AUTHOR_REVERSE" }
  ],
  [
    "fallback-hook/synastry-pair/venus/ascendant/soft",
    { existing: "venus_to_ascendant", missing: "ascendant_to_venus", action: "AUTHOR_REVERSE" }
  ],
  [
    "fallback-hook/synastry-pair/neptune/midheaven/soft",
    { existing: "neptune_to_midheaven", missing: "midheaven_to_neptune", action: "AUTHOR_REVERSE" }
  ]
]);

for (const [contentKey, expected] of expectedSeeds) {
  const row = rowsByKey.get(contentKey);
  assert(row, `Missing Batch 1 seeded row ${contentKey}`);
  assert.equal(row.existingSemanticDirection, expected.existing);
  assert.equal(row.missingSemanticDirection, expected.missing);
  assert.equal(row.action, expected.action);
  assert.equal(row.reciprocalCandidate, false);
  assert.equal(typeof row.candidateNameToYou, "string");
  assert(row.candidateNameToYou.includes("{{Name}}"));
}

const moonSouthNode = rowsByKey.get("fallback-hook/synastry-pair/moon/south-node/soft");
assert(moonSouthNode, "Moon / South Node control row must remain in the inventory");
assert.equal(moonSouthNode.action, "NEEDS_DIRECTION_REVIEW");
assert.equal(moonSouthNode.reciprocalCandidate, true);
assert.equal(moonSouthNode.missingSemanticDirection, null);
assert.equal(moonSouthNode.candidateNameToYou, null);

const unseededRows = inventory.rows.filter((row) => row.decisionSource === null);
assert.equal(unseededRows.length, 478);
assert(unseededRows.every((row) => row.existingSemanticDirection === null));
assert(unseededRows.every((row) => row.missingSemanticDirection === null));
assert(unseededRows.every((row) => row.action === "NEEDS_DIRECTION_REVIEW"));

console.log(
  `PASS synastry directionality inventory: ${inventory.summary.servingRowCount} rows, `
  + `${inventory.summary.canonicalPairCount} canonical pairs, `
  + `${inventory.summary.actionCounts.AUTHOR_REVERSE} seeded reverse candidates, `
  + `${inventory.summary.actionCounts.NEEDS_DIRECTION_REVIEW} rows held for human direction review.`
);
