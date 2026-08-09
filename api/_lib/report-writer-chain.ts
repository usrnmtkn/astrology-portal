import type { ReportDraft, ReportGenerationPayload } from "./report-generation.ts";
import { reportPromptFromPayload } from "./report-generation.ts";
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
  quote: string;
  evidence: string;
  instruction: string;
};

export type ReportCritique = { result: "no_defects" | "defects"; defects: ReportDefect[] };
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
  type: "object", additionalProperties: false, required: ["result", "defects"],
  properties: {
    result: { type: "string", enum: ["no_defects", "defects"] },
    defects: { type: "array", items: { type: "object", additionalProperties: false,
      required: ["id", "category", "location", "sentence_index", "quote", "evidence", "instruction"],
      properties: {
        id: { type: "string" }, category: { type: "string", enum: [...REPORT_DEFECT_CATEGORIES] },
        location: { type: "string" }, sentence_index: { type: "integer", minimum: 0 }, quote: { type: "string" }, evidence: { type: "string" }, instruction: { type: "string" }
      }
    } }
  }
};

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
  const named = new Set(defects.map((defect) => `${defect.location}:${defect.sentence_index}`));
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
  const critiqueResult = await callModel<ReportCritique>({
    ...target,
    prompt: `${critiquePrompt.text}\n\nCANONICAL_PROMPT\n${payload.canonicalOwnerPrompt.text}\n\nSCOPED_FACTS\n${JSON.stringify(payload.frozenFacts)}\n\nOWNER_REFERENCE_EVIDENCE\n${JSON.stringify(payload.voiceEvidence)}\n\nDRAFT\n${JSON.stringify(draftResult.value)}`,
    schemaName: "report_unit_critique",
    schema: critiqueSchema
  });
  calls.push({ stage: "critique", model: critiqueResult.model, provider: critiqueResult.provider, usage: critiqueResult.usage });
  if (critiqueResult.value.result === "no_defects" || critiqueResult.value.defects.length === 0) {
    return { draft: draftResult.value, critique: { result: "no_defects", defects: [] }, revised: draftResult.value, calls, promptVersion: critiquePrompt.version };
  }
  const reviseResult = await callModel<ReportDraft>({
    ...target,
    prompt: [
      "Revise only the named sentences. Every unnamed sentence must remain byte-identical.",
      `DRAFT\n${JSON.stringify(draftResult.value)}`,
      `NAMED_DEFECTS\n${JSON.stringify(critiqueResult.value.defects)}`
    ].join("\n\n"),
    schemaName: "report_unit_revision",
    schema: draftSchema
  });
  calls.push({ stage: "revise", model: reviseResult.model, provider: reviseResult.provider, usage: reviseResult.usage });
  const revised = enforceReportRevisionStopRule(draftResult.value, reviseResult.value, critiqueResult.value.defects);
  return { draft: draftResult.value, critique: critiqueResult.value, revised, calls, promptVersion: critiquePrompt.version };
}
