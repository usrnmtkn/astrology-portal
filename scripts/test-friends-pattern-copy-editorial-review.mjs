#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateCopy } from "../src/astro-writing/validateCopy.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const reviewPath = path.join(
  repoRoot,
  "packages/astro-knowledge/review/friends-pattern-copy-editorial-review-2026-08-21.json"
);
const review = JSON.parse(fs.readFileSync(reviewPath, "utf8"));
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const copyProjection = (row) => ({
  body: row.body ?? null,
  body_you: row.body_you ?? null,
  body_they: row.body_they ?? null
});

assert.equal(review.governance.reviewState, "needs_review");
assert.equal(review.governance.ownerApproved, false);
assert.equal(review.governance.promotionAuthorized, false);
assert.equal(review.governance.canonical, false);
assert.equal(review.governance.servingRowsChanged, false);
assert.equal(review.sourceSnapshots.length, 11);
assert.equal(review.candidates.length, 9);
assert.ok(review.candidates.every((candidate) => candidate.ownerApproved === false));

const sourceCache = new Map();
for (const snapshot of review.sourceSnapshots) {
  if (!sourceCache.has(snapshot.sourcePath)) {
    sourceCache.set(
      snapshot.sourcePath,
      JSON.parse(fs.readFileSync(path.join(repoRoot, snapshot.sourcePath), "utf8"))
    );
  }
  const source = sourceCache.get(snapshot.sourcePath);
  const rows = Object.values(source).flat().filter((value) => value && typeof value === "object");
  const row = rows.find((candidate) => candidate.contentKey === snapshot.contentKey);
  assert.ok(row, `${snapshot.contentKey}: source row missing`);
  assert.equal(row.review_status, snapshot.expectedReviewStatus, `${snapshot.contentKey}: review state drifted`);
  assert.equal(
    sha256(JSON.stringify(copyProjection(row))),
    snapshot.rowCopySha256,
    `${snapshot.contentKey}: current source wording changed before exact approval`
  );
}

const vagueAction = validateCopy("Ask for more.", {
  validationProfile: "shared-only",
  family: "daily-dodont",
  register: "second_person"
});
assert.ok(vagueAction.violations.some((violation) => violation.category === "vague_action_object"));

const completeAction = validateCopy("Ask for more time.", {
  validationProfile: "shared-only",
  family: "daily-dodont",
  register: "second_person"
});
assert.ok(!completeAction.violations.some((violation) => violation.category === "vague_action_object"));

const relationshipMetaphor = validateCopy("The obligations are eating the warmth out of the room.", {
  validationProfile: "shared-only",
  family: "synastry",
  register: "second_person"
});
assert.ok(relationshipMetaphor.advisories.some((violation) => violation.category === "relationship_container_metaphor"));

for (const allowed of ["Organize one room.", "Give the connection room to change."]) {
  const lint = validateCopy(allowed, {
    validationProfile: "shared-only",
    family: "synastry",
    register: "second_person"
  });
  assert.ok(![...lint.violations, ...lint.advisories].some((violation) => violation.category === "relationship_container_metaphor"));
}

const ruling = fs.readFileSync(
  path.join(repoRoot, "tldr-astro-phrasebank/TLDR-HUMAN-PATTERN-AND-RELATIONSHIP-COPY-RULING-OWNER.md"),
  "utf8"
);
for (const requiredRule of [
  "The astrology explains why a pattern is easy to enter. It never excuses",
  "Supply the object when a transitive action needs one.",
  "After the opening, the passage must become more specific, not more abstract.",
  "Short cards put the human pattern ahead of the astrology taxonomy"
]) {
  assert.match(ruling, new RegExp(requiredRule.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"));
}

console.log("Friends pattern-copy editorial review passed: active behavioral rules; 11 source snapshots unchanged; 9 candidates remain inert and unapproved.");
