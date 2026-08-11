#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json");
const recordPath = path.join(repoRoot, "packages/astro-knowledge/review/v13-duplicate-contentkey-repair-2026-08-11.json");
const ingestionScriptPath = path.join(repoRoot, "scripts/ingest-ll-matrix-v13.mjs");
const releaseId = "ll-matrix-v13-owner-approved-runtime";
const approvedStates = new Set(["approved", "approved_reuse", "reviewed"]);
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const rowSha256 = (row) => sha256(JSON.stringify(row));

const sourceBytes = fs.readFileSync(sourcePath);
const source = JSON.parse(sourceBytes.toString("utf8"));
const record = JSON.parse(fs.readFileSync(recordPath, "utf8"));
const rows = [...source.vocabularyRows, ...source.hookRows];
const byKey = new Map();
for (const row of rows) {
  const matches = byKey.get(row.contentKey) ?? [];
  matches.push(row);
  byKey.set(row.contentKey, matches);
}
const duplicates = [...byKey].filter(([, matches]) => matches.length > 1);
assert.deepEqual(duplicates, [], "Canonical fallback source must never contain duplicate contentKey values.");

assert.equal(record.counts.duplicateKeysBefore, 108);
assert.equal(record.counts.supersededRowsRemoved, 108);
assert.equal(record.counts.duplicateKeysAfter, 0);
assert.equal(record.counts.v13RowsRetained, 301);
assert.equal(record.counts.copyIdenticalDuplicates, 106);
assert.equal(record.counts.ownerRuledCopyConflicts, 2);
assert.equal(record.invariants.otherApprovedRowsChanged, 0);
assert.equal(record.entries.length, 108);
assert.equal(record.invariants.sourceAfterSha256, sha256(sourceBytes));

const approvedFingerprint = sha256(JSON.stringify(
  rows
    .filter((row) => approvedStates.has(row.review_status))
    .map(rowSha256)
    .sort(),
));
assert.equal(
  approvedFingerprint,
  record.invariants.approvedRowsAfterSha256,
  "An approved row changed outside the recorded 108-row repair.",
);

for (const disposition of record.entries) {
  const matches = byKey.get(disposition.contentKey) ?? [];
  assert.equal(matches.length, 1, `${disposition.contentKey}: repair must retain exactly one row.`);
  assert.equal(matches[0].source_release, releaseId, `${disposition.contentKey}: retained row must be V13-derived.`);
  assert.equal(rowSha256(matches[0]), disposition.kept.rowSha256, `${disposition.contentKey}: retained V13 row drifted.`);
  assert.notEqual(rowSha256(matches[0]), disposition.dropped.rowSha256, `${disposition.contentKey}: superseded row was not removed.`);
}

const moonOpposition = byKey.get("fallback-hook/natal-aspect-lived/moon/opposition/ascendant")[0];
assert.match(moonOpposition.body, /somebody else's mood keeps deciding the whole day\.$/u);
const marsCancer = byKey.get("fallback-hook/placement-sign-lived/mars/cancer")[0];
assert.match(marsCancer.body, /The anger builds when you cannot address it directly\.$/u);

const ingestionScript = fs.readFileSync(ingestionScriptPath, "utf8");
assert.match(ingestionScript, /supersededPriorRows/u, "V13 ingestion must identify same-key superseded rows.");
assert.match(ingestionScript, /preservedPriorRows/u, "V13 ingestion must replace same-key rows instead of appending duplicates.");
assert.doesNotMatch(
  ingestionScript,
  /sourceRows\.hookRows\s*=\s*\[\.\.\.priorRows,\s*\.\.\.servingRows\]/u,
  "Append-instead-of-replace regression detected in V13 ingestion.",
);

console.log("V13 duplicate contentKey gate passed: 0 duplicates; 108 dispositions verified; 301 V13 rows retained; approved-row invariant held.");
