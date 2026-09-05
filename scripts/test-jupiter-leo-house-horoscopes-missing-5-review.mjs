import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const reviewPath = path.join(root, "packages/astro-knowledge/review/jupiter-leo-house-horoscopes-missing-5-2026-09-05/review.json");
const sourcePath = path.join(root, "apps/web/src/content/fallbackArchitectureV3/authored-inputs/owner-authored-sky-placement-house-passages-v1.json");
const review = JSON.parse(fs.readFileSync(reviewPath, "utf8"));
const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));

assert.equal(review.governance.review_status, "needs_review");
assert.equal(review.governance.owner_approved, false);
assert.equal(review.governance.serving_enabled, false);
assert.deepEqual(review.existingOwnerApprovedHouses, [5, 7, 8, 9, 10, 11, 12]);
assert.deepEqual(review.candidateHouses, [1, 2, 3, 4, 6]);
assert.equal(review.candidates.length, 5);
assert.equal(source.rows.length, 7, "Review staging must not modify the owner-approved serving source.");
assert.deepEqual(source.rows.map((row) => Number(row.contentKey.match(/house-(\d+)$/u)?.[1])).sort((a, b) => a - b), [5, 7, 8, 9, 10, 11, 12]);

for (const candidate of review.candidates) {
  assert.equal(candidate.review_status, "needs_review");
  assert.equal(candidate.owner_approved, false);
  assert.equal(candidate.serving_enabled, false);
  assert.ok(review.candidateHouses.includes(candidate.house));
  assert.equal(candidate.contentKey, `house-horoscope-core/jupiter/leo/house-${candidate.house}`);
  assert.equal(crypto.createHash("sha256").update(candidate.body_you).digest("hex"), candidate.body_sha256, `house ${candidate.house} hash drift`);
  const wordCount = candidate.body_you.match(/\b[\w’'-]+\b/gu)?.length ?? 0;
  assert.equal(wordCount, candidate.word_count, `house ${candidate.house} word count drift`);
}

console.log("Jupiter in Leo missing-five review wall passed: 5 candidates staged, 0 owner-approved source rows changed.");
