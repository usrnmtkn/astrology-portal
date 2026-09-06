import { createHash } from "node:crypto";
import type { AskTldrGovernedFactor } from "./ask-tldr-governed-evidence.ts";
import {
  assertAskTldrVoiceEvidenceReceipt,
  type AskTldrVoiceEvidenceReceipt
} from "./ask-tldr-voice-receipt.ts";

type FactRecord = Record<string, unknown>;

type GovernedAnswerPacket = {
  schema: "ask-tldr-governed-answer-packet.v1";
  question: Record<string, unknown>;
  decisionMode: string;
  answerContract: Record<string, unknown>;
  evidence: AskTldrGovernedFactor[];
  evidenceIds: string[];
  generationAllowed: boolean;
  generationBlockReason: string | null;
};

export type AskTldrWriterOutput = {
  answer: string;
  evidenceIdsUsed: string[];
  primaryEvidenceId: string;
  whyNowEvidenceId: string | null;
  decisionOutcomeClaimed: boolean;
};

export type AskTldrWriterRequest = {
  schema: "ask-tldr-writer-request.v1";
  runtimeEnabled: false;
  instructions: string;
  input: string;
  outputSchema: Record<string, unknown>;
  evidenceIds: string[];
  primaryEvidenceId: string;
  decisionMode: string;
  requestSha256: string;
};

const MECHANICAL_BANS = [
  /\u2014/gu,
  /\bthis is about\b/giu,
  /\bthis placement becomes\b/giu,
  /\bthis part of the chart\b/giu,
  /\balignment\b/giu,
  /\bactivation\b/giu,
  /\bholding space\b/giu,
  /\bnavigating\b/giu,
  /\bleaning into\b/giu,
  /\byour journey\b/giu,
  /\bthe thread\b/giu,
  /\bmoves through your topics\b/giu
];

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function sha256Json(value: unknown) {
  return sha256(JSON.stringify(value));
}

function words(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function unique<T>(values: T[]) {
  return [...new Set(values)];
}

function primaryEvidence(packet: GovernedAnswerPacket) {
  const primary = packet.evidence.find((factor) => factor.role === "primary");
  if (!primary) throw new Error("ASK_TLDR_PRIMARY_EVIDENCE_REQUIRED");
  return primary;
}

function validateReceiptMatchesPacket(packet: GovernedAnswerPacket, receipt: AskTldrVoiceEvidenceReceipt) {
  assertAskTldrVoiceEvidenceReceipt(receipt);
  if (!packet.generationAllowed) {
    throw new Error(`ASK_TLDR_GOVERNED_PACKET_BLOCKED: ${packet.generationBlockReason ?? "unknown"}`);
  }
  if (JSON.stringify(receipt.question) !== JSON.stringify(packet.question)) {
    throw new Error("ASK_TLDR_WRITER_QUESTION_RECEIPT_MISMATCH");
  }
  const receiptById = new Map(receipt.semanticSources.map((source) => [words(source.evidenceId), source]));
  for (const factor of packet.evidence) {
    const source = receiptById.get(factor.id);
    if (!source
      || words(source.factorKey) !== words(factor.factorKey)
      || words(source.packetSha256) !== words(factor.governedMeaning.packetSha256)
      || words(source.calculatedFactsSha256) !== sha256Json(factor.facts)) {
      throw new Error(`ASK_TLDR_WRITER_SEMANTIC_RECEIPT_MISMATCH: ${factor.id}`);
    }
  }
  return true;
}

function writerInstructions(packet: GovernedAnswerPacket) {
  const pillarId = words(packet.question.pillarId);
  return [
    "You write one TLDR Astro answer to the user's question.",
    "Do not calculate astrology. Do not infer a placement, aspect, house, transit, date, return, profection, eclipse contact, or timing window that is not explicitly supplied in CALCULATED EVIDENCE.",
    "Use the ranked astrology in the order supplied. The primary factor must carry the answer; supporting factors may clarify it but may not replace it.",
    "GOVERNED SEMANTIC EVIDENCE controls what the astrology means. OWNER REGISTER EVIDENCE controls vocabulary, sentence movement, examples, and tone only. Never transfer an astrology claim from an owner passage into this person's chart unless that claim also appears in the calculated/governed semantic evidence.",
    "Answer the human question first. Explain the astrology only enough to show why the answer follows. Use recognizable possibilities rather than inventing a personal event or history.",
    "Use second person. Use ordinary language. Keep manifestations conditional with may, can, might, or another clear possibility construction when the facts support more than one lived outcome.",
    "When you use active, upcoming, or annual evidence, name why the timing matters from the supplied timing facts instead of leaving the reader with an undated generalization.",
    "Do not imitate an owner passage sentence-by-sentence. Write new prose from the supplied meaning using the retrieved passages as register evidence.",
    "Do not add a generic reassurance, summary, or life-coach ending after the useful point has landed.",
    packet.decisionMode === "decision_support_not_outcome"
      ? "This is decision support, not an outcome prediction. Explain the pressures, tradeoffs, timing, and what deserves attention. Do not tell the reader that astrology proves they should choose a specific outcome."
      : "Give an interpretive answer, not a prediction of a guaranteed event.",
    pillarId === "money"
      ? "Money boundary: describe pressures, priorities, tradeoffs, scope, rates, resources, or timing context. Do not tell the reader to buy, sell, invest, borrow, take a loan, or make another financial transaction because of astrology."
      : "",
    pillarId === "daily_life_health"
      ? "Health boundary: describe schedule, workload, sleep, meals, appointments, recovery, physical limits, or routine. Do not diagnose illness, predict disease, attribute symptoms to a psychological cause, or replace medical advice."
      : "",
    pillarId === "spirituality"
      ? "Spirituality boundary: describe belief, meaning, private practice, solitude, closure, faith, or intuition. Do not assert psychic ability, diagnose a spiritual crisis, promise awakening, or present intuition as factual proof."
      : "",
    "Return only the structured output requested by OUTPUT SCHEMA. The reader-facing answer must not contain internal evidence IDs, scores, provenance labels, hashes, or governance language."
  ].filter(Boolean).join("\n");
}

function writerInput(packet: GovernedAnswerPacket, receipt: AskTldrVoiceEvidenceReceipt) {
  const lines = [
    "USER QUESTION",
    words(packet.question.text),
    "",
    "QUESTION CONTRACT",
    JSON.stringify({
      pillarId: packet.question.pillarId,
      primaryIntent: packet.question.primaryIntent,
      secondaryIntents: packet.question.secondaryIntents,
      questionTypes: packet.question.questionTypes,
      timeWindow: packet.question.timeWindow,
      decisionMode: packet.decisionMode,
      answerContract: packet.answerContract
    }, null, 2),
    "",
    "CALCULATED EVIDENCE (facts only; never change these facts)"
  ];

  for (const factor of packet.evidence) {
    lines.push(
      `--- ${factor.role.toUpperCase()} EVIDENCE ${factor.id}`,
      JSON.stringify({
        id: factor.id,
        factorKey: factor.factorKey ?? null,
        kind: factor.kind,
        temporalState: factor.temporalState,
        exactAt: factor.exactAt ?? null,
        startsAt: factor.startsAt ?? null,
        endsAt: factor.endsAt ?? null,
        houses: factor.houses ?? [],
        angles: factor.angles ?? [],
        points: factor.points ?? [],
        facts: factor.facts,
        calculator: factor.provenance
      }, null, 2),
      "GOVERNED SEMANTIC EVIDENCE",
      factor.governedMeaning.promptEvidence ?? "NONE"
    );
  }

  lines.push("", "OWNER REGISTER EVIDENCE (style/register only; these passages are not facts about the reader)");
  for (const [index, passage] of receipt.ownerPassages.entries()) {
    lines.push(
      `--- OWNER PASSAGE ${index + 1}; source=${passage.sourcePath}; sha256=${passage.passageSha256}`,
      passage.text
    );
  }

  lines.push("", "OWNER CORRECTIONS (apply the correction, not the rejected wording)");
  for (const correction of receipt.ownerCorrections) {
    lines.push(
      `--- category=${correction.category}; rule=${correction.rule ?? "none"}; source=${correction.sourcePath}`,
      `REJECTED: ${correction.before}`,
      `OWNER: ${correction.after}`,
      correction.ownerReason ? `WHY: ${correction.ownerReason}` : ""
    );
  }

  lines.push(
    "",
    `ACTIVE DO-NOT-USE RULES; source=${receipt.doNotUse.sourcePath}; sha256=${receipt.doNotUse.sectionSha256}`,
    receipt.doNotUse.text
  );
  return lines.filter((line) => line !== "").join("\n");
}

function outputSchema(evidenceIds: string[], primaryEvidenceId: string) {
  return {
    type: "object",
    additionalProperties: false,
    required: ["answer", "evidenceIdsUsed", "primaryEvidenceId", "whyNowEvidenceId", "decisionOutcomeClaimed"],
    properties: {
      answer: { type: "string", minLength: 1 },
      evidenceIdsUsed: {
        type: "array",
        minItems: 1,
        maxItems: evidenceIds.length,
        items: { type: "string", enum: evidenceIds }
      },
      primaryEvidenceId: { type: "string", const: primaryEvidenceId },
      whyNowEvidenceId: { anyOf: [{ type: "string", enum: evidenceIds }, { type: "null" }] },
      decisionOutcomeClaimed: { type: "boolean", const: false }
    }
  };
}

export function buildAskTldrWriterRequest(input: {
  packet: GovernedAnswerPacket;
  receipt: AskTldrVoiceEvidenceReceipt;
}): AskTldrWriterRequest {
  validateReceiptMatchesPacket(input.packet, input.receipt);
  const primary = primaryEvidence(input.packet);
  if (primary.governedMeaning.status !== "full") throw new Error("ASK_TLDR_PRIMARY_MEANING_NOT_FULL");
  const evidenceIds = input.packet.evidence.map((factor) => factor.id);
  const requestWithoutHash = {
    schema: "ask-tldr-writer-request.v1" as const,
    runtimeEnabled: false as const,
    instructions: writerInstructions(input.packet),
    input: writerInput(input.packet, input.receipt),
    outputSchema: outputSchema(evidenceIds, primary.id),
    evidenceIds,
    primaryEvidenceId: primary.id,
    decisionMode: input.packet.decisionMode
  };
  return { ...requestWithoutHash, requestSha256: sha256Json(requestWithoutHash) };
}

function sentenceCount(paragraph: string) {
  return (paragraph.match(/[.!?](?:[\"')\]]?)(?=\s|$)/gu) ?? []).length;
}

function validateReaderProse(answer: string, pillarId: string, decisionMode: string) {
  const issues: string[] = [];
  if (!answer.trim()) issues.push("empty_answer");
  for (const pattern of MECHANICAL_BANS) {
    pattern.lastIndex = 0;
    if (pattern.test(answer)) issues.push(`banned_pattern:${pattern.source}`);
  }
  const paragraphs = answer.trim().split(/\n\s*\n/gu).map((paragraph) => paragraph.trim()).filter(Boolean);
  if (paragraphs.length > 1 && paragraphs.some((paragraph) => sentenceCount(paragraph) < 2)) {
    issues.push("one_sentence_paragraph");
  }
  if (/\b(?:evidence|factor)[-_ ]?id\b/iu.test(answer) || /\btldrastro-api\b/iu.test(answer) || /sha256/iu.test(answer)) {
    issues.push("internal_metadata_leak");
  }
  if (decisionMode === "decision_support_not_outcome" && /\b(?:astrology|chart|transit) (?:says|shows|proves) (?:you should|that you should)\b/iu.test(answer)) {
    issues.push("decision_outcome_claim");
  }
  if (pillarId === "money" && /\b(?:you should|i recommend|astrology says to)\s+(?:buy|sell|invest|borrow|take out (?:a )?loan|refinance)\b/iu.test(answer)) {
    issues.push("financial_transaction_directive");
  }
  if (pillarId === "daily_life_health" && /\b(?:diagnos(?:e|is)|you have|you will develop)\s+(?:a |an )?(?:disease|disorder|condition|illness)\b/iu.test(answer)) {
    issues.push("medical_diagnosis_or_prediction");
  }
  if (pillarId === "spirituality" && /\b(?:you are psychic|psychic ability is|you will awaken|spiritual awakening is guaranteed|intuition proves)\b/iu.test(answer)) {
    issues.push("spiritual_certainty_claim");
  }
  return unique(issues);
}

export function validateAskTldrWriterOutput(input: {
  request: AskTldrWriterRequest;
  question: Record<string, unknown>;
  evidence: AskTldrGovernedFactor[];
  value: unknown;
}): AskTldrWriterOutput {
  if (!input.value || typeof input.value !== "object" || Array.isArray(input.value)) {
    throw new Error("ASK_TLDR_WRITER_OUTPUT_OBJECT_REQUIRED");
  }
  const value = input.value as FactRecord;
  const expectedKeys = ["answer", "evidenceIdsUsed", "primaryEvidenceId", "whyNowEvidenceId", "decisionOutcomeClaimed"].sort();
  if (JSON.stringify(Object.keys(value).sort()) !== JSON.stringify(expectedKeys)) {
    throw new Error("ASK_TLDR_WRITER_OUTPUT_KEYS_INVALID");
  }
  const answer = words(value.answer);
  const evidenceIdsUsed = Array.isArray(value.evidenceIdsUsed) ? value.evidenceIdsUsed.map(words) : [];
  if (!answer || !evidenceIdsUsed.length || evidenceIdsUsed.some((id) => !input.request.evidenceIds.includes(id))) {
    throw new Error("ASK_TLDR_WRITER_EVIDENCE_IDS_INVALID");
  }
  if (new Set(evidenceIdsUsed).size !== evidenceIdsUsed.length) {
    throw new Error("ASK_TLDR_WRITER_EVIDENCE_IDS_DUPLICATE");
  }
  if (!evidenceIdsUsed.includes(input.request.primaryEvidenceId)
    || words(value.primaryEvidenceId) !== input.request.primaryEvidenceId) {
    throw new Error("ASK_TLDR_WRITER_PRIMARY_EVIDENCE_NOT_USED");
  }
  if (value.whyNowEvidenceId !== null && typeof value.whyNowEvidenceId !== "string") {
    throw new Error("ASK_TLDR_WRITER_WHY_NOW_EVIDENCE_INVALID");
  }
  const whyNowEvidenceId = value.whyNowEvidenceId === null ? null : words(value.whyNowEvidenceId);
  if (whyNowEvidenceId && (!input.request.evidenceIds.includes(whyNowEvidenceId) || !evidenceIdsUsed.includes(whyNowEvidenceId))) {
    throw new Error("ASK_TLDR_WRITER_WHY_NOW_EVIDENCE_INVALID");
  }
  const usedTemporal = input.evidence.some((factor) => evidenceIdsUsed.includes(factor.id) && factor.temporalState !== "natal");
  if (usedTemporal && !whyNowEvidenceId) {
    throw new Error("ASK_TLDR_WRITER_WHY_NOW_REQUIRED");
  }
  if (value.decisionOutcomeClaimed !== false) {
    throw new Error("ASK_TLDR_WRITER_DECISION_OUTCOME_FLAG_INVALID");
  }
  const proseIssues = validateReaderProse(answer, words(input.question.pillarId), input.request.decisionMode);
  if (proseIssues.length) throw new Error(`ASK_TLDR_WRITER_PROSE_INVALID: ${proseIssues.join(",")}`);
  return {
    answer,
    evidenceIdsUsed,
    primaryEvidenceId: input.request.primaryEvidenceId,
    whyNowEvidenceId,
    decisionOutcomeClaimed: false
  };
}
