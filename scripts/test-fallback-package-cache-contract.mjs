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
import { isGovernedReaderEligible } from "../apps/web/src/content/fallbackArchitectureV3/resolver/readerEligibility.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
const readJson = (relativePath) => JSON.parse(read(relativePath));
const runtimeSource = read("apps/web/src/content/fallbackArchitectureV3Runtime.ts");
const generatedContentSource = read("apps/web/src/services/generatedContent.ts");
const materializerSource = read("scripts/materialize-fallback-architecture-v3-dashboard-rows.mjs");
const appSource = read("apps/web/src/App.tsx");

assert.equal(PACKAGE_VERSION, "v3-2026-09-01b");
assert.match(
  runtimeSource,
  /export const fallbackArchitectureV3BundledManifestSummary = bundledManifestSummaryV3 as FallbackArchitectureV3PackageManifestSummary/u,
  "Runtime must expose the generated full-package version and hashes without eagerly importing the key list."
);
assert.match(
  runtimeSource,
  /import\("\.\/fallbackArchitectureV3\/bundled-manifest-v3\.json"\)/u,
  "The full bundled key list must load only when dashboard validation needs it."
);
assert.match(
  runtimeSource,
  /packageRowsWithLatestReaderEligibleOverride\(bundle\.rowsFile\.vocabularyRows \?\? \[\]\)/u,
  "Reader bundle assembly must select the latest eligible row for each vocabulary key."
);
assert.match(
  generatedContentSource,
  /fallbackArchitectureV3BundleCacheSchema = "fallback-architecture-v3-dashboard-cache-v5"/u,
  "Browser cache envelopes must use the hash-aware schema."
);
assert.match(
  generatedContentSource,
  /envelope\?\.runtimeCapability !== fallbackArchitectureV3BundledManifestSummary\.runtimeCapability[\s\S]*envelope\?\.bundledContentHash !== bundledPartition\.contentHash/u,
  "A runtime capability or partition-content hash change must invalidate browser cache."
);
assert.match(
  generatedContentSource,
  /allowEditorialContentOverrides[\s\S]*?manifest\.keyManifestHash !== bundledManifest\.keyManifestHash[\s\S]*?manifest\.keyManifestHash !== metadata\.keyManifestHash/u,
  "Database partitions must retain the bundled key topology while allowing approved editorial copy overrides."
);
assert.match(
  generatedContentSource,
  /packageAuthoredCardFromRow[\s\S]*?!recordBody && !recordBodyYou && !recordBodyThey/u,
  "Database package reconstruction must retain authored cards that use dual-voice bodies."
);
assert.match(
  generatedContentSource,
  /packageVocabRowFromRow[\s\S]*?if \(!body\)[\s\S]*?grammarFrame \? \{ grammar_frame: grammarFrame \} : \{\}/u,
  "Database package reconstruction must retain vocabulary rows with optional grammar frames."
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
  /Dashboard mirror mismatch:[\s\S]*changedCount[\s\S]*changedKeys/u,
  "Mirror verification must report exact row-content drift alongside missing and stale keys."
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
const dailyGlanceVariants = readJson(`${packageDir}/source-rows/daily-glance-variants-v1.json`);
const transitRows = readJson(`${packageDir}/source-rows/transit-synastry-rows-v1.json`);
const bondLanguagePass2 = readJson(`${packageDir}/source-rows/bond-language-pass-2.json`);
const pairDailyFrames = readJson(`${packageDir}/source-rows/pair-daily-frames-v1.json`);
const pairDailyClauses = readJson(`${packageDir}/source-rows/pair-daily-clauses-v1.json`);
const lunationRows = readJson(`${packageDir}/source-rows/lunation-blend-units-v1.json`);
const placementRows = readJson(`${packageDir}/source-rows/placement-interim-fixes-v1.json`);
const skyArticleRows = readJson(`${packageDir}/source-rows/sky-article-v1.json`);
const skyAspectPhrasebook = readJson(`${packageDir}/source-rows/sky-aspect-phrasebook-v1.json`);
const skyPlacementVoicePass = readJson(`${packageDir}/source-rows/sky-placement-inventories-voice-pass-v1.json`);
const skyPlacementOwnerApprovedFallbacks = readJson(`${packageDir}/bundled-sky-placement-owner-approved-reader-v1.json`);
const skyPlacementHouseTemplates = readJson(`${packageDir}/source-rows/sky-placement-house-templates-v1.json`);
const skyPlacementHouseTemplateReaderRows = skyPlacementHouseTemplates.rows.map((row) => ({
  contentKey: row.contentKey,
  content_role: row.content_role,
  grammar_frame: row.grammar_frame,
  body_you: row.body_you,
  review_status: row.review_status,
  ...(row.source_release ? { source_release: row.source_release } : {}),
  ...(row.copy_protection ? { copy_protection: row.copy_protection } : {})
}));
const sunLeoHouseCores = readJson(`${packageDir}/source-rows/sun-leo-house-cores-v1.json`);
const sunLeoHouseCoreReaderRows = sunLeoHouseCores.rows.map(({
  notes: _notes,
  source_keys: _sourceKeys,
  approved_via: _approvedVia,
  ...row
}) => row);
const venusLibraHouseCores = readJson(`${packageDir}/source-rows/venus-libra-house-cores-v1.json`);
const venusLibraHouseCoreReaderRows = venusLibraHouseCores.rows.map(({
  notes: _notes,
  source_keys: _sourceKeys,
  approved_via: _approvedVia,
  ...row
}) => row);
const skyPlanetFrames = readJson(`${packageDir}/source-rows/sky-planet-frames-v1.json`);
const servingManifest = readJson(`${packageDir}/authored-inputs/sky-placement-serving-manifest-v1.json`);
const servingReleaseByKey = new Map(servingManifest.releases.flatMap((release) => (
  release.approved_keys.map((key) => [key, release])
)));
const skySignCopyRows = fs.readdirSync(path.join(repoRoot, packageDir, "source-rows"))
  .filter((fileName) => /^sky-sign-copy-.*\.json$/u.test(fileName))
  .sort()
  .flatMap((fileName) => readJson(`${packageDir}/source-rows/${fileName}`).rows ?? []);
const timingEventRows = readJson(`${packageDir}/source-rows/timing-event-reader-copy-v2.json`);
const weeklyRows = readJson(`${packageDir}/source-rows/station-cards-week-openers-v1.json`);
const templates = readJson(`${packageDir}/templates/fallback-templates-v3.json`);
const eligible = (row, allowBlank = false) => {
  const editoriallyEligible = ["approved", "approved_reuse", "reviewed"]
    .includes(String(row.review_status ?? "").toLowerCase()) || (allowBlank && !row.review_status);
  const requiresServingRelease = row.render_policy === "sky-placement-continuous-v2"
    || String(row.contentKey ?? "").startsWith("fallback-hook/sky-sign-copy/");

  const distributionEligible = (
    !requiresServingRelease
    || servingReleaseByKey.get(row.contentKey)?.distribution_state === "serving"
  );

  return editoriallyEligible
    && distributionEligible
    && (allowBlank && !row.review_status ? true : isGovernedReaderEligible(row));
};
const latestEligible = (rows, allowBlank = false) => {
  const candidates = new Map();
  for (const row of rows) {
    const keyed = candidates.get(row.contentKey) ?? [];
    keyed.push(row);
    candidates.set(row.contentKey, keyed);
  }
  return [...candidates.values()]
    .map((keyed) => [...keyed].reverse().find((row) => eligible(row, allowBlank)))
    .filter(Boolean);
};
const approvedDailyGlanceVariants = (source) => ({
  schema: source.schema,
  version: source.version,
  note: "Generated approved-only serving projection. Pending text and pairings are intentionally absent.",
  keys: Object.fromEntries(Object.entries(source.keys ?? {}).map(([contentKey, set]) => {
    const eligibleVariant = (kind, item) => isGovernedReaderEligible({
      ...item,
      contentKey: `daily-glance-variant/${contentKey}/${kind}/${item.id}`
    });
    const headlines = (set.headlines ?? []).filter((item) => eligibleVariant("headline", item));
    const bodies = (set.bodies ?? []).filter((item) => eligibleVariant("body", item));
    const headlineIds = new Set(headlines.map((item) => item.id));
    const bodyIds = new Set(bodies.map((item) => item.id));
    const pairings = (set.pairings ?? []).filter((item) => (
      eligibleVariant("pairing", item)
      && headlineIds.has(item.headline_id)
      && bodyIds.has(item.body_id)
    ));
    return [contentKey, { pairing_policy: set.pairing_policy, headlines, bodies, pairings }];
  }))
});
const projectedDailyGlanceVariants = approvedDailyGlanceVariants(dailyGlanceVariants);
const expectedManifest = createPackageManifest({
  transitLib: {
    authoredCards: latestEligible([
      ...transitRows.authoredCards,
      ...lunationRows.authoredCards,
      ...skyArticleRows.authoredCards,
      ...weeklyRows,
      ...timingEventRows.authoredCards
    ])
  },
  rowsFile: {
    hookRows: latestEligible([
      ...bondLanguagePass2.rows,
      ...sourceRows.hookRows,
      ...pairDailyFrames.rows,
      ...pairDailyClauses.rows,
      ...lunationRows.hookRows,
      ...skyArticleRows.hookRows,
      ...skyAspectPhrasebook.hookRows,
      ...skyPlanetFrames.rows,
      ...skyPlacementVoicePass.rows,
      ...skySignCopyRows,
      ...skyPlacementOwnerApprovedFallbacks.rows,
      ...skyPlacementHouseTemplateReaderRows,
      ...sunLeoHouseCoreReaderRows,
      ...venusLibraHouseCoreReaderRows
    ]),
    vocabularyRows: latestEligible([
      ...sourceRows.vocabularyRows,
      ...placementRows.vocabularyRows,
      ...skyArticleRows.vocabularyRows
    ]),
    dailyGlanceVariants: projectedDailyGlanceVariants
  },
  templatesFile: {
    templates: latestEligible([...templates.templates, ...placementRows.templates], true)
  }
}, PACKAGE_VERSION);
const templateHashFixture = (body) => createPackageManifest({
  transitLib: { authoredCards: [] },
  rowsFile: {},
  templatesFile: { templates: [{ contentKey: "fallback-template/hash-fixture", body }] }
}, "fixture");
const templateHashBefore = templateHashFixture("{{firstSlot}}");
const templateHashAfter = templateHashFixture("{{secondSlot}}");
assert.deepEqual(templateHashBefore.keys, ["template:fallback-template/hash-fixture"]);
assert.notEqual(
  templateHashBefore.contentHash,
  templateHashAfter.contentHash,
  "Changing a template body must change the package content hash."
);
const bundledManifest = readJson(`${packageDir}/bundled-manifest-v3.json`);
const bundledManifestSummary = readJson(`${packageDir}/bundled-manifest-summary-v3.json`);
const isSkyPlacementPartitionRow = (row) => (
  String(row.contentKey ?? "").startsWith("house-horoscope-core/")
  || String(row.contentKey ?? "").startsWith("fallback-hook/sky-sign-copy/")
  || String(row.contentKey ?? "").startsWith("fallback-hook/sky-placement-sign/")
  || (
    String(row.contentKey ?? "").startsWith("fallback-hook/sky-placement-")
  )
);
const skyPlacementRows = latestEligible([
  ...sourceRows.hookRows.filter(isSkyPlacementPartitionRow),
  ...skyAspectPhrasebook.hookRows.filter((row) => (
    String(row.contentKey ?? "").startsWith("fallback-hook/sky-placement-sign/")
  )),
  ...skyPlanetFrames.rows,
  ...skyPlacementVoicePass.rows,
  ...skySignCopyRows,
  ...skyPlacementOwnerApprovedFallbacks.rows,
  ...skyPlacementHouseTemplateReaderRows,
  ...sunLeoHouseCoreReaderRows,
  ...venusLibraHouseCoreReaderRows
]).filter((row) => isGovernedReaderEligible(row));
const skyPlacementKeys = new Set(skyPlacementRows.map((row) => row.contentKey));
const expectedCoreManifest = createPackageManifest({
  ...{
    transitLib: expectedManifest.keys ? {
      authoredCards: latestEligible([
        ...transitRows.authoredCards,
        ...lunationRows.authoredCards,
        ...skyArticleRows.authoredCards,
        ...weeklyRows,
        ...timingEventRows.authoredCards
      ])
    } : { authoredCards: [] }
  },
  rowsFile: {
    hookRows: latestEligible([
      ...bondLanguagePass2.rows,
      ...sourceRows.hookRows,
      ...pairDailyFrames.rows,
      ...pairDailyClauses.rows,
      ...lunationRows.hookRows,
      ...skyArticleRows.hookRows,
      ...skyAspectPhrasebook.hookRows,
      ...skyPlanetFrames.rows,
      ...skyPlacementVoicePass.rows,
      ...skySignCopyRows,
      ...skyPlacementOwnerApprovedFallbacks.rows,
      ...sunLeoHouseCoreReaderRows,
      ...venusLibraHouseCoreReaderRows
    ]).filter((row) => !skyPlacementKeys.has(row.contentKey)),
    vocabularyRows: latestEligible([
      ...sourceRows.vocabularyRows,
      ...placementRows.vocabularyRows,
      ...skyArticleRows.vocabularyRows
    ]),
    dailyGlanceVariants: projectedDailyGlanceVariants
  },
  templatesFile: {
    templates: latestEligible([...templates.templates, ...placementRows.templates], true)
  }
}, PACKAGE_VERSION);
const expectedSkyPlacementManifest = createPackageManifest({
  transitLib: { authoredCards: [] },
  rowsFile: { hookRows: skyPlacementRows, vocabularyRows: [] },
  templatesFile: { templates: [] }
}, PACKAGE_VERSION);
const bundledCoreManifest = readJson(`${packageDir}/bundled-core-manifest-v3.json`);
const bundledSkyPlacementManifest = readJson(`${packageDir}/bundled-sky-placement-manifest-v3.json`);
const expectedManifestSummary = {
  packageVersion: expectedManifest.packageVersion,
  contentHash: expectedManifest.contentHash,
  keyManifestHash: expectedManifest.keyManifestHash,
  keyCount: expectedManifest.keyCount,
  runtimeCapability: "sky-placement-on-demand-v1",
  partitions: {
    core: {
      contentHash: expectedCoreManifest.contentHash,
      keyManifestHash: expectedCoreManifest.keyManifestHash,
      keyCount: expectedCoreManifest.keyCount
    },
    skyPlacement: {
      contentHash: expectedSkyPlacementManifest.contentHash,
      keyManifestHash: expectedSkyPlacementManifest.keyManifestHash,
      keyCount: expectedSkyPlacementManifest.keyCount
    }
  }
};

assert.deepEqual(
  bundledManifest,
  expectedManifest,
  "Bundled fallback manifest is stale. Run npm run build:fallback-manifest after changing source rows or templates."
);
assert.deepEqual(
  bundledManifestSummary,
  expectedManifestSummary,
  "Bundled fallback manifest summary is stale. Run npm run build:fallback-manifest after changing source rows or templates."
);
assert.deepEqual(bundledCoreManifest, expectedCoreManifest, "Bundled core partition manifest is stale.");
assert.deepEqual(
  bundledSkyPlacementManifest,
  expectedSkyPlacementManifest,
  "Bundled Sky Placement partition manifest is stale."
);

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
  assert.deepEqual(
    materialized.packagePartitionManifests,
    { core: expectedCoreManifest, "sky-placement": expectedSkyPlacementManifest },
    "Dashboard mirror partition metadata must exactly match both reader partitions."
  );
  assert.ok(
    materialized.rows.some((row) => row.provider === "tldrastro-fallback-architecture-v3-sky-placement"),
    "Sky Placement dashboard rows must use the on-demand partition provider."
  );
  assert.equal(
    materialized.rows.length,
    new Set(materialized.rows.map((row) => row.content_key)).size,
    "Materialization must emit one row per content key."
  );
  const v15FullCopyHook = materialized.rows.find((row) => (
    row.content_key === "fallback-hook/natal-aspect-lived/sun/conjunction/ascendant"
  ));
  assert.equal(v15FullCopyHook?.source_snapshot?.content_role, "full_copy");
  assert.equal(
    v15FullCopyHook?.block_type,
    "fallback_hook",
    "A fallback-hook/* package record must retain fallback_hook classification even when its content role is full_copy."
  );
  const unrelatedFullCopyArticle = materialized.rows.find((row) => (
    row.source_snapshot?.content_role === "full_copy"
    && !row.content_key.startsWith("fallback-hook/")
  ));
  assert.ok(unrelatedFullCopyArticle, "The regression fixture needs an unrelated full-copy article.");
  assert.equal(unrelatedFullCopyArticle.block_type, "fallback_article");
  const unrelatedTemplate = materialized.rows.find((row) => row.source_snapshot?.content_role === "template");
  assert.ok(unrelatedTemplate, "The regression fixture needs an unrelated template.");
  assert.equal(unrelatedTemplate.block_type, "fallback_template");
  const unrelatedHook = materialized.rows.find((row) => (
    row.source_snapshot?.content_role === "fallback_hook"
    && row.content_key !== v15FullCopyHook.content_key
  ));
  assert.ok(unrelatedHook, "The regression fixture needs an unrelated fallback hook.");
  assert.equal(unrelatedHook.block_type, "fallback_hook");
  const placementProviderRows = materialized.rows.filter((row) => (
    row.provider === "tldrastro-fallback-architecture-v3-sky-placement"
  ));
  const continuousServingRows = placementProviderRows.filter((row) => (
    row.source_snapshot?.distributionState === "serving"
  ));
  assert.deepEqual(
    continuousServingRows
      .filter((row) => row.content_key.startsWith("fallback-hook/sky-sign-copy/"))
      .map((row) => row.content_key)
      .sort(),
    servingManifest.releases
      .filter((release) => release.distribution_state === "serving")
      .flatMap((release) => release.approved_keys)
      .filter((contentKey) => contentKey.startsWith("fallback-hook/sky-sign-copy/"))
      .sort(),
    "The dashboard partition must expose only the exact owner-approved continuous serving diff."
  );
  const batch2Rows = placementProviderRows
    .filter((row) => row.source_snapshot?.releaseBatch === "2");
  assert.equal(batch2Rows.length, 7, "Batch 2 must materialize exactly its seven approved keys.");
  assert.ok(
    batch2Rows.every((row) => (
      row.source_snapshot?.distributionState === "serving"
      && row.lane === "reference"
    )),
    "Owner-approved batch-2 rows must be serving in the on-demand reference partition."
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
