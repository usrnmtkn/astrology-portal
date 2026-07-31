#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createPackageManifest,
  PACKAGE_VERSION
} from "../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
const readJson = (relativePath) => JSON.parse(read(relativePath));
const runtimeSource = read("apps/web/src/content/fallbackArchitectureV3Runtime.ts");
const generatedContentSource = read("apps/web/src/services/generatedContent.ts");
const materializerSource = read("scripts/materialize-fallback-architecture-v3-dashboard-rows.mjs");
const appSource = read("apps/web/src/App.tsx");

assert.equal(PACKAGE_VERSION, "v3-2026-07-29q");
assert.match(
  runtimeSource,
  /export const fallbackArchitectureV3BundledManifest = fallbackArchitectureV3ManifestForBundle\(snapshotBundle\)/u,
  "Runtime must expose the bundled package version, content hash, and key manifest."
);
assert.match(
  runtimeSource,
  /packageRowsWithLatestOverride\(bundle\.rowsFile\.vocabularyRows \?\? \[\]\)\.filter\(isReaderEligible\)/u,
  "Review-gated overrides must suppress older rows before reader filtering."
);
assert.match(
  generatedContentSource,
  /fallbackArchitectureV3BundleCacheSchema = "fallback-architecture-v3-dashboard-cache-v3"/u,
  "Browser cache envelopes must use the hash-aware schema."
);
assert.match(
  generatedContentSource,
  /envelope\?\.bundledContentHash !== fallbackArchitectureV3BundledManifest\.contentHash/u,
  "A bundled-content hash change must invalidate browser cache."
);
assert.match(
  generatedContentSource,
  /containsBundledManifest[\s\S]*?sameVersionMatchesBundled[\s\S]*?manifest\.contentHash !== metadata\.contentHash/u,
  "Database packages must be complete, same-or-newer, and hash verified."
);
assert.match(
  generatedContentSource,
  /package metadata is missing or inconsistent[\s\S]*?clearCachedFallbackArchitectureV3Bundle\(\);[\s\S]*?return null;/u,
  "Unversioned or inconsistent database packages must fail closed."
);
assert.match(
  generatedContentSource,
  /\.order\("updated_at", \{ ascending: false \}\)[\s\S]*?\.order\("id", \{ ascending: false \}\)/u,
  "Supabase pagination must use a stable unique-ID tiebreaker."
);
assert.match(
  materializerSource,
  /packageContentHash: packageManifest\.contentHash/u,
  "Every mirrored row must carry the package content hash."
);
assert.match(
  materializerSource,
  /Dashboard mirror content mismatch/u,
  "Mirror verification must compare exact row content."
);
assert.match(
  appSource,
  /<ProfileView[\s\S]{0,240}targetDate=\{skyDate\}/u,
  "The You daily surface must receive the selected Sky date."
);
assert.match(
  appSource,
  /dayKey: Number\.isFinite\(Date\.parse\(`\$\{targetDate\}T00:00:00Z`\)\)/u,
  "Do/Don't rotation must derive its day key from the selected Sky date."
);

const packageDir = "apps/web/src/content/fallbackArchitectureV3";
const sourceRows = readJson(`${packageDir}/source-rows/fallback-source-rows-v3.json`);
const transitRows = readJson(`${packageDir}/source-rows/transit-synastry-rows-v1.json`);
const lunationRows = readJson(`${packageDir}/source-rows/lunation-blend-units-v1.json`);
const placementRows = readJson(`${packageDir}/source-rows/placement-interim-fixes-v1.json`);
const weeklyRows = readJson(`${packageDir}/source-rows/station-cards-week-openers-v1.json`);
const templates = readJson(`${packageDir}/templates/fallback-templates-v3.json`);
const latest = (rows) => [...new Map(rows.map((row) => [row.contentKey, row])).values()];
const eligible = (row, allowBlank = false) => (
  ["approved", "approved_reuse", "reviewed"].includes(String(row.review_status ?? "").toLowerCase())
  || (allowBlank && !row.review_status)
);
const expectedManifest = createPackageManifest({
  transitLib: {
    authoredCards: latest([
      ...transitRows.authoredCards,
      ...lunationRows.authoredCards,
      ...weeklyRows
    ]).filter((row) => eligible(row))
  },
  rowsFile: {
    hookRows: latest([...sourceRows.hookRows, ...lunationRows.hookRows]).filter((row) => eligible(row)),
    vocabularyRows: latest([
      ...sourceRows.vocabularyRows,
      ...placementRows.vocabularyRows
    ]).filter((row) => eligible(row))
  },
  templatesFile: {
    templates: latest([...templates.templates, ...placementRows.templates]).filter((row) => eligible(row, true))
  }
}, PACKAGE_VERSION);
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "tldr-fallback-package-contract-"));
const outputPath = path.join(tempDir, "mirror.json");

try {
  execFileSync(process.execPath, [
    path.join(repoRoot, "scripts/materialize-fallback-architecture-v3-dashboard-rows.mjs"),
    `--out=${outputPath}`
  ]);
  const materialized = JSON.parse(fs.readFileSync(outputPath, "utf8"));

  assert.deepEqual(
    materialized.packageManifest,
    expectedManifest,
    "Materialized mirror metadata must exactly match the bundled reader package."
  );
  assert.equal(
    materialized.rows.length,
    new Set(materialized.rows.map((row) => row.content_key)).size,
    "Materialization must emit one row per content key."
  );
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}

console.log("fallback package cache contract passed", {
  packageVersion: expectedManifest.packageVersion,
  contentHash: expectedManifest.contentHash,
  keyManifestHash: expectedManifest.keyManifestHash,
  keyCount: expectedManifest.keyCount,
});
