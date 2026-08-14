#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import { assertManifestationShapeCap } from "./sky-calendar-manifestation-shape.mjs";

const registryPath = "packages/astro-knowledge/review/sky-calendar-meaning-components-v1/sky-calendar-meaning-components-v1.json";
const fallbackPath = "apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json";
const v9Path = "apps/web/public/content/knowledge-matrix-v9/v9-owner-approved-governance-labeled/knowledge-matrix-v9-owner-approved-rows.json";
const v13Path = "apps/web/public/content/knowledge-matrix-v13/v13-direct-language-owner-approved/knowledge-matrix-v13-owner-approved-locked.json";

const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
const fallback = JSON.parse(fs.readFileSync(fallbackPath, "utf8"));
const v9 = JSON.parse(fs.readFileSync(v9Path, "utf8"));
const v13 = JSON.parse(fs.readFileSync(v13Path, "utf8"));
const fallbackRows = [...fallback.vocabularyRows, ...fallback.fallbackSourceRows, ...fallback.hookRows];

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function sourceValue(sourceId) {
  if (sourceId.startsWith(`${fallbackPath}#`)) {
    const contentKey = sourceId.slice(fallbackPath.length + 1);
    return fallbackRows.find((row) => row.contentKey === contentKey);
  }
  const v9Match = sourceId.match(/#TransitMeanings!(\d+)$/u);
  if (v9Match) return v9.transit_meanings.find((row) => row.source_row === Number(v9Match[1]));
  const v13Match = sourceId.match(/#([^!]+)!(\d+)$/u);
  if (v13Match) {
    return v13.rows.find((row) => (
      row.workbookProvenance?.sheet === v13Match[1]
      && row.workbookRow === Number(v13Match[2])
    ));
  }
  return null;
}

assert.equal(registry.schema, "tldrastro.sky-calendar-meaning-components.v1");
assert.equal(registry.status, "PENDING OWNER");
assert.deepEqual(registry.counts, {
  signUnits: 144,
  aspectMechanisms: 5,
  modalityUnits: 9,
  elementUnits: 16,
  total: 174,
});
assert.equal(registry.policy.componentsAreMeaningNotSentences, true);
assert.equal(registry.policy.emitStoredComponentVerbatim, false);
assert.equal(registry.policy.firstSentenceMustBeComposed, true);
assert.equal(registry.policy.failClosed, true);
assert.equal(registry.evidenceLayerSha256, "0ceb85f5897fb42238dfdd69e7b02271f87befe202f009da8659add9b9337c23");
assert.equal(registry.wordingQuality.maximumOpeningConstructionUse <= registry.wordingQuality.caps.openingConstruction, true);
assert.equal(registry.wordingQuality.maximumManifestationUse <= registry.wordingQuality.caps.repeatedManifestation, true);
assert.equal(registry.wordingQuality.caps.manifestationShape, 3);
assert.equal(registry.wordingQuality.maximumManifestationShapeUse <= registry.wordingQuality.caps.manifestationShape, true);
assert.ok(Array.isArray(registry.wordingQuality.manifestationShapeDistribution));
assert.equal(
  registry.wordingQuality.manifestationShapeDistribution.reduce((total, row) => total + (row.occurrences * row.distinctValues), 0),
  432,
);
assert.equal(registry.wordingQuality.maximumDetailsLanguageUse <= registry.wordingQuality.caps.repeatedDetailsLanguage, true);
assert.equal(registry.wordingQuality.maximumConnectiveNgramUse <= registry.wordingQuality.caps.connectiveNgram, true);
assert.deepEqual(registry.wordingQuality.detailsCopiedFromCombinedPosition, []);
assert.deepEqual(registry.wordingQuality.mechanicalJoinRows, []);
assert.deepEqual(registry.wordingQuality.abstractSubjectViolations, []);
assert.deepEqual(registry.wordingQuality.ownerVoiceVerbatimMatches, []);
assert.equal(registry.ownerVoiceCoverage.approvedPlanetRows, 7);
assert.equal(registry.ownerVoiceCoverage.approvedPlacementRows, 56);
assert.equal(registry.ownerVoiceCoverage.targetExactPairRows, 46);
assert.equal(registry.ownerVoiceCoverage.targetInferredPairRows, 98);
assert.equal(registry.ownerVoiceCoverage.targetPlanets.length, 12);
assert.equal(registry.ownerVoiceCoverage.signs.length, 12);
assert.equal(registry.ownerVoiceCoverage.signs.every((row) => row.placement_sign_lived_planets.length > 0), true);
assert.throws(
  () => assertManifestationShapeCap([
    { key: "sky-sign/sun/aries", reader_manifestations: ["credit being claimed before others agree"] },
    { key: "sky-sign/moon/aries", reader_manifestations: ["care being claimed before others agree"] },
    { key: "sky-sign/mercury/aries", reader_manifestations: ["information being claimed before others agree"] },
    { key: "sky-sign/venus/aries", reader_manifestations: ["value being claimed before others agree"] },
  ], 3),
  /Reader manifestation shape cap exceeded/u,
);

const all = [
  ...registry.signUnits,
  ...registry.aspectMechanisms,
  ...registry.modalityUnits,
  ...registry.elementUnits,
];
assert.equal(all.length, 174);
assert.equal(new Set(all.map((row) => row.key)).size, 174);
const renderedRegistryText = JSON.stringify({
  signUnits: registry.signUnits,
  aspectMechanisms: registry.aspectMechanisms,
  modalityUnits: registry.modalityUnits,
  elementUnits: registry.elementUnits,
});
assert.doesNotMatch(renderedRegistryText, /\b(?:you|your|yours|yourself|yourselves)\b/iu, "collective components may not use second person");
assert.doesNotMatch(renderedRegistryText, /—/u, "components must remain ASCII and em-dash free");
assert.equal([...renderedRegistryText].some((character) => character.charCodeAt(0) > 127), false, "components must remain ASCII");
assert.doesNotMatch(renderedRegistryText, /\bsteady\b/iu, "banned word steady");

for (const row of all) {
  assert.equal(row.owner_review_status, "PENDING OWNER", `${row.key} must remain pending`);
  assert.ok(Array.isArray(row.source_ids) && row.source_ids.length > 0, `${row.key} source_ids`);
  assert.equal(row.source_ids.length, row.source_hashes.length, `${row.key} source/hash parity`);
  row.source_ids.forEach((sourceId, index) => {
    const value = sourceValue(sourceId);
    assert.ok(value, `${row.key} missing source ${sourceId}`);
    assert.equal(row.source_hashes[index], sha256(JSON.stringify(value)), `${row.key} source hash ${sourceId}`);
  });
}

for (const row of registry.signUnits) {
  for (const field of ["planet_function", "sign_expression", "combined_position", "details_language"]) {
    assert.ok(typeof row[field] === "string" && row[field].trim(), `${row.key} ${field}`);
    assert.doesNotMatch(row[field], /[.!?]$/u, `${row.key} ${field} must remain a meaning component, not a sentence`);
  }
  assert.notEqual(row.details_language, row.combined_position, `${row.key} details language must be independently phrased`);
  assert.doesNotMatch(row.combined_position, /;\s*expressed through|\bexpressed through\b/iu, `${row.key} mechanical join`);
  assert.ok(Array.isArray(row.reader_manifestations) && row.reader_manifestations.length === 3);
  assert.ok(typeof row.owner_voice_coverage === "string" && row.owner_voice_coverage.length > 0);
  assert.ok(Array.isArray(row.owner_voice_source_ids) && row.owner_voice_source_ids.length > 0);
  assert.equal(row.owner_voice_source_ids.length, row.owner_voice_source_hashes.length);
  row.owner_voice_source_ids.forEach((sourceId, index) => {
    const value = sourceValue(sourceId);
    assert.ok(value, `${row.key} missing owner-voice source ${sourceId}`);
    assert.equal(row.owner_voice_source_hashes[index], sha256(JSON.stringify(value)), `${row.key} owner-voice source hash ${sourceId}`);
  });
  row.reader_manifestations.forEach((value) => {
    assert.doesNotMatch(value, /[.!?]$/u, `${row.key} reader manifestation must remain a component`);
  });
}

for (const row of [...registry.aspectMechanisms, ...registry.modalityUnits, ...registry.elementUnits]) {
  for (const field of ["reader_effect", "conflict_behavior", "movement_bias"]) {
    assert.ok(typeof row[field] === "string" && row[field].trim(), `${row.key} ${field}`);
    assert.doesNotMatch(row[field], /[.!?]$/u, `${row.key} ${field} must remain a meaning component`);
  }
}

const opposition = registry.aspectMechanisms.find((row) => row.key === "sky-aspect-mechanism/opposition");
assert.equal(opposition.reader_effect, "people can see both positions at the same time");
assert.equal(opposition.conflict_behavior, "the two sides are more likely to state the disagreement openly");
assert.equal(opposition.movement_bias, "people usually have to deal with both positions instead of removing one");

const fixedFixed = registry.modalityUnits.find((row) => row.key === "sky-how/modality/fixed/fixed");
assert.equal(fixedFixed.reader_effect, "the disagreement settles around two positions neither side considers expendable");
assert.equal(fixedFixed.conflict_behavior, "neither side gives ground easily under pressure");
assert.equal(fixedFixed.movement_bias, "people are more likely to change the terms or structure than to make either side back down");

console.log("Sky Calendar meaning components: PASS (174/174 evidence hashes verified)");
