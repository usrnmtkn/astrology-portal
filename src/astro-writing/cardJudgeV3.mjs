import crypto from "node:crypto";
import { cardCritiqueChecklist } from "./cardWritingStandard.mjs";

export const CARD_JUDGE_V3_VERSION = "card-writing-judge-v3-candidate-2026-08-09";
export const CARD_JUDGE_V3_SURFACE = "card";
export const CARD_JUDGE_V3_CALL_BUDGET = 20;
export const CARD_JUDGE_V3_AUTHORIZATION_ENV = "ASTRO_WRITING_V3_RUN_AUTHORIZATION";
export const CARD_JUDGE_V3_AUTHORIZATION_TOKEN = "owner-authorized-card-judge-v3-run-1-20-calls";
export const CARD_JUDGE_V3_ARTIFACT_PATH = "packages/astro-knowledge/review/writing-harness-v3/card-judge-v3-live-evaluation-run-1.json";

export const CARD_JUDGE_V3_CATEGORY_CONFIG = Object.freeze({
  astrology_integrity: Object.freeze({
    action: "FAIL",
    definition: "Contradicts the supplied astrology facts or assigns an unsupported astrological function."
  }),
  shared_ban: Object.freeze({
    action: "FAIL",
    definition: "Violates a shared register ban that applies to every surface."
  }),
  specificity_ceiling: Object.freeze({
    action: "FAIL",
    definition: "Asserts an unsupported event, motive, life status, or outcome as fact."
  }),
  house_bleed: Object.freeze({
    action: "REVISE",
    definition: "Defines a sign-only card through its associated house domain instead of the sign mechanism."
  }),
  stock_trope: Object.freeze({
    action: "REVISE",
    definition: "Uses a familiar shortcut in place of the card's actual mechanism."
  }),
  example_proves_astrology: Object.freeze({
    action: "REVISE",
    definition: "Uses an example that does not demonstrate the supplied mechanism."
  }),
  metaphor_requires_translation: Object.freeze({
    action: "REVISE",
    definition: "Requires translation from figurative compression into ordinary events."
  }),
  tagline_stands_alone: Object.freeze({
    action: "REVISE",
    definition: "Presents an undeveloped hook with no cause, stake, behavior, or consequence beneath it."
  }),
  owner_voice_drift: Object.freeze({
    action: "REVISE",
    definition: "Observably drifts from the supplied same-surface owner exemplars."
  })
});

export const CARD_JUDGE_V3_CATEGORIES = Object.freeze(Object.keys(CARD_JUDGE_V3_CATEGORY_CONFIG));
export const CARD_JUDGE_V3_LOCATIONS = Object.freeze([
  "[LOCATION=tagline; PARAGRAPH_INDEX=0]",
  "[LOCATION=hook; PARAGRAPH_INDEX=1]",
  "[LOCATION=lived; PARAGRAPH_INDEX=2]",
  "[LOCATION=turn; PARAGRAPH_INDEX=3]"
]);

export const CARD_JUDGE_V3_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: ["findings"],
  properties: {
    findings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["category", "location", "finding", "evidence_ids"],
        properties: {
          category: { type: "string", enum: [...CARD_JUDGE_V3_CATEGORIES] },
          location: { type: "string", enum: [...CARD_JUDGE_V3_LOCATIONS] },
          finding: { type: "string" },
          evidence_ids: { type: "array", items: { type: "string" } }
        }
      }
    }
  }
});

const CARD_FIELDS = Object.freeze(["tagline", "hook", "lived", "turn"]);

function cardRecord(card) {
  if (!card || typeof card !== "object") throw new Error("V3 evaluation requires a complete card object.");
  const record = Object.fromEntries(CARD_FIELDS.map((field) => {
    const value = card[field];
    if (typeof value !== "string" || !value.trim()) throw new Error(`V3 complete card omitted ${field}.`);
    return [field, value];
  }));
  return record;
}

export function cardJudgeV3CardHash(card) {
  return crypto.createHash("sha256").update(JSON.stringify(cardRecord(card))).digest("hex");
}

export function numberedCompleteCard(card) {
  const record = cardRecord(card);
  return CARD_FIELDS.map((field, index) => `${CARD_JUDGE_V3_LOCATIONS[index]}\n${record[field]}`).join("\n\n");
}

function comparisonRecord(value) {
  if (!value || typeof value !== "object") throw new Error("V3 comparison evidence must be an object.");
  if (typeof value.evidenceId !== "string" || !value.evidenceId) throw new Error("V3 comparison evidence omitted evidenceId.");
  if (value.surface !== CARD_JUDGE_V3_SURFACE) throw new Error("Cross-surface comparison evidence is forbidden for the card judge.");
  if (value.status !== "owner-locked") throw new Error("V3 comparison evidence must be owner-locked.");
  if (!value.provenance || typeof value.provenance.sourcePath !== "string" || typeof value.provenance.sourceType !== "string") {
    throw new Error("V3 comparison evidence omitted provenance.");
  }
  if (!Array.isArray(value.functions) || value.functions.length === 0 || value.functions.some((item) => typeof item !== "string")) {
    throw new Error("V3 comparison evidence omitted comparable functions.");
  }
  return { ...value, card: cardRecord(value.card) };
}

export function buildCardJudgeV3Packet({
  candidateEvidenceId,
  candidate,
  astrologyFacts,
  meaningPlan,
  ownerComparisonSet,
  targetFunctions,
  labeledNegativeExamples,
  validatorResults
}) {
  if (!astrologyFacts || typeof astrologyFacts !== "object") throw new Error("V3 packet omitted ASTROLOGY_FACTS.");
  if (!meaningPlan || typeof meaningPlan !== "object") throw new Error("V3 packet omitted the structured meaning plan.");
  if (!Array.isArray(ownerComparisonSet) || ownerComparisonSet.length < 2 || ownerComparisonSet.length > 3) {
    throw new Error("V3 card evaluation requires two or three owner comparison cards.");
  }
  if (!Array.isArray(targetFunctions) || targetFunctions.length === 0) throw new Error("V3 packet omitted TARGET_FUNCTIONS.");
  if (!Array.isArray(labeledNegativeExamples)) throw new Error("V3 packet omitted LABELED_NEGATIVE_EXAMPLES.");
  if (!validatorResults || typeof validatorResults !== "object") throw new Error("V3 packet omitted VALIDATOR_RESULTS.");
  const candidateCard = cardRecord(candidate);
  const candidateHash = cardJudgeV3CardHash(candidateCard);
  const comparisons = ownerComparisonSet.map(comparisonRecord);
  if (new Set(comparisons.map((item) => item.evidenceId)).size !== comparisons.length) {
    throw new Error("V3 comparison evidence IDs must be unique.");
  }
  for (const comparison of comparisons) {
    if (comparison.evidenceId === candidateEvidenceId || cardJudgeV3CardHash(comparison.card) === candidateHash) {
      throw new Error("The candidate card itself is forbidden from its own comparison set.");
    }
    if (!comparison.functions.some((item) => targetFunctions.includes(item))) {
      throw new Error(`Comparison ${comparison.evidenceId} does not perform a target function.`);
    }
  }
  if (labeledNegativeExamples.some((item) => item?.eligiblePositiveEvidence !== false)) {
    throw new Error("Every labeled negative example must be explicitly excluded from positive voice evidence.");
  }
  return {
    version: CARD_JUDGE_V3_VERSION,
    surface: CARD_JUDGE_V3_SURFACE,
    completeCard: numberedCompleteCard(candidateCard),
    astrologyFacts,
    meaningPlan,
    ownerComparisonSet: comparisons,
    targetFunctions: [...targetFunctions],
    labeledNegativeExamples,
    validatorResults,
    locationContract: {
      convention: "supplied_zero_based_indices",
      allowedLocations: [...CARD_JUDGE_V3_LOCATIONS],
      instruction: "Copy the exact supplied LOCATION/PARAGRAPH_INDEX token. The model never counts fields or paragraphs."
    }
  };
}

export function cardJudgeV3PacketPrompt(rubric, packet) {
  if (typeof rubric !== "string" || !rubric.includes("**Surface:** `card`")) throw new Error("V3 card rubric is missing or cross-scoped.");
  return [
    rubric,
    `CARD_CRITIQUE_CHECKLIST\n${cardCritiqueChecklist}`,
    `SURFACE\n${packet.surface}`,
    `LOCATION_CONTRACT\n${JSON.stringify(packet.locationContract)}`,
    `COMPLETE_CARD\n${packet.completeCard}`,
    `ASTROLOGY_FACTS\n${JSON.stringify(packet.astrologyFacts)}`,
    `STRUCTURED_MEANING_PLAN\n${JSON.stringify(packet.meaningPlan)}`,
    `OWNER_COMPARISON_SET\n${JSON.stringify(packet.ownerComparisonSet)}`,
    `TARGET_FUNCTIONS\n${JSON.stringify(packet.targetFunctions)}`,
    `LABELED_NEGATIVE_EXAMPLES\n${JSON.stringify(packet.labeledNegativeExamples)}`,
    `VALIDATOR_RESULTS\n${JSON.stringify(packet.validatorResults)}`,
    "Return findings only under the strict v3 schema. Do not return a verdict, severity, score, or replacement prose."
  ].join("\n\n");
}

function validateFinding(finding, packet) {
  if (!finding || typeof finding !== "object") throw new Error("V3 judge returned a malformed finding.");
  if (!CARD_JUDGE_V3_CATEGORIES.includes(finding.category)) throw new Error(`V3 judge returned unknown category ${finding.category}.`);
  if (!CARD_JUDGE_V3_LOCATIONS.includes(finding.location)) throw new Error(`V3 judge returned unsupplied location ${finding.location}.`);
  if (typeof finding.finding !== "string" || !finding.finding.trim()) throw new Error("V3 judge returned an empty finding.");
  if (!Array.isArray(finding.evidence_ids) || finding.evidence_ids.some((item) => typeof item !== "string")) {
    throw new Error("V3 judge returned malformed evidence_ids.");
  }
  const eligible = new Set(packet.ownerComparisonSet.map((item) => item.evidenceId));
  if (finding.evidence_ids.some((id) => !eligible.has(id))) throw new Error("V3 finding cites ineligible or cross-surface evidence.");
  if (finding.category === "owner_voice_drift" && finding.evidence_ids.length === 0) {
    throw new Error("V3 owner_voice_drift requires eligible comparison evidence.");
  }
  return {
    category: finding.category,
    location: finding.location,
    finding: finding.finding,
    evidence_ids: [...finding.evidence_ids]
  };
}

export function cardJudgeV3Verdict(findings) {
  if (!Array.isArray(findings)) throw new Error("V3 verdict mapping requires findings.");
  if (findings.length === 0) return "PASS";
  return findings.some((finding) => CARD_JUDGE_V3_CATEGORY_CONFIG[finding.category]?.action === "FAIL")
    ? "FAIL"
    : "REVISE";
}

export function evaluateCardJudgeV3({ packet, modelOutput }) {
  if (!modelOutput || typeof modelOutput !== "object" || !Array.isArray(modelOutput.findings)) {
    throw new Error("V3 judge omitted the findings-only output contract.");
  }
  for (const forbidden of ["verdict", "decision", "severity", "score", "overall"]) {
    if (Object.hasOwn(modelOutput, forbidden)) throw new Error(`V3 model output must not contain ${forbidden}.`);
  }
  const modelFindings = modelOutput.findings.map((finding) => validateFinding(finding, packet));
  const deterministic = Array.isArray(packet.validatorResults.findings)
    ? packet.validatorResults.findings.map((finding) => validateFinding({ ...finding, evidence_ids: finding.evidence_ids ?? [] }, packet))
    : [];
  const findings = [...new Map([...deterministic, ...modelFindings].map((finding) => [
    `${finding.category}|${finding.location}|${finding.finding}`,
    finding
  ])).values()];
  return { findings, verdict: cardJudgeV3Verdict(findings) };
}

export function assertCardJudgeV3LiveAuthorization({ env = process.env, artifactExists = false } = {}) {
  if (env[CARD_JUDGE_V3_AUTHORIZATION_ENV] !== CARD_JUDGE_V3_AUTHORIZATION_TOKEN) {
    throw new Error(`No billed call was made. Set ${CARD_JUDGE_V3_AUTHORIZATION_ENV} only after explicit owner authorization naming the 20-call budget.`);
  }
  if (artifactExists) {
    throw new Error("The card-judge-v3 run-one authorization has already been consumed. A new run requires fresh owner authorization and a new token.");
  }
  return { authorizedCalls: CARD_JUDGE_V3_CALL_BUDGET, retriesAuthorized: 0 };
}
