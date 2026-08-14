#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import {
  dailyGlanceChartContextFromSelection,
  selectDailyGlanceChartContext,
  selectDailyGlanceCivilDayDriver
} from "../apps/web/src/services/chartMath.ts";

const require = createRequire(import.meta.url);
const {
  compileSceneContext,
  dailyGlanceKeyForContext,
  getApprovedLlMechanism,
  loadWriterSceneContextForKey,
  validateLicenseRegistry,
  validateSpecificityCandidate
} = require("../packages/astro-knowledge/scripts/daily-glance-scene-context.js");

const registry = JSON.parse(fs.readFileSync(new URL(
  "../packages/astro-knowledge/config/daily-glance-scene-licenses-v1.json",
  import.meta.url
), "utf8"));
const writerDirective = fs.readFileSync(new URL(
  "../packages/astro-knowledge/review/daily-glance-sol-writer-directive-v2.md",
  import.meta.url
), "utf8");
assert.ok(writerDirective.includes("Licensed vocabulary may be paraphrased naturally; do not embed grant phrases verbatim."));

const registryValidation = validateLicenseRegistry(registry);
assert.deepEqual(registryValidation, { passed: true, errors: [], licenseCount: 6 });
assert.ok(registry.licenses.every((license) => license.approval.status === "approved"));
assert.ok(registry.licenses.every((license) => license.approval.inheritsSourceApproval === false));
assert.ok(registry.licenses.every((license) => license.approval.ownerApproved === true));
assert.ok(registry.licenses.every((license) => license.approval.writerEligible === true));
assert.ok(registry.licenses.every((license) => license.approval.renderEligible === false));
assert.equal(registry.authoritySources[0].sourceId, "owner-doctrine:daily-glance-scene-license-ruling-2026-08-11");
assert.equal(
  registry.authoritySources[1].sourceId,
  "owner-doctrine:daily-glance-scene-license-ruling-2026-08-14"
);

const licensesById = new Map(registry.licenses.map((license) => [license.licenseId, license]));
const neptuneLicense = licensesById.get("scene-license/aspect/moon-conjunction-neptune/v1");
const house6License = licensesById.get("scene-license/house/6/v1");
const house10License = licensesById.get("scene-license/house/10/v1");
const northNodeLicense = licensesById.get("scene-license/aspect/moon-conjunction-north-node/v1");
const house4License = licensesById.get("scene-license/house/4/v1");
const moonVirgoLicense = licensesById.get("scene-license/transit-sign/moon-virgo/v1");
assert.deepEqual(neptuneLicense.normalizedMeaning.actions, [
  "notice another person's mood",
  "form an explanation before the other person has explained what happened"
]);
assert.deepEqual(neptuneLicense.normalizedMeaning.behaviors, [
  "absorb another person's mood as their own",
  "imagine a version of the situation or person that may differ from what is actually happening"
]);
assert.deepEqual(neptuneLicense.normalizedMeaning.consequences, ["confusion about which feelings belong to them"]);
assert.ok(!registry.closedVocabulary.actions["notice another person's mood"].includes("a coworker seems uneasy"));
assert.deepEqual(house6License.normalizedMeaning.domains, ["daily work", "routines", "health habits / body care"]);
assert.deepEqual(house6License.normalizedMeaning.roles, []);
assert.deepEqual(house6License.normalizedMeaning.objects, ["appointment"]);
assert.deepEqual(house6License.normalizedMeaning.actions, ["manage a schedule"]);
assert.equal(
  house6License.provenance.find((grant) => grant.value === "manage a schedule").grantType,
  "normalized"
);
assert.deepEqual(house10License.normalizedMeaning.domains, [
  "career",
  "reputation",
  "public responsibility",
  "professional achievement"
]);
assert.deepEqual(house10License.normalizedMeaning.roles, ["manager / authority figure"]);
assert.deepEqual(house10License.normalizedMeaning.settings, ["work that can be evaluated publicly or professionally"]);
assert.deepEqual(house10License.normalizedMeaning.actions, []);
assert.equal(
  house10License.provenance.find((grant) => grant.value === "manager / authority figure").grantType,
  "normalized, owner-reviewed"
);
assert.deepEqual(northNodeLicense.normalizedMeaning.actions, [
  "notice an unfamiliar possibility",
  "return attention to a plan they have barely admitted they want"
]);
assert.deepEqual(northNodeLicense.normalizedMeaning.behaviors, [
  "treat a temporary emotional opening as information rather than a decision"
]);
assert.deepEqual(northNodeLicense.normalizedMeaning.consequences, []);
assert.equal(northNodeLicense.evidence[0].evidenceRole, "supporting-reference");
assert.ok(northNodeLicense.provenance.every((grant) => (
  grant.sourceIds.length === 1
  && grant.sourceIds[0] === "owner-doctrine:daily-glance-scene-license-ruling-2026-08-14"
)));
assert.deepEqual(house4License.scope, { type: "house", house: 4 });
assert.deepEqual(house4License.normalizedMeaning.domains, ["private life", "home", "family"]);
assert.deepEqual(house4License.normalizedMeaning.roles, ["family member"]);
assert.deepEqual(house4License.normalizedMeaning.settings, ["home"]);
assert.deepEqual(house4License.normalizedMeaning.actions, []);
assert.deepEqual(moonVirgoLicense.normalizedMeaning.actions, ["check details"]);
assert.deepEqual(moonVirgoLicense.normalizedMeaning.behaviors, ["responds by trying to make the feeling useful or correctable"]);

const pendingRegistry = structuredClone(registry);
for (const license of pendingRegistry.licenses) {
  license.approval.status = "review_needed";
  license.approval.ownerApproved = false;
  license.approval.writerEligible = false;
}

const natalNeptune = [{
  planet: "Neptune",
  longitude: 90,
  sign: "Capricorn",
  house: 10
}];
const context = selectDailyGlanceChartContext(
  { longitude: 86, sign: "Virgo", house: 6 },
  natalNeptune,
  6,
  true
);
assert.deepEqual(context, {
  kind: "aspect",
  transitPlanet: "moon",
  transitSign: "Virgo",
  transitHouse: 6,
  natalPoint: "Neptune",
  natalSign: "Capricorn",
  natalHouse: 10,
  aspect: "conjunction",
  aspectGroup: "conjunction",
  orb: 4,
  housesReliable: true
});
assert.equal(dailyGlanceKeyForContext(context), "conjunction/neptune");

const houseContext = selectDailyGlanceChartContext(
  { longitude: 30, sign: "Virgo", house: 6 },
  [{ planet: "Neptune", longitude: 180, sign: "Capricorn", house: 10 }],
  6,
  true
);
assert.deepEqual(houseContext, {
  kind: "house",
  transitPlanet: "moon",
  transitSign: "Virgo",
  transitHouse: 6,
  housesReliable: true
});
assert.equal(dailyGlanceKeyForContext(houseContext), "house/6");
assert.equal(
  selectDailyGlanceChartContext(
    { longitude: 30, sign: "Virgo", house: 6 },
    [{ planet: "Neptune", longitude: 180, sign: "Capricorn", house: 10 }],
    6,
    false
  ),
  null,
  "A house-only result must fail closed without reliable birth-time houses."
);

const contextWithoutHouses = selectDailyGlanceChartContext(
  { longitude: 86, sign: "Virgo", house: 6 },
  natalNeptune,
  6,
  false
);
assert.equal(contextWithoutHouses.kind, "aspect");
assert.equal(contextWithoutHouses.transitHouse, null);
assert.equal(contextWithoutHouses.natalHouse, null);

const civilDayTargets = [
  { planet: "North Node", longitude: 314, sign: "Cancer", house: 11 },
  { planet: "Mars", longitude: 327, sign: "Leo", house: 12 }
];
const civilDayDriver = selectDailyGlanceCivilDayDriver(7, 14, civilDayTargets, 4);
assert.deepEqual(civilDayDriver, {
  kind: "aspect",
  natal: "North Node",
  aspect: "sextile",
  orb: 0,
  selectionScope: "civil-day-exact",
  exactOffsetDays: 0.5
});
const civilDayContext = selectDailyGlanceChartContext(
  { longitude: 7, speed: 14, sign: "Virgo", house: 4 },
  civilDayTargets,
  4,
  true
);
assert.deepEqual(civilDayContext, {
  kind: "aspect",
  transitPlanet: "moon",
  transitSign: "Virgo",
  transitHouse: 4,
  natalPoint: "North Node",
  natalSign: "Cancer",
  natalHouse: 11,
  aspect: "sextile",
  aspectGroup: "soft",
  orb: 0,
  housesReliable: true
});
assert.equal(dailyGlanceKeyForContext(civilDayContext), "soft/north-node");
assert.deepEqual(
  dailyGlanceChartContextFromSelection(
    civilDayDriver,
    { sign: "Virgo", house: 4 },
    civilDayTargets,
    4,
    true
  ),
  civilDayContext,
  "Writer context must be derivable from the exact driver already selected for serving."
);

const northNodeContext = selectDailyGlanceChartContext(
  { longitude: 86, sign: "Virgo", house: 4 },
  [{ planet: "North Node", longitude: 90, sign: "Cancer", house: 11 }],
  4,
  true
);
assert.deepEqual(northNodeContext, {
  kind: "aspect",
  transitPlanet: "moon",
  transitSign: "Virgo",
  transitHouse: 4,
  natalPoint: "North Node",
  natalSign: "Cancer",
  natalHouse: 11,
  aspect: "conjunction",
  aspectGroup: "conjunction",
  orb: 4,
  housesReliable: true
});
assert.equal(dailyGlanceKeyForContext(northNodeContext), "conjunction/north-node");

const northNodePacket = compileSceneContext(northNodeContext, { mode: "production", registry });
assert.equal(northNodePacket.status, "UNAPPROVED");
assert.equal(northNodePacket.servingEligible, false);
assert.equal(northNodePacket.canGenerateContextualCandidate, true);
assert.equal(northNodePacket.mechanism.sourceId, "scene-license/aspect/moon-conjunction-north-node/v1");
assert.equal(northNodePacket.mechanism.provenanceTier, "exact-owner-doctrine");
assert.deepEqual(
  northNodePacket.licenses.map((license) => license.licenseId),
  [
    "scene-license/aspect/moon-conjunction-north-node/v1",
    "scene-license/house/4/v1",
    "scene-license/transit-sign/moon-virgo/v1"
  ]
);
assert.ok(northNodePacket.permissions.domains.home);
assert.ok(northNodePacket.permissions.domains["private life"]);
assert.ok(northNodePacket.permissions.roles["family member"]);
assert.ok(northNodePacket.permissions.actions["notice an unfamiliar possibility"]);
assert.ok(northNodePacket.permissions.actions["return attention to a plan they have barely admitted they want"]);
assert.ok(northNodePacket.permissions.behaviors[
  "treat a temporary emotional opening as information rather than a decision"
]);
assert.deepEqual(northNodePacket.writerBoundary.causalGuards, []);
assert.deepEqual(northNodePacket.writerBoundary.disallowedInferences, []);

const northNodeNoHousePacket = compileSceneContext(
  { ...northNodeContext, transitHouse: null, natalHouse: null, housesReliable: false },
  { mode: "production", registry }
);
assert.ok(!northNodeNoHousePacket.licenses.some((license) => license.licenseId.includes("house/4")));
assert.equal(northNodeNoHousePacket.permissions.domains.home, undefined);
assert.equal(northNodeNoHousePacket.permissions.settings.home, undefined);
assert.equal(northNodeNoHousePacket.canGenerateContextualCandidate, true);

const northNodeSquareHouse4Packet = compileSceneContext(
  { ...northNodeContext, aspect: "square", aspectGroup: "square" },
  { mode: "production", registry }
);
assert.ok(northNodeSquareHouse4Packet.licenses.some((license) => license.licenseId === "scene-license/house/4/v1"));
assert.ok(northNodeSquareHouse4Packet.permissions.domains.home);
assert.ok(northNodeSquareHouse4Packet.permissions.roles["family member"]);
assert.equal(northNodeSquareHouse4Packet.canGenerateContextualCandidate, false);

const neptuneHouse4Packet = compileSceneContext(
  { ...context, transitHouse: 4, natalHouse: 11 },
  { mode: "production", registry }
);
assert.ok(neptuneHouse4Packet.licenses.some((license) => license.licenseId === "scene-license/house/4/v1"));
assert.ok(neptuneHouse4Packet.permissions.domains.home);

const exactMechanism = getApprovedLlMechanism(context);
assert.equal(exactMechanism.sourceId, "ll:moon|conjunction|neptune");
assert.equal(exactMechanism.sourceApproval, "approved");

const reviewPacket = compileSceneContext(context, { mode: "review", registry: pendingRegistry });
assert.equal(reviewPacket.status, "UNAPPROVED");
assert.equal(reviewPacket.servingEligible, false);
assert.equal(reviewPacket.aspectGrammar.id, "conjunction-saturation");
assert.equal(reviewPacket.licenses.length, 0);
assert.equal(reviewPacket.reviewLicenses.length, 4);
assert.equal(reviewPacket.canGenerateContextualCandidate, false);
assert.equal(reviewPacket.requiresOwnerLicenseApproval, true);
assert.equal(reviewPacket.fallback.selected, "approved-base-aspect-target-card");
assert.equal(reviewPacket.fallback.mayUseAspectHouseFallback, false);
assert.equal(reviewPacket.permissions.roles.coworker, undefined);
assert.equal(reviewPacket.permissions.actions["notice another person's mood"], undefined);
assert.equal(reviewPacket.permissions.actions["check details"], undefined);
assert.equal(reviewPacket.permissions.actions["make a professional decision"], undefined);
assert.equal(reviewPacket.permissions.objects.message, undefined);
assert.equal(reviewPacket.permissions.objects.presentation, undefined);
assert.equal(reviewPacket.writerBoundary.enabled, false);
assert.equal(reviewPacket.writerBoundary.allowed.roles.length, 0);
assert.ok(reviewPacket.writerBoundary.doNotInvent.objects.includes("message"));
assert.ok(reviewPacket.writerBoundary.doNotInvent.objects.includes("presentation"));
assert.equal(reviewPacket.writerBoundary.outputContract.approvalStatus, "UNAPPROVED");

const productionPacket = compileSceneContext(context, { mode: "production", registry: pendingRegistry });
assert.equal(productionPacket.licenses.length, 0);
assert.equal(productionPacket.hasContextualPermissions, false);
assert.equal(productionPacket.canGenerateContextualCandidate, false);
assert.equal(productionPacket.writerBoundary.enabled, false);
assert.equal(productionPacket.fallback.selected, "approved-base-aspect-target-card");

const approvedRegistry = structuredClone(registry);
const approvedPacket = compileSceneContext(context, { mode: "production", registry: approvedRegistry });
assert.equal(approvedPacket.licenses.length, 4);
assert.equal(approvedPacket.reviewLicenses.length, 0);
assert.equal(approvedPacket.canGenerateContextualCandidate, true);
assert.equal(approvedPacket.writerBoundary.enabled, true);
assert.equal(approvedPacket.permissions.roles.coworker, undefined);
assert.ok(approvedPacket.permissions.roles["manager / authority figure"]);
assert.ok(approvedPacket.permissions.settings["work that can be evaluated publicly or professionally"]);
assert.ok(approvedPacket.permissions.actions["notice another person's mood"]);
assert.ok(approvedPacket.permissions.actions["form an explanation before the other person has explained what happened"]);
assert.ok(approvedPacket.permissions.actions["check details"]);
assert.equal(approvedPacket.permissions.actions["make a professional decision"], undefined);
assert.ok(approvedPacket.permissions.behaviors["absorb another person's mood as their own"]);
assert.ok(approvedPacket.permissions.consequences["confusion about which feelings belong to them"]);
assert.ok(approvedPacket.writerBoundary.allowed.roles.some((entry) => entry.value === "manager / authority figure"));
assert.deepEqual(
  approvedPacket.permissions.actions["manage a schedule"].sourceIds,
  ["owner-doctrine:daily-glance-scene-license-ruling-2026-08-11"]
);

const noHousePacket = compileSceneContext(contextWithoutHouses, { mode: "production", registry: approvedRegistry });
assert.ok(noHousePacket.licenses.every((license) => !license.applicationRoles.includes("trigger-house") && !license.applicationRoles.includes("affected-house")));
assert.equal(noHousePacket.permissions.roles.coworker, undefined);
assert.equal(noHousePacket.permissions.roles["manager / authority figure"], undefined);
assert.ok(noHousePacket.permissions.actions["check details"]);

const squareContext = selectDailyGlanceChartContext(
  { longitude: 86, sign: "Virgo", house: 6 },
  [{ planet: "Neptune", longitude: 0, sign: "Capricorn", house: 10 }],
  6,
  true
);
assert.equal(squareContext.aspect, "square");
assert.equal(getApprovedLlMechanism(squareContext), null, "The unapproved LL square row must grant zero executable meaning.");
const squarePacket = compileSceneContext(squareContext, { mode: "production", registry: approvedRegistry });
assert.equal(squarePacket.mechanism.provenanceTier, "base-card-only");
assert.match(squarePacket.mechanism.reason, /Pair mechanism .* is draft/u);
assert.equal(squarePacket.canGenerateContextualCandidate, false);
assert.equal(squarePacket.aspectGrammar.id, "square-self-friction");

const cleanCandidate = {
  headline: "Someone else's mood changes the workday.",
  body: "You notice someone else's mood, then form an explanation before the other person has explained what happened.",
  specificityClaims: [
    { semanticClass: "domains", value: "daily work", sourceIds: ["owner-doctrine:daily-glance-scene-license-ruling-2026-08-11"] },
    { semanticClass: "actions", value: "notice another person's mood", sourceIds: ["owner-doctrine:daily-glance-scene-license-ruling-2026-08-11"] },
    { semanticClass: "actions", value: "check details", sourceIds: ["owner-doctrine:daily-glance-scene-license-ruling-2026-08-11"] },
    { semanticClass: "actions", value: "form an explanation before the other person has explained what happened", sourceIds: ["owner-doctrine:daily-glance-scene-license-ruling-2026-08-11"] }
  ]
};
const cleanLint = validateSpecificityCandidate(cleanCandidate, approvedPacket, { registry: approvedRegistry });
assert.equal(cleanLint.passed, true, JSON.stringify(cleanLint.failures));

const neptunePilotCandidates = [
  {
    headline: "You read a manager's mood as criticism of your work.",
    body: "You notice your manager's mood while managing the schedule and start checking every detail as if your work is being judged. You may feel responsible for correcting a problem before your manager has said there is one. You do not know yet. You keep checking the same details, leaving less time to manage the appointment that still needs your attention. Wait for your manager's explanation before changing the schedule."
  },
  {
    headline: "You start fixing a problem no one has named.",
    body: "You notice your manager seems off and start rearranging the day's schedule before they explain what happened. You may treat that mood as your own, so you check every detail and push aside work that will be evaluated. You still do not know what happened. Before you change the schedule again, ask your manager what actually needs attention."
  },
  {
    headline: "You respond to an unexplained mood by doing extra work.",
    body: "You notice your manager's mood while managing the schedule and start treating it as a problem with your work. You may absorb the mood as your own, then lose time checking details instead of finishing the work your manager will evaluate. You still have no explanation. Only change the schedule after your manager explains what happened."
  }
];
for (const candidate of neptunePilotCandidates) {
  const result = validateSpecificityCandidate(candidate, approvedPacket, { registry: approvedRegistry });
  assert.equal(result.passed, true, JSON.stringify(result.failures));
}

const unsupportedKnown = validateSpecificityCandidate({
  headline: "The presentation starts to look wrong.",
  body: "You reopen the slides before anyone identifies a problem.",
  specificityClaims: []
}, approvedPacket, { registry: approvedRegistry });
assert.equal(unsupportedKnown.passed, false);
assert.ok(unsupportedKnown.unsupportedRecognized.some((entry) => entry.value === "presentation"));

const unsupportedOmitted = validateSpecificityCandidate({
  headline: "You question the message.",
  body: "You reread the email even though the writer declared no concrete claim.",
  specificityClaims: []
}, approvedPacket, { registry: approvedRegistry });
assert.equal(unsupportedOmitted.passed, false, "Omitting specificityClaims must not allow an unsupported object through.");
assert.ok(unsupportedOmitted.unsupportedRecognized.some((entry) => entry.value === "message"));

const unsupportedUnknown = validateSpecificityCandidate({
  headline: "The work starts to look wrong.",
  body: "You reopen a quarterly deck before anyone identifies a problem.",
  specificityClaims: []
}, approvedPacket, { registry: approvedRegistry });
assert.equal(unsupportedUnknown.passed, false);
assert.ok(unsupportedUnknown.unknownConcretePhrases.includes("deck"));

const invalidApproval = structuredClone(registry);
invalidApproval.licenses[0].approval.ownerApproved = false;
const invalidApprovalResult = validateLicenseRegistry(invalidApproval);
assert.equal(invalidApprovalResult.passed, false);
assert.ok(invalidApprovalResult.errors.some((error) => error.includes("cannot be writerEligible")));

const invalidRender = structuredClone(registry);
invalidRender.licenses[0].approval.renderEligible = true;
const invalidRenderResult = validateLicenseRegistry(invalidRender);
assert.equal(invalidRenderResult.passed, false);
assert.ok(invalidRenderResult.errors.some((error) => error.includes("must remain render-ineligible")));

const uncitedNormalization = structuredClone(registry);
const uncitedGrant = uncitedNormalization.licenses
  .find((license) => license.licenseId === "scene-license/house/6/v1")
  .provenance.find((grant) => grant.value === "manage a schedule");
uncitedGrant.sourceIds = ["ll:6th house"];
const uncitedNormalizationResult = validateLicenseRegistry(uncitedNormalization);
assert.equal(uncitedNormalizationResult.passed, false);
assert.ok(uncitedNormalizationResult.errors.some((error) => error.includes("must cite an owner-doctrine source ID")));

const falseVerbatimGrant = structuredClone(registry);
const falseVerbatim = falseVerbatimGrant.licenses
  .find((license) => license.licenseId === "scene-license/house/6/v1")
  .provenance.find((grant) => grant.value === "manage a schedule");
falseVerbatim.grantType = "verbatim";
falseVerbatim.sourceIds = ["ll:6th house"];
const falseVerbatimResult = validateLicenseRegistry(falseVerbatimGrant);
assert.equal(falseVerbatimResult.passed, false);
assert.ok(falseVerbatimResult.errors.some((error) => error.includes("is not literal in its cited matrix evidence")));

const driftedOwnerDoctrine = structuredClone(registry);
driftedOwnerDoctrine.authoritySources[0].verificationText = "this approval text does not exist";
const driftedOwnerDoctrineResult = validateLicenseRegistry(driftedOwnerDoctrine);
assert.equal(driftedOwnerDoctrineResult.passed, false);
assert.ok(driftedOwnerDoctrineResult.errors.some((error) => error.includes("verification text drifted")));

const aspectRoleLeak = structuredClone(registry);
const aspectRoleLicense = aspectRoleLeak.licenses.find((license) => license.scope.type === "aspect");
aspectRoleLicense.normalizedMeaning.roles.push("coworker");
aspectRoleLicense.provenance.push({
  semanticClass: "roles",
  value: "coworker",
  grantType: "normalized, owner-reviewed",
  scopeRole: "mechanism",
  sourceIds: ["owner-doctrine:daily-glance-scene-license-ruling-2026-08-11"]
});
const aspectRoleLeakResult = validateLicenseRegistry(aspectRoleLeak);
assert.equal(aspectRoleLeakResult.passed, false);
assert.ok(aspectRoleLeakResult.errors.some((error) => error.includes("cannot carry roles")));

const houseMechanismLeak = structuredClone(registry);
const houseMechanismLicense = houseMechanismLeak.licenses.find((license) => license.scope.house === 6);
houseMechanismLicense.normalizedMeaning.behaviors.push("absorb another person's mood as their own");
houseMechanismLicense.provenance.push({
  semanticClass: "behaviors",
  value: "absorb another person's mood as their own",
  grantType: "normalized, owner-reviewed",
  scopeRole: "arena",
  sourceIds: ["owner-doctrine:daily-glance-scene-license-ruling-2026-08-11"]
});
const houseMechanismLeakResult = validateLicenseRegistry(houseMechanismLeak);
assert.equal(houseMechanismLeakResult.passed, false);
assert.ok(houseMechanismLeakResult.errors.some((error) => error.includes("cannot carry behaviors")));

const signDomainLeak = structuredClone(registry);
const signDomainLicense = signDomainLeak.licenses.find((license) => license.scope.type === "transit-sign");
signDomainLicense.normalizedMeaning.domains.push("daily work");
signDomainLicense.provenance.push({
  semanticClass: "domains",
  value: "daily work",
  grantType: "normalized, owner-reviewed",
  scopeRole: "manner",
  sourceIds: ["owner-doctrine:daily-glance-scene-license-ruling-2026-08-11"]
});
const signDomainLeakResult = validateLicenseRegistry(signDomainLeak);
assert.equal(signDomainLeakResult.passed, false);
assert.ok(signDomainLeakResult.errors.some((error) => error.includes("cannot carry domains")));

const aspectContextGuardLeak = structuredClone(registry);
aspectContextGuardLeak.licenses
  .find((license) => license.scope.type === "aspect")
  .scope.contextGuard = { transitPlanet: "moon", aspect: "conjunction", natalPoint: "neptune" };
const aspectContextGuardLeakResult = validateLicenseRegistry(aspectContextGuardLeak);
assert.equal(aspectContextGuardLeakResult.passed, false);
assert.ok(aspectContextGuardLeakResult.errors.some((error) => error.includes("contextGuard only to narrow a house arena")));

const missingCausalGuard = structuredClone(registry);
missingCausalGuard.licenses
  .find((license) => license.licenseId === "scene-license/house/4/v1")
  .scope.contextGuard = { transitPlanet: "moon", aspect: "conjunction", natalPoint: "north-node" };
const missingCausalGuardResult = validateLicenseRegistry(missingCausalGuard);
assert.equal(missingCausalGuardResult.passed, false);
assert.ok(missingCausalGuardResult.errors.some((error) => error.includes("must carry a causal guard")));

const supportingReferencePromotion = structuredClone(registry);
supportingReferencePromotion.licenses
  .find((license) => license.licenseId === "scene-license/aspect/moon-conjunction-north-node/v1")
  .provenance[0].sourceIds = ["authored:transit-aspect/moon/north-node/conjunction"];
const supportingReferencePromotionResult = validateLicenseRegistry(supportingReferencePromotion);
assert.equal(supportingReferencePromotionResult.passed, false);
assert.ok(supportingReferencePromotionResult.errors.some((error) => error.includes("cites supporting-only reference")));

const invalidEvidenceRole = structuredClone(registry);
invalidEvidenceRole.licenses
  .find((license) => license.licenseId === "scene-license/aspect/moon-conjunction-north-node/v1")
  .evidence[0].evidenceRole = "executable-ish";
const invalidEvidenceRoleResult = validateLicenseRegistry(invalidEvidenceRole);
assert.equal(invalidEvidenceRoleResult.passed, false);
assert.ok(invalidEvidenceRoleResult.errors.some((error) => error.includes("unsupported evidence role")));

const contextDir = fs.mkdtempSync(path.join(os.tmpdir(), "daily-glance-scene-context-"));
fs.writeFileSync(path.join(contextDir, "conjunction-neptune.context.json"), `${JSON.stringify(context)}\n`);
assert.throws(
  () => loadWriterSceneContextForKey("conjunction/neptune", contextDir, { registry: pendingRegistry }),
  /SCENE_LICENSE_APPROVAL_REQUIRED/u
);
const loadedApproved = loadWriterSceneContextForKey("conjunction/neptune", contextDir, { registry: approvedRegistry });
assert.equal(loadedApproved.packet.canGenerateContextualCandidate, true);
assert.throws(
  () => loadWriterSceneContextForKey("square/neptune", contextDir, { registry: approvedRegistry }),
  /SCENE_CONTEXT_REQUIRED/u
);

console.log("daily-glance chart-context, scene-license governance, and specificity provenance checks passed");
