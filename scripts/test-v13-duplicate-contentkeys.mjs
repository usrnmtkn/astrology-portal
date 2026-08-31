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
const angleV15ManifestPath = path.join(repoRoot, "packages/astro-knowledge/review/angle-aspects-60-v15/shipping-manifest.json");
const releaseId = "ll-matrix-v13-owner-approved-runtime";
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const rowSha256 = (row) => sha256(JSON.stringify(row));

const sourceBytes = fs.readFileSync(sourcePath);
const source = JSON.parse(sourceBytes.toString("utf8"));
const record = JSON.parse(fs.readFileSync(recordPath, "utf8"));
const angleV15Manifest = JSON.parse(fs.readFileSync(angleV15ManifestPath, "utf8"));
const angleV15ByKey = new Map(angleV15Manifest.rows.map((row) => [row.contentKey, row]));
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
// These hashes are point-in-time evidence for the V13 repair, not a lock on
// every future approved source-row release. The per-entry checks below keep
// the repaired V13 rows byte-locked while later owner-authorized families may
// update other rows in the canonical source.
assert.equal(record.invariants.sourceAfterSha256, "e7929e6314c152adb91fd17afe5d4b6ace596adaed16f81037f46a60250ec83f");
assert.equal(record.invariants.approvedRowsAfterSha256, "250c7b9b6b045eb98bcf5f78e3c4e036a6f9deac8c01f3dba577edc735c246f3");

for (const disposition of record.entries) {
  const matches = byKey.get(disposition.contentKey) ?? [];
  assert.equal(matches.length, 1, `${disposition.contentKey}: repair must retain exactly one row.`);
  const laterV15 = angleV15ByKey.get(disposition.contentKey);
  if (laterV15) {
    assert.equal(matches[0].approval?.recordPath, laterV15.recordPath, `${disposition.contentKey}: later V15 approval path missing.`);
    assert.equal(matches[0].approval?.payloadSha256, laterV15.payloadSha256, `${disposition.contentKey}: later V15 payload hash missing.`);
    continue;
  }
  assert.equal(matches[0].source_release, releaseId, `${disposition.contentKey}: retained row must be V13-derived.`);
  assert.equal(rowSha256(matches[0]), disposition.kept.rowSha256, `${disposition.contentKey}: retained V13 row drifted.`);
  assert.notEqual(rowSha256(matches[0]), disposition.dropped.rowSha256, `${disposition.contentKey}: superseded row was not removed.`);
}

assert.equal(record.entries.filter(({ contentKey }) => angleV15ByKey.has(contentKey)).length, 3, "Exactly three repaired V13 rows must have later explicit V15 authority.");
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

console.log("V13 duplicate contentKey gate passed: 0 duplicates; 105 repaired rows remain byte-locked; 3 carry later explicit V15 authority; approved-row invariant held.");
