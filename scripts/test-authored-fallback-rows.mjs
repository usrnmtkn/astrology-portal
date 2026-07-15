#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createFallbackRows, writeArtifacts } from "./materialize-authored-fallback-rows.mjs";

const blocklistedPhrases = [
  "makes this feel real",
  "on good days",
  "on harder days",
  "the thing",
  "the thing that",
  "their weight settles on you",
  "let the fog be information",
  "the part of you that already knows",
  "hard to miss",
  "connects with",
  "you amplify each other",
  "makes this pattern",
  "flows naturally",
  "magnetic and polarizing",
  "push and pull",
  "fused this tightly"
];

const disasterPhrases = [
  "device failure",
  "breakup",
  "betrayal",
  "accident",
  "punishment",
  "universal delay",
  "guaranteed return of an ex",
  "suspend all travel",
  "suspend all contracts",
  "suspend all decisions"
];

function textIncludes(text, phrases) {
  const lower = text.toLowerCase();
  return phrases.find((phrase) => lower.includes(phrase.toLowerCase()));
}

function parseScope(row) {
  return JSON.parse(row.scope);
}

function rowByKey(rows, key) {
  return rows.find((row) => row.canonical_key === key);
}

export function runAuthoredFallbackRowsTests() {
  const rows = createFallbackRows();

  assert(rows.length > 100, "expected a substantial materialized fallback set");
  assert.equal(new Set(rows.map((row) => row.canonical_key)).size, rows.length, "canonical keys must be unique");

  for (const row of rows) {
    assert.notEqual(row.status, "LIVE", `${row.canonical_key} must not be LIVE`);
    assert(!row.canonical_key.startsWith("store/"), `${row.canonical_key} must not use blanket store prefix`);
    assert.equal(textIncludes(row.text, blocklistedPhrases), undefined, `${row.canonical_key} uses a blocked phrase`);
  }

  const referenceRows = rows.filter((row) => row.lane === "reference");
  assert(referenceRows.length >= 1, "expected reference-only rows for generation rules");
  for (const row of referenceRows) {
    assert.equal(row.mapping_action, "REFERENCE_ONLY");
    assert.notEqual(row.review_state, null);
  }

  const servingRows = rows.filter((row) => row.lane === "serving");
  for (const row of servingRows) {
    assert.equal(row.status, "DRAFT");
    assert.equal(row.review_state, "editorial-review-required");
    assert.match(row.text, /(conversation|decision|choice|response|plan|task|timing|message|daily|ordinary|boundary|repair|attention|work|care|pressure|pattern|commitment|house|fact|chart|orb|action|step|method|opening|coordination|path|contact|check|room|difference|role|loyalty|feedback|agreement|expectation)/i, `${row.canonical_key} needs lived behavior or concrete situation`);
  }

  const aspectRows = rows.filter((row) => row.content_family === "current_sky_aspect");
  assert.equal(aspectRows.length, 25);
  for (const row of aspectRows) {
    assert.match(row.text, /(choice|decision|response|conversation|pressure|repair|coordinate|coordination|compromise|practice|boundary|plan|action|step|opening|path)/i, `${row.canonical_key} must describe behavior`);
    assert.doesNotMatch(row.text, /creates friction|supports this if you act|hard to miss|flows naturally|push and pull/i);
  }

  const ingressRows = rows.filter((row) => row.content_family === "planetary_ingress" || row.content_family === "personalized_ingress");
  assert.equal(ingressRows.length, 50);
  for (const row of ingressRows) {
    assert.doesNotMatch(row.text, /\bbringing\b.*\bto\b/i, `${row.canonical_key} must not concatenate keywords`);
    assert.doesNotMatch(row.text, /keywords/i, `${row.canonical_key} must not mention keywords`);
    assert.match(row.text, /(changes|shift|tone|pace|attention|daily|ordinary|decision|message|connection|structure|house|birth time)/i);
  }

  const retroRows = rows.filter((row) => row.content_family.includes("retrograde") || row.content_family === "multiple_retrogrades");
  assert(retroRows.length >= 17);
  for (const row of retroRows) {
    assert.equal(textIncludes(row.text, disasterPhrases), undefined, `${row.canonical_key} predicts disaster`);
    assert.match(row.text, /(review|returns|station|integration|repair|clarify|slow|correction|shadow|resume|count|list)/i);
  }

  const contextRows = rows.filter((row) => row.content_family === "synastry_relationship_context");
  const romanticContexts = new Set(["romantic-partner", "romantic-situationship", "romantic-ex"]);
  for (const row of contextRows) {
    const scope = parseScope(row);
    const hasRomance = /\bromantic\b|\bdesire\b|\bchemistry\b|\bex\b/i.test(row.text);
    if (hasRomance) {
      assert(romanticContexts.has(scope.relationshipContext), `${row.canonical_key} leaks romantic language into non-romantic context`);
    }
  }

  const directionalTheir = rowByKey(rows, "fallback-hook/friends.synastry-contact/directional/their-planet-your-planet/conjunction");
  const directionalYour = rowByKey(rows, "fallback-hook/friends.synastry-contact/directional/your-planet-their-planet/conjunction");
  assert(directionalTheir && directionalYour, "directional synastry rows must exist");
  assert.notEqual(directionalTheir.canonical_key, directionalYour.canonical_key);
  assert.match(directionalTheir.text, /their expression meets your response/i);
  assert.match(directionalYour.text, /your expression meets their response/i);

  const samePlanetRows = rows.filter((row) => row.content_family === "synastry_same_planet");
  assert(samePlanetRows.length >= 300);
  for (const row of samePlanetRows) {
    const scope = parseScope(row);
    assert.equal(scope.mutual, true);
    assert.equal(scope.samePlanet, true);
    assert.match(row.text, /\bboth\b/i, `${row.canonical_key} must use mutual logic`);
    assert.notEqual(row.existing_canonical_match, "fallback-hook/friends.synastry-contact", `${row.canonical_key} must not map to the generic synastry hook`);
    assert.doesNotMatch(row.text, /generational|background context|similar collective shifts|not be treated as proof/i, `${row.canonical_key} must not expose internal weighting`);
  }

  const saturnSamePlanet = rowByKey(rows, "fallback-hook/friends.same-planet/saturn/conjunction");
  assert(saturnSamePlanet, "Saturn same-planet conjunction row must exist");
  assert.match(saturnSamePlanet.text, /both|recognize|conjunction|practical/i);

  const prioritizedContextAspectRows = samePlanetRows.filter((row) => {
    const scope = parseScope(row);
    return scope.aspectPreserved === true && scope.relationshipContext;
  });
  assert.equal(prioritizedContextAspectRows.length, 114, "expected prioritized context/aspect same-planet layer plus exact rows");
  for (const row of prioritizedContextAspectRows) {
    const scope = parseScope(row);
    assert(scope.aspect || scope.aspectFamily, `${row.canonical_key} must carry an aspect or aspect family`);
    assert.notEqual(scope.aspectNeutral, true, `${row.canonical_key} must not be aspect neutral`);
  }

  for (const key of [
    "fallback-hook/friends.same-planet/context/friend/saturn/conjunction",
    "fallback-hook/friends.same-planet/context/romantic-partner/venus/square",
    "fallback-hook/friends.same-planet/context/romantic-partner-ex/venus/square",
    "fallback-hook/friends.same-planet/context/family-sibling/mercury/square",
    "fallback-hook/friends.same-planet/context/coworker/mars/opposition",
    "fallback-hook/friends.same-planet/context/business/jupiter/trine",
    "fallback-hook/friends.same-planet/context/friend/neptune/conjunction"
  ]) {
    const match = rowByKey(rows, key);
    assert(match, `${key} must exist`);
    assert.equal(parseScope(match).aspectPreserved, true, `${key} must preserve aspect`);
  }

  const neutralContextRows = samePlanetRows.filter((row) => parseScope(row).aspectNeutral === true);
  assert.equal(neutralContextRows.length, 120);

  const houseRows = rows.filter((row) => row.content_family === "synastry_house_overlay");
  assert(houseRows.length >= 3);
  for (const row of houseRows) {
    const scope = parseScope(row);
    assert(scope.requiresReliableBirthTimeOf, `${row.canonical_key} must declare receiving birth-time requirement`);
    if (scope.birthTimeUnknownFallback) {
      assert.match(row.text, /do not guess/i);
    }
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "authored-fallback-rows-"));
  const result = writeArtifacts(tempDir);
  assert.equal(result.rows.length, rows.length);
  for (const filename of [
    "tldr-astro-fallback-rows.json",
    "tldr-astro-fallback-rows.csv",
    "tldr-astro-fallback-key-map.csv",
    "tldr-astro-fallback-conflicts.csv",
    "tldr-astro-fallback-unmapped.csv",
    "tldr-astro-fallback-dry-run.sql",
    "tldr-astro-fallback-import-report.md"
  ]) {
    assert(fs.existsSync(path.join(tempDir, filename)), `${filename} should be written`);
  }

  const sql = fs.readFileSync(path.join(tempDir, "tldr-astro-fallback-dry-run.sql"), "utf8");
  assert(!sql.includes("'LIVE'"), "dry-run SQL must not create LIVE rows");
  assert(sql.includes("on conflict (content_key, target_date, mode) do nothing"), "dry-run SQL must protect existing rows");
  assert(!sql.includes("reference/authored-fallback"), "reference rows must not be emitted to generated_interpretations SQL");
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  runAuthoredFallbackRowsTests();
  console.log("authored fallback row tests passed");
}
