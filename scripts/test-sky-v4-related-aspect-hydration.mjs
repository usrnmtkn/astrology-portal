#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const app = fs.readFileSync(path.join(repoRoot, "apps/web/src/App.tsx"), "utf8");
const routing = fs.readFileSync(path.join(repoRoot, "apps/web/src/services/skyAspectRouting.ts"), "utf8");

const functionStart = app.indexOf("function relatedSkyAspectSectionsForPlacement({");
const functionEnd = app.indexOf("\nfunction skyPlacementAspectExactMoment(", functionStart);
assert.ok(functionStart >= 0 && functionEnd > functionStart, "Related Sky aspect section builder must exist.");
const relatedAspectBuilder = app.slice(functionStart, functionEnd);

assert.match(
  relatedAspectBuilder,
  /const resolvedSections = aspects[\s\S]*?\.sort\(\(first, second\) => first\.orb - second\.orb\)/u,
  "Reader-eligible related aspects must remain ordered by orb before editorial selection."
);
assert.match(
  relatedAspectBuilder,
  /const giftSection = resolvedSections\.find\(\(\{ section \}\) => section\.group === "gifts"\);/u,
  "The placement detail must retain the tightest reader-eligible Gift."
);
assert.match(
  relatedAspectBuilder,
  /const lessonSection = resolvedSections\.find\(\(\{ section \}\) => section\.group === "lessons"\);/u,
  "The placement detail must retain the tightest reader-eligible Lesson."
);
assert.match(
  relatedAspectBuilder,
  /if \(giftSection && lessonSection\)[\s\S]*?return \[giftSection, lessonSection\][\s\S]*?\.map\(\(\{ section \}\) => section\);/u,
  "When both tones exist, one Gift and one Lesson must survive the two-card cap."
);
assert.match(
  relatedAspectBuilder,
  /return resolvedSections[\s\S]*?\.slice\(0, 2\)[\s\S]*?\.map\(\(\{ section \}\) => section\);/u,
  "When only one tone exists, the placement detail must remain capped at its two tightest reader-eligible aspects."
);

assert.match(
  app,
  /const contentRegistryVersion = useContentRegistryRevision\(\);/u,
  "Open Sky details must synchronize the current lazy content-registry revision on mount."
);
assert.match(
  app,
  /const refreshKey = `\$\{skyDetailRoutePath\}:\$\{fallbackArchitectureV3Version\}:\$\{contentRegistryVersion\}:\$\{personalizationKey\}`;/u,
  "The open-detail refresh key must change when exact registry content arrives."
);
assert.match(
  app,
  /\}, \[contentRegistryVersion, fallbackArchitectureV3Version, profileNatalSky\?\.ascendant, selectedSkyDetail\?\.routePath, sky, skyDetailRoutePath, skyGeneratedContent, skyPlacementPersonalizationTransits, userProfile\?\.rising\]\);/u,
  "The open-detail refresh effect must depend on the content-registry revision."
);
assert.doesNotMatch(
  app,
  /setContentRegistryVersion/u,
  "Open Sky details must not use the race-prone duplicate registry listener."
);

assert.match(
  routing,
  /return composed \?\? exact \?\? signSpecific \?\? phrasebook \?\? generated \?\? fallback \?\? null;/u,
  "Owner-approved exact aspect copy must outrank legacy sign-specific phrasebook copy."
);
assert.doesNotMatch(
  routing,
  /return composed \?\? signSpecific \?\? exact/u,
  "Legacy sign-specific copy must not replace an available exact aspect body."
);
assert.match(
  app,
  /const sourceGapAspectRows = isRegistryArticle\s*\? \[\]\s*:\s*relatedAspectRowsForPlacement/u,
  "Unreviewed source-gap aspect rows must remain suppressed for canonical registry articles."
);

console.log("Sky related-aspect balance, registry refresh, and exact-copy authority contract passed.");
