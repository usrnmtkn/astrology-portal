import assert from "node:assert/strict";
import fs from "node:fs";
import {
  askTldrFocusSelectors,
  buildAskTldrAnswerPacket,
  compileEvergreenAskPlan,
  compileFreeTextAskPlan,
  rankAskTldrEvidence
} from "../api/_lib/ask-tldr-model.ts";

const readJson = (relativePath) => JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), "utf8"));
const model = readJson("../packages/astro-knowledge/data/questions/ask-tldr-answer-model-v1.json");
const career = readJson("../packages/astro-knowledge/data/questions/ask-tldr-question-taxonomy-v1/career.json");

assert.equal(model.status, "needs_review");
assert.equal(model.ownerApproved, false);
assert.equal(model.promotionAuthorized, false);
assert.equal(model.runtimeEnabled, false);
assert.deepEqual(askTldrFocusSelectors(["Midheaven / 10th-ruler / Sun transits", "6th-10th house links"]), {
  houses: [10, 6],
  points: ["Sun"],
  angles: ["Midheaven"]
});

const recognition = career.questions.find((question) => question.id === "career.recognition");
assert.ok(recognition);
const recognitionPlan = compileEvergreenAskPlan({ model, pillar: career, question: recognition });
assert.equal(recognitionPlan.pillarId, "career");
assert.equal(recognitionPlan.primaryIntent, "recognition");
assert.equal(recognitionPlan.timeWindow, "4_months");
assert.deepEqual(recognitionPlan.focus, { houses: [10], points: ["Sun"], angles: ["Midheaven"] });

const now = new Date("2026-09-05T12:00:00Z");
const candidates = [
  {
    id: "jupiter-midheaven-active",
    factorKey: "jupiter-opposition-midheaven",
    kind: "transit_to_natal",
    temporalState: "active",
    houses: [10], angles: ["Midheaven"], points: ["Jupiter"],
    themes: ["recognition", "visibility", "public_role"],
    exactAt: "2026-09-12T12:00:00Z", importance: "major",
    provenance: { calculator: "tldrastro-api", sourceId: "arc:jupiter-opposition-midheaven" }
  },
  {
    id: "jupiter-midheaven-second-pass",
    factorKey: "jupiter-opposition-midheaven",
    kind: "transit_to_natal",
    temporalState: "upcoming",
    houses: [10], angles: ["Midheaven"], points: ["Jupiter"],
    themes: ["recognition", "visibility"],
    exactAt: "2026-10-01T12:00:00Z", importance: "major",
    provenance: { calculator: "tldrastro-api", sourceId: "arc:jupiter-opposition-midheaven:pass2" }
  },
  {
    id: "natal-sun-career",
    kind: "natal_placement",
    temporalState: "natal",
    houses: [10], points: ["Sun"],
    themes: ["professional_identity", "visibility"],
    importance: "supporting",
    provenance: { calculator: "tldrastro-api", sourceId: "natal:sun" }
  },
  {
    id: "saturn-career-upcoming",
    kind: "transit_through_house",
    temporalState: "upcoming",
    houses: [10], points: ["Saturn"],
    themes: ["authority", "responsibility"],
    exactAt: "2026-12-01T12:00:00Z", importance: "supporting",
    provenance: { calculator: "tldrastro-api", sourceId: "transit:saturn-house10" }
  },
  {
    id: "unrelated-home-factor",
    kind: "transit_through_house",
    temporalState: "active",
    houses: [4], points: ["Moon"], themes: ["home", "family"],
    importance: "major",
    provenance: { calculator: "tldrastro-api", sourceId: "transit:moon-house4" }
  },
  {
    id: "career-too-far-away",
    kind: "transit_to_natal",
    temporalState: "upcoming",
    houses: [10], angles: ["Midheaven"], themes: ["recognition"],
    exactAt: "2027-04-01T12:00:00Z", importance: "major",
    provenance: { calculator: "tldrastro-api", sourceId: "future:outside-window" }
  }
];

const ranked = rankAskTldrEvidence({ model, plan: recognitionPlan, candidates, now });
assert.equal(ranked.length, 3);
assert.equal(ranked[0].id, "jupiter-midheaven-active");
assert.equal(ranked[0].role, "primary");
assert.ok(ranked[0].reasons.some((reason) => reason.includes("primary intent")));
assert.ok(!ranked.some((entry) => entry.id === "jupiter-midheaven-second-pass"), "Repeated passes of one factor must not crowd the answer packet.");
assert.ok(!ranked.some((entry) => entry.id === "unrelated-home-factor"));
assert.ok(!ranked.some((entry) => entry.id === "career-too-far-away"));

const recognitionPacket = buildAskTldrAnswerPacket({ model, plan: recognitionPlan, candidates, now });
assert.equal(recognitionPacket.generationAllowed, true);
assert.equal(recognitionPacket.evidence.length, 3);
assert.deepEqual(recognitionPacket.evidenceIds, recognitionPacket.evidence.map((entry) => entry.id));
assert.ok(recognitionPacket.evidenceIds.every((id) => candidates.some((candidate) => candidate.id === id)), "The answer packet may contain only supplied calculated evidence IDs.");

const freeTextCareer = compileFreeTextAskPlan({
  model,
  pillarId: "career",
  questionText: "Why am I doing all the work and nobody notices?",
  classification: {
    primaryIntent: "recognition",
    secondaryIntents: ["credit", "workload"],
    questionTypes: ["current_state", "guidance"],
    timeWindow: "1_month"
  }
});
assert.equal(freeTextCareer.source, "free_text");
assert.equal(freeTextCareer.pillarId, recognitionPlan.pillarId);
assert.equal(freeTextCareer.primaryIntent, recognitionPlan.primaryIntent);
const freeTextRanked = rankAskTldrEvidence({ model, plan: freeTextCareer, candidates, now });
assert.equal(freeTextRanked[0].id, "jupiter-midheaven-active");

const relationshipPattern = compileFreeTextAskPlan({
  model,
  pillarId: "love",
  questionText: "Why does the same relationship problem keep happening?",
  classification: {
    primaryIntent: "relationship",
    secondaryIntents: ["pattern", "commitment"],
    questionTypes: ["pattern"]
  }
});
const patternCandidates = [
  {
    id: "natal-venus-saturn",
    kind: "natal_aspect",
    temporalState: "natal",
    houses: [7], points: ["Venus", "Saturn"], themes: ["relationship", "commitment", "pattern"],
    importance: "major",
    provenance: { calculator: "tldrastro-api", sourceId: "natal:venus-saturn" }
  },
  {
    id: "venus-short-transit",
    kind: "transit_through_house",
    temporalState: "active",
    houses: [7], points: ["Venus"], themes: ["relationship"],
    importance: "supporting",
    provenance: { calculator: "tldrastro-api", sourceId: "transit:venus-house7" }
  }
];
assert.equal(rankAskTldrEvidence({ model, plan: relationshipPattern, candidates: patternCandidates, now })[0].id, "natal-venus-saturn", "Pattern questions should allow natal evidence to lead.");

const moneyDecision = compileFreeTextAskPlan({
  model,
  pillarId: "money",
  questionText: "Should I make this big financial commitment?",
  classification: { primaryIntent: "financial_terms", secondaryIntents: ["money"], questionTypes: ["decision"] }
});
const moneyPacket = buildAskTldrAnswerPacket({ model, plan: moneyDecision, candidates: [], now });
assert.equal(moneyDecision.decisionMode, "decision_support_not_outcome");
assert.equal(moneyDecision.answerContract, "money");
assert.equal(moneyPacket.generationAllowed, false);
assert.equal(moneyPacket.generationBlockReason, "NO_RELEVANT_CALCULATED_EVIDENCE");
assert.match(JSON.stringify(moneyPacket.answerContract.pillar), /financial advice/iu);

const healthPlan = compileFreeTextAskPlan({
  model,
  pillarId: "daily_life_health",
  questionText: "Why does my schedule feel impossible?",
  classification: { primaryIntent: "schedule", secondaryIntents: ["workload"], questionTypes: ["current_state", "guidance"] }
});
assert.equal(healthPlan.answerContract, "daily_life_health");
const healthPacket = buildAskTldrAnswerPacket({ model, plan: healthPlan, candidates: [{
  id: "saturn-house6",
  kind: "transit_through_house",
  temporalState: "active",
  houses: [6], points: ["Saturn"], themes: ["schedule", "workload"], importance: "major",
  provenance: { calculator: "tldrastro-api", sourceId: "transit:saturn-house6" }
}], now });
assert.equal(healthPacket.generationAllowed, true);
assert.match(JSON.stringify(healthPacket.answerContract.pillar), /diagnose illness/iu);

assert.throws(() => rankAskTldrEvidence({ model, plan: recognitionPlan, now, candidates: [{
  id: "bad-candidate", kind: "natal_placement", temporalState: "natal", houses: [10], themes: ["recognition"], provenance: { calculator: "", sourceId: "" }
}] }), /ASK_TLDR_INVALID_EVIDENCE_CANDIDATE/u);

console.log("Ask TLDR answer model contract passed: evergreen/free-text share one planner, evidence ranks deterministically, repeated factors dedupe, and unsupported answers fail closed.");
