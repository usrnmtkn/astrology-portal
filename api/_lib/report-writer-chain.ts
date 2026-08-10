import type { ReportDraft, ReportGenerationPayload } from "./report-generation.ts";
import { reportPromptFromPayload, validateReportDraft } from "./report-generation.ts";
import { assertReportEvaluationPacketReady, completeReportUnit, reportEvaluationPacket, reportDraftMovementApplicable } from "./report-evaluation-packet.ts";
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

export type ReportRevisionReplacement = {
  defect_id: string;
  location: string;
  scope_start: number;
  scope_end: number;
  replacement: string;
};

export type ReportRevisionPatch = { replacements: ReportRevisionReplacement[] };

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

const revisionPatchSchema = {
  type: "object", additionalProperties: false, required: ["replacements"],
  properties: {
    replacements: {
      type: "array",
      items: {
        type: "object", additionalProperties: false,
        required: ["defect_id", "location", "scope_start", "scope_end", "replacement"],
        properties: {
          defect_id: { type: "string" }, location: { type: "string" },
          scope_start: { type: "integer", minimum: 0 }, scope_end: { type: "integer", minimum: 0 },
          replacement: { type: "string" }
        }
      }
    }
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

type SentenceSpan = { start: number; end: number; text: string };

function sentenceSpans(value: string): SentenceSpan[] {
  const spans: SentenceSpan[] = [];
  const matcher = /[^.!?]+[.!?]+|[^.!?]+$/gu;
  for (const match of value.matchAll(matcher)) {
    const raw = match[0];
    const leading = raw.length - raw.trimStart().length;
    const trailing = raw.length - raw.trimEnd().length;
    const start = (match.index ?? 0) + leading;
    const end = (match.index ?? 0) + raw.length - trailing;
    if (start < end) spans.push({ start, end, text: value.slice(start, end) });
  }
  return spans;
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

export class ReportRevisionScopeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReportRevisionScopeError";
  }
}

function setTextField(draft: ReportDraft, location: string, value: string) {
  if (["headline", "tldr", "summary", "body", "action", "timing"].includes(location)) {
    (draft as unknown as Record<string, unknown>)[location] = value;
    return;
  }
  const match = /^sections\.(\d+)\.(heading|body)$/u.exec(location);
  if (!match) throw new ReportRevisionScopeError(`Unknown replacement location '${location}'.`);
  const index = Number(match[1]);
  const section = draft.sections?.[index];
  if (!section) throw new ReportRevisionScopeError(`Replacement location '${location}' does not exist in the draft.`);
  section[match[2] as "heading" | "body"] = value;
}

/**
 * Applies only model-returned replacement spans. The model never returns a new
 * unit, so bytes outside named sentence ranges cannot be regenerated.
 */
export function spliceReportRevision(draft: ReportDraft, defects: ReportDefect[], patch: ReportRevisionPatch) {
  const byId = new Map(defects.map((defect) => [defect.id, defect]));
  if (byId.size !== defects.length) throw new ReportRevisionScopeError("Named defect ids must be unique.");
  if (!Array.isArray(patch.replacements) || patch.replacements.length !== defects.length) {
    throw new ReportRevisionScopeError(`Revision returned ${patch.replacements?.length ?? 0} spans for ${defects.length} named defects.`);
  }
  const seen = new Set<string>();
  const byLocation = new Map<string, Array<{ replacement: ReportRevisionReplacement; start: number; end: number }>>();
  const fields = textFields(draft);
  for (const replacement of patch.replacements) {
    const defect = byId.get(replacement.defect_id);
    if (!defect || seen.has(replacement.defect_id)) {
      throw new ReportRevisionScopeError(`Revision returned an unknown or duplicate defect id '${replacement.defect_id}'.`);
    }
    seen.add(replacement.defect_id);
    if (replacement.location !== defect.location || replacement.scope_start !== defect.scope_start || replacement.scope_end !== defect.scope_end) {
      throw new ReportRevisionScopeError(`Replacement '${replacement.defect_id}' spilled outside its supplied location/index tokens.`);
    }
    if (defect.scope_end < defect.scope_start || defect.sentence_index < defect.scope_start || defect.sentence_index > defect.scope_end) {
      throw new ReportRevisionScopeError(`Invalid named scope for '${defect.id}'.`);
    }
    const value = fields.get(defect.location);
    if (value === undefined) throw new ReportRevisionScopeError(`Replacement location '${defect.location}' is not present.`);
    const spans = sentenceSpans(value);
    const first = spans[defect.scope_start];
    const last = spans[defect.scope_end];
    if (!first || !last) throw new ReportRevisionScopeError(`Replacement '${defect.id}' references a sentence outside '${defect.location}'.`);
    const entries = byLocation.get(defect.location) ?? [];
    if (entries.some((entry) => first.start < entry.end && last.end > entry.start)) {
      throw new ReportRevisionScopeError(`Replacement '${defect.id}' overlaps another named scope.`);
    }
    entries.push({ replacement, start: first.start, end: last.end });
    byLocation.set(defect.location, entries);
  }

  const revised = structuredClone(draft);
  for (const [location, entries] of byLocation) {
    const original = fields.get(location) ?? "";
    let next = original;
    for (const entry of entries.sort((a, b) => b.start - a.start)) {
      next = `${next.slice(0, entry.start)}${entry.replacement.replacement}${next.slice(entry.end)}`;
    }
    setTextField(revised, location, next);
  }

  // Belt-and-suspenders: reconstruct independently from the original bytes and
  // assert the output contains exactly those splices and no other mutation.
  const revisedFields = textFields(revised);
  for (const [location, original] of fields) {
    const entries = byLocation.get(location) ?? [];
    let expected = original;
    for (const entry of [...entries].sort((a, b) => b.start - a.start)) {
      expected = `${expected.slice(0, entry.start)}${entry.replacement.replacement}${expected.slice(entry.end)}`;
    }
    if (revisedFields.get(location) !== expected) throw new ReportStopRuleError([location]);
  }
  return revised;
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
  // Fail closed before draft generation: a packet missing owner comparisons
  // must never consume a billed provider call.
  assertReportEvaluationPacketReady(payload);
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
  const reviseResult = await callModel<ReportRevisionPatch>({
    ...target,
    prompt: [
      "Return replacement spans only. Do not return or regenerate the complete unit.",
      "Return exactly one replacement for every named defect in this single response. Copy defect_id, location, scope_start, and scope_end exactly. Replacement text is inserted only inside that supplied range. Any changed location/index token is rejected as scope spill.",
      "The complete unit is read-only context. Text outside named spans is structurally unavailable for revision.",
      `COMPLETE_UNIT_READ_ONLY\n${completeReportUnit(draftResult.value)}`,
      `NAMED_DEFECTS_AND_INSTRUCTIONS\n${JSON.stringify(critique.defects)}`,
      `CANONICAL_OWNER_RULING\n${payload.canonicalOwnerPrompt.text}`,
      `LIVED_PROSE_OWNER_RULING\n${payload.livedProseStandard.text}`
    ].join("\n\n"),
    schemaName: "report_unit_revision_spans",
    schema: revisionPatchSchema
  });
  calls.push({ stage: "revise", model: reviseResult.model, provider: reviseResult.provider, usage: reviseResult.usage });
  const revised = spliceReportRevision(draftResult.value, critique.defects, reviseResult.value);
  return { draft: draftResult.value, critique, revised, calls, promptVersion: critiquePrompt.version };
}
