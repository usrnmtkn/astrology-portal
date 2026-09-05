#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appPath = path.join(repoRoot, "apps/web/src/App.tsx");
const appSource = fs.readFileSync(appPath, "utf8");

const before = `  const relatedAspectSections = isRegistryArticle\n    ? []\n    : relatedSkyAspectSectionsForPlacement({`;
const after = `  const relatedAspectSections = relatedSkyAspectSectionsForPlacement({`;

if (appSource.includes(before)) {
  if (appSource.split(before).length !== 2) {
    throw new Error("Expected exactly one Sky V4 registry-article aspect suppression boundary.");
  }
  fs.writeFileSync(appPath, appSource.replace(before, after));
  console.log("Preserved approved exact aspect sections across canonical V4 article hydration.");
} else if (appSource.includes(after)) {
  console.log("Sky V4 related-aspect hydration hotfix is already applied.");
} else {
  throw new Error("Expected Sky V4 registry-article aspect suppression boundary was not found.");
}

const phrasebookTestPath = path.join(repoRoot, "scripts/test-reviewed-sky-aspect-phrasebook.mjs");
const phrasebookTestSource = fs.readFileSync(phrasebookTestPath, "utf8");
const staleCount = "assert.equal(exactTransitRecords.length, 215);";
const currentCount = "assert.equal(exactTransitRecords.length, 248);";

if (phrasebookTestSource.includes(staleCount)) {
  fs.writeFileSync(phrasebookTestPath, phrasebookTestSource.replace(staleCount, currentCount));
  console.log("Updated the reviewed Sky aspect corpus contract from 215 to 248 exact records.");
} else if (phrasebookTestSource.includes(currentCount)) {
  console.log("Reviewed Sky aspect corpus contract already expects 248 exact records.");
} else {
  throw new Error("Expected exact-transit corpus count assertion was not found.");
}
