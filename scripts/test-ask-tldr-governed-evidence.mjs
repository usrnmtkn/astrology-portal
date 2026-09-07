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

for (const factor of governed.evidence) {
  const records = packetRecords(factor.governedMeaning.packet);
  for (const record of records) {
    assert.ok(["owner-approved-prose", "factual-evidence"].includes(record.authorityClass), `Ask TLDR meaning leaked disallowed authority ${record.authorityClass}`);
    assert.ok(!["serving", "ac-reference", "book-ms-ca", "book-ms-aasb"].includes(record.store), `Ask TLDR meaning leaked prohibited store ${record.store}`);
  }
  if (factor.governedMeaning.promptEvidence) {
    assert.doesNotMatch(factor.governedMeaning.promptEvidence, /\[machine-proposal|\[unverified|serving-source-only/iu);
  }
}

const lunarEclipse = calculated.find((item) => item.kind === "eclipse" && item.id.includes("lunar_eclipse-2026-08-28"));
assert.ok(lunarEclipse, "Frozen Marie report facts must include the August 28 lunar eclipse.");
const governedLunarEclipse = resolveAskTldrGovernedFactor({
  ...lunarEclipse,
  score: 90,
  role: "supporting",
  reasons: ["fixture"]
});
assert.equal(governedLunarEclipse.governedMeaning.status, "full", "Exact owner-approved generic lunar-eclipse sections should make lunar eclipse semantics usable in Ask TLDR.");
assert.equal(governedLunarEclipse.governedMeaning.sourceKind, "owner_approved_eclipse_snapshot");
assert.match(governedLunarEclipse.governedMeaning.promptEvidence, /owner-approved lunar-eclipse meaning/iu);
assert.match(governedLunarEclipse.governedMeaning.promptEvidence, /Eclipses warp time and shift the course of events/iu);
assert.match(governedLunarEclipse.governedMeaning.promptEvidence, /Lunar eclipses are portals into your soul/iu);
assert.ok(governedLunarEclipse.governedMeaning.governanceSourceSha256);
assert.equal(governedLunarEclipse.governedMeaning.indexSha256, null, "Approved eclipse-section snapshots must not pretend to come from the knowledge index.");
for (const record of packetRecords(governedLunarEclipse.governedMeaning.packet)) {
  assert.equal(record.authorityClass, "owner-approved-prose");
  assert.equal(record.store, "owner-approved-lunar-eclipse-section-snapshot");
}

const solarEclipse = calculated.find((item) => item.kind === "eclipse" && item.id.includes("solar_eclipse-2026-08-12"));
assert.ok(solarEclipse, "Frozen Marie report facts must include the August 12 solar eclipse.");
const governedSolarEclipse = resolveAskTldrGovernedFactor({
  ...solarEclipse,
  score: 80,
  role: "supporting",
  reasons: ["fixture"]
});
assert.notEqual(governedSolarEclipse.governedMeaning.sourceKind, "owner_approved_eclipse_snapshot", "Lunar approval must never be generalized to solar-eclipse meaning.");
assert.notEqual(governedSolarEclipse.governedMeaning.status, "full", "Review-held generic solar-eclipse semantics must remain unavailable to Ask TLDR.");

const profection = calculated.find((item) => item.kind === "profection");
assert.ok(profection);
const governedProfection = resolveAskTldrGovernedFactor({
  ...profection,
  score: 100,
  role: "primary",
  reasons: ["fixture"]
});
assert.equal(governedProfection.governedMeaning.status, "partial", "Generic house/ruler doctrine is not enough to pretend we have governed profection technique semantics.");
assert.ok(governedProfection.governedMeaning.canonicalIds.some((id) => id === "house/12"));
assert.equal(governedProfection.governedMeaning.sourceKind, "knowledge_index");

const profectionPacket = buildAskTldrGovernedAnswerPacket({
  ...answerPacket,
  evidence: [{ ...profection, score: 100, role: "primary", reasons: ["fixture"] }],
  evidenceIds: [profection.id]
});
assert.equal(profectionPacket.generationAllowed, false, "A primary annual technique with only partial governed meaning must fail closed.");
assert.equal(profectionPacket.generationBlockReason, "PRIMARY_GOVERNED_INTERPRETATION_INCOMPLETE");

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

console.log("Ask TLDR governed evidence passed: ranked calculated factors resolve only through approved/factual TLDR knowledge, hash-verified owner-approved CMS snapshots, or exact owner-approved lunar-eclipse sections; solar eclipse source gaps and incomplete techniques still fail closed.");