#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json");
const candidatePath = path.join(repoRoot, "packages/astro-knowledge/review/friend-vocabulary-person-inflection-candidates-2026-08-15.json");
const approvalPath = path.join(repoRoot, "packages/astro-knowledge/review/friend-vocabulary-person-inflection-owner-approval-2026-08-15.json");
const rulingPath = path.join(repoRoot, "packages/astro-knowledge/review/friend-vocabulary-person-inflection-owner-rulings-2026-08-15.json");
const write = process.argv.includes("--write");
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, "utf8"));

const source = readJson(sourcePath);
const candidates = readJson(candidatePath);
const approval = readJson(approvalPath);
const rulings = readJson(rulingPath);

assert.equal(sha256(fs.readFileSync(candidatePath)), approval.candidateRecord.sha256);
assert.equal(approval.approvedCount, 38);
assert.equal(rulings.rulings.length, 2);
assert.equal(rulings.servingAuthorized, true);

const candidateByKey = new Map(candidates.candidates.map((candidate) => [candidate.contentKey, candidate]));
const approved = new Map();
for (const contentKey of approval.approvedContentKeys) {
  const candidate = candidateByKey.get(contentKey);
  assert.equal(candidate?.disposition, "ready_for_owner_review", `${contentKey}: candidate disposition drifted.`);
  approved.set(contentKey, {
    bodyThey: candidate.proposedBodyThey,
    sourceBody: candidate.sourceBody,
    sourceBodySha256: candidate.sourceBodySha256,
    approvedVia: path.relative(repoRoot, approvalPath)
  });
}
for (const ruling of rulings.rulings) {
  assert.ok(approval.unresolvedContentKeys.includes(ruling.contentKey), `${ruling.contentKey}: ruling was not requested.`);
  approved.set(ruling.contentKey, {
    bodyThey: ruling.bodyThey,
    sourceBody: ruling.sourceBody,
    sourceBodySha256: ruling.sourceBodySha256,
    approvedVia: path.relative(repoRoot, rulingPath)
  });
}
assert.equal(approved.size, 40);

let changed = 0;
for (const row of source.vocabularyRows) {
  const variant = approved.get(row.contentKey);
  if (!variant) continue;
  assert.equal(row.body, variant.sourceBody, `${row.contentKey}: approved body changed.`);
  assert.equal(sha256(row.body), variant.sourceBodySha256, `${row.contentKey}: source hash changed.`);
  if (row.body_they !== variant.bodyThey) changed += 1;
  row.body_they = variant.bodyThey;
  row.body_they_review_status = "approved";
  row.body_they_approved_via = variant.approvedVia;
}

const expected = `${JSON.stringify(source, null, 1)}\n`;
if (write) {
  fs.writeFileSync(sourcePath, expected);
  console.log(`Applied ${approved.size} owner-approved Friend variants (${changed} source rows updated).`);
} else {
  assert.equal(fs.readFileSync(sourcePath, "utf8"), expected, "Canonical source is stale; run with --write.");
  console.log(`Friend vocabulary inflection import is current: ${approved.size} exact variants, canonical Self bodies unchanged.`);
}
