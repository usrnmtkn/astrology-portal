#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..").replace(/^\/Users\/mprez\/Code\//, "/Users/mprez/code/");
const packageRoot = "/private/tmp/tldr-astro-handoff-final/tldr-astro-handoff-final";
const packageRecords = JSON.parse(fs.readFileSync(path.join(packageRoot, "tldr-astro-records.json"), "utf8")).records;
const sourceKeys = new Set(packageRecords.map((record) => record.key));
const natalOverlayPath = path.join(repoRoot, "tldr-astro-phrasebank/phrasebank/cc-natal-source-grounded-bundle.json");

if (fs.existsSync(natalOverlayPath)) {
  const natalOverlay = JSON.parse(fs.readFileSync(natalOverlayPath, "utf8"));

  for (const record of natalOverlay.records ?? []) {
    for (const key of record.sourceKeys ?? []) {
      sourceKeys.add(key);
    }

    for (const clause of Object.values(record.clauses ?? {})) {
      for (const key of clause.source_keys ?? []) {
        sourceKeys.add(key);
      }
    }
  }
}

const materialized = JSON.parse(fs.readFileSync(path.join(repoRoot, "scripts/content-source/final-source-grounded-dashboard-records.json"), "utf8"));
const appMaterialized = JSON.parse(fs.readFileSync(path.join(repoRoot, "apps/web/src/content/finalSourceGroundedDashboardRecords.json"), "utf8"));

const bannedPatterns = [
  /the planet names the topic/i,
  /the sign describes the condition/i,
  /\bCancer conditions\b/i,
  /\bconditions\b/i,
  /\btopics\b/i,
  /\bmeets\b/i,
  /\bis your natal\b/i,
  /bringing .+ to your .+/i,
  /use it while it lasts/i,
  /background noise/i,
  /before publishing/i,
  /entries are ordered/i,
  /do not apply/i,
  /\{\{[^}]+\}\}/
];

assert.equal(materialized.schema, "tldrastro-final-source-grounded-dashboard-records-v1");
assert.deepEqual(appMaterialized.summary, materialized.summary, "App snapshot must match script source summary.");
assert.ok(materialized.records.length > 1000, "Expected broad source-grounded package coverage.");
assert.ok(materialized.sourceGaps.length > 0, "Known source gaps must stay visible instead of being hidden.");

const requiredFamilies = ["natal-placement", "natal-aspect", "personalized-transit"];
for (const family of requiredFamilies) {
  assert.ok(materialized.summary.recordsByFamily[family] > 0, `Missing materialized ${family} records.`);
}

for (const record of materialized.records) {
  assert.ok(record.canonicalKey, "Record needs canonicalKey.");
  assert.ok(record.family, `${record.canonicalKey} needs family.`);
  assert.ok(record.validation?.templateDoesNotSupplyFacts, `${record.canonicalKey} must not supply calculated facts from templates.`);
  assert.ok(Array.isArray(record.sourceKeys) && record.sourceKeys.length > 0, `${record.canonicalKey} needs sourceKeys.`);

  for (const key of record.sourceKeys) {
    assert.ok(sourceKeys.has(key), `${record.canonicalKey} references missing source key ${key}.`);
  }

  for (const clause of Object.values(record.clauses ?? {})) {
    assert.ok(Array.isArray(clause.source_keys) && clause.source_keys.length > 0, `${record.canonicalKey} clause needs source_keys.`);
    for (const key of clause.source_keys) {
      assert.ok(sourceKeys.has(key), `${record.canonicalKey} clause references missing source key ${key}.`);
    }
  }

  for (const preview of Object.values(record.preview ?? {})) {
    const text = String(preview ?? "");
    assert.ok(text.trim(), `${record.canonicalKey} has an empty preview.`);
    for (const pattern of bannedPatterns) {
      assert.ok(!pattern.test(text), `${record.canonicalKey} preview contains banned seam ${pattern}: ${text}`);
    }
  }
}

for (const gap of materialized.sourceGaps) {
  assert.equal(gap.state, "SOURCE_GAP", `${gap.canonicalKey} must be reported as SOURCE_GAP.`);
  assert.ok(Array.isArray(gap.missing) && gap.missing.length > 0, `${gap.canonicalKey} gap must identify missing source keys.`);
}

console.log(JSON.stringify({
  status: "PASS",
  readyRecords: materialized.summary.readyRecords,
  sourceGaps: materialized.summary.sourceGaps,
  recordsByFamily: materialized.summary.recordsByFamily,
  sourceGapsByFamily: materialized.summary.sourceGapsByFamily
}, null, 2));
