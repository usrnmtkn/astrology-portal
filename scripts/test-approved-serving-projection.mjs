#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isGovernedReaderEligible } from "../apps/web/src/content/fallbackArchitectureV3/resolver/readerEligibility.mjs";
import { canonicalSha256 } from "./lib/content-approval-governance.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageRoot = path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3");
const projection = JSON.parse(fs.readFileSync(path.join(packageRoot, "approved-serving-projection-v1.json"), "utf8"));
const summary = JSON.parse(fs.readFileSync(path.join(packageRoot, "bundled-manifest-summary-v3.json"), "utf8"));

assert.equal(projection.schema, "tldrastro-approved-serving-projection/v1");
assert.equal(projection.policy.pendingRowsPresent, false);
assert.equal(projection.manifest.contentHash, summary.contentHash);
assert.equal(projection.manifest.keyManifestHash, summary.keyManifestHash);
assert.equal(projection.manifest.keyCount, summary.keyCount);
const lineage = JSON.parse(fs.readFileSync(path.join(packageRoot, projection.lineage.file), "utf8"));
assert.equal(lineage.schema, "tldrastro-approved-serving-lineage/v1");
assert.equal(lineage.count, projection.lineage.count);
assert.equal(lineage.emissionCount, projection.lineage.emissionCount);
assert.equal(lineage.exactSourceMatchCount, projection.lineage.exactSourceMatchCount);
assert.equal(canonicalSha256(lineage), projection.lineage.sha256);
assert.equal(lineage.entries.length, lineage.count);
assert.equal(lineage.entries.reduce((count, entry) => count + entry.emissions.length, 0), lineage.emissionCount);
assert.equal(lineage.entries.every((entry) => entry.authoringSources.length > 0), true, "every serving row must identify an authoring source");

for (const [partitionName, descriptor] of Object.entries(projection.partitions)) {
  const document = JSON.parse(fs.readFileSync(path.join(packageRoot, descriptor.file), "utf8"));
  const rows = [
    ...(document.hookRows ?? []),
    ...(document.vocabularyRows ?? []),
    ...(document.authoredCards ?? []),
    ...(document.templates ?? []),
    ...(document.bookCards ?? []),
    ...(document.eclipseSections ?? []),
    ...(document.eclipseHouseLayers ?? [])
  ];
  const ineligible = rows.filter((row) => (
    row.review_status
      ? !isGovernedReaderEligible(row)
      : !document.templates?.includes(row)
  ));
  assert.deepEqual(ineligible.map((row) => row.contentKey), [], `${partitionName} must be approved-only`);
  for (const row of rows.filter((candidate) => candidate.review_status)) {
    assert.equal(isGovernedReaderEligible({ ...row, review_status: "needs_review" }), false, `${partitionName}/${row.contentKey} must reject pending status`);
    assert.equal(isGovernedReaderEligible({ ...row, review_status: "superseded" }), false, `${partitionName}/${row.contentKey} must reject superseded status`);
  }
  if (typeof descriptor.hookRows === "number") assert.equal(document.hookRows?.length ?? 0, descriptor.hookRows);
  if (typeof descriptor.vocabularyRows === "number") assert.equal(document.vocabularyRows?.length ?? 0, descriptor.vocabularyRows);
  if (typeof descriptor.authoredCards === "number") assert.equal(document.authoredCards?.length ?? 0, descriptor.authoredCards);
  if (typeof descriptor.templates === "number") assert.equal(document.templates?.length ?? 0, descriptor.templates);
  if (typeof descriptor.bookCards === "number") assert.equal(document.bookCards?.length ?? 0, descriptor.bookCards);
  if (typeof descriptor.eclipseSections === "number") assert.equal(document.eclipseSections?.length ?? 0, descriptor.eclipseSections);
  if (typeof descriptor.eclipseHouseLayers === "number") assert.equal(document.eclipseHouseLayers?.length ?? 0, descriptor.eclipseHouseLayers);

  const variants = document.dailyGlanceVariants;
  for (const [contentKey, set] of Object.entries(variants?.keys ?? {})) {
    const headlineIds = new Set(set.headlines.map((item) => item.id));
    const bodyIds = new Set(set.bodies.map((item) => item.id));
    for (const [kind, collection] of [["headline", set.headlines], ["body", set.bodies], ["pairing", set.pairings]]) {
      for (const item of collection) {
        assert.equal(isGovernedReaderEligible({
          ...item,
          contentKey: `daily-glance-variant/${contentKey}/${kind}/${item.id}`
        }), true, `${contentKey}/${kind}/${item.id} must be approved`);
      }
    }
    for (const pairing of set.pairings) {
      assert.equal(headlineIds.has(pairing.headline_id), true);
      assert.equal(bodyIds.has(pairing.body_id), true);
    }
  }
}

for (const contentKey of [
  "authored/book-ritual-and-the-moon/lunation-horoscope/eclipse-fixture",
  "authored/lunation-eclipse-section/fixture",
  "fallback-hook/natal-aspect-lived/sun/square/saturn"
]) {
  assert.equal(isGovernedReaderEligible({ contentKey, review_status: "approved" }), false, `${contentKey} must reject approval-by-label without evidence`);
  assert.equal(isGovernedReaderEligible({
    contentKey,
    review_status: "approved",
    approval: {
      approvalLevel: "exact_owner_approved",
      recordPath: "review/fixture.md",
      payloadSha256: "stale",
      approvedAt: "2026-08-25"
    }
  }), false, `${contentKey} must reject malformed approval evidence`);
}

const sourceVariants = JSON.parse(fs.readFileSync(path.join(packageRoot, "source-rows/daily-glance-variants-v1.json"), "utf8"));
const projectedVariants = JSON.parse(fs.readFileSync(path.join(packageRoot, "bundled-deferred-core-rows-v3.json"), "utf8")).dailyGlanceVariants;
const sourcePending = Object.values(sourceVariants.keys).flatMap((set) => [
  ...set.headlines,
  ...set.bodies,
  ...set.pairings
]).filter((item) => !["approved", "approved_reuse", "reviewed"].includes(item.review_status));
const projectedPending = Object.values(projectedVariants.keys).flatMap((set) => [
  ...set.headlines,
  ...set.bodies,
  ...set.pairings
]).filter((item) => !["approved", "approved_reuse", "reviewed"].includes(item.review_status));
assert.ok(sourcePending.length > 0, "fixture must prove pending variants exist in authoring source");
assert.equal(projectedPending.length, 0, "pending variants must not enter the serving projection");

const runtime = fs.readFileSync(path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3Runtime.ts"), "utf8");
assert.match(runtime, /approvedServingProjectionV1/);
assert.match(runtime, /pendingRowsPresent !== false/);

const lunationSource = JSON.parse(fs.readFileSync(path.join(packageRoot, "source-rows/lunation-blend-units-v1.json"), "utf8"));
const skyCoreBundle = JSON.parse(fs.readFileSync(path.join(packageRoot, "bundled-sky-core-rows-v3.json"), "utf8"));
const initialBundle = JSON.parse(fs.readFileSync(path.join(packageRoot, "bundled-initial-reader-rows-v3.json"), "utf8"));
const stagedRulers = lunationSource.hookRows.filter((row) => row.contentKey.startsWith("fallback-hook/lunation-ruler-house/"));
assert.equal(stagedRulers.length, 12);
assert.equal(stagedRulers.filter((row) => row.review_status === "needs_review").length, 11);
const approvedRulers = stagedRulers.filter((row) => row.review_status === "approved");
assert.deepEqual(approvedRulers.map((row) => row.contentKey), ["fallback-hook/lunation-ruler-house/11"]);
const projectedRulers = [...new Map([
  ...skyCoreBundle.hookRows,
  ...initialBundle.hookRows
].map((row) => [row.contentKey, row])).values()].filter((row) => (
  row.contentKey.startsWith("fallback-hook/lunation-ruler-house/")
));
assert.deepEqual(projectedRulers, approvedRulers, "the approved ruler row must be byte-equivalent and all pending ruler rows absent");

for (const servingModule of [
  "apps/web/src/content/fallbackArchitectureV3Runtime.ts",
  "apps/web/src/content/fallbackArchitectureV3DeferredBundle.ts",
  "apps/web/src/content/fallbackArchitectureV3LunationBookBundle.ts",
  "apps/web/src/services/weeklyHoroscope.ts"
]) {
  assert.doesNotMatch(
    fs.readFileSync(path.join(repoRoot, servingModule), "utf8"),
    /from\s+["'][^"']*fallbackArchitectureV3\/source-rows\//u,
    `${servingModule} must consume only the approved projection`
  );
}

console.log("Approved serving projection tests passed.");
