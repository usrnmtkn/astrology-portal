#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import { assertManifestationShapeCap } from "./sky-calendar-manifestation-shape.mjs";
import {
  REALIZATION_FIELDS,
  assertTypedRealizationSchema,
  selectRealizationForAspect,
} from "./sky-calendar-realization-types.mjs";
import {
  assertOwnerReplacements,
  classificationReviewAudit,
  manifestationPlainnessViolations,
  sourceShadowAudit,
} from "./sky-calendar-component-repass.mjs";

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

assert.equal(registry.schema, "tldrastro.sky-calendar-meaning-components.v2");
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
assert.equal(registry.policy.realizationPoolsAreTypedNotOrdered, true);
assert.equal(registry.policy.positionalRealizationTemplateForbidden, true);
assert.equal(registry.evidenceLayerSha256, "0ceb85f5897fb42238dfdd69e7b02271f87befe202f009da8659add9b9337c23");
assert.equal(registry.wordingQuality.maximumOpeningConstructionUse <= registry.wordingQuality.caps.openingConstruction, true);
assert.equal(registry.wordingQuality.maximumManifestationUse <= registry.wordingQuality.caps.repeatedManifestation, true);
assert.equal(registry.wordingQuality.caps.manifestationShape, 3);
assert.equal(registry.wordingQuality.maximumManifestationShapeUse <= registry.wordingQuality.caps.manifestationShape, true);
assert.ok(Array.isArray(registry.wordingQuality.manifestationShapeDistribution));
assert.equal(
  registry.wordingQuality.manifestationShapeDistribution.reduce((total, row) => total + (row.occurrences * row.distinctValues), 0),
  496,
);
assert.equal(registry.wordingQuality.maximumDetailsLanguageUse <= registry.wordingQuality.caps.repeatedDetailsLanguage, true);
assert.equal(registry.wordingQuality.maximumConnectiveNgramUse <= registry.wordingQuality.caps.connectiveNgram, true);
assert.deepEqual(registry.wordingQuality.detailsCopiedFromCombinedPosition, []);
assert.deepEqual(registry.wordingQuality.mechanicalJoinRows, []);
assert.deepEqual(registry.wordingQuality.abstractSubjectViolations, []);
assert.deepEqual(registry.wordingQuality.manifestationPlainnessViolations, []);
assert.deepEqual(registry.wordingQuality.ownerVoiceVerbatimMatches, []);
assert.equal(registry.systemicRepass.reviewedUnits, 174);
assert.equal(registry.systemicRepass.changedUnits, 174);
assert.equal(registry.systemicRepass.schemaChangedUnits, 174);
assert.equal(registry.systemicRepass.reviewedUnchangedUnits, 0);
assert.equal(registry.systemicRepass.sourceShadowAudit.oneSidedBeforePass, 39);
assert.equal(registry.systemicRepass.sourceShadowAudit.oneSidedAfterPass, 0);
assert.equal(registry.systemicRepass.ownerAuthoredReplacementKeys.length, 8);
assert.equal(registry.systemicRepass.realizationSchema.positionalTemplatePrevented, true);
assert.equal(registry.systemicRepass.realizationSchema.countShapeDistribution.length >= 2, true);
assert.deepEqual(
  Object.fromEntries(Object.entries(registry.systemicRepass.classificationAudit).filter(([key]) => key !== "reviewed")),
  {
    reviewedUnits: 23,
    allNeutralBefore: 13,
    allNeutralAfter: 0,
    allShadowBefore: 10,
    allShadowAfter: 1,
    emptySupportiveBefore: 81,
    emptySupportiveAfter: 64,
    changedRealizations: 44,
  },
);
assert.deepEqual(
  Object.fromEntries(Object.entries(registry.systemicRepass.supportiveExtractionAudit).filter(([key]) => key !== "keys" && key !== "rule")),
  {
    authorizationDate: "2026-08-16",
    extractionOnly: true,
    units: 64,
    realizations: 64,
    emptySupportivePoolsAfter: 0,
    unsupportedUnits: [],
  },
);
assert.deepEqual(registry.systemicRepass.faultAudit.remainingViolations, {
  analytical_abstraction: [],
  assembled_construction: [],
  invented_motive: [],
  unsupported_borrowed_vocabulary: [],
});
assert.deepEqual(
  Object.fromEntries(Object.entries(registry.systemicRepass.faultAudit.changedUnderFaultCategory).map(([key, value]) => [key, value.units])),
  {
    analytical_abstraction: 4,
    assembled_construction: 1,
    invented_motive: 2,
    unsupported_borrowed_vocabulary: 3,
    generic_actor_removed: 7,
  },
);
assert.deepEqual(registry.systemicRepass.faultAudit.borrowedVocabularyRemoved, [
  { key: "sky-sign/sun/taurus", removedTerms: ["budget", "material"] },
  { key: "sky-sign/moon/taurus", removedTerms: ["food", "money", "shelter"] },
  { key: "sky-sign/mercury/taurus", removedTerms: ["price"] },
]);
assert.equal(registry.ownerVoiceCoverage.approvedPlanetRows, 7);
assert.equal(registry.ownerVoiceCoverage.approvedPlacementRows, 56);
assert.equal(registry.ownerVoiceCoverage.targetExactPairRows, 46);
assert.equal(registry.ownerVoiceCoverage.targetInferredPairRows, 98);
assert.equal(registry.ownerVoiceCoverage.targetPlanets.length, 12);
assert.equal(registry.ownerVoiceCoverage.signs.length, 12);
assert.equal(registry.ownerVoiceCoverage.signs.every((row) => row.placement_sign_lived_planets.length > 0), true);
assert.throws(
  () => assertManifestationShapeCap([
    { key: "sky-sign/sun/aries", supportive_realizations: ["credit being claimed before others agree"], neutral_realizations: [], shadow_realizations: [] },
    { key: "sky-sign/moon/aries", supportive_realizations: ["care being claimed before others agree"], neutral_realizations: [], shadow_realizations: [] },
    { key: "sky-sign/mercury/aries", supportive_realizations: ["information being claimed before others agree"], neutral_realizations: [], shadow_realizations: [] },
    { key: "sky-sign/venus/aries", supportive_realizations: ["value being claimed before others agree"], neutral_realizations: [], shadow_realizations: [] },
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
assertTypedRealizationSchema(all);
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
  assert.equal(Object.hasOwn(row, "reader_manifestations"), false, `${row.key} may not carry the positional legacy field`);
  REALIZATION_FIELDS.forEach((field) => assert.ok(Array.isArray(row[field]), `${row.key} ${field}`));
  assert.ok(Array.isArray(row.source_ids) && row.source_ids.length > 0, `${row.key} source_ids`);
  assert.equal(row.source_ids.length, row.source_hashes.length, `${row.key} source/hash parity`);
  row.source_ids.forEach((sourceId, index) => {
    const value = sourceValue(sourceId);
    assert.ok(value, `${row.key} missing source ${sourceId}`);
    assert.equal(row.source_hashes[index], sha256(JSON.stringify(value)), `${row.key} source hash ${sourceId}`);
  });
}

for (const row of registry.signUnits) {
  assert.ok(Array.isArray(row.supportive_realization_evidence), `${row.key} supportive realization evidence`);
  for (const evidence of row.supportive_realization_evidence) {
    assert.ok(row.supportive_realizations.includes(evidence.realization), `${row.key} extracted supportive realization`);
    assert.equal(evidence.source_ids.length, evidence.source_hashes.length, `${row.key} extraction source/hash parity`);
    evidence.source_ids.forEach((sourceId, index) => {
      const sourceIndex = row.source_ids.indexOf(sourceId);
      assert.notEqual(sourceIndex, -1, `${row.key} extraction evidence must be local to the unit`);
      assert.equal(evidence.source_hashes[index], row.source_hashes[sourceIndex], `${row.key} extraction evidence hash`);
    });
  }
  for (const field of ["planet_function", "sign_expression", "combined_position", "details_language"]) {
    assert.ok(typeof row[field] === "string" && row[field].trim(), `${row.key} ${field}`);
    if (field !== "combined_position") {
      assert.doesNotMatch(row[field], /[.!?]$/u, `${row.key} ${field} must remain a meaning component, not a sentence`);
    }
  }
  assert.notEqual(row.details_language, row.combined_position, `${row.key} details language must be independently phrased`);
  assert.doesNotMatch(row.combined_position, /;\s*expressed through|\bexpressed through\b/iu, `${row.key} mechanical join`);
  assert.equal(
    REALIZATION_FIELDS.reduce((total, field) => total + row[field].length, 0),
    3 + row.supportive_realization_evidence.length,
  );
  assert.ok(typeof row.owner_voice_coverage === "string" && row.owner_voice_coverage.length > 0);
  assert.ok(Array.isArray(row.owner_voice_source_ids) && row.owner_voice_source_ids.length > 0);
  assert.equal(row.owner_voice_source_ids.length, row.owner_voice_source_hashes.length);
  row.owner_voice_source_ids.forEach((sourceId, index) => {
    const value = sourceValue(sourceId);
    assert.ok(value, `${row.key} missing owner-voice source ${sourceId}`);
    assert.equal(row.owner_voice_source_hashes[index], sha256(JSON.stringify(value)), `${row.key} owner-voice source hash ${sourceId}`);
  });
  REALIZATION_FIELDS.flatMap((field) => row[field]).forEach((value) => {
    assert.doesNotMatch(value, /[.!?]$/u, `${row.key} reader manifestation must remain a component`);
  });
}
assertOwnerReplacements(registry.signUnits);
assert.deepEqual(manifestationPlainnessViolations(registry.signUnits), []);
assert.equal(sourceShadowAudit(registry.signUnits).oneSidedAfterPass, 0);
assert.deepEqual(classificationReviewAudit(registry.signUnits), registry.systemicRepass.classificationAudit);

for (const row of [...registry.aspectMechanisms, ...registry.modalityUnits, ...registry.elementUnits]) {
  for (const field of ["reader_effect", "conflict_behavior", "movement_bias"]) {
    assert.ok(typeof row[field] === "string" && row[field].trim(), `${row.key} ${field}`);
    assert.doesNotMatch(row[field], /[.!?]$/u, `${row.key} ${field} must remain a meaning component`);
  }
}

const typedFixture = {
  key: "fixture",
  supportive_realizations: ["supportive opening"],
  neutral_realizations: ["neutral condition"],
  shadow_realizations: ["shadow cost"],
};
assert.equal(selectRealizationForAspect(typedFixture, "square").type, "shadow");
assert.equal(selectRealizationForAspect(typedFixture, "opposition").type, "neutral");
assert.equal(selectRealizationForAspect(typedFixture, "trine").type, "supportive");
const noSupportiveFixture = {
  key: "no-supportive-fixture",
  supportive_realizations: [],
  neutral_realizations: ["neutral condition"],
  shadow_realizations: ["shadow cost"],
};
assert.throws(
  () => selectRealizationForAspect(noSupportiveFixture, "trine"),
  (error) => (
    error.code === "sky-calendar-missing-required-realization"
    && error.gaps?.[0]?.componentKey === "no-supportive-fixture"
    && error.gaps?.[0]?.requiredType === "supportive"
  ),
  "A trine may not silently substitute a neutral realization",
);
const allShadowFixture = {
  key: "all-shadow-fixture",
  supportive_realizations: [],
  neutral_realizations: [],
  shadow_realizations: ["shadow cost"],
};
assert.throws(
  () => selectRealizationForAspect(allShadowFixture, "trine"),
  (error) => (
    error.code === "sky-calendar-missing-required-realization"
    && error.gaps?.[0]?.availableTypes?.includes("shadow")
    && error.gaps?.[0]?.requiredType === "supportive"
  ),
  "An all-shadow unit must block a trine instead of degrading it to shadow material",
);

const opposition = registry.aspectMechanisms.find((row) => row.key === "sky-aspect-mechanism/opposition");
assert.equal(opposition.reader_effect, "people can see both positions at the same time");
assert.equal(opposition.conflict_behavior, "the two sides are more likely to state the disagreement openly");
assert.equal(opposition.movement_bias, "people usually have to deal with both positions instead of removing one");

const fixedFixed = registry.modalityUnits.find((row) => row.key === "sky-how/modality/fixed/fixed");
assert.equal(fixedFixed.reader_effect, "the disagreement settles around two positions neither side considers expendable");
assert.equal(fixedFixed.conflict_behavior, "neither side gives ground easily under pressure");
assert.equal(fixedFixed.movement_bias, "people are more likely to change the terms or structure than to make either side back down");

console.log("Sky Calendar meaning components: PASS (174/174 evidence hashes verified)");
