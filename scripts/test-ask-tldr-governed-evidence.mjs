import assert from "node:assert/strict";
import fs from "node:fs";
import {
  buildAskTldrAnswerPacket,
  compileEvergreenAskPlan
} from "../api/_lib/ask-tldr-model.ts";
import { askTldrEvidenceFromReportWindow } from "../api/_lib/ask-tldr-evidence-adapter.ts";
import {
  buildAskTldrGovernedAnswerPacket,
  resolveAskTldrGovernedFactor
} from "../api/_lib/ask-tldr-governed-evidence.ts";

const readJson = (relativePath) => JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), "utf8"));
const model = readJson("../config/ask-tldr/answer-model-v1.json");
const career = readJson("../config/ask-tldr/pillars/career.json");
const reportWindow = readJson("./fixtures/marie-report-frozen-facts.json");
const now = new Date("2026-09-05T12:00:00Z");

const recognition = career.questions.find((question) => question.id === "career.recognition");
assert.ok(recognition);
const plan = compileEvergreenAskPlan({ model, pillar: career, question: recognition });
const calculated = askTldrEvidenceFromReportWindow(reportWindow, now);
const answerPacket = buildAskTldrAnswerPacket({ model, plan, candidates: calculated, now });
assert.equal(answerPacket.generationAllowed, true);
assert.equal(answerPacket.evidence[0].factorKey, "transit:jupiter:opposition:midheaven", "Marie Career recognition should be led by the upcoming Jupiter-Midheaven factor in the real report-window fixture.");
assert.equal(answerPacket.evidence[0].facts.natalHouse, 9, "The ranked factor must preserve the calculator's raw reported house while retrieval uses canonical Midheaven coordinates.");

const governed = buildAskTldrGovernedAnswerPacket(answerPacket);
assert.equal(governed.schema, "ask-tldr-governed-answer-packet.v1");
assert.equal(governed.generationAllowed, true, "A hash-verified owner-approved current Personal Transit meaning should permit the future writer stage.");
assert.equal(governed.generationBlockReason, null);
assert.equal(governed.evidence[0].governedMeaning.status, "full");
assert.equal(governed.evidence[0].governedMeaning.sourceKind, "owner_approved_cms_snapshot");
assert.deepEqual(governed.evidence[0].governedMeaning.canonicalIds, ["cms:authored/transit-aspect/jupiter/midheaven/hard"]);
assert.ok(governed.evidence[0].governedMeaning.packetSha256);
assert.ok(governed.evidence[0].governedMeaning.governanceSourceSha256, "CMS-backed governed meaning must carry the exact owner-authorization file hash.");
assert.equal(governed.evidence[0].governedMeaning.indexSha256, null, "CMS snapshot evidence must not pretend it came from the canonical knowledge index.");
assert.match(governed.evidence[0].governedMeaning.promptEvidence, /ASTROLOGICAL TRUTH/u);
assert.equal(governed.evidence[0].facts.natalPoint, "Midheaven");
assert.equal(governed.evidence[0].provenance.calculator, "tldrastro-api:/timing/report-window");

function packetRecords(packet) {
  if (!packet || typeof packet !== "object") return [];
  if (Array.isArray(packet.evidence)) return packet.evidence;
  if (Array.isArray(packet.packets)) return packet.packets.flatMap(packetRecords);
  return [];
}

function assertApprovedPacketRecords(factor) {
  const records = packetRecords(factor.governedMeaning.packet);
  if (factor.governedMeaning.status !== "full") {
    assert.equal(factor.role === "primary" && records.length === 0, false, "An incomplete primary factor may not bypass the governed-answer fail-closed gate.");
    return;
  }
  assert.ok(records.length > 0, `${factor.id} must carry bounded semantic evidence when its meaning is full.`);
  for (const record of records) {
    assert.ok(["owner-approved-prose", "factual-evidence"].includes(record.authorityClass), `Ask TLDR meaning leaked disallowed authority ${record.authorityClass}`);
    assert.ok(!["serving", "ac-reference", "book-ms-ca", "book-ms-aasb"].includes(record.store), `Ask TLDR meaning leaked prohibited store ${record.store}`);
  }
  if (factor.governedMeaning.promptEvidence) {
    assert.doesNotMatch(factor.governedMeaning.promptEvidence, /\[machine-proposal|\[unverified|serving-source-only/iu);
  }
}

for (const factor of governed.evidence) assertApprovedPacketRecords(factor);

const natalNeptune = calculated.find((item) => item.id === "natal-placement:neptune");
assert.ok(natalNeptune, "Frozen facts must include natal Neptune for the house-mechanism regression.");
const governedNatalNeptune = resolveAskTldrGovernedFactor({
  ...natalNeptune,
  score: 100,
  role: "primary",
  reasons: ["fixture"]
});
assert.equal(governedNatalNeptune.governedMeaning.status, "full", "Hash-approved natal AstrologySupport may supply the semantic mechanism while generated reader prose remains non-serving and review-gated.");
assert.deepEqual(governedNatalNeptune.governedMeaning.canonicalIds, ["internal-mechanism:neptune|7th house"]);
assert.equal(governedNatalNeptune.governedMeaning.sourceKind, "owner_approved_internal_mechanism");
assert.deepEqual(governedNatalNeptune.governedMeaning.targetUsages, ["mechanism-reference"]);
assert.match(governedNatalNeptune.governedMeaning.promptEvidence, /not reader copy/u);
assert.equal(governedNatalNeptune.governedMeaning.indexSha256, null);
assert.ok(governedNatalNeptune.governedMeaning.governanceSourceSha256);
assertApprovedPacketRecords(governedNatalNeptune);

const solarReturnJupiter = calculated.find((item) => item.id === "solar-return-overlay:jupiter:house-2");
assert.ok(solarReturnJupiter, "Frozen facts must include Solar Return Jupiter in natal house 2.");
const governedSolarReturnJupiter = resolveAskTldrGovernedFactor({
  ...solarReturnJupiter,
  score: 100,
  role: "primary",
  reasons: ["fixture"]
});
assert.equal(governedSolarReturnJupiter.governedMeaning.status, "full", "The exact owner-approved Solar Return overlay manifestation set must satisfy semantic coverage without generic body-plus-house inference.");
assert.deepEqual(governedSolarReturnJupiter.governedMeaning.canonicalIds, ["sr-overlay/jupiter/2"]);
assert.equal(governedSolarReturnJupiter.governedMeaning.sourceKind, "owner_approved_manifestation_set");
assert.deepEqual(governedSolarReturnJupiter.governedMeaning.targetUsages, ["primary"]);
assert.ok(governedSolarReturnJupiter.governedMeaning.governanceSourceSha256);
assertApprovedPacketRecords(governedSolarReturnJupiter);

const marchEclipse = calculated.find((item) => item.id === "eclipse:lunar-eclipse-2026-03-03");
assert.ok(marchEclipse, "Frozen facts must include the March 3 eclipse in natal house 4.");
const governedMarchEclipse = resolveAskTldrGovernedFactor({
  ...marchEclipse,
  score: 100,
  role: "primary",
  reasons: ["fixture"]
});
assert.equal(governedMarchEclipse.governedMeaning.status, "full");
assert.equal(governedMarchEclipse.governedMeaning.sourceKind, "owner_approved_manifestation_set");
assert.deepEqual(governedMarchEclipse.governedMeaning.canonicalIds, ["eclipse-house-placement/4"]);
assert.match(governedMarchEclipse.governedMeaning.promptEvidence, /natal-house placement/u);
assertApprovedPacketRecords(governedMarchEclipse);

const augustEclipse = calculated.find((item) => item.id === "eclipse:solar-eclipse-2026-08-12");
assert.ok(augustEclipse, "Frozen facts must include the August 12 eclipse.");
assert.deepEqual(augustEclipse.houses, [3, 6], "The calculated candidate must preserve both the activation house and contact house for relevance.");
const governedAugustEclipse = resolveAskTldrGovernedFactor({
  ...augustEclipse,
  score: 100,
  role: "primary",
  reasons: ["fixture"]
});
assert.equal(governedAugustEclipse.governedMeaning.status, "full");
assert.deepEqual(governedAugustEclipse.governedMeaning.canonicalIds, ["eclipse-house-placement/3"], "Semantic authority must use the eclipse activation house, never the Uranus contact's house 6.");
assert.doesNotMatch(governedAugustEclipse.governedMeaning.promptEvidence, /ACTIVATION HOUSE: 6/u);
assertApprovedPacketRecords(governedAugustEclipse);

const profection = calculated.find((item) => item.kind === "profection");
assert.ok(profection);
const governedProfection = resolveAskTldrGovernedFactor({
  ...profection,
  score: 100,
  role: "primary",
  reasons: ["fixture"]
});
assert.equal(governedProfection.governedMeaning.status, "full", "The exact owner-approved 12th-house profection doctrine must satisfy the annual-technique semantic gate.");
assert.deepEqual(governedProfection.governedMeaning.canonicalIds, ["profection-year-house-12"]);
assert.equal(governedProfection.governedMeaning.sourceKind, "owner_approved_profection_doctrine");
assert.match(governedProfection.governedMeaning.promptEvidence, /not teach that a 12th-house profection is intrinsically about grief/u);
assertApprovedPacketRecords(governedProfection);

const profectionPacket = buildAskTldrGovernedAnswerPacket({
  ...answerPacket,
  evidence: [{ ...profection, score: 100, role: "primary", reasons: ["fixture"] }],
  evidenceIds: [profection.id]
});
assert.equal(profectionPacket.generationAllowed, true, "An exact owner-approved annual technique may pass the governed semantic gate while generated copy remains calibration-only.");
assert.equal(profectionPacket.generationBlockReason, null);

const unsupportedProfection = {
  ...profection,
  id: "profection:annual:11-fixture",
  factorKey: "profection:annual:11-fixture",
  houses: [11],
  facts: { ...profection.facts, house: 11 }
};
const governedUnsupportedProfection = resolveAskTldrGovernedFactor({
  ...unsupportedProfection,
  score: 100,
  role: "primary",
  reasons: ["fixture"]
});
assert.equal(governedUnsupportedProfection.governedMeaning.status, "partial", "Other profection houses must remain fail-closed until an exact governed technique authority exists.");
assert.notEqual(governedUnsupportedProfection.governedMeaning.sourceKind, "owner_approved_profection_doctrine");

const unsupportedProfectionPacket = buildAskTldrGovernedAnswerPacket({
  ...answerPacket,
  evidence: [{ ...unsupportedProfection, score: 100, role: "primary", reasons: ["fixture"] }],
  evidenceIds: [unsupportedProfection.id]
});
assert.equal(unsupportedProfectionPacket.generationAllowed, false);
assert.equal(unsupportedProfectionPacket.generationBlockReason, "PRIMARY_GOVERNED_INTERPRETATION_INCOMPLETE");

assert.throws(() => resolveAskTldrGovernedFactor({
  id: "missing-facts",
  kind: "natal_placement",
  temporalState: "natal",
  houses: [10],
  points: ["Sun"],
  provenance: { calculator: "tldrastro-api", sourceId: "fixture" },
  score: 10,
  role: "primary",
  reasons: [],
  label: "fixture",
  knowledgeIds: []
}), /ASK_TLDR_CALCULATED_FACTS_REQUIRED/u);

console.log("Ask TLDR governed evidence passed: ranked calculated factors resolve only through approved/factual TLDR knowledge, hash-verified owner-approved semantic snapshots, exact approved eclipse-house/profection authorities, or owner-approved internal AstrologySupport mechanisms; generated copy remains calibration-only and unsupported techniques fail closed.");