#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  auditSkyCalendarTwoPartCards,
  composeSkyCalendarTwoPartCard,
  loadLiveSkyReaderBodies,
  loadSkyCalendarComponentRegistry,
} from "./sky-calendar-two-part-composer.mjs";

const root = process.cwd();
const registry = loadSkyCalendarComponentRegistry();
const plans = JSON.parse(fs.readFileSync(path.join(
  root,
  "packages/astro-knowledge/review/sky-calendar-two-part-composer-v1/worked-card-plans.json",
), "utf8"));

assert.equal(plans.cards.length, 6);
assert.throws(
  () => composeSkyCalendarTwoPartCard(registry, plans.cards[0]),
  /component approval is incomplete; composer fails closed/u,
  "Production mode must reject PENDING OWNER components",
);

const cards = plans.cards.map((plan) => composeSkyCalendarTwoPartCard(registry, plan, {
  reviewMode: true,
}));

const ownerApprovedShape = {
  contentKey: "owner-approved-calendar-two-part-shape",
  componentApprovalComplete: false,
  componentProseForGate: [],
  forecast: "someone may want their effort recognized while the answer coming back is that the same rule applies to everyone. That can turn a quiet frustration into a direct disagreement about credit, exceptions, or what the policy actually covers. Neither side is likely to back down quickly. What can change is the agreement: what counts, who gets recognized, and which rule applies here.",
  forecastBeats: {
    whatMayHappen: "someone may want their effort recognized while the answer coming back is that the same rule applies to everyone.",
    whatItTurnsInto: "That can turn a quiet frustration into a direct disagreement about credit, exceptions, or what the policy actually covers.",
    howItBehaves: "Neither side is likely to back down quickly.",
    whatCanMove: "What can change is the agreement: what counts, who gets recognized, and which rule applies here.",
  },
  detailsTransitLabel: "Sun in Leo opposite Saturn in Aquarius.",
  details: "Sun in Leo opposite Saturn in Aquarius. Someone may want their contribution recognized while the answer coming back is that the same rule applies to everyone. The Sun in Leo puts more weight on individual contribution and recognition, while Saturn in Aquarius holds to the standard meant to apply across the group. The opposition makes both positions difficult to ignore, and because both signs are fixed, neither side is likely to give way quickly. What can move is the agreement itself: what counts, who gets recognized, and which rule applies here.",
  detailsBeats: {
    whatMayHappen: "Someone may want their contribution recognized while the answer coming back is that the same rule applies to everyone.",
    whyItMatters: "The Sun in Leo puts more weight on individual contribution and recognition, while Saturn in Aquarius holds to the standard meant to apply across the group.",
    whyItSticksOrMoves: "The opposition makes both positions difficult to ignore, and because both signs are fixed, neither side is likely to give way quickly.",
    whatCanMove: "What can move is the agreement itself: what counts, who gets recognized, and which rule applies here.",
  },
};
const ownerApprovedShapeReport = auditSkyCalendarTwoPartCards([ownerApprovedShape]);
assert.equal(
  ownerApprovedShapeReport.pass,
  true,
  `The owner's approved shape must pass every deterministic gate: ${JSON.stringify(ownerApprovedShapeReport.cardReports, null, 2)}`,
);

const report = auditSkyCalendarTwoPartCards(cards, {
  baselineBodies: loadLiveSkyReaderBodies(root),
});
assert.equal(report.pass, true, JSON.stringify(report.cardReports, null, 2));
assert.equal(report.servingEligible, false);
assert.equal(report.cardReports.every((result) => result.expectedGovernanceBlock === "components_pending_owner"), true);
assert.equal(new Set(cards.map((card) => card.inputs.aspect)).size, 5, "Worked cards must span all five LIVE aspects");
assert.ok(cards.some((card) => card.classification === "overlap_pair"));
assert.ok(cards.some((card) => card.classification.includes("friction")));
assert.equal(cards.every((card) => /^[a-z]/u.test(card.forecast)), true);
assert.equal(cards.every((card) => card.generationAllowed === false), true);

const sceneMenuCard = structuredClone(cards[0]);
sceneMenuCard.forecast = sceneMenuCard.forecast.replace(
  /^[^.]+\./u,
  "a payment plan stretches, a school cancels a class, or an office changes a shift.",
);
sceneMenuCard.forecastBeats.whatMayHappen = "a payment plan stretches, a school cancels a class, or an office changes a shift.";
const sceneMenuReport = auditSkyCalendarTwoPartCards([sceneMenuCard]);
assert.equal(sceneMenuReport.pass, false);
assert.ok(sceneMenuReport.cardReports[0].defects.some((defect) => defect.code === "alternative_scene_menu"));

const synonymFacetCard = structuredClone(cards[0]);
synonymFacetCard.forecast = synonymFacetCard.forecast.replace(
  /^[^.]+\./u,
  "someone may ask what counts, what the rule covers, or where an exception begins.",
);
synonymFacetCard.forecastBeats.whatMayHappen = "someone may ask what counts, what the rule covers, or where an exception begins.";
const synonymFacetReport = auditSkyCalendarTwoPartCards([synonymFacetCard]);
assert.equal(
  synonymFacetReport.cardReports[0].defects.some((defect) => defect.code === "alternative_scene_menu"),
  false,
  "Facets of one policy question are not alternative scenes",
);

const secondPersonCard = structuredClone(cards[0]);
secondPersonCard.forecast = secondPersonCard.forecast.replace("someone may", "you may");
secondPersonCard.forecastBeats.whatMayHappen = secondPersonCard.forecastBeats.whatMayHappen.replace("someone may", "you may");
const secondPersonReport = auditSkyCalendarTwoPartCards([secondPersonCard]);
assert.ok(secondPersonReport.cardReports[0].defects.some((defect) => defect.code === "second_person_register"));

const detachableFormulaCard = structuredClone(cards[0]);
detachableFormulaCard.details = detachableFormulaCard.details.replace(
  detachableFormulaCard.detailsBeats.whyItSticksOrMoves,
  "The opposition places both concerns in full view.",
);
detachableFormulaCard.detailsBeats.whyItSticksOrMoves = "The opposition places both concerns in full view.";
const detachableFormulaReport = auditSkyCalendarTwoPartCards([detachableFormulaCard]);
assert.ok(detachableFormulaReport.cardReports[0].defects.some((defect) => defect.code === "detachable_aspect_formula"));

const personifiedPlanetCard = structuredClone(cards[0]);
personifiedPlanetCard.details = personifiedPlanetCard.details.replace(
  personifiedPlanetCard.detailsBeats.whyItMatters,
  "The Sun in Leo wants recognition, while Saturn in Aquarius refuses exceptions.",
);
personifiedPlanetCard.detailsBeats.whyItMatters = "The Sun in Leo wants recognition, while Saturn in Aquarius refuses exceptions.";
const personifiedPlanetReport = auditSkyCalendarTwoPartCards([personifiedPlanetCard]);
assert.ok(personifiedPlanetReport.cardReports[0].defects.some((defect) => defect.code === "planet_narrated_as_character"));

console.log(`Sky Calendar two-part composer: PASS (${cards.length} worked cards, ${report.baselineBodyCount} LIVE bodies checked)`);
