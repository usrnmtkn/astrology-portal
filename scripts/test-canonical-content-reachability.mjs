#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), "utf8"));
const index = readJson("packages/astro-knowledge/canonical-content/index/canonical-content-index.json");
const report = readJson("packages/astro-knowledge/canonical-content/review/natal-wave-1-migration-report.json");
const allowlist = readJson("packages/astro-knowledge/canonical-content/review/natal-wave-1-source-allowlist.json");

assert.equal(report.sourceReachability.eligibleExactRows, 403);
assert.equal(report.sourceReachability.failures, 0);
assert.deepEqual(report.sourceReachability.original371, {
  total: 371,
  canonicalUnit: 352,
  compositionIngredient: 19,
  explicitAllowlist: 0,
  failures: 0
});
assert.equal(index.sourceManifest.sourceReachability.rows.some((row) => row.category === "UNREFERENCED" || row.category === "AMBIGUOUS"), false);
assert.equal(index.sourceManifest.authoredStoreInventory.distinctKeys, 2764);
assert.equal(index.sourceManifest.authoredStoreInventory.migratedInWave1, 0);
assert.equal(index.sourceManifest.authoredStoreInventory.entries.length, 2764);
assert.equal(report.authoredStoreInventory.careerNatalAdjacent.count, 15);
assert.equal(report.authoredStoreInventory.pointExplainers.count, 2);

const semanticExclusions = allowlist.entries.filter((entry) => entry.entryType === "semantic-unit-family");
assert.deepEqual(semanticExclusions.map((entry) => entry.expectedUnitCount), [12, 12]);
for (const entry of semanticExclusions) {
  assert.match(entry.evidence, /fallbackArchitectureV3Runtime\.ts:610-613/u);
}

console.log("Canonical source reachability passed: 403 eligible exact rows classified; original 371 fully reconciled; 2,764 authored keys inventoried without migration.");
