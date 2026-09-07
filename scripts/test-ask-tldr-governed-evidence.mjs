import assert from "node:assert/strict";
import fs from "node:fs";
import { buildAskTldrAnswerPacket, compileEvergreenAskPlan } from "../api/_lib/ask-tldr-model.ts";
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
const ranked = buildAskTldrAnswerPacket({ model, plan, candidates: calculated, now });
const governed = buildAskTldrGovernedAnswerPacket(ranked);
assert.equal(governed.schema, "ask-tldr-governed-answer-packet.v1");
assert.equal(governed.generationAllowed, true);
assert.ok(governed.evidence.length > 0);
assert.equal(governed.evidence[0].role, "primary");
assert.equal(governed.evidence[0].factorKey, "transit:jupiter:opposition:midheaven");
assert.equal(governed.evidence[0].governedMeaning.status, "full");
assert.equal(governed.evidence[0].governedMeaning.sourceKind, "owner_approved_cms_snapshot");
assert.match(governed.evidence[0].governedMeaning.promptEvidence, /Jupiter/u);
assert.match(governed.evidence[0].governedMeaning.promptEvidence, /Midheaven/u);
assert.ok(governed.evidence[0].governedMeaning.canonicalIds.length > 0, "Primary governed meaning must retain canonical provenance.");
assert.ok(governed.evidence[0].governedMeaning.packetSha256);
assert.ok(governed.evidence[0].governedMeaning.governanceSourceSha256);

function packetRecords(packet) {
  if (!packet || typeof packet !== "object") return [];
  if (Array.isArray(packet.evidence)) return packet.evidence;
  if (packet.record && typeof packet.record === "object") return [packet.record];
  if (Array.isArray(packet.records)) return packet.records;
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

const lunarEclipse = calculated.find((item) => item.kind === "eclipse" && item.id.includes("lunar-eclipse-2026-08-28"));
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
assert.equal(packetRecords(governedLunarEclipse.governedMeaning.packet).length, 2, "The lunar governance checks must inspect both actual evidence records.");
for (const record of packetRecords(governedLunarEclipse.governedMeaning.packet)) {
  assert.equal(record.authorityClass, "owner-approved-prose");
  assert.equal(record.store, "owner-approved-lunar-eclipse-section-snapshot");
}

const solarEclipse = calculated.find((item) => item.kind === "eclipse" && item.id.includes("solar-eclipse-2026-08-12"));
assert.ok(solarEclipse, "Frozen Marie report facts must include the August 12 solar eclipse.");
const governedSolarEclipse = resolveAskTldrGovernedFactor({
  ...solarEclipse,
  score: 80,
  role: "supporting",
  reasons: ["fixture"]
});
assert.notEqual(governedSolarEclipse.governedMeaning.sourceKind, "owner_approved_eclipse_snapshot", "Lunar approval must never be generalized to solar-eclipse meaning.");
assert.notEqual(governedSolarEclipse.governedMeaning.status, "full", "Review-held generic solar-eclipse semantics must remain unavailable to Ask TLDR.");

const profectionCandidate = calculated.find((factor) => factor.kind === "profection");
assert.ok(profectionCandidate);
const profection = resolveAskTldrGovernedFactor({
  ...profectionCandidate,
  score: 100,
  role: "primary",
  reasons: ["fixture"]
});
assert.equal(profection.governedMeaning.status, "partial");
assert.equal(profection.governedMeaning.sourceKind, "knowledge_index");
assert.ok(profection.governedMeaning.canonicalIds.includes("house/12"), "Partial house doctrine preserves provenance without authorizing profection technique meaning.");

const blockedPacket = buildAskTldrGovernedAnswerPacket({
  ...ranked,
  evidence: [{ ...profectionCandidate, score: 100, role: "primary", reasons: ["fixture"] }],
  evidenceIds: [profectionCandidate.id],
  generationAllowed: true,
  generationBlockReason: null
});
assert.equal(blockedPacket.generationAllowed, false);
assert.equal(blockedPacket.generationBlockReason, "PRIMARY_GOVERNED_INTERPRETATION_INCOMPLETE");

console.log("Ask TLDR governed evidence passed: ranked calculated factors resolve only through approved/factual TLDR knowledge or hash-verified owner-approved CMS/eclipse snapshots, preserve canonical provenance, lunar eclipse semantics stay explicitly approved, solar eclipse review holds remain enforced, and incomplete technique coverage fails closed.");
