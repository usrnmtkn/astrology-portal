import type { ReportDraft, ReportGenerationPayload } from "./report-generation.ts";
import { reportPromptFromPayload, validateReportDraft } from "./report-generation.ts";
import { reportEvaluationPacket, reportDraftMovementApplicable } from "./report-evaluation-packet.ts";
import { verifyReportFactLock } from "./report-fact-lock.ts";
import { callReportModel, type ReportModelCall, type ReportModelUsage, writerModelTarget } from "./report-model-client.ts";
import { loadVersionedReportPrompt, REPORT_CRITIQUE_PROMPT_PATH } from "./report-prompt-versions.ts";
import { scopeReportPayloadToUnit } from "./report-unit-scope.ts";

export const REPORT_DEFECT_CATEGORIES = [
  "astrology_chronology",
  "factual_traceability",
  "unlived_abstraction",
  "owner_voice_drift",
  "interpretive_gap",
  "unnatural_phrasing",
  "repeated_generated_syntax",
  "emotional_temperature",
  "keyword_stack",
  "density_violation"
] as const;
export type ReportDefectCategory = typeof REPORT_DEFECT_CATEGORIES[number];

export type ReportDefect = {
  id: string;
  category: ReportDefectCategory;
  location: string;
  sentence_index: number;
  scope_start: number;
  scope_end: number;
  quote: string;
  evidence: string;
  evidence_ids: string[];
  instruction: string;
};

export type ReportCritique = {
  result: "no_defects" | "defects";
  applicability: { interpretive_movement: "applicable" | "not_applicable"; reason: string };
  defects: ReportDefect[];
};
export type ReportWriterChainResult = {
  draft: ReportDraft;
  critique: ReportCritique;
  revised: ReportDraft;
  calls: Array<{ stage: "draft" | "critique" | "revise"; model: string; provider: string; usage: ReportModelUsage }>;
  promptVersion: string;
};

const draftSchema = {
  type: "object",
  additionalProperties: false,
  required: ["headline", "tldr", "summary", "body", "action", "timing", "sections"],
  properties: {
    headline: { type: "string" }, tldr: { type: "string" }, summary: { type: "string" },
    body: { type: "string" }, action: { type: "string" }, timing: { type: "string" },
    sections: { type: "array", items: { type: "object", additionalProperties: false, required: ["heading", "body"], properties: { heading: { type: "string" }, body: { type: "string" } } } }
  }
};

const critiqueSchema = {
  type: "object", additionalProperties: false, required: ["result", "applicability", "defects"],
  properties: {
    result: { type: "string", enum: ["no_defects", "defects"] },
    applicability: {
      type: "object", additionalProperties: false,
      required: ["interpretive_movement", "reason"],
      properties: {
        interpretive_movement: { type: "string", enum: ["applicable", "not_applicable"] },
        reason: { type: "string" }
      }
    },
    defects: { type: "array", items: { type: "object", additionalProperties: false,
      required: ["id", "category", "location", "sentence_index", "scope_start", "scope_end", "quote", "evidence", "evidence_ids", "instruction"],
      properties: {
        id: { type: "string" }, category: { type: "string", enum: [...REPORT_DEFECT_CATEGORIES] },
        location: { type: "string" }, sentence_index: { type: "integer", minimum: 0 },
        scope_start: { type: "integer", minimum: 0 }, scope_end: { type: "integer", minimum: 0 },
        quote: { type: "string" }, evidence: { type: "string" },
        evidence_ids: { type: "array", items: { type: "string" } }, instruction: { type: "string" }
      }
    } }
  }
};

const FLATNESS_DIAGNOSTIC_ROUTING = `FLATNESS / LIVED PROSE
Apply the lived-prose standard's ten-question final flatness check as a diagnostic group. It does not create a new defect enum.
Questions 1-3 route to unlived_abstraction.
Questions 4-5 route to interpretive_gap and/or owner_voice_drift when supported.
Question 6 routes to owner_voice_drift.
Question 7 routes to density_violation.
Question 8 routes to owner_voice_drift and/or density_violation.
Question 9 routes to unlived_abstraction or owner_voice_drift only with comparison evidence. It is corroborative only and can never be the sole basis for a defect.
Question 10 routes to density_violation.
Never return flatness or lived_prose as a defect category.`;

function sentences(value: string) {
  return value.match(/[^.!?]+[.!?]+|[^.!?]+$/gu)?.map((sentence) => sentence.trim()).filter(Boolean) ?? [];
}

function textFields(draft: ReportDraft) {
  return new Map<string, string>([
    ["headline", draft.headline ?? ""], ["tldr", draft.tldr ?? ""], ["summary", draft.summary ?? ""],
    ["body", draft.body ?? ""], ["action", draft.action ?? ""], ["timing", draft.timing ?? ""],
    ...(draft.sections ?? []).flatMap((section, index) => [
      [`sections.${index}.heading`, section.heading ?? ""] as [string, string],
      [`sections.${index}.body`, section.body ?? ""] as [string, string]
    ])
  ]);
}

export class ReportStopRuleError extends Error {
  readonly changedLocations: string[];

  constructor(changedLocations: string[]) {
    super(`Revise changed unnamed sentences: ${changedLocations.join(", ")}`);
    this.name = "ReportStopRuleError";
    this.changedLocations = changedLocations;
  }
}

export function enforceReportRevisionStopRule(draft: ReportDraft, revised: ReportDraft, defects: ReportDefect[]) {
  const named = new Set<string>();
  for (const defect of defects) {
    const start = defect.scope_start ?? defect.sentence_index;
    const end = defect.scope_end ?? defect.sentence_index;
    if (end < start || defect.sentence_index < start || defect.sentence_index > end) {
      throw new Error(`Invalid report defect scope for ${defect.id}: ${start}-${end} (representative ${defect.sentence_index}).`);
    }
    for (let index = start; index <= end; index += 1) named.add(`${defect.location}:${index}`);
  }
  const before = textFields(draft);
  const after = textFields(revised);
  const changed: string[] = [];
  for (const [location, value] of before) {
    const beforeSentences = sentences(value);
    const afterSentences = sentences(after.get(location) ?? "");
    const length = Math.max(beforeSentences.length, afterSentences.length);
    for (let index = 0; index < length; index += 1) {
      if (beforeSentences[index] !== afterSentences[index] && !named.has(`${location}:${index}`)) {
        changed.push(`${location}:${index}`);
      }
    }
  }
  for (const location of after.keys()) if (!before.has(location)) changed.push(`${location}:new`);
  if (changed.length) throw new ReportStopRuleError(changed);
  return revised;
}

export async function runReportWriterChain(input: {
  payload: ReportGenerationPayload;
  failureContext?: string[];
  callModel?: ReportModelCall;
}): Promise<ReportWriterChainResult> {
  const callModel = input.callModel ?? callReportModel;
  const target = writerModelTarget();
  const payload = scopeReportPayloadToUnit(input.payload);
  const critiquePrompt = loadVersionedReportPrompt(REPORT_CRITIQUE_PROMPT_PATH);
  const calls: ReportWriterChainResult["calls"] = [];
  const draftResult = await callModel<ReportDraft>({
    ...target,
    prompt: [reportPromptFromPayload(payload), input.failureContext?.length ? `FAILURE_CONTEXT\n${input.failureContext.join("\n")}` : "", "Return one report unit using the structured output contract."].filter(Boolean).join("\n\n"),
    schemaName: "report_unit_draft",
    schema: draftSchema
  });
  calls.push({ stage: "draft", model: draftResult.model, provider: draftResult.provider, usage: draftResult.usage });
  const packet = reportEvaluationPacket(payload, draftResult.value);
  const deterministicIssues = [
    ...validateReportDraft(draftResult.value, payload),
    ...verifyReportFactLock(draftResult.value, payload.frozenFacts).issues
  ];
  const critiqueResult = await callModel<ReportCritique>({
    ...target,
    prompt: [
      critiquePrompt.text,
      `CANONICAL_PROMPT\n${payload.canonicalOwnerPrompt.text}`,
      `LIVED_PROSE_STANDARD\n${payload.livedProseStandard.text}`,
      FLATNESS_DIAGNOSTIC_ROUTING,
      `PRODUCTION_LOCATION_CONTRACT\n${packet.locationContract}`,
      `COMPLETE_UNIT\n${packet.completeUnit}`,
      `UNIT_FACTS\n${JSON.stringify(packet.unitFacts)}`,
      `OWNER_COMPARISON_SET\n${JSON.stringify(packet.ownerComparisonSet)}`,
      `TARGET_FUNCTIONS\n${JSON.stringify(packet.targetFunctions)}`,
      `LABELED_NEGATIVE_EXAMPLES\n${JSON.stringify(packet.labeledNegativeExamples)}`,
      `VALIDATOR_RESULTS\n${JSON.stringify(deterministicIssues)}`
    ].join("\n\n"),
    schemaName: "report_unit_critique",
    schema: critiqueSchema
  });
  calls.push({ stage: "critique", model: critiqueResult.model, provider: critiqueResult.provider, usage: critiqueResult.usage });
  const movementApplicable = reportDraftMovementApplicable(draftResult.value);
  const critique: ReportCritique = {
    ...critiqueResult.value,
    applicability: {
      interpretive_movement: movementApplicable ? "applicable" : "not_applicable",
      reason: movementApplicable
        ? "The complete unit contains at least two substantive prose paragraphs."
        : "The complete unit contains fewer than two substantive prose paragraphs."
    }
  };
  if (!movementApplicable && critique.defects.some((defect) => defect.category === "interpretive_gap")) {
    throw new Error("V3 critique returned interpretive_gap for a unit where interpretive movement is not applicable.");
  }
  const eligibleEvidence = new Set(packet.ownerComparisonSet.map((passage) => passage.evidenceId));
  for (const defect of critique.defects.filter((candidate) => candidate.category === "owner_voice_drift")) {
    if (!defect.evidence_ids.length || defect.evidence_ids.some((id) => !eligibleEvidence.has(id))) {
      throw new Error(`V3 owner_voice_drift defect ${defect.id} lacks eligible comparison evidence.`);
    }
  }
  if (critique.result === "no_defects" || critique.defects.length === 0) {
    return { draft: draftResult.value, critique: { ...critique, result: "no_defects", defects: [] }, revised: draftResult.value, calls, promptVersion: critiquePrompt.version };
  }
  const reviseResult = await callModel<ReportDraft>({
    ...target,
    prompt: [
      "Revise only the explicitly named sentence or scope range. Everything outside every named scope must remain byte-identical.",
      `DRAFT\n${JSON.stringify(draftResult.value)}`,
      `NAMED_DEFECTS\n${JSON.stringify(critique.defects)}`
    ].join("\n\n"),
    schemaName: "report_unit_revision",
    schema: draftSchema
  });
  calls.push({ stage: "revise", model: reviseResult.model, provider: reviseResult.provider, usage: reviseResult.usage });
  const revised = enforceReportRevisionStopRule(draftResult.value, reviseResult.value, critique.defects);
  return { draft: draftResult.value, critique, revised, calls, promptVersion: critiquePrompt.version };
}
