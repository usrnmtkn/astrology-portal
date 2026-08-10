import {
  CARD_JUDGE_V3_CATEGORIES,
  CARD_JUDGE_V3_LOCATIONS,
  buildCardJudgeV3Packet,
  cardJudgeV3Verdict
} from "./cardJudgeV3.mjs";

export const CARD_JUDGE_V3_1_VERSION = "card-writing-judge-rubric-v3.1-draft";

export const CARD_JUDGE_V3_1_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: ["findings"],
  properties: {
    findings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["category", "location", "finding", "evidence_ids", "mechanism_citations"],
        properties: {
          category: { type: "string", enum: [...CARD_JUDGE_V3_CATEGORIES] },
          location: { type: "string", enum: [...CARD_JUDGE_V3_LOCATIONS] },
          finding: { type: "string" },
          evidence_ids: { type: "array", items: { type: "string" } },
          mechanism_citations: { type: "array", minItems: 1, items: { type: "string" } }
        }
      }
    }
  }
});

function validateMechanismRecord(record, astrologyFacts) {
  if (!record || typeof record !== "object") throw new Error("V3.1 packet omitted the governed mechanism record.");
  if (record.sign !== astrologyFacts?.sign) throw new Error("V3.1 mechanism record does not match the supplied sign facts.");
  if (!["internal", "external"].includes(record.interiority)) throw new Error("V3.1 mechanism record omitted its interiority tag.");
  if (!Array.isArray(record.elements) || record.elements.length === 0) throw new Error("V3.1 mechanism record omitted governed elements.");
  const elementIds = record.elements.map((element) => element.id);
  if (elementIds.some((id) => typeof id !== "string" || !id) || new Set(elementIds).size !== elementIds.length) {
    throw new Error("V3.1 mechanism element IDs must be unique non-empty strings.");
  }
  if (!record.provenance || typeof record.provenance.sourcePath !== "string" || typeof record.provenance.sourceSha256 !== "string") {
    throw new Error("V3.1 mechanism record omitted provenance.");
  }
  return record;
}

export function buildCardJudgeV31Packet({ mechanismRecord, ...input }) {
  const record = validateMechanismRecord(mechanismRecord, input.astrologyFacts);
  const packet = buildCardJudgeV3Packet(input);
  if (packet.ownerComparisonSet.some((comparison) => comparison.interiority !== record.interiority)) {
    throw new Error("V3.1 comparison evidence must match the candidate mechanism interiority where the gold set allows.");
  }
  return { ...packet, version: CARD_JUDGE_V3_1_VERSION, mechanismRecord: record };
}

export function cardJudgeV31PacketPrompt(rubric, packet) {
  if (typeof rubric !== "string" || !rubric.includes("**Version:** `card-writing-judge-rubric-v3.1-draft`")) {
    throw new Error("V3.1 card rubric is missing or cross-scoped.");
  }
  return [
    rubric,
    `SURFACE\n${packet.surface}`,
    `LOCATION_CONTRACT\n${JSON.stringify(packet.locationContract)}`,
    `COMPLETE_CARD\n${packet.completeCard}`,
    `ASTROLOGY_FACTS\n${JSON.stringify(packet.astrologyFacts)}`,
    `STRUCTURED_MEANING_PLAN\n${JSON.stringify(packet.meaningPlan)}`,
    `MECHANISM_RECORD\n${JSON.stringify(packet.mechanismRecord)}`,
    `OWNER_COMPARISON_SET\n${JSON.stringify(packet.ownerComparisonSet)}`,
    `TARGET_FUNCTIONS\n${JSON.stringify(packet.targetFunctions)}`,
    `LABELED_NEGATIVE_EXAMPLES\n${JSON.stringify(packet.labeledNegativeExamples)}`,
    `VALIDATOR_RESULTS\n${JSON.stringify(packet.validatorResults)}`,
    "Use only ASTROLOGY_FACTS and MECHANISM_RECORD for astrology, theme, manifestation-space, interiority, and house-bleed judgments. Training-prior astrology knowledge is forbidden.",
    "Every finding must cite at least one exact mechanism element ID under mechanism_citations. Return findings only; runtime owns the verdict."
  ].join("\n\n");
}

function findingRecord(finding, packet) {
  if (!finding || typeof finding !== "object") throw new Error("V3.1 judge returned a malformed finding.");
  if (!CARD_JUDGE_V3_CATEGORIES.includes(finding.category)) throw new Error(`V3.1 judge returned unknown category ${finding.category}.`);
  if (!CARD_JUDGE_V3_LOCATIONS.includes(finding.location)) throw new Error(`V3.1 judge returned unsupplied location ${finding.location}.`);
  if (typeof finding.finding !== "string" || !finding.finding.trim()) throw new Error("V3.1 judge returned an empty finding.");
  if (!Array.isArray(finding.evidence_ids) || finding.evidence_ids.some((item) => typeof item !== "string")) {
    throw new Error("V3.1 judge returned malformed evidence_ids.");
  }
  if (!Array.isArray(finding.mechanism_citations) || finding.mechanism_citations.length === 0 || finding.mechanism_citations.some((item) => typeof item !== "string")) {
    throw new Error("V3.1 finding omitted required mechanism_citations.");
  }
  const eligibleEvidence = new Set(packet.ownerComparisonSet.map((item) => item.evidenceId));
  if (finding.evidence_ids.some((id) => !eligibleEvidence.has(id))) throw new Error("V3.1 finding cites ineligible or cross-surface comparison evidence.");
  if (finding.category === "owner_voice_drift" && finding.evidence_ids.length === 0) {
    throw new Error("V3.1 owner_voice_drift requires eligible comparison evidence.");
  }
  const eligibleMechanism = new Set(packet.mechanismRecord.elements.map((element) => element.id));
  if (finding.mechanism_citations.some((id) => !eligibleMechanism.has(id))) {
    throw new Error("V3.1 finding cites an absent or training-prior mechanism element.");
  }
  return {
    category: finding.category,
    location: finding.location,
    finding: finding.finding,
    evidence_ids: [...finding.evidence_ids],
    mechanism_citations: [...finding.mechanism_citations]
  };
}

export function evaluateCardJudgeV31({ packet, modelOutput }) {
  if (!modelOutput || typeof modelOutput !== "object" || !Array.isArray(modelOutput.findings)) {
    throw new Error("V3.1 judge omitted the findings-only output contract.");
  }
  for (const forbidden of ["verdict", "decision", "severity", "score", "overall"]) {
    if (Object.hasOwn(modelOutput, forbidden)) throw new Error(`V3.1 model output must not contain ${forbidden}.`);
  }
  const modelFindings = modelOutput.findings.map((finding) => findingRecord(finding, packet));
  const deterministic = Array.isArray(packet.validatorResults.findings)
    ? packet.validatorResults.findings.map((finding) => findingRecord({ ...finding, evidence_ids: finding.evidence_ids ?? [] }, packet))
    : [];
  const findings = [...new Map([...deterministic, ...modelFindings].map((finding) => [
    `${finding.category}|${finding.location}|${finding.finding}`,
    finding
  ])).values()];
  return { findings, verdict: cardJudgeV3Verdict(findings) };
}

function normalized(value) {
  return String(value ?? "").toLowerCase().replace(/[’']/gu, "'");
}

export function validateCardJudgeV31HouseBleed({ candidate, mechanismRecord }) {
  const blacklist = mechanismRecord.houseBleedNounBlacklist;
  if (!blacklist || blacklist.status !== "needs_review" || !Array.isArray(blacklist.terms)) {
    throw new Error("V3.1 mechanism record omitted its review-gated house-bleed blacklist.");
  }
  const fields = ["tagline", "hook", "lived", "turn"];
  const findings = [];
  for (const [index, field] of fields.entries()) {
    const text = normalized(candidate[field]);
    const hits = blacklist.terms.filter((term) => text.includes(normalized(term)));
    const anchors = blacklist.mechanismAnchors.filter((anchor) => text.includes(normalized(anchor)));
    if (hits.length >= blacklist.triggerThreshold && anchors.length === 0) {
      findings.push({
        category: "house_bleed",
        location: CARD_JUDGE_V3_LOCATIONS[index],
        finding: `Deterministic noun-level house-bleed evidence: ${hits.join(", ")}.`,
        evidence_ids: [],
        mechanism_citations: hits.map((term) => `house_bleed_noun_blacklist.${term}`)
      });
    }
  }
  return { findings };
}
