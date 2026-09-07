#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const reviewDir = path.join(
  repoRoot,
  "packages/astro-knowledge/review/sky-calendar-collective-rewrite-2026-09-07"
);
const sourceProjectionPath = path.join(
  repoRoot,
  "packages/astro-knowledge/review/sky-calendar-exact-approved-2026-09-06-final-83/current-owner-payloads.json"
);

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, "utf8"));
const sourceProjection = readJson(sourceProjectionPath);
const sourceKeys = Object.keys(sourceProjection.payloads ?? {}).sort();

assert.equal(sourceProjection.rowCount, 379, "Expected the current owner projection to contain 379 exact Calendar aspects.");
assert.equal(sourceKeys.length, 379, "Current owner projection key count drifted.");

const candidateFiles = fs.readdirSync(reviewDir)
  .filter((name) => /^candidate-payloads-\d+\.json$/u.test(name))
  .sort();
assert.equal(candidateFiles.length, 8, "Expected eight collective rewrite candidate payload files.");

const candidateEntries = new Map();
const secondPerson = /\b(?:you|your|yours|yourself|yourselves)\b/iu;
const bannedWhether = /\bwhether\b/iu;
const emDash = /—/u;

for (const file of candidateFiles) {
  const payload = readJson(path.join(reviewDir, file));
  assert.equal(payload.reviewStatus, "needs_review", `${file}: candidate package must remain needs_review.`);
  assert.equal(payload.ownerApproved, false, `${file}: unseen candidate wording cannot be marked owner-approved.`);
  assert.equal(payload.promotionAuthorized, false, `${file}: candidate package cannot authorize promotion.`);

  for (const [contentKey, entry] of Object.entries(payload.entries ?? {})) {
    assert.equal(candidateEntries.has(contentKey), false, `${contentKey}: duplicate candidate key.`);
    assert.ok(sourceProjection.payloads?.[contentKey], `${contentKey}: candidate key is not in the current 379-row exact projection.`);
    assert.equal(typeof entry.summary, "string", `${contentKey}: missing summary.`);
    assert.equal(typeof entry.body, "string", `${contentKey}: missing body.`);
    assert.ok(entry.summary.trim().length > 0, `${contentKey}: blank summary.`);
    assert.ok(entry.body.trim().length > 0, `${contentKey}: blank body.`);
    assert.ok(entry.body.startsWith(entry.summary), `${contentKey}: body must begin with the exact summary sentence.`);
    assert.match(entry.body, /\bWhen\b/u, `${contentKey}: body must name the aspect mechanism after the collective thesis.`);

    for (const [field, value] of [["summary", entry.summary], ["body", entry.body]]) {
      assert.doesNotMatch(value, secondPerson, `${contentKey}.${field}: direct second-person language is forbidden on this collective Calendar batch.`);
      assert.doesNotMatch(value, bannedWhether, `${contentKey}.${field}: banned 'whether' construction detected.`);
      assert.doesNotMatch(value, emDash, `${contentKey}.${field}: em dash detected.`);
    }

    candidateEntries.set(contentKey, entry);
  }
}

const candidateKeys = [...candidateEntries.keys()].sort();
assert.equal(candidateKeys.length, 379, "Collective rewrite must cover all and only the current 379 Calendar exact aspects.");
assert.deepEqual(candidateKeys, sourceKeys, "Collective rewrite key set must exactly match the current owner projection.");

console.log("Sky Calendar collective rewrite candidate validation passed", {
  candidateFiles: candidateFiles.length,
  rowCount: candidateKeys.length,
  sourceRowCount: sourceKeys.length,
  reviewStatus: "needs_review",
  servingChanged: false
});
