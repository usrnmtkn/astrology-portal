#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

const readJson = (path) => JSON.parse(fs.readFileSync(path, "utf8"));
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const importPath = "packages/astro-knowledge/review/friend-natal-owner-verdict-import-2026-08-11.json";
const applicationPath = "packages/astro-knowledge/review/friend-natal-owner-verdict-application-2026-08-11.json";
const sourcePaths = [
  "apps/web/src/content/fallbackArchitectureV3/source-rows/friend-natal-vocabulary-they-candidates-v1.json",
  "apps/web/src/content/fallbackArchitectureV3/source-rows/friend-natal-row-level-candidates-v1.json"
];

const imported = readJson(importPath);
const application = readJson(applicationPath);
assert.equal(application.sourceImportSha256, sha256(fs.readFileSync(importPath)));
assert.deepEqual(application.verdictCounts, { approve: 2, cut: 41, edit: 0 });
assert.equal(application.ownerDecisions.length, 3);
assert.deepEqual(application.ownerDecisions, imported.ownerDecisions);
assert.equal(application.invariants.canonicalServingRowsChanged, false);
assert.equal(application.invariants.autoPublish, false);
assert.equal(application.invariants.writerPromotionAuthorized, false);

const rows = sourcePaths.flatMap((path) => {
  const document = readJson(path);
  const expected = application.candidateDocuments.find((item) => item.path === path);
  assert.ok(expected, `${path}: missing application hash.`);
  assert.equal(sha256(fs.readFileSync(path)), expected.sha256After, `${path}: state changed after application.`);
  return [...(document.vocabularyRows ?? []), ...(document.hookRows ?? [])];
});
assert.equal(rows.length, 43);

const approved = rows.filter((row) => row.review_status === "owner_approved_candidate");
const discarded = rows.filter((row) => row.review_status === "discarded");
assert.deepEqual(approved.map((row) => row.contentKey).sort(), [
  "fallback-vocab/planet-function/moon",
  "fallback-vocab/planet-function/venus"
]);
assert.equal(discarded.length, 41);
assert.ok(approved.every((row) => row.ownerApproved === true && row.ownerVerdict === "approve"));
assert.ok(discarded.every((row) => row.ownerApproved === false && row.ownerVerdict === "cut"));
assert.ok(rows.every((row) => row.promotionAuthorized === false));

const canonical = readJson("apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json");
const canonicalRows = [...canonical.vocabularyRows, ...canonical.hookRows];
assert.ok(canonicalRows.every((row) => row.candidateState === undefined && row.ownerVerdictRecord === undefined));

console.log("Friend natal owner verdict application passed (2 approved candidates, 41 discarded, 3 OwnerDecisions; serving untouched)." );
