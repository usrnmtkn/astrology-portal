#!/usr/bin/env node

import assert from "node:assert/strict";
import childProcess from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..", "..");
const auditPath = "packages/astro-knowledge/review/sky-placement-deep-audit-2026-08-15/inventory.json";
const rowsPath = "apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json";
const reviewRoot = path.join(repoRoot, "packages/astro-knowledge/review/sky-placement-recovery");
const readerRoots = [
  "apps/web/src/content/fallbackArchitectureV3/source-rows",
  "apps/web/src/content/fallbackArchitectureV3/authored-inputs",
  "packages/astro-knowledge/data"
];
const readerFields = new Set([
  "body", "body_you", "body_they", "body_sky", "plainTranslation",
  "shadow", "traditional", "summary", "headline", "try_this", "opening",
  "tension", "development", "close", "title", "weeklyOverview",
  "conflictPatterns", "gift", "challenge", "integration", "overview",
  "tagline", "hook", "lived", "turn", "copy", "text", "do", "dont"
]);
const mapping = new Map([
  ["\u2018", "'"], ["\u2019", "'"], ["\u201c", "\""], ["\u201d", "\""],
  ["\u2026", "..."], ["\u2013", "-"], ["\u2014", "-"], ["\u00a0", " "],
  ["\u200b", ""], ["\u200c", ""], ["\u200d", ""], ["\u200e", ""], ["\u200f", ""],
  ["\ufeff", ""], ["\u202a", ""], ["\u202b", ""], ["\u202c", ""], ["\u202d", ""],
  ["\u202e", ""], ["\u2066", ""], ["\u2067", ""], ["\u2068", ""], ["\u2069", ""]
]);
const mappedPattern = /[\u2018\u2019\u201c\u201d\u2026\u2013\u2014\u00a0\u200b-\u200f\ufeff\u202a-\u202e\u2066-\u2069]/gu;
const accentPattern = /\p{Letter}/gu;

function gitShow(relativePath) {
  return childProcess.execFileSync("git", ["show", `origin/main:${relativePath}`], {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024
  });
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), "utf8"));
}

function normalize(value) {
  return value.replace(mappedPattern, (character) => mapping.get(character) ?? character);
}

function filesUnder(directory) {
  const absolute = path.join(repoRoot, directory);
  return fs.readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    const relative = path.join(directory, entry.name);
    if (entry.isDirectory()) return filesUnder(relative);
    return entry.isFile() && entry.name.endsWith(".json") ? [relative] : [];
  });
}

function countWords(value) {
  return String(value ?? "").trim().split(/\s+/u).filter(Boolean).length;
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function collectReaderStrings(node, field = null, contentKey = null, result = []) {
  if (Array.isArray(node)) {
    node.forEach((value) => {
      if (typeof value === "string" && readerFields.has(field)) {
        result.push({ contentKey, field, value });
      } else {
        collectReaderStrings(value, field, contentKey, result);
      }
    });
    return result;
  }
  if (!node || typeof node !== "object") return result;
  const nextContentKey = typeof node.contentKey === "string" ? node.contentKey : contentKey;
  for (const [key, value] of Object.entries(node)) {
    if (typeof value === "string" && readerFields.has(key)) {
      result.push({ contentKey: nextContentKey, field: key, value });
    } else {
      collectReaderStrings(value, key, nextContentKey, result);
    }
  }
  return result;
}

function readerKey(entry, occurrence) {
  return `${entry.contentKey ?? "unkeyed"}\u0000${entry.field}\u0000${occurrence}`;
}

function readerMap(rows) {
  const seen = new Map();
  return new Map(collectReaderStrings(rows).map((entry) => {
    const base = `${entry.contentKey ?? "unkeyed"}\u0000${entry.field}`;
    const occurrence = seen.get(base) ?? 0;
    seen.set(base, occurrence + 1);
    return [readerKey(entry, occurrence), entry];
  }));
}

function allowedOwnerWordFix(entry, before, after) {
  if (!["body_you", "body_they"].includes(entry.field)) return false;
  if (entry.contentKey === "fallback-hook/sky-placement-turn/chiron/pisces") {
    return after === normalize(before).replace("edges wobble or leak", "edges wobble or give way");
  }
  if (entry.contentKey === "fallback-hook/sky-placement-lived/saturn/scorpio") {
    return after === normalize(before).replace("a secret leaks despite the lock", "a secret gets out despite the lock");
  }
  return false;
}

function verifyReaderCopy() {
  let filesChanged = 0;
  let valuesChanged = 0;
  let punctuationValuesChanged = 0;
  let charactersReplaced = 0;
  const characterCounts = {};
  const accentedBefore = [];
  const accentedAfter = [];
  const changedFiles = [];

  for (const relativePath of readerRoots.flatMap(filesUnder)) {
    let beforeRaw;
    try { beforeRaw = gitShow(relativePath); } catch { continue; }
    const beforeMap = readerMap(JSON.parse(beforeRaw));
    const afterMap = readerMap(readJson(relativePath));
    assert.deepEqual([...afterMap.keys()], [...beforeMap.keys()], `${relativePath}: reader row/field set drifted`);
    let fileChanged = false;
    for (const [key, beforeEntry] of beforeMap) {
      const afterEntry = afterMap.get(key);
      for (const letter of beforeEntry.value.match(accentPattern) ?? []) {
        if (letter.codePointAt(0) > 127) accentedBefore.push(letter);
      }
      for (const letter of afterEntry.value.match(accentPattern) ?? []) {
        if (letter.codePointAt(0) > 127) accentedAfter.push(letter);
      }
      if (beforeEntry.value === afterEntry.value) continue;
      fileChanged = true;
      valuesChanged += 1;
      if (mappedPattern.test(beforeEntry.value)) punctuationValuesChanged += 1;
      mappedPattern.lastIndex = 0;
      const expected = normalize(beforeEntry.value);
      if (afterEntry.value !== expected) {
        assert.ok(
          allowedOwnerWordFix(afterEntry, beforeEntry.value, afterEntry.value),
          `${relativePath}: unauthorized reader-copy change in ${afterEntry.contentKey ?? "unkeyed"}.${afterEntry.field}`
        );
      }
      for (const character of beforeEntry.value.match(mappedPattern) ?? []) {
        const code = `U+${character.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")}`;
        characterCounts[code] = (characterCounts[code] ?? 0) + 1;
        charactersReplaced += 1;
      }
    }
    if (fileChanged) {
      filesChanged += 1;
      changedFiles.push(relativePath);
    }
  }
  assert.deepEqual(accentedAfter.sort(), accentedBefore.sort(), "Accented reader letters changed");
  return {
    filesChanged,
    valuesChanged,
    punctuationValuesChanged,
    charactersReplaced,
    characterCounts,
    accentedLettersPreserved: true,
    changedFiles
  };
}

const baselineAudit = JSON.parse(gitShow(auditPath));
const currentAudit = readJson(auditPath);
const baselinePages = baselineAudit.servingInventory.pages;
const currentPages = new Map(currentAudit.servingInventory.pages.map((page) => [page.page, page]));
const newlyServing = baselinePages.filter((page) => page.state === "source_gap").map((page) => page.page).sort();
const thinSaturn = baselinePages.filter((page) => page.state === "legacy_thin_standalone").map((page) => page.page).sort();
const previouslyServing = baselinePages.filter((page) => !["source_gap", "legacy_thin_standalone"].includes(page.state));

assert.equal(newlyServing.length, 78);
assert.equal(thinSaturn.length, 10);
assert.equal(currentAudit.servingInventory.incompletePageCount, 0);
assert.equal(currentAudit.sourceIntegrity.renderedTryThisCount, 0);
assert.deepEqual(currentAudit.sourceIntegrity.unresolvedRenderedPlaceholders, []);
for (const page of [...newlyServing, ...thinSaturn]) {
  assert.equal(currentPages.get(page)?.state, "other:sky-placement-frame-v3", `${page} did not move to the stamped frame`);
}
for (const page of previouslyServing) {
  assert.notEqual(currentPages.get(page.page)?.state, "source_gap", `${page.page} went dark`);
}

const baselineRows = JSON.parse(gitShow(rowsPath));
const baselineHooks = new Map(baselineRows.hookRows.map((row) => [row.contentKey, row]));
const baselineSaturnStandalone = baselineHooks.get("fallback-hook/sky-placement/saturn")?.body_you ?? "";
const resolverUrl = `${pathToFileURL(path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.mjs")).href}?verify=${Date.now()}`;
const { renderSkyPlacement } = await import(resolverUrl);
const saturnWordCounts = thinSaturn.map((page) => {
  const sign = page.split("/")[1];
  const rendered = renderSkyPlacement({
    planet: "saturn",
    sign,
    entryDate: "January 1, 2047",
    exitDate: "January 1, 2050",
    priorSign: "sagittarius",
    priorSignEntryDate: "January 1, 2044",
    priorSignExitDate: "January 1, 2047",
    previousResidencyEntryDate: "December 19, 2017",
    previousResidencyExitDate: "December 17, 2020",
    events: []
  });
  assert.equal(rendered.templateKey, "sky-placement-frame-v3");
  return { page, before: countWords(baselineSaturnStandalone), after: countWords(rendered.body) };
});

const readerNormalization = verifyReaderCopy();
const report = {
  schema: "sky-placement-serving-recovery-verification-v1",
  generatedAt: new Date().toISOString(),
  baselineRef: "origin/main",
  packageVersion: "v3-2026-08-16a",
  newlyServing,
  newlyServingCount: newlyServing.length,
  upgradedSaturnPages: saturnWordCounts,
  previouslyServingCount: previouslyServing.length,
  previouslyServingStillAvailable: true,
  finalStateCounts: currentAudit.servingInventory.counts,
  unresolvedPlaceholders: currentAudit.sourceIntegrity.unresolvedRenderedPlaceholders,
  renderedTryThisCount: currentAudit.sourceIntegrity.renderedTryThisCount,
  readerNormalization,
  looseDurationsLeftUnchanged: [
    "North Node and South Node pages say nearly two years for an approximately 18-month residency.",
    "Neptune pages say over a decade for an approximately fourteen-year residency."
  ],
  billedCalls: 0,
  hashes: {
    fallbackSourceRowsSha256: sha256(fs.readFileSync(path.join(repoRoot, rowsPath))),
    distSha256: sha256(fs.readFileSync(path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js"))),
    manifestSha256: sha256(fs.readFileSync(path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3/bundled-manifest-v3.json")))
  }
};

fs.mkdirSync(reviewRoot, { recursive: true });
fs.writeFileSync(path.join(reviewRoot, "SERVING-VERIFICATION-2026-08-16.json"), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(path.join(reviewRoot, "SERVING-VERIFICATION-2026-08-16.md"), [
  "# Sky Placement serving recovery verification",
  "",
  `- Newly serving: ${report.newlyServingCount}`,
  `- Thin Saturn pages upgraded: ${saturnWordCounts.length}`,
  `- Previously serving pages retained: ${report.previouslyServingCount}`,
  `- Final render states: ${JSON.stringify(report.finalStateCounts)}`,
  `- Reader-copy punctuation: ${readerNormalization.filesChanged} files, ${readerNormalization.punctuationValuesChanged} values, ${readerNormalization.charactersReplaced} mapped characters`,
  "- Accented letters preserved: yes",
  "- Unresolved placeholders: 0",
  "- Rendered Try this sections: 0",
  "- Billed calls: 0",
  "",
  "## Newly serving pages",
  "",
  ...newlyServing.map((page) => `- ${page}`),
  "",
  "## Saturn word counts",
  "",
  "| Page | Before | After |",
  "|---|---:|---:|",
  ...saturnWordCounts.map(({ page, before, after }) => `| ${page} | ${before} | ${after} |`),
  "",
  "## Loose durations retained under the historical allowance",
  "",
  ...report.looseDurationsLeftUnchanged.map((line) => `- ${line}`),
  ""
].join("\n"));

console.log(JSON.stringify({
  newlyServing: report.newlyServingCount,
  saturnUpgrades: saturnWordCounts.length,
  previouslyServingRetained: report.previouslyServingCount,
  finalStateCounts: report.finalStateCounts,
  readerNormalization: {
    filesChanged: readerNormalization.filesChanged,
    valuesChanged: readerNormalization.valuesChanged,
    punctuationValuesChanged: readerNormalization.punctuationValuesChanged,
    charactersReplaced: readerNormalization.charactersReplaced,
    accentedLettersPreserved: readerNormalization.accentedLettersPreserved
  }
}, null, 2));
