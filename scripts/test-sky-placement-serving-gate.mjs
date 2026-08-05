#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageRoot = path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3");
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(packageRoot, relativePath), "utf8"));
const readSource = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
const manifest = readJson("authored-inputs/sky-placement-serving-manifest-v1.json");

assert.equal(manifest.runtime_capability, "sky-placement-on-demand-v1");
assert.equal(manifest.owner_approval_policy?.editorial_approval_is_serving_approval, false);
assert.equal(manifest.owner_approval_policy?.require_explicit_owner_approval_for_every_staged_to_serving_transition, true);

const releaseIds = new Set();
const releaseBatches = new Set();
const approvedKeys = new Set();

for (const release of manifest.releases ?? []) {
  assert.ok(release.release_id && !releaseIds.has(release.release_id), "Serving releases must have unique release_id values.");
  assert.ok(
    release.release_batch != null && !releaseBatches.has(String(release.release_batch)),
    "Serving releases must have unique release_batch values."
  );
  releaseIds.add(release.release_id);
  releaseBatches.add(String(release.release_batch));

  const releaseKeys = Array.isArray(release.approved_keys) ? release.approved_keys : [];
  for (const contentKey of releaseKeys) {
    assert.ok(!approvedKeys.has(contentKey), `Serving diff repeats ${contentKey}.`);
    approvedKeys.add(contentKey);
  }

  if (release.distribution_state !== "serving") continue;

  assert.ok(release.owner_approval?.statement?.trim(), `${release.release_id} needs an exact owner approval statement.`);
  assert.ok(release.owner_approval?.approved_at?.trim(), `${release.release_id} needs an owner approval date.`);
  assert.ok(release.owner_approval?.source?.trim(), `${release.release_id} needs an owner approval source.`);
  assert.deepEqual(release.owner_approval?.approved_keys, releaseKeys, `${release.release_id} owner approval must cover the exact serving diff.`);

  if (Number(release.release_batch) >= 2) {
    assert.equal(release.transition, "staged_to_serving");
    assert.equal(release.required_runtime_capability, manifest.runtime_capability);
    assert.equal(release.migration_gate?.status, "verified");
    assert.ok(release.migration_gate?.deployed_package_version?.trim());
    assert.ok(release.migration_gate?.verified_at?.trim());
    assert.ok(release.migration_gate?.source?.trim());
  }
}

const batch2 = manifest.releases.find((release) => String(release.release_batch) === "2");
assert.ok(batch2, "Batch 2 must have an explicit serving-manifest release.");
const expectedBatch2Keys = [
  "fallback-hook/sky-sign-copy/mercury/aries",
  "fallback-hook/sky-sign-copy/mercury/taurus",
  "fallback-hook/sky-sign-copy/mercury/cancer",
  "fallback-hook/sky-sign-copy/mercury/leo",
  "fallback-hook/sky-sign-copy/mercury/libra",
  "fallback-hook/sky-sign-copy/mercury/scorpio",
  "fallback-hook/sky-sign-copy/mercury/sagittarius"
];
if (batch2.distribution_state === "staged") {
  assert.ok(["blocked", "verified"].includes(batch2.migration_gate?.status));
  assert.deepEqual(batch2.approved_keys, []);
  assert.equal(batch2.owner_approval, null);
} else {
  assert.equal(batch2.distribution_state, "serving");
  assert.deepEqual(batch2.approved_keys, expectedBatch2Keys);
  assert.deepEqual(batch2.owner_approval?.approved_keys, expectedBatch2Keys);
  assert.equal(batch2.migration_gate?.deployed_package_version, "v3-2026-08-04b");
  assert.equal(batch2.migration_gate?.verified_at, "2026-08-04T18:17:03Z");
  assert.match(batch2.migration_gate?.source ?? "", /dpl_GxWYk5B8bKdxEices36VEmf1G2mA/u);
}

const expectedBatch3Keys = [
  "fallback-hook/sky-sign-copy/mercury/capricorn",
  "fallback-hook/sky-sign-copy/mercury/aquarius",
  "fallback-hook/sky-sign-copy/mars/taurus",
  "fallback-hook/sky-sign-copy/mars/gemini",
  "fallback-hook/sky-sign-copy/mars/cancer",
  "fallback-hook/sky-sign-copy/mars/leo",
  "fallback-hook/sky-sign-copy/mars/virgo"
];
const expectedBatch4Keys = [
  "fallback-hook/sky-sign-copy/mars/sagittarius",
  "fallback-hook/sky-sign-copy/mars/aquarius",
  "fallback-hook/sky-sign-copy/mars/pisces",
  "fallback-hook/sky-sign-copy/neptune/aries",
  "fallback-hook/sky-sign-copy/pluto/aquarius"
];
for (const [batch, expectedKeys] of [["3", expectedBatch3Keys], ["4", expectedBatch4Keys]]) {
  const release = manifest.releases.find((candidate) => String(candidate.release_batch) === batch);
  assert.ok(release, `Batch ${batch} must have an explicit serving-manifest release.`);
  assert.equal(release.distribution_state, "serving");
  assert.deepEqual(release.approved_keys, expectedKeys);
  assert.deepEqual(release.owner_approval?.approved_keys, expectedKeys);
  assert.match(release.owner_approval?.statement ?? "", /exact 12-key batches 3 and 4 staged_to_serving diff/u);
  assert.equal(release.migration_gate?.deployed_package_version, "v3-2026-08-04b");
}
assert.equal([...expectedBatch2Keys, ...expectedBatch3Keys, ...expectedBatch4Keys].length, 19);
assert.ok(!approvedKeys.has("fallback-hook/sky-sign-copy/chiron/aries"));
assert.ok(!approvedKeys.has("fallback-hook/sky-sign-copy/nodes/aquarius-leo"));

const runtimeSource = readSource("apps/web/src/content/fallbackArchitectureV3Runtime.ts");
const placementBundleSource = readSource("apps/web/src/content/fallbackArchitectureV3SkyPlacementBundle.ts");
const appSource = readSource("apps/web/src/App.tsx");
const generatedContentSource = readSource("apps/web/src/services/generatedContent.ts");
const materializerSource = readSource("scripts/materialize-fallback-architecture-v3-dashboard-rows.mjs");
const importerSource = readSource("scripts/import-sky-placement-continuous-v2.mjs");

assert.match(runtimeSource, /import\("\.\/fallbackArchitectureV3SkyPlacementBundle"\)/u);
assert.doesNotMatch(runtimeSource, /^import .*sky-(?:planet-frames|placement-inventories|sign-copy).*\.json/mu);
assert.match(placementBundleSource, /bundled-sky-placement-rows-v3\.json/u);
assert.match(appSource, /loadSkyPlacementFallbackArchitectureV3Bundle/u);
assert.match(generatedContentSource, /tldrastro-fallback-architecture-v3-sky-placement/u);
assert.match(materializerSource, /serving-awaiting-owner-approval/u);
assert.match(importerSource, /distribution_state: "staged"/u);
assert.match(importerSource, /Editorial approval does not authorize serving/u);

console.log("Sky Placement serving gate passed with 19 approved batches 2-4 keys and Chiron/Nodes excluded.");
