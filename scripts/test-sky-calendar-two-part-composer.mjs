#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  ASPECT_ARGUMENT_SHAPES,
  auditSkyCalendarTwoPartCards,
  composeSkyCalendarTwoPartCard,
  loadLiveSkyReaderBodies,
  loadSkyCalendarComponentRegistry,
} from "./sky-calendar-two-part-composer.mjs";

const root = process.cwd();
const registry = loadSkyCalendarComponentRegistry();
const plans = JSON.parse(fs.readFileSync(path.join(
  root,
  "packages/astro-knowledge/review/sky-calendar-two-part-composer-v2/worked-card-plans.json",
), "utf8"));
const workedArtifact = JSON.parse(fs.readFileSync(path.join(
  root,
  "packages/astro-knowledge/review/sky-calendar-two-part-composer-v2/worked-cards.json",
), "utf8"));

assert.equal(plans.schema, "tldr.sky-calendar.two-part.worked-card-plans.v2");
assert.equal(plans.cards.length, 6);
assert.throws(
  () => composeSkyCalendarTwoPartCard(registry, plans.cards[0]),
  /component approval is incomplete; composer fails closed/u,
  "Production mode must reject PENDING OWNER components",
);

const allShadowTrineRegistry = structuredClone(registry);
const allShadowTrinePlan = plans.cards.find((card) => card.input.aspect === "trine");
const allShadowPlacementKey = `sky-sign/${allShadowTrinePlan.input.planetA}/${allShadowTrinePlan.input.signA}`;
const allShadowPlacement = allShadowTrineRegistry.signUnits.find((unit) => unit.key === allShadowPlacementKey);
allShadowPlacement.supportive_realizations = [];
allShadowPlacement.neutral_realizations = [];
assert.ok(allShadowPlacement.shadow_realizations.length > 0, "The trine regression fixture must remain all-shadow");
assert.throws(
  () => composeSkyCalendarTwoPartCard(allShadowTrineRegistry, allShadowTrinePlan, { reviewMode: true }),
  (error) => (
    error.code === "sky-calendar-missing-required-realization"
    && error.gaps?.some((gap) => (
      gap.id === "sky-calendar-missing-required-realization"
      && gap.componentSlot === "placementA"
      && gap.componentKey === allShadowPlacementKey
      && gap.requiredType === "supportive"
      && gap.availableTypes.includes("shadow")
    ))
  ),
  "The composer must record a named gap and emit no trine when a selected component is all-shadow",
);

const missingSituation = structuredClone(plans.cards[0]);
delete missingSituation.causalSituation.practicalConsequence;
assert.throws(
  () => composeSkyCalendarTwoPartCard(registry, missingSituation, { reviewMode: true }),
  /causalSituation\.practicalConsequence is required/u,
  "Prose cannot bypass the causal-situation layer",
);

const planResolution = plans.cards.map((plan) => {
  try {
    return {
      contentKey: plan.contentKey,
      card: composeSkyCalendarTwoPartCard(registry, plan, { reviewMode: true }),
      gaps: [],
    };
  } catch (error) {
    if (error.code !== "sky-calendar-missing-required-realization") throw error;
    return { contentKey: plan.contentKey, card: null, gaps: error.gaps };
  }
});
assert.equal(planResolution.filter((result) => result.card).length, 2);
assert.equal(planResolution.filter((result) => result.gaps.length > 0).length, 4);
assert.equal(
  planResolution.filter((result) => result.gaps.length > 0).every((result) => (
    result.gaps.every((gap) => gap.id === "sky-calendar-missing-required-realization")
  )),
  true,
);

assert.equal(workedArtifact.schema, "tldr.sky-calendar.two-part.worked-cards.v2");
const componentIndex = new Map([
  ...registry.signUnits,
  ...registry.aspectMechanisms,
  ...registry.modalityUnits,
  ...registry.elementUnits,
].map((unit) => [unit.key, unit]));
const cards = workedArtifact.cards.map((card) => ({
  ...card,
  componentProseForGate: Object.values(card.inputs.componentKeys)
    .filter(Boolean)
    .flatMap((key) => {
      const unit = componentIndex.get(key);
      return Object.entries(unit ?? {}).flatMap(([field, value]) => {
        if (["key", "source_ids", "source_hashes", "owner_review_status"].includes(field)) return [];
        if (typeof value === "string") return [value];
        if (Array.isArray(value)) return value.filter((item) => typeof item === "string");
        return [];
      });
    }),
}));

const ownerApprovedShape = {
  contentKey: "owner-approved-calendar-two-part-shape",
  componentApprovalComplete: false,
  componentProseForGate: [],
  entryMode: "person_and_action",
  closingFunction: "practical_distinction",
  inputs: {
    placements: [{ planet: "sun", sign: "leo" }, { planet: "saturn", sign: "aquarius" }],
    aspect: "opposition",
  },
  forecast: "someone may want their effort recognized while the answer coming back is that the same rule applies to everyone. That can turn a quiet frustration into a direct disagreement about credit, exceptions, or what the policy actually covers. Neither side is likely to back down quickly. What can change is the agreement: what counts, who gets recognized, and which rule applies here.",
  forecastBeats: {
    whatMayHappen: [0],
    whatItTurnsInto: [1],
    howItBehaves: [2],
    whatCanMove: [3],
  },
  detailsTransitLabel: "Sun in Leo opposite Saturn in Aquarius.",
  details: "Sun in Leo opposite Saturn in Aquarius. Someone may want their contribution recognized while the answer coming back is that the same rule applies to everyone. The Sun in Leo puts more weight on individual contribution and recognition, while Saturn in Aquarius holds to the standard meant to apply across the group. The opposition makes both positions difficult to ignore, and because both signs are fixed, pressure alone is unlikely to change either side.",
  detailsSentences: [
    { text: "Someone may want their contribution recognized while the answer coming back is that the same rule applies to everyone.", beats: ["whatMayHappen"] },
    { text: "The Sun in Leo puts more weight on individual contribution and recognition, while Saturn in Aquarius holds to the standard meant to apply across the group.", beats: ["whyItMatters"] },
    { text: "The opposition makes both positions difficult to ignore, and because both signs are fixed, pressure alone is unlikely to change either side.", beats: ["whyItSticksOrMoves"] },
  ],
  detailsBeats: { whatMayHappen: [0], whyItMatters: [1], whyItSticksOrMoves: [2] },
};
const ownerApprovedShapeReport = auditSkyCalendarTwoPartCards([ownerApprovedShape]);
assert.equal(
  ownerApprovedShapeReport.pass,
  true,
  `The owner's corrected shape must pass every deterministic gate: ${JSON.stringify(ownerApprovedShapeReport, null, 2)}`,
);

const report = auditSkyCalendarTwoPartCards(cards, {
  baselineBodies: loadLiveSkyReaderBodies(root),
});
assert.equal(report.pass, true, JSON.stringify(report, null, 2));
assert.equal(report.servingEligible, false);
assert.equal(report.batchShapeCap, 2);
assert.equal(report.batchDefects.length, 0);
assert.equal(report.cardReports.every((result) => result.expectedGovernanceBlock === "components_pending_owner"), true);
assert.equal(Math.max(...Object.values(report.shapeDistribution.openerFamilies)), 2);
assert.equal(Math.max(...Object.values(report.shapeDistribution.closingFamilies)), 2);
assert.equal(Math.max(...Object.values(report.shapeDistribution.entryModes)), 2);
assert.deepEqual(report.shapeDistribution.colonThreeItemLists, {});
assert.equal(new Set(cards.map((card) => card.inputs.aspect)).size, 5, "Worked cards must span all five LIVE aspects");
assert.deepEqual(new Set(cards.map((card) => card.argumentShape.aspect)), new Set(Object.keys(ASPECT_ARGUMENT_SHAPES)));
assert.ok(cards.some((card) => card.classification === "overlap_pair"));
assert.ok(cards.some((card) => card.classification.includes("friction")));
assert.equal(cards.every((card) => /^[a-z]/u.test(card.forecast)), true);
assert.equal(cards.every((card) => card.generationAllowed === false), true);
assert.equal(cards.every((card) => card.forecastSentences.length >= 2 && card.forecastSentences.length <= 5), true);
assert.equal(cards.every((card) => !Object.hasOwn(card.detailsBeats, "whatCanMove")), true);
assert.equal(cards.every((card) => Object.keys(card.causalSituation).length === 5), true);
assert.equal(cards.every((card) => Object.keys(card.inputs.realizationSelections).length >= 3), true);
assert.equal(cards.every((card) => Object.values(card.inputs.realizationSelections).every((selection) => (
  ["supportive", "neutral", "shadow"].includes(selection.type) && typeof selection.value === "string"
))), true);

const repeatedShapeCards = cards.slice(0, 3).map((card, index) => ({
  ...structuredClone(card),
  contentKey: `repeated-shape-${index}`,
  entryMode: "person_and_action",
  closingFunction: "practical_distinction",
  forecast: `someone asks for version ${index + 1} of the same rule. The useful question is which term applies to version ${index + 1}.`,
  forecastBeats: { whatMayHappen: [0], whatItTurnsInto: [0], howItBehaves: [1], whatCanMove: [1] },
}));
const repeatedShapeReport = auditSkyCalendarTwoPartCards(repeatedShapeCards);
assert.ok(repeatedShapeReport.batchDefects.some((defect) => defect.code === "opener_family_batch_cap"));
assert.ok(repeatedShapeReport.batchDefects.some((defect) => defect.code === "closing_family_batch_cap"));
assert.ok(repeatedShapeReport.batchDefects.some((defect) => defect.code === "entry_mode_batch_cap"));

const sceneMenuCard = structuredClone(cards[0]);
sceneMenuCard.forecast = sceneMenuCard.forecast.replace(
  /^[^.]+\./u,
  "a payment plan stretches, a school cancels a class, or an office changes a shift.",
);
const sceneMenuReport = auditSkyCalendarTwoPartCards([sceneMenuCard]);
assert.ok(sceneMenuReport.cardReports[0].defects.some((defect) => defect.code === "alternative_scene_menu"));

const synonymFacetCard = structuredClone(cards[0]);
synonymFacetCard.forecast = synonymFacetCard.forecast.replace(
  /^[^.]+\./u,
  "someone asks what counts, what the rule covers, or where an exception begins.",
);
const synonymFacetReport = auditSkyCalendarTwoPartCards([synonymFacetCard]);
assert.equal(
  synonymFacetReport.cardReports[0].defects.some((defect) => defect.code === "alternative_scene_menu"),
  false,
  "Facets of one policy question are not alternative scenes",
);

const secondPersonCard = structuredClone(cards[0]);
secondPersonCard.forecast = secondPersonCard.forecast.replace("someone asks", "you ask");
const secondPersonReport = auditSkyCalendarTwoPartCards([secondPersonCard]);
assert.ok(secondPersonReport.cardReports[0].defects.some((defect) => defect.code === "second_person_register"));

const genericPeopleCard = structuredClone(cards[0]);
genericPeopleCard.forecast = genericPeopleCard.forecast.replace("someone asks", "people ask");
const genericPeopleReport = auditSkyCalendarTwoPartCards([genericPeopleCard]);
assert.ok(genericPeopleReport.cardReports[0].defects.some((defect) => defect.code === "generic_people"));

const vagueCapacityCard = structuredClone(cards[0]);
vagueCapacityCard.forecast = vagueCapacityCard.forecast.replace("their work", "their capacity");
const vagueCapacityReport = auditSkyCalendarTwoPartCards([vagueCapacityCard]);
assert.ok(vagueCapacityReport.cardReports[0].defects.some((defect) => defect.code === "vague_capacity"));

const repeatedDetailsCard = structuredClone(cards[0]);
repeatedDetailsCard.detailsSentences[0].text = repeatedDetailsCard.forecastSentences[0].text;
repeatedDetailsCard.details = [
  repeatedDetailsCard.detailsTransitLabel,
  ...repeatedDetailsCard.detailsSentences.map((sentence) => sentence.text),
].join(" ");
const repeatedDetailsReport = auditSkyCalendarTwoPartCards([repeatedDetailsCard]);
assert.ok(repeatedDetailsReport.cardReports[0].defects.some((defect) => defect.code === "details_paraphrases_forecast"));

const detachableFormulaCard = structuredClone(cards[0]);
detachableFormulaCard.details = detachableFormulaCard.details.replace(
  detachableFormulaCard.detailsSentences[2].text,
  "The opposition places both concerns in full view.",
);
detachableFormulaCard.detailsSentences[2].text = "The opposition places both concerns in full view.";
const detachableFormulaReport = auditSkyCalendarTwoPartCards([detachableFormulaCard]);
assert.ok(detachableFormulaReport.cardReports[0].defects.some((defect) => defect.code === "detachable_aspect_formula"));

const personifiedPlanetCard = structuredClone(cards[0]);
personifiedPlanetCard.details = personifiedPlanetCard.details.replace(
  personifiedPlanetCard.detailsSentences[1].text,
  "The Sun in Leo wants recognition, while Saturn in Aquarius refuses exceptions.",
);
personifiedPlanetCard.detailsSentences[1].text = "The Sun in Leo wants recognition, while Saturn in Aquarius refuses exceptions.";
const personifiedPlanetReport = auditSkyCalendarTwoPartCards([personifiedPlanetCard]);
assert.ok(personifiedPlanetReport.cardReports[0].defects.some((defect) => defect.code === "planet_narrated_as_character"));

console.log(`Sky Calendar Aspect Composer v2: PASS (${cards.length} worked cards, ${report.baselineBodyCount} LIVE bodies checked)`);
