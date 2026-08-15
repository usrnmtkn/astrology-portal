#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import {
  createPackageManifest,
  PACKAGE_VERSION
} from "../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageRoot = path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3");
const outputPath = path.join(packageRoot, "bundled-manifest-v3.json");
const summaryOutputPath = path.join(packageRoot, "bundled-manifest-summary-v3.json");
const skyCoreOutputPath = path.join(packageRoot, "bundled-sky-core-rows-v3.json");
const deferredCoreOutputPath = path.join(packageRoot, "bundled-deferred-core-rows-v3.json");
const sharedPlacementOutputPath = path.join(packageRoot, "bundled-shared-placement-rows-v3.json");
const relationshipHookOutputPath = path.join(packageRoot, "bundled-relationship-hook-rows-v3.json");
const emptyHouseOutputPath = path.join(packageRoot, "bundled-empty-house-rows-v3.json");
const transitCoreAuthoredOutputPath = path.join(packageRoot, "bundled-transit-core-authored-cards-v3.json");
const relationshipAuthoredOutputPath = path.join(packageRoot, "bundled-relationship-authored-cards-v3.json");
const skyAuthoredOutputPath = path.join(packageRoot, "bundled-sky-authored-cards-v3.json");
const skyPlacementOutputPath = path.join(packageRoot, "bundled-sky-placement-rows-v3.json");
const coreManifestOutputPath = path.join(packageRoot, "bundled-core-manifest-v3.json");
const skyPlacementManifestOutputPath = path.join(packageRoot, "bundled-sky-placement-manifest-v3.json");
const skyPlacementOwnerApprovedReaderOutputPath = path.join(
  packageRoot,
  "bundled-sky-placement-owner-approved-reader-v1.json"
);
const checkOnly = process.argv.includes("--check");

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(packageRoot, relativePath), "utf8"));
}

function readSkySignCopySources() {
  return fs.readdirSync(path.join(packageRoot, "source-rows"))
    .filter((fileName) => /^sky-sign-copy-.*\.json$/u.test(fileName))
    .sort()
    .map((fileName) => readJson(`source-rows/${fileName}`));
}

const skyPlacementServingManifest = readJson("authored-inputs/sky-placement-serving-manifest-v1.json");
const skyPlacementReleaseByKey = new Map();
const skyPlacementReleaseByBatch = new Map();

if (skyPlacementServingManifest.runtime_capability !== "sky-placement-on-demand-v1") {
  throw new Error("Sky Placement serving manifest must require the sky-placement-on-demand-v1 runtime capability.");
}

for (const release of skyPlacementServingManifest.releases ?? []) {
  const approvedKeys = Array.isArray(release.approved_keys) ? release.approved_keys : [];
  const approval = release.owner_approval;

  if (release.distribution_state === "serving") {
    if (
      !approval
      || typeof approval.statement !== "string"
      || !approval.statement.trim()
      || typeof approval.approved_at !== "string"
      || !approval.approved_at.trim()
      || typeof approval.source !== "string"
      || !approval.source.trim()
      || !Array.isArray(approval.approved_keys)
      || JSON.stringify(approval.approved_keys) !== JSON.stringify(approvedKeys)
    ) {
      throw new Error(`Serving release ${release.release_id ?? "unknown"} is missing its exact owner-approved serving diff.`);
    }

    if (Number(release.release_batch) >= 2) {
      const migrationGate = release.migration_gate;

      if (
        release.transition !== "staged_to_serving"
        || release.required_runtime_capability !== skyPlacementServingManifest.runtime_capability
        || migrationGate?.status !== "verified"
        || typeof migrationGate.deployed_package_version !== "string"
        || !migrationGate.deployed_package_version.trim()
        || typeof migrationGate.verified_at !== "string"
        || !migrationGate.verified_at.trim()
        || typeof migrationGate.source !== "string"
        || !migrationGate.source.trim()
      ) {
        throw new Error(`Serving release ${release.release_id ?? "unknown"} is blocked until the on-demand runtime deployment is verified.`);
      }
    }
  }

  const releaseBatch = String(release.release_batch ?? "").trim();
  if (!releaseBatch || skyPlacementReleaseByBatch.has(releaseBatch)) {
    throw new Error(`Sky Placement serving manifest has a missing or duplicate release_batch: ${releaseBatch || "unknown"}.`);
  }
  skyPlacementReleaseByBatch.set(releaseBatch, release);

  for (const contentKey of approvedKeys) {
    if (skyPlacementReleaseByKey.has(contentKey)) {
      throw new Error(`Sky Placement serving manifest repeats ${contentKey}.`);
    }
    skyPlacementReleaseByKey.set(contentKey, release);
  }
}

function isContinuousSkyPlacementRow(row) {
  return row?.render_policy === "sky-placement-continuous-v2"
    || String(row?.contentKey ?? "").startsWith("fallback-hook/sky-sign-copy/");
}

function isSkyPlacementDeferredHook(row) {
  const contentKey = String(row?.contentKey ?? "");
  return contentKey.startsWith("fallback-hook/sky-sign-copy/")
    || (
      contentKey.startsWith("fallback-hook/sky-placement-")
      && !contentKey.startsWith("fallback-hook/sky-placement-sign/")
    );
}

function isEmptyHouseHook(row) {
  return String(row?.contentKey ?? "").startsWith("fallback-hook/empty-house/");
}

function isSharedPlacementHook(row) {
  return String(row?.contentKey ?? "").startsWith("fallback-hook/placement-sentence/");
}

function isRelationshipHook(row) {
  const contentKey = String(row?.contentKey ?? "");

  return [
    "fallback-hook/bond-effect-",
    "fallback-hook/compat-domain/",
    "fallback-hook/element-pattern/",
    "fallback-hook/planet-grates/",
    "fallback-hook/planet-mode/",
    "fallback-hook/synastry-aspect-type/",
    "fallback-hook/synastry-pair/"
  ].some((prefix) => contentKey.startsWith(prefix));
}

function isDistributionEligible(row) {
  if (!isContinuousSkyPlacementRow(row)) return true;
  const release = skyPlacementReleaseByKey.get(row.contentKey)
    ?? skyPlacementReleaseByBatch.get(String(row.release_batch ?? "").trim());
  return release?.distribution_state === "serving"
    && release.approved_keys?.includes(row.contentKey);
}

function skyPlacementOwnerApprovedReaderRows() {
  const source = readJson("source-rows/sky-placement-owner-approved-fallbacks-v1.json");

  return {
    schemaVersion: 1,
    generatedFrom: "source-rows/sky-placement-owner-approved-fallbacks-v1.json",
    rows: source.rows
      .filter((row) => row.rendered_as_body_copy !== false)
      .map(({ body_you: _legacyBody, note: _note, source_keys: _sourceKeys, approved_via: _approvedVia, ...row }) => row)
  };
}

function isReaderEligible(row, allowBlank = false) {
  const status = String(row.review_status ?? "").trim().toLowerCase();
  return (
    ["approved", "approved_reuse", "reviewed"].includes(status)
    || (allowBlank && !status)
  ) && isDistributionEligible(row);
}

function latestReaderEligible(rows, allowBlank = false) {
  const candidates = new Map();

  for (const row of rows) {
    const keyed = candidates.get(row.contentKey) ?? [];
    keyed.push(row);
    candidates.set(row.contentKey, keyed);
  }

  return [...candidates.values()]
    .map((keyed) => [...keyed].reverse().find((row) => isReaderEligible(row, allowBlank)))
    .filter(Boolean);
}

function isSkyCoreHook(row) {
  return [
    "fallback-hook/sky-",
    "fallback-hook/lunation-",
    "fallback-hook/transit-retro/",
    "fallback-hook/transit-effect-soft/",
    "fallback-hook/transit-effect-hard/",
    "fallback-hook/dignity-line/"
  ].some((prefix) => row.contentKey.startsWith(prefix));
}

function isRelationshipAuthoredCard(row) {
  const contentKey = String(row?.contentKey ?? "");
  return [
    "authored/compat-",
    "authored/relationship-",
    "authored/synastry-"
  ].some((prefix) => contentKey.startsWith(prefix));
}

function fullReaderBundle() {
  const sourceRows = readJson("source-rows/fallback-source-rows-v3.json");
  const dailyGlanceVariants = readJson("source-rows/daily-glance-variants-v1.json");
  const transitRows = readJson("source-rows/transit-synastry-rows-v1.json");
  const bondLanguage = readJson("source-rows/bond-language-pass-2.json");
  const lunationRows = readJson("source-rows/lunation-blend-units-v1.json");
  const placementRows = readJson("source-rows/placement-interim-fixes-v1.json");
  const pairDailyFrames = readJson("source-rows/pair-daily-frames-v1.json");
  const pairDailyClauses = readJson("source-rows/pair-daily-clauses-v1.json");
  const skyArticleRows = readJson("source-rows/sky-article-v1.json");
  const skyAspectRows = readJson("source-rows/sky-aspect-phrasebook-v1.json");
  const skyPlanetRows = readJson("source-rows/sky-planet-frames-v1.json");
  const skyPlacementRows = readJson("source-rows/sky-placement-inventories-voice-pass-v1.json");
  const skySignRows = readSkySignCopySources().flatMap((source) => source.rows ?? []);
  const skyPlacementOwnerApprovedRows = skyPlacementOwnerApprovedReaderRows();
  const sunLeoHouseCoreRows = readJson("source-rows/sun-leo-house-cores-v1.json").rows
    .map(({ notes: _notes, source_keys: _sourceKeys, approved_via: _approvedVia, ...row }) => row);
  const venusLibraHouseCoreRows = readJson("source-rows/venus-libra-house-cores-v1.json").rows
    .map(({ notes: _notes, source_keys: _sourceKeys, approved_via: _approvedVia, ...row }) => row);
  const timingEventRows = readJson("source-rows/timing-event-reader-copy-v2.json");
  const weeklyRows = readJson("source-rows/station-cards-week-openers-v1.json");
  const templates = readJson("templates/fallback-templates-v3.json");

  return {
    transitLib: {
      authoredCards: latestReaderEligible([
        ...transitRows.authoredCards,
        ...lunationRows.authoredCards,
        ...skyArticleRows.authoredCards,
        ...weeklyRows,
        ...timingEventRows.authoredCards
      ])
    },
    rowsFile: {
      hookRows: latestReaderEligible([
        ...bondLanguage.rows,
        ...sourceRows.hookRows,
        ...lunationRows.hookRows,
        ...pairDailyFrames.rows,
        ...pairDailyClauses.rows,
        ...skyArticleRows.hookRows,
        ...skyAspectRows.hookRows,
        ...skyPlanetRows.rows,
        ...skyPlacementRows.rows,
        ...skySignRows,
        ...skyPlacementOwnerApprovedRows.rows,
        ...sunLeoHouseCoreRows,
        ...venusLibraHouseCoreRows
      ]),
      vocabularyRows: latestReaderEligible([
        ...sourceRows.vocabularyRows,
        ...placementRows.vocabularyRows,
        ...skyArticleRows.vocabularyRows
      ]),
      dailyGlanceVariants
    },
    templatesFile: {
      templates: latestReaderEligible([
        ...templates.templates,
        ...placementRows.templates
      ], true)
    }
  };
}

const manifest = createPackageManifest(fullReaderBundle(), PACKAGE_VERSION);
const sourceRows = readJson("source-rows/fallback-source-rows-v3.json");
const dailyGlanceVariants = readJson("source-rows/daily-glance-variants-v1.json");
const transitRows = readJson("source-rows/transit-synastry-rows-v1.json");
const pairDailyFrames = readJson("source-rows/pair-daily-frames-v1.json");
const pairDailyClauses = readJson("source-rows/pair-daily-clauses-v1.json");
const skyPlacementVoicePassRows = readJson("source-rows/sky-placement-inventories-voice-pass-v1.json");
const skyPlanetFrameRows = readJson("source-rows/sky-planet-frames-v1.json");
const skyPlacementOwnerApprovedRows = skyPlacementOwnerApprovedReaderRows();
const sunLeoHouseCoreRows = readJson("source-rows/sun-leo-house-cores-v1.json").rows
  .map(({ notes: _notes, source_keys: _sourceKeys, approved_via: _approvedVia, ...row }) => row);
const venusLibraHouseCoreRows = readJson("source-rows/venus-libra-house-cores-v1.json").rows
  .map(({ notes: _notes, source_keys: _sourceKeys, approved_via: _approvedVia, ...row }) => row);
const skySignCopyRows = readSkySignCopySources().flatMap((source) => source.rows ?? []);
const skyCoreRows = {
  hookRows: sourceRows.hookRows.filter((row) => isSkyCoreHook(row) && !isSkyPlacementDeferredHook(row)),
  // Several reader modules construct shared vocabulary constants at module
  // evaluation time. Keep this relatively small bank eager until those
  // constants become route-local.
  vocabularyRows: sourceRows.vocabularyRows
};
const deferredCoreRows = {
  hookRows: [
    ...sourceRows.hookRows.filter((row) => (
      !isSkyCoreHook(row)
      && !isEmptyHouseHook(row)
      && !isSharedPlacementHook(row)
      && !isRelationshipHook(row)
    ))
  ],
  vocabularyRows: [],
  dailyGlanceVariants
};
const sharedPlacementRows = {
  hookRows: sourceRows.hookRows.filter(isSharedPlacementHook),
  vocabularyRows: []
};
const relationshipHookRows = {
  hookRows: [
    ...sourceRows.hookRows.filter(isRelationshipHook),
    ...pairDailyFrames.rows,
    ...pairDailyClauses.rows
  ],
  vocabularyRows: []
};
const emptyHouseRows = {
  hookRows: sourceRows.hookRows.filter(isEmptyHouseHook),
  vocabularyRows: []
};
const transitCoreAuthoredCards = {
  // Keep the source order and historical candidates intact. The runtime's
  // readerEligibleBundle applies the same latest-eligible precedence after
  // all partitions are recomposed.
  authoredCards: transitRows.authoredCards.filter((row) => !isRelationshipAuthoredCard(row))
};
const relationshipAuthoredCards = {
  authoredCards: transitRows.authoredCards.filter(isRelationshipAuthoredCard)
};
const skyAuthoredCards = {
  authoredCards: transitRows.authoredCards.filter((row) => row.contentKey.startsWith("authored/sky-"))
};
const skyPlacementRows = {
  hookRows: latestReaderEligible([
    ...sourceRows.hookRows.filter(isSkyPlacementDeferredHook),
    ...(skyPlanetFrameRows.rows ?? []),
    ...(skyPlacementVoicePassRows.rows ?? []),
    ...skySignCopyRows,
    ...skyPlacementOwnerApprovedRows.rows,
    ...sunLeoHouseCoreRows,
    ...venusLibraHouseCoreRows
  ]),
  vocabularyRows: []
};
const skyPlacementKeySet = new Set(skyPlacementRows.hookRows.map((row) => row.contentKey));
const completeReaderBundle = fullReaderBundle();
const coreReaderBundle = {
  transitLib: completeReaderBundle.transitLib,
  templatesFile: completeReaderBundle.templatesFile,
  rowsFile: {
    hookRows: completeReaderBundle.rowsFile.hookRows.filter((row) => !skyPlacementKeySet.has(row.contentKey)),
    vocabularyRows: completeReaderBundle.rowsFile.vocabularyRows,
    dailyGlanceVariants: completeReaderBundle.rowsFile.dailyGlanceVariants
  }
};
const skyPlacementReaderBundle = {
  transitLib: { authoredCards: [] },
  templatesFile: { templates: [] },
  rowsFile: skyPlacementRows
};
const coreManifest = createPackageManifest(coreReaderBundle, PACKAGE_VERSION);
const skyPlacementManifest = createPackageManifest(skyPlacementReaderBundle, PACKAGE_VERSION);
const serialized = `${JSON.stringify(manifest, null, 2)}\n`;
const summary = {
  packageVersion: manifest.packageVersion,
  contentHash: manifest.contentHash,
  keyManifestHash: manifest.keyManifestHash,
  keyCount: manifest.keyCount,
  runtimeCapability: skyPlacementServingManifest.runtime_capability,
  partitions: {
    core: {
      contentHash: coreManifest.contentHash,
      keyManifestHash: coreManifest.keyManifestHash,
      keyCount: coreManifest.keyCount
    },
    skyPlacement: {
      contentHash: skyPlacementManifest.contentHash,
      keyManifestHash: skyPlacementManifest.keyManifestHash,
      keyCount: skyPlacementManifest.keyCount
    }
  }
};
const serializedSummary = `${JSON.stringify(summary, null, 2)}\n`;
const serializedSkyCore = `${JSON.stringify(skyCoreRows, null, 2)}\n`;
const serializedDeferredCore = `${JSON.stringify(deferredCoreRows, null, 2)}\n`;
const serializedSharedPlacement = `${JSON.stringify(sharedPlacementRows, null, 2)}\n`;
const serializedRelationshipHooks = `${JSON.stringify(relationshipHookRows, null, 2)}\n`;
const serializedEmptyHouse = `${JSON.stringify(emptyHouseRows, null, 2)}\n`;
const serializedTransitCoreAuthored = `${JSON.stringify(transitCoreAuthoredCards, null, 2)}\n`;
const serializedRelationshipAuthored = `${JSON.stringify(relationshipAuthoredCards, null, 2)}\n`;
const serializedSkyAuthored = `${JSON.stringify(skyAuthoredCards, null, 2)}\n`;
const serializedSkyPlacement = `${JSON.stringify(skyPlacementRows, null, 2)}\n`;
const serializedCoreManifest = `${JSON.stringify(coreManifest, null, 2)}\n`;
const serializedSkyPlacementManifest = `${JSON.stringify(skyPlacementManifest, null, 2)}\n`;
const skyPlacementOwnerApprovedReader = skyPlacementOwnerApprovedReaderRows();
const serializedSkyPlacementOwnerApprovedReader = `${JSON.stringify(skyPlacementOwnerApprovedReader, null, 2)}\n`;

if (checkOnly) {
  const existing = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, "utf8") : "";
  const existingSummary = fs.existsSync(summaryOutputPath) ? fs.readFileSync(summaryOutputPath, "utf8") : "";
  const existingSkyCore = fs.existsSync(skyCoreOutputPath) ? fs.readFileSync(skyCoreOutputPath, "utf8") : "";
  const existingDeferredCore = fs.existsSync(deferredCoreOutputPath) ? fs.readFileSync(deferredCoreOutputPath, "utf8") : "";
  const existingSharedPlacement = fs.existsSync(sharedPlacementOutputPath) ? fs.readFileSync(sharedPlacementOutputPath, "utf8") : "";
  const existingRelationshipHooks = fs.existsSync(relationshipHookOutputPath) ? fs.readFileSync(relationshipHookOutputPath, "utf8") : "";
  const existingEmptyHouse = fs.existsSync(emptyHouseOutputPath) ? fs.readFileSync(emptyHouseOutputPath, "utf8") : "";
  const existingTransitCoreAuthored = fs.existsSync(transitCoreAuthoredOutputPath) ? fs.readFileSync(transitCoreAuthoredOutputPath, "utf8") : "";
  const existingRelationshipAuthored = fs.existsSync(relationshipAuthoredOutputPath) ? fs.readFileSync(relationshipAuthoredOutputPath, "utf8") : "";
  const existingSkyAuthored = fs.existsSync(skyAuthoredOutputPath) ? fs.readFileSync(skyAuthoredOutputPath, "utf8") : "";
  const existingSkyPlacement = fs.existsSync(skyPlacementOutputPath) ? fs.readFileSync(skyPlacementOutputPath, "utf8") : "";
  const existingCoreManifest = fs.existsSync(coreManifestOutputPath) ? fs.readFileSync(coreManifestOutputPath, "utf8") : "";
  const existingSkyPlacementManifest = fs.existsSync(skyPlacementManifestOutputPath) ? fs.readFileSync(skyPlacementManifestOutputPath, "utf8") : "";
  const existingSkyPlacementOwnerApprovedReader = fs.existsSync(skyPlacementOwnerApprovedReaderOutputPath)
    ? fs.readFileSync(skyPlacementOwnerApprovedReaderOutputPath, "utf8")
    : "";

  if (
    existing !== serialized
    || existingSummary !== serializedSummary
    || existingSkyCore !== serializedSkyCore
    || existingDeferredCore !== serializedDeferredCore
    || existingSharedPlacement !== serializedSharedPlacement
    || existingRelationshipHooks !== serializedRelationshipHooks
    || existingEmptyHouse !== serializedEmptyHouse
    || existingTransitCoreAuthored !== serializedTransitCoreAuthored
    || existingRelationshipAuthored !== serializedRelationshipAuthored
    || existingSkyAuthored !== serializedSkyAuthored
    || existingSkyPlacement !== serializedSkyPlacement
    || existingCoreManifest !== serializedCoreManifest
    || existingSkyPlacementManifest !== serializedSkyPlacementManifest
    || existingSkyPlacementOwnerApprovedReader !== serializedSkyPlacementOwnerApprovedReader
  ) {
    console.error("Bundled fallback manifest is stale. Run npm run build:fallback-manifest.");
    process.exit(1);
  }

  console.log(`Bundled fallback manifest is current (${manifest.keyCount} keys).`);
} else {
  fs.writeFileSync(outputPath, serialized);
  fs.writeFileSync(summaryOutputPath, serializedSummary);
  fs.writeFileSync(skyCoreOutputPath, serializedSkyCore);
  fs.writeFileSync(deferredCoreOutputPath, serializedDeferredCore);
  fs.writeFileSync(sharedPlacementOutputPath, serializedSharedPlacement);
  fs.writeFileSync(relationshipHookOutputPath, serializedRelationshipHooks);
  fs.writeFileSync(emptyHouseOutputPath, serializedEmptyHouse);
  fs.writeFileSync(transitCoreAuthoredOutputPath, serializedTransitCoreAuthored);
  fs.writeFileSync(relationshipAuthoredOutputPath, serializedRelationshipAuthored);
  fs.writeFileSync(skyAuthoredOutputPath, serializedSkyAuthored);
  fs.writeFileSync(skyPlacementOutputPath, serializedSkyPlacement);
  fs.writeFileSync(coreManifestOutputPath, serializedCoreManifest);
  fs.writeFileSync(skyPlacementManifestOutputPath, serializedSkyPlacementManifest);
  fs.writeFileSync(skyPlacementOwnerApprovedReaderOutputPath, serializedSkyPlacementOwnerApprovedReader);
  console.log(`Wrote ${path.relative(repoRoot, outputPath)} (${manifest.keyCount} keys).`);
  console.log(`Wrote ${path.relative(repoRoot, summaryOutputPath)}.`);
  console.log(`Wrote ${path.relative(repoRoot, skyCoreOutputPath)} (${skyCoreRows.hookRows.length} hooks, ${skyCoreRows.vocabularyRows.length} vocabulary rows).`);
  console.log(`Wrote ${path.relative(repoRoot, deferredCoreOutputPath)} (${deferredCoreRows.hookRows.length} hooks).`);
  console.log(`Wrote ${path.relative(repoRoot, sharedPlacementOutputPath)} (${sharedPlacementRows.hookRows.length} hooks).`);
  console.log(`Wrote ${path.relative(repoRoot, relationshipHookOutputPath)} (${relationshipHookRows.hookRows.length} hooks).`);
  console.log(`Wrote ${path.relative(repoRoot, emptyHouseOutputPath)} (${emptyHouseRows.hookRows.length} hooks).`);
  console.log(`Wrote ${path.relative(repoRoot, transitCoreAuthoredOutputPath)} (${transitCoreAuthoredCards.authoredCards.length} authored cards).`);
  console.log(`Wrote ${path.relative(repoRoot, relationshipAuthoredOutputPath)} (${relationshipAuthoredCards.authoredCards.length} authored cards).`);
  console.log(`Wrote ${path.relative(repoRoot, skyAuthoredOutputPath)} (${skyAuthoredCards.authoredCards.length} authored cards).`);
  console.log(`Wrote ${path.relative(repoRoot, skyPlacementOutputPath)} (${skyPlacementRows.hookRows.length} hooks).`);
  console.log(`Wrote ${path.relative(repoRoot, coreManifestOutputPath)} (${coreManifest.keyCount} keys).`);
  console.log(`Wrote ${path.relative(repoRoot, skyPlacementManifestOutputPath)} (${skyPlacementManifest.keyCount} keys).`);
  console.log(`Wrote ${path.relative(repoRoot, skyPlacementOwnerApprovedReaderOutputPath)} (${skyPlacementOwnerApprovedReader.rows.length} metadata-free reader rows).`);
}
