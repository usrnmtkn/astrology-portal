import { createHash } from "node:crypto";
import type { AskTldrGovernedFactor } from "./ask-tldr-governed-evidence.js";
import type { AskTldrVoiceEvidenceReceipt } from "./ask-tldr-voice-receipt.js";
import type { AskTldrWriterOutput, AskTldrWriterRequest } from "./ask-tldr-writer.js";

export const ASK_TLDR_JUDGE_CATEGORIES = [
  "question_answering",
  "astrology_fidelity",
  "factual_traceability",
  "timing_relevance",
  "lived_specificity",
  "owner_voice",
  "natural_language",
  "practical_usefulness",
  "boundary_compliance"
] as const;

export type AskTldrJudgeCategory = typeof ASK_TLDR_JUDGE_CATEGORIES[number];
export type AskTldrJudgeScores = Record<AskTldrJudgeCategory, number | null>;

export type AskTldrJudgeFinding = {
  category: AskTldrJudgeCategory;
  location: string;
  finding: string;
  evidenceIds: string[];
  ownerPassageIds: string[];
};

export type AskTldrJudgeResult = {
  scores: AskTldrJudgeScores;
  timingApplicability: { applicable: boolean; reason: string };
  overall: number;
  verdict: "pass" | "below_threshold";
  findings: AskTldrJudgeFinding[];
};

export type AskTldrJudgeRequest = {
  schema: "ask-tldr-judge-request.v1";
  runtimeEnabled: false;
  instructions: string;
  input: string;
  outputSchema: Record<string, unknown>;
  usedEvidenceIds: string[];
  ownerPassageIds: string[];
  timingApplicable: boolean;
  requestSha256: string;
};

export const ASK_TLDR_JUDGE_SCORE_FLOORS: Record<AskTldrJudgeCategory, number> = {
  question_answering: 4,
  astrology_fidelity: 4,
  factual_traceability: 4,
  timing_relevance: 3,
  lived_specificity: 3,
  owner_voice: 4,
  natural_language: 4,
  practical_usefulness: 3,
  boundary_compliance: 4
};

export const ASK_TLDR_JUDGE_OVERALL_FLOOR = 0.88;

const EVIDENCE_REQUIRED_FINDINGS = new Set<AskTldrJudgeCategory>([
  "astrology_fidelity", "factual_traceability", "timing_relevance"
]);

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function sha256Json(value: unknown) {
  return sha256(JSON.stringify(value));
}

function words(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function usedFactors(output: AskTldrWriterOutput, evidence: AskTldrGovernedFactor[]) {
  const byId = new Map(evidence.map((factor) => [factor.id, factor]));
  return output.evidenceIdsUsed.map((id) => {
    const factor = byId.get(id);
    if (!factor) throw new Error(`ASK_TLDR_JUDGE_USED_EVIDENCE_MISSING: ${id}`);
    if (factor.governedMeaning.status !== "full") throw new Error(`ASK_TLDR_JUDGE_PARTIAL_EVIDENCE_FORBIDDEN: ${id}`);
    return factor;
  });
}

function judgeInstructions() {
  return [
    "You are the release-quality reviewer for one Ask TLDR astrology answer.",
    "Judge only the supplied reader answer against the supplied question, calculated evidence, governed semantic evidence, owner-authored register passages, owner corrections, and active do-not-use rules.",
    "Do not calculate astrology. Do not reward a plausible claim that is absent from the supplied calculated evidence.",
    "Question answering: does the answer actually answer the user's question rather than drifting into a generic horoscope?",
    "Astrology fidelity: does the prose preserve the meaning and role of the supplied primary factor and any supporting factors without changing the aspect, body, house, timing, or mechanism?",
    "Factual traceability: every named date, transit, aspect, house, sign, angle, return, eclipse, or other chart fact must be traceable to USED CALCULATED EVIDENCE.",
    "Timing relevance: when temporal evidence is used, does the answer explain why this matters now or during the supplied window without inventing a new window?",
    "Lived specificity: does the answer translate the astrology into recognizable human behavior, stakes, or consequences without inventing personal history or claiming a specific event happened?",
    "Owner voice: compare sentence movement, vocabulary, directness, and stopping point to OWNER REGISTER EVIDENCE. Do not confuse semantic CMS copy with owner-authored voice evidence.",
    "Natural language: flag technically correct but written-sounding phrases, vague referents, abstract handbook language, keyword stacks, clever lines that need decoding, and unnecessary summaries.",
    "Practical usefulness: the answer should leave the reader with a concrete perspective, choice, boundary, question, or next move that follows from the astrology and the question.",
    "Boundary compliance: enforce the supplied pillar boundary and decision-support rule. Astrology must not become financial, medical, or spiritual certainty where prohibited.",
    "A score of 4 means no meaningful defect in that category. A 3 means good but with a specific fixable weakness. A 2 or below means the answer is not release quality.",
    "Do not output a pass/fail verdict. TLDR computes release status deterministically from your scores."
  ].join("\n");
}

function judgeOutputSchema(timingApplicable: boolean) {
  const scoreProperties = Object.fromEntries(ASK_TLDR_JUDGE_CATEGORIES.map((category) => [
    category,
    category === "timing_relevance" && !timingApplicable
      ? { type: "null" }
      : { type: "number", minimum: 0, maximum: 4 }
  ]));
  return {
    type: "object",
    additionalProperties: false,
    required: ["scores", "timingApplicability", "findings"],
    properties: {
      scores: {
        type: "object",
        additionalProperties: false,
        required: [...ASK_TLDR_JUDGE_CATEGORIES],
        properties: scoreProperties
      },
      timingApplicability: {
        type: "object",
        additionalProperties: false,
        required: ["applicable", "reason"],
        properties: {
          applicable: { type: "boolean", const: timingApplicable },
          reason: { type: "string", minLength: 1 }
        }
      },
      findings: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["category", "location", "finding", "evidenceIds", "ownerPassageIds"],
          properties: {
            category: { type: "string", enum: [...ASK_TLDR_JUDGE_CATEGORIES] },
            location: { type: "string" },
            finding: { type: "string" },
            evidenceIds: { type: "array", items: { type: "string" } },
            ownerPassageIds: { type: "array", items: { type: "string" } }
          }
        }
      }
    }
  };
}

export function buildAskTldrJudgeRequest(input: {
  writerRequest: AskTldrWriterRequest;
  writerOutput: AskTldrWriterOutput;
  evidence: AskTldrGovernedFactor[];
  receipt: AskTldrVoiceEvidenceReceipt;
  factLock: { passed: boolean; issues: unknown[]; checkedEvidenceIds: string[] };
}): AskTldrJudgeRequest {
  if (!input.factLock.passed) throw new Error("ASK_TLDR_JUDGE_FACT_LOCK_MUST_PASS");
  if (input.writerRequest.runtimeEnabled !== false) throw new Error("ASK_TLDR_JUDGE_WRITER_RUNTIME_UNEXPECTED");
  if (JSON.stringify(input.writerOutput.evidenceIdsUsed) !== JSON.stringify(input.factLock.checkedEvidenceIds)) {
    throw new Error("ASK_TLDR_JUDGE_FACT_LOCK_SCOPE_MISMATCH");
  }
  const factors = usedFactors(input.writerOutput, input.evidence);
  const timingApplicable = factors.some((factor) => factor.temporalState !== "natal");
  const ownerPassageIds = input.receipt.ownerPassages.map((passage) => passage.id);
  const requestWithoutHash = {
    schema: "ask-tldr-judge-request.v1" as const,
    runtimeEnabled: false as const,
    instructions: judgeInstructions(),
    input: [
      "USER QUESTION",
      words(input.receipt.question.text),
      "",
      "QUESTION CONTRACT",
      JSON.stringify(input.receipt.question, null, 2),
      "",
      "READER ANSWER",
      input.writerOutput.answer,
      "",
      "USED CALCULATED + GOVERNED EVIDENCE",
      ...factors.flatMap((factor) => [
        `--- ${factor.role.toUpperCase()} ${factor.id}`,
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
          facts: factor.facts
        }, null, 2),
        factor.governedMeaning.promptEvidence ?? "NONE"
      ]),
      "",
      "OWNER REGISTER EVIDENCE",
      ...input.receipt.ownerPassages.flatMap((passage) => [
        `--- ${passage.id}; source=${passage.sourcePath}; sha256=${passage.passageSha256}`,
        passage.text
      ]),
      "",
      "OWNER CORRECTIONS",
      ...input.receipt.ownerCorrections.flatMap((pair) => [
        `REJECTED: ${pair.before}`,
        `OWNER: ${pair.after}`,
        pair.ownerReason ? `WHY: ${pair.ownerReason}` : ""
      ]),
      "",
      "ACTIVE DO-NOT-USE RULES",
      input.receipt.doNotUse.text,
      "",
      "DETERMINISTIC FACT LOCK",
      JSON.stringify(input.factLock)
    ].filter((line) => line !== "").join("\n"),
    outputSchema: judgeOutputSchema(timingApplicable),
    usedEvidenceIds: factors.map((factor) => factor.id),
    ownerPassageIds,
    timingApplicable
  };
  return { ...requestWithoutHash, requestSha256: sha256Json(requestWithoutHash) };
}

export function validateAskTldrJudgeOutput(request: AskTldrJudgeRequest, value: unknown): AskTldrJudgeResult {
  const root = record(value);
  if (!root) throw new Error("ASK_TLDR_JUDGE_OUTPUT_OBJECT_REQUIRED");
  if (JSON.stringify(Object.keys(root).sort()) !== JSON.stringify(["findings", "scores", "timingApplicability"].sort())) {
    throw new Error("ASK_TLDR_JUDGE_OUTPUT_KEYS_INVALID");
  }
  const rawScores = record(root.scores);
  if (!rawScores || JSON.stringify(Object.keys(rawScores).sort()) !== JSON.stringify([...ASK_TLDR_JUDGE_CATEGORIES].sort())) {
    throw new Error("ASK_TLDR_JUDGE_SCORE_KEYS_INVALID");
  }
  const scores = {} as AskTldrJudgeScores;
  for (const category of ASK_TLDR_JUDGE_CATEGORIES) {
    const score = rawScores[category];
    if (category === "timing_relevance" && !request.timingApplicable) {
      if (score !== null) throw new Error("ASK_TLDR_JUDGE_TIMING_SCORE_MUST_BE_NULL");
      scores[category] = null;
      continue;
    }
    if (typeof score !== "number" || !Number.isFinite(score) || score < 0 || score > 4) {
      throw new Error(`ASK_TLDR_JUDGE_SCORE_INVALID: ${category}`);
    }
    scores[category] = score;
  }
  const applicability = record(root.timingApplicability);
  if (!applicability || applicability.applicable !== request.timingApplicable || !words(applicability.reason)) {
    throw new Error("ASK_TLDR_JUDGE_TIMING_APPLICABILITY_INVALID");
  }
  if (!Array.isArray(root.findings)) throw new Error("ASK_TLDR_JUDGE_FINDINGS_ARRAY_REQUIRED");
  const evidenceSet = new Set(request.usedEvidenceIds);
  const ownerSet = new Set(request.ownerPassageIds);
  const findings: AskTldrJudgeFinding[] = root.findings.map((candidate) => {
    const finding = record(candidate);
    if (!finding) throw new Error("ASK_TLDR_JUDGE_FINDING_OBJECT_REQUIRED");
    const category = words(finding.category) as AskTldrJudgeCategory;
    if (!ASK_TLDR_JUDGE_CATEGORIES.includes(category)) throw new Error("ASK_TLDR_JUDGE_FINDING_CATEGORY_INVALID");
    const evidenceIds = Array.isArray(finding.evidenceIds) ? finding.evidenceIds.map(words) : [];
    const ownerPassageIds = Array.isArray(finding.ownerPassageIds) ? finding.ownerPassageIds.map(words) : [];
    if (evidenceIds.some((id) => !evidenceSet.has(id)) || ownerPassageIds.some((id) => !ownerSet.has(id))) {
      throw new Error("ASK_TLDR_JUDGE_FINDING_EVIDENCE_INVALID");
    }
    if (EVIDENCE_REQUIRED_FINDINGS.has(category) && evidenceIds.length === 0) {
      throw new Error(`ASK_TLDR_JUDGE_FINDING_EVIDENCE_REQUIRED: ${category}`);
    }
    if (category === "owner_voice" && ownerPassageIds.length === 0) {
      throw new Error("ASK_TLDR_JUDGE_OWNER_VOICE_PASSAGE_REQUIRED");
    }
    return {
      category,
      location: words(finding.location),
      finding: words(finding.finding),
      evidenceIds,
      ownerPassageIds
    };
  });
  const applicableCategories = ASK_TLDR_JUDGE_CATEGORIES.filter((category) => category !== "timing_relevance" || request.timingApplicable);
  const overall = applicableCategories.reduce((sum, category) => sum + (scores[category] as number), 0) / (4 * applicableCategories.length);
  const floorsPassed = applicableCategories.every((category) => (scores[category] as number) >= ASK_TLDR_JUDGE_SCORE_FLOORS[category]);
  return {
    scores,
    timingApplicability: { applicable: request.timingApplicable, reason: words(applicability.reason) },
    overall,
    verdict: floorsPassed && overall >= ASK_TLDR_JUDGE_OVERALL_FLOOR ? "pass" : "below_threshold",
    findings
  };
}
