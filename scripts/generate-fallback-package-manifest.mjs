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
  const weeklyRows = readJson("source-rows/station-cards-week-openers-v1.json");
  const templates = readJson("templates/fallback-templates-v3.json");

  return {
    transitLib: {
      authoredCards: latestReaderEligible([
        ...transitRows.authoredCards,
        ...lunationRows.authoredCards,
        ...skyArticleRows.authoredCards,
        ...weeklyRows
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
const serialized = `${JSON.stringify(manifest, null, 2)}\n`;
const summary = {
  packageVersion: manifest.packageVersion,
  contentHash: manifest.contentHash,
  keyManifestHash: manifest.keyManifestHash,
  keyCount: manifest.keyCount
};
const serializedSummary = `${JSON.stringify(summary, null, 2)}\n`;

if (checkOnly) {
  const existing = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, "utf8") : "";
  const existingSummary = fs.existsSync(summaryOutputPath) ? fs.readFileSync(summaryOutputPath, "utf8") : "";

  if (existing !== serialized || existingSummary !== serializedSummary) {
    console.error("Bundled fallback manifest is stale. Run npm run build:fallback-manifest.");
    process.exit(1);
  }

  console.log(`Bundled fallback manifest is current (${manifest.keyCount} keys).`);
} else {
  fs.writeFileSync(outputPath, serialized);
  fs.writeFileSync(summaryOutputPath, serializedSummary);
  console.log(`Wrote ${path.relative(repoRoot, outputPath)} (${manifest.keyCount} keys).`);
  console.log(`Wrote ${path.relative(repoRoot, summaryOutputPath)}.`);
}
