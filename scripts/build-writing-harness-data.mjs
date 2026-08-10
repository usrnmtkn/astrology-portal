#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageRoot = path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3");
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(packageRoot, relativePath), "utf8"));
const writeJsonl = (relativePath, rows) => fs.writeFileSync(
  path.join(repoRoot, relativePath),
  `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`
);

function readSkySignRows() {
  return fs.readdirSync(path.join(packageRoot, "source-rows"))
    .filter((name) => /^sky-sign-copy-.*\.json$/u.test(name))
    .sort()
    .flatMap((name) => readJson(`source-rows/${name}`).rows ?? []);
}

function latestOwnerApproved(rows) {
  const byKey = new Map();
  for (const row of rows) {
    const list = byKey.get(row.contentKey) ?? [];
    list.push(row);
    byKey.set(row.contentKey, list);
  }
  return [...byKey.values()]
    .map((rowsForKey) => [...rowsForKey].reverse().find((row) => String(row.review_status ?? "").toLowerCase() === "approved"))
    .filter(Boolean);
}

const source = readJson("source-rows/fallback-source-rows-v3.json");
const transit = readJson("source-rows/transit-synastry-rows-v1.json");
const lunation = readJson("source-rows/lunation-blend-units-v1.json");
const bond = readJson("source-rows/bond-language-pass-2.json");
const pairFrames = readJson("source-rows/pair-daily-frames-v1.json");
const pairClauses = readJson("source-rows/pair-daily-clauses-v1.json");
const skyArticle = readJson("source-rows/sky-article-v1.json");
const skyAspect = readJson("source-rows/sky-aspect-phrasebook-v1.json");
const skyPlanet = readJson("source-rows/sky-planet-frames-v1.json");
const skyPlacement = readJson("source-rows/sky-placement-inventories-voice-pass-v1.json");
const ownerFallbacks = readJson("source-rows/sky-placement-owner-approved-fallbacks-v1.json");
const sunLeo = readJson("source-rows/sun-leo-house-cores-v1.json");
const venusLibra = readJson("source-rows/venus-libra-house-cores-v1.json");
const timing = readJson("source-rows/timing-event-reader-copy-v2.json");
const weekly = readJson("source-rows/station-cards-week-openers-v1.json");
const placementInterim = readJson("source-rows/placement-interim-fixes-v1.json");
const templates = readJson("templates/fallback-templates-v3.json");
const manifest = readJson("bundled-manifest-v3.json");
const servingKeys = new Set(manifest.keys.map((key) => key.slice(key.indexOf(":") + 1)));

const allCandidates = latestOwnerApproved([
  ...transit.authoredCards,
  ...lunation.authoredCards,
  ...skyArticle.authoredCards,
  ...weekly,
  ...timing.authoredCards,
  ...source.hookRows,
  ...lunation.hookRows,
  ...bond.rows,
  ...pairFrames.rows,
  ...pairClauses.rows,
  ...skyArticle.hookRows,
  ...skyAspect.hookRows,
  ...skyPlanet.rows,
  ...skyPlacement.rows,
  ...readSkySignRows(),
  ...ownerFallbacks.rows,
  ...sunLeo.rows,
  ...venusLibra.rows,
  ...source.vocabularyRows,
  ...placementInterim.vocabularyRows,
  ...skyArticle.vocabularyRows,
  ...templates.templates,
  ...placementInterim.templates
]);

function familyFor(contentKey) {
  if (contentKey.includes("house-horoscope-core")) return "house-core";
  if (contentKey.includes("sky-placement")) return "sky-placement";
  if (contentKey.includes("synastry") || contentKey.includes("bond-")) return "synastry";
  if (contentKey.includes("daily")) return "daily";
  if (contentKey.includes("sky-aspect")) return "sky-aspect";
  if (contentKey.includes("natal")) return "natal";
  return contentKey.split("/").slice(0, 2).join("/");
}

function registerFor(row) {
  if (row.grammar_frame === "second_person_block" || row.contentKey.includes("house-horoscope-core")) return "second_person";
  if (row.contentKey.includes("sky-placement")) return "collective";
  const body = String(row.body_you ?? row.body ?? "");
  return /\b(?:you|your|yours|yourself)\b/iu.test(body) ? "second_person" : "collective";
}

const servingApproved = allCandidates
  .filter((row) => servingKeys.has(row.contentKey))
  .map((row) => ({
    id: `serving:${row.contentKey}`,
    contentKey: row.contentKey,
    family: familyFor(row.contentKey),
    register: registerFor(row),
    text: row.body_you ?? row.body ?? "",
    ownerApproved: true,
    authority: "serving-review-status-approved",
    source: "fallbackArchitectureV3"
  }));

const matrixRoot = path.join(repoRoot, "packages/astro-knowledge/voice/tldr-astro/marie-satori-writer/knowledge-matrix-v9");
const matrix = JSON.parse(fs.readFileSync(path.join(matrixRoot, "knowledge-matrix-v9-owner-approved-rows.json"), "utf8"));
const matrixApproved = [];
for (const entry of matrix.transit_meanings) {
  if (entry.Governance !== "owner-approved" || String(entry.Copy).startsWith("[EXCLUDE FROM FALLBACK]")) continue;
  matrixApproved.push({
    id: `matrix-v9:transit:row-${entry.source_row}`,
    contentKey: entry.Key,
    family: "knowledge-matrix-transit",
    register: /\b(?:you|your|yours|yourself)\b/iu.test(entry.Copy) ? "second_person" : "collective",
    text: entry.Copy,
    ownerApproved: true,
    authority: "owner-approved-v9-governance-labeled",
    governance: entry.Governance,
    judgeLineage: entry.Judge,
    source: "knowledge-matrix-v9"
  });
}
for (const entry of matrix.house_activations) {
  if (entry.Governance !== "owner-approved" || String(entry.Experience).startsWith("[EXCLUDE FROM FALLBACK]")) continue;
  matrixApproved.push({
    id: `matrix-v9:house:row-${entry.source_row}`,
    contentKey: `${entry.Key}|${entry.House ?? ""}`,
    family: "knowledge-matrix-house",
    register: "second_person",
    text: entry.Experience,
    ownerApproved: true,
    authority: "owner-approved-v9-governance-labeled",
    governance: entry.Governance,
    judgeLineage: entry.Judge,
    source: "knowledge-matrix-v9"
  });
}

const output = [...servingApproved, ...matrixApproved].sort((a, b) => a.id.localeCompare(b.id));
writeJsonl("data/writing/OWNER_APPROVED_EXAMPLES.jsonl", output);

const bannedWordsSource = JSON.parse(fs.readFileSync(path.join(repoRoot, "packages/astro-knowledge/voice/banned-words.json"), "utf8"));
const bannedPhrasesSource = JSON.parse(fs.readFileSync(path.join(repoRoot, "packages/astro-knowledge/voice/tldr-astro/banned-phrases.json"), "utf8"));
const bannedConstructionsSource = JSON.parse(fs.readFileSync(path.join(repoRoot, "packages/astro-knowledge/voice/banned-constructions.json"), "utf8"));
const literalConstructions = bannedConstructionsSource.bannedConstructions
  .map((entry) => entry.pattern)
  .filter((pattern) => !/[\[\]\/]/u.test(pattern));
const generatedPolicy = {
  bannedWords: [...new Set([
    ...bannedWordsSource.bannedWords.map((entry) => entry.term),
    ...Object.values(bannedWordsSource.surfaceBannedWords).flat().map((entry) => entry.term)
  ])].sort(),
  bannedPhrases: [...new Set([...bannedPhrasesSource, ...literalConstructions])].sort()
};
fs.writeFileSync(
  path.join(repoRoot, "src/astro-writing/policyData.generated.mjs"),
  `// Generated from canonical voice policy JSON. Do not edit by hand.\nexport const WRITING_POLICY_DATA = Object.freeze(${JSON.stringify(generatedPolicy, null, 2)});\n`
);
console.log(JSON.stringify({ servingApproved: servingApproved.length, matrixApproved: matrixApproved.length, total: output.length }, null, 2));
