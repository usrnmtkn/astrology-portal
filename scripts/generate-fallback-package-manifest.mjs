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
const skyAuthoredOutputPath = path.join(packageRoot, "bundled-sky-authored-cards-v3.json");
const checkOnly = process.argv.includes("--check");

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(packageRoot, relativePath), "utf8"));
}

function isReaderEligible(row, allowBlank = false) {
  const status = String(row.review_status ?? "").trim().toLowerCase();
  return ["approved", "approved_reuse", "reviewed"].includes(status)
    || (allowBlank && !status);
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

function fullReaderBundle() {
  const sourceRows = readJson("source-rows/fallback-source-rows-v3.json");
  const transitRows = readJson("source-rows/transit-synastry-rows-v1.json");
  const bondLanguage = readJson("source-rows/bond-language-pass-2.json");
  const lunationRows = readJson("source-rows/lunation-blend-units-v1.json");
  const placementRows = readJson("source-rows/placement-interim-fixes-v1.json");
  const skyArticleRows = readJson("source-rows/sky-article-v1.json");
  const skyAspectRows = readJson("source-rows/sky-aspect-phrasebook-v1.json");
  const skyPlanetRows = readJson("source-rows/sky-planet-frames-v1.json");
  const skyPlacementRows = readJson("source-rows/sky-placement-inventories-voice-pass-v1.json");
  const skySignRows = readJson("source-rows/sky-sign-copy-sun-v1.json");
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
        ...sourceRows.hookRows,
        ...lunationRows.hookRows,
        ...bondLanguage.rows,
        ...skyArticleRows.hookRows,
        ...skyAspectRows.hookRows,
        ...skyPlanetRows.rows,
        ...skyPlacementRows.rows,
        ...skySignRows.rows
      ]),
      vocabularyRows: latestReaderEligible([
        ...sourceRows.vocabularyRows,
        ...placementRows.vocabularyRows,
        ...skyArticleRows.vocabularyRows
      ])
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
const transitRows = readJson("source-rows/transit-synastry-rows-v1.json");
const skyCoreRows = {
  hookRows: sourceRows.hookRows.filter(isSkyCoreHook),
  // Several reader modules construct shared vocabulary constants at module
  // evaluation time. Keep this relatively small bank eager until those
  // constants become route-local.
  vocabularyRows: sourceRows.vocabularyRows
};
const deferredCoreRows = {
  hookRows: sourceRows.hookRows.filter((row) => !isSkyCoreHook(row)),
  vocabularyRows: []
};
const skyAuthoredCards = {
  authoredCards: transitRows.authoredCards.filter((row) => row.contentKey.startsWith("authored/sky-"))
};
const serialized = `${JSON.stringify(manifest, null, 2)}\n`;
const summary = {
  packageVersion: manifest.packageVersion,
  contentHash: manifest.contentHash,
  keyManifestHash: manifest.keyManifestHash,
  keyCount: manifest.keyCount
};
const serializedSummary = `${JSON.stringify(summary, null, 2)}\n`;
const serializedSkyCore = `${JSON.stringify(skyCoreRows, null, 2)}\n`;
const serializedDeferredCore = `${JSON.stringify(deferredCoreRows, null, 2)}\n`;
const serializedSkyAuthored = `${JSON.stringify(skyAuthoredCards, null, 2)}\n`;

if (checkOnly) {
  const existing = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, "utf8") : "";
  const existingSummary = fs.existsSync(summaryOutputPath) ? fs.readFileSync(summaryOutputPath, "utf8") : "";
  const existingSkyCore = fs.existsSync(skyCoreOutputPath) ? fs.readFileSync(skyCoreOutputPath, "utf8") : "";
  const existingDeferredCore = fs.existsSync(deferredCoreOutputPath) ? fs.readFileSync(deferredCoreOutputPath, "utf8") : "";
  const existingSkyAuthored = fs.existsSync(skyAuthoredOutputPath) ? fs.readFileSync(skyAuthoredOutputPath, "utf8") : "";

  if (
    existing !== serialized
    || existingSummary !== serializedSummary
    || existingSkyCore !== serializedSkyCore
    || existingDeferredCore !== serializedDeferredCore
    || existingSkyAuthored !== serializedSkyAuthored
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
  fs.writeFileSync(skyAuthoredOutputPath, serializedSkyAuthored);
  console.log(`Wrote ${path.relative(repoRoot, outputPath)} (${manifest.keyCount} keys).`);
  console.log(`Wrote ${path.relative(repoRoot, summaryOutputPath)}.`);
  console.log(`Wrote ${path.relative(repoRoot, skyCoreOutputPath)} (${skyCoreRows.hookRows.length} hooks, ${skyCoreRows.vocabularyRows.length} vocabulary rows).`);
  console.log(`Wrote ${path.relative(repoRoot, deferredCoreOutputPath)} (${deferredCoreRows.hookRows.length} hooks).`);
  console.log(`Wrote ${path.relative(repoRoot, skyAuthoredOutputPath)} (${skyAuthoredCards.authoredCards.length} authored cards).`);
}
