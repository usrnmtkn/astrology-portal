#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const app = fs.readFileSync(path.join(repoRoot, "apps/web/src/App.tsx"), "utf8");

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
  /const sourceGapAspectRows = isRegistryArticle\s*\? \[\]\s*:\s*relatedAspectRowsForPlacement/u,
  "Unreviewed source-gap aspect rows must remain suppressed for canonical registry articles."
);

console.log("Sky related-aspect Gift/Lesson balance contract passed.");
