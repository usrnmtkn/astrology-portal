import type { ReportDraft, ReportGenerationPayload, ReportValidationIssue } from "./report-generation.ts";
import { reportPromptFromPayload, validateReportDraft } from "./report-generation.js";
import {
  assertReportEvaluationPacketReady, completeReportUnit, reportEvaluationPacket,
  reportDraftMovementApplicable, reportUnitCoordinates
} from "./report-evaluation-packet.js";
import { verifyReportFactLock } from "./report-fact-lock.js";
import { callReportModel, type ReportModelCall, type ReportModelUsage, writerModelTarget } from "./report-model-client.js";
import { loadActiveReportCritiquePrompt } from "./report-prompt-versions.js";
import { scopeReportPayloadToUnit } from "./report-unit-scope.js";

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
type ReportColdReadDefect = Omit<ReportDefect, "location" | "sentence_index" | "scope_start" | "scope_end"> & {
  address_token: string;
};
type ReportColdReadCritique = {
  result: "no_defects" | "defects";
  applicability: { interpretive_movement: "applicable" | "not_applicable"; reason: string };
  defects: ReportColdReadDefect[];
};
export type ReportWriterChainCall = {
  stage: "draft" | "critique" | "revise" | "cold_read" | "cold_revise";
  model: string;
  provider: string;
  usage: ReportModelUsage;
};

export type ReportWriterChainCheckpoint = {
  schema: "report-writer-chain-checkpoint.v1";
  chainKey: string;
  unitId: string;
  completedStage: "draft" | "critique" | "revision" | "cold_read" | "cold_revision";
  draft: ReportDraft;
  critique?: ReportCritique;
  revised?: ReportDraft;
  coldCritique?: ReportCritique;
  calls: ReportWriterChainCall[];
  promptVersion: string;
};

export type ReportWriterChainResult = {
  draft: ReportDraft;
  critique: ReportCritique;
  revised: ReportDraft;
  coldCritique: ReportCritique;
  calls: ReportWriterChainCall[];
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

type MechanicalValidationIssue = ReportValidationIssue;

const EXACT_SENTENCE_LINT_CODES = new Set([
  "em_dash", "whether", "astrologer_persona",
  "writer_note_leakage", "generic_advice", "internal_scaffold_leakage",
  "vague_noun", "banned_settled", "astrology_as_agent", "labor_for_work", "no_cleverness_tax",
  "love_banned_vocabulary", "personal_health_banned_advice"
]);

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

function coldReadCritiqueSchema(draft: ReportDraft, movementApplicable: boolean) {
  const addressTokens = reportUnitCoordinates(draft).map((coordinate) => coordinate.token);
  if (!addressTokens.length) throw new ReportRevisionScopeError("Cold-read unit has no supplied address tokens.");
  const categories = movementApplicable
    ? [...REPORT_DEFECT_CATEGORIES]
    : REPORT_DEFECT_CATEGORIES.filter((category) => category !== "interpretive_gap");
  const movement = movementApplicable ? "applicable" : "not_applicable";
  return {
    type: "object", additionalProperties: false, required: ["result", "applicability", "defects"],
    properties: {
      result: { type: "string", enum: ["no_defects", "defects"] },
      applicability: {
        type: "object", additionalProperties: false,
        required: ["interpretive_movement", "reason"],
        properties: {
          interpretive_movement: { type: "string", enum: [movement] },
          reason: { type: "string" }
        }
      },
      defects: {
        type: "array",
        items: {
          type: "object", additionalProperties: false,
          required: ["id", "category", "address_token", "quote", "evidence", "evidence_ids", "instruction"],
          properties: {
            id: { type: "string" }, category: { type: "string", enum: categories },
            address_token: { type: "string", enum: addressTokens },
            quote: { type: "string" }, evidence: { type: "string" },
            evidence_ids: { type: "array", items: { type: "string" } }, instruction: { type: "string" }
          }
        }
      }
    }
  };
}

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

function issueCategory(code: string): ReportDefectCategory {
  if (/untraceable|next_year|saturn_return/iu.test(code)) return "factual_traceability";
  if (/menu_size|lexical_budget|isolated_one_liners|status_branching|repeated|duplicate|modal_budget/iu.test(code)) return "density_violation";
  if (/possibility_language|do_not_assume|invention|specificity/iu.test(code)) return "astrology_chronology";
  if (/no_cleverness|vague_noun|astrology_as_agent|labor_for_work|mechanism_grounding/iu.test(code)) return "owner_voice_drift";
  return "unnatural_phrasing";
}

function mechanicalInstruction(issue: MechanicalValidationIssue, noun?: string) {
  switch (issue.code) {
    case "menu_size":
      return "Reduce the quoted sentence to at most five items. Preserve its fact, attribution, and possibility framing.";
    case "lexical_budget":
      return `Replace the over-budget noun '${noun ?? "the repeated noun"}' in the quoted sentence with a precise context-fitting alternative. Preserve the fact and meaning.`;
    case "possibility_language":
      return "Add may, can, could, or might to the quoted sentence so the manifestation remains a possibility rather than an asserted event.";
    case "do_not_assume":
      return "Remove the unsupported assumption from the quoted sentence or recast it as a chart-earned possibility without inventing reader circumstances.";
    case "em_dash":
      return "Replace the em dash in the quoted sentence with permitted punctuation without changing its meaning.";
    case "whether":
      return "Rewrite the quoted sentence without the word whether while preserving its branches and meaning.";
    case "astrologer_persona":
      return "Remove the astrologer persona from the quoted sentence and state the supported interpretation directly.";
    case "writer_note_leakage":
    case "internal_scaffold_leakage":
      return "Remove the internal writer-facing language from the quoted sentence and preserve only reader-facing meaning.";
    case "generic_advice":
      return "Replace the generic advice in the quoted sentence with one situated, observable consequence already supported by the unit facts.";
    case "vague_noun":
      return "Replace the vague noun 'things' with the supported behavior, circumstance, decision, or consequence.";
    case "banned_settled":
      return "Replace the abstract 'not settled' disclaimer with the concrete decision or range of chart-earned outcomes.";
    case "astrology_as_agent":
      return "State the astrological mechanism directly without making the year, eclipse, transit, profection, or Solar Return ask, want, invite, or encourage anything.";
    case "labor_for_work":
      return "Replace 'labor' with the concrete kind of work, task, responsibility, or household work meant in this sentence.";
    case "no_cleverness_tax":
      return "Rewrite the quoted sentence so it names the observable behavior, circumstance, decision, or consequence directly. The reader must not have to decode a metaphor, compressed phrase, or abstract noun.";
    case "mechanism_grounding":
      return "Ensure the enclosing section names the astrological mechanism and this capacity passage names a concrete cost in hours, sleep, meals, appointments, travel, preparation, follow-up, workload, recovery, caregiving, schedule, money, or expenses. Do not turn the passage into generic balance advice.";
    case "money_abstraction":
      return "Translate the abstraction in the quoted sentence into rate, hours, expenses, scope, payment timing, or another supported concrete financial term.";
    case "love_banned_vocabulary":
    case "personal_health_banned_advice":
      return "Replace the banned phrase in the quoted sentence with status-neutral, chart-earned language.";
    case "status_branching":
      return "Replace the relationship-status branch in the quoted sentence with one status-neutral formulation.";
    case "sex_invention":
    case "personal_health_medical_invention":
    case "personal_health_spirituality_invention":
      return "Remove the unsupported condition from the quoted sentence; do not substitute a different invented condition.";
    case "personal_health_moralizing":
      return "Remove the reward-or-deserving frame from the quoted sentence while preserving the practical capacity point.";
    case "untraceable_date":
    case "untraceable_degree":
    case "untraceable_attribution":
      return "Remove or replace the untraceable claim in the quoted sentence using only a value present in the scoped frozen facts.";
    case "next_year_in_current_review":
      return "Remove the next-year event from the current-year review sentence without moving or inventing another event.";
    case "saturn_return_non_return_year":
      return "Remove the Saturn Return claim from the quoted sentence while preserving only aspects present in the scoped facts.";
    case "deep_dive_key_date_format":
      return "Rewrite only the quoted key-date line as DATE · TITLE · one sentence · attribution, with no category tag.";
    default:
      return `Correct only the deterministic '${issue.code}' failure in the quoted sentence: ${issue.message}`;
  }
}

function normalizedNeedle(value: string) {
  return value.trim().replace(/^['"“”]|['"“”]$/gu, "").replace(/[.]+$/u, "").toLowerCase();
}

function locatedSentences(draft: ReportDraft, needle?: string) {
  const normalized = needle ? normalizedNeedle(needle) : "";
  const matches: Array<{ location: string; sentenceIndex: number; quote: string }> = [];
  for (const [location, value] of textFields(draft)) {
    for (const [sentenceIndex, span] of sentenceSpans(value).entries()) {
      if (!normalized || span.text.toLowerCase().includes(normalized)) {
        matches.push({ location, sentenceIndex, quote: span.text });
      }
    }
  }
  return matches;
}

function issueNeedle(issue: MechanicalValidationIssue) {
  if (issue.value) return issue.value;
  if (issue.code === "em_dash") return "—";
  if (issue.code === "whether") return "whether";
  const afterColon = issue.message.includes(": ") ? issue.message.slice(issue.message.lastIndexOf(": ") + 2) : "";
  if (afterColon && afterColon.split(/\s+/u).length > 1) return afterColon;
  const phrase = /(?:contains|language|terms?|condition|item|fact):\s*([^.]*)/iu.exec(issue.message)?.[1];
  return phrase?.trim() || afterColon || "";
}

function exactIssueMatches(draft: ReportDraft, issue: MechanicalValidationIssue) {
  if (issue.location !== undefined || issue.sentenceIndex !== undefined || issue.quote !== undefined) {
    if (!issue.location || !Number.isInteger(issue.sentenceIndex) || !issue.quote) {
      throw new ReportRevisionScopeError(`Deterministic lint '${issue.code}' has an incomplete sentence coordinate.`);
    }
    const value = textFields(draft).get(issue.location);
    const span = value === undefined ? undefined : sentenceSpans(value)[issue.sentenceIndex as number];
    if (!span || span.text !== issue.quote) {
      throw new ReportRevisionScopeError(`Deterministic lint '${issue.code}' does not match its supplied sentence coordinate.`);
    }
    return [{ location: issue.location, sentenceIndex: issue.sentenceIndex as number, quote: span.text }];
  }
  if (issue.code === "astrologer_persona") {
    return locatedSentences(draft).filter(({ quote }) => /\b(?:i think|i'm watching|i am watching|this makes me think)\b/iu.test(quote));
  }
  return locatedSentences(draft, issueNeedle(issue));
}

/**
 * Converts deterministic validator and fact-lock findings into sentence-scoped
 * defects. These are fed to the same splice-only revision call as critique
 * defects; they never trigger whole-unit regeneration.
 */
export function reportValidationIssuesToNamedDefects(
  draft: ReportDraft,
  issues: MechanicalValidationIssue[],
  signatureNounCap = 3
) {
  const defects: ReportDefect[] = [];
  for (const [issueIndex, issue] of issues.entries()) {
    if (issue.code === "lexical_budget") {
      const noun = issue.message.match(/^(.+?) exceeds the configured lexical budget\./u)?.[1]?.trim() ?? "";
      const occurrences = noun ? locatedSentences(draft, noun) : [];
      const excess = occurrences.slice(signatureNounCap);
      for (const [matchIndex, match] of (excess.length ? excess : occurrences.slice(-1)).entries()) {
        defects.push({
          id: `validator-${issueIndex + 1}-${matchIndex + 1}-${issue.code}`,
          category: issueCategory(issue.code), location: match.location,
          sentence_index: match.sentenceIndex, scope_start: match.sentenceIndex, scope_end: match.sentenceIndex,
          quote: match.quote, evidence: issue.message, evidence_ids: [],
          instruction: mechanicalInstruction(issue, noun)
        });
      }
      continue;
    }
    if (EXACT_SENTENCE_LINT_CODES.has(issue.code)) {
      const matches = exactIssueMatches(draft, issue);
      if (!matches.length) {
        throw new ReportRevisionScopeError(`Deterministic lint '${issue.code}' could not be localized to an exact sentence.`);
      }
      for (const [matchIndex, match] of matches.entries()) {
        defects.push({
          id: `validator-${issueIndex + 1}-${matchIndex + 1}-${issue.code}`,
          category: issueCategory(issue.code), location: match.location,
          sentence_index: match.sentenceIndex, scope_start: match.sentenceIndex, scope_end: match.sentenceIndex,
          quote: match.quote, evidence: issue.message, evidence_ids: [],
          instruction: mechanicalInstruction(issue)
        });
      }
      continue;
    }
    const matches = locatedSentences(draft, issueNeedle(issue));
    const match = matches[0] ?? locatedSentences(draft)[0];
    if (!match) continue;
    defects.push({
      id: `validator-${issueIndex + 1}-1-${issue.code}`,
      category: issueCategory(issue.code), location: match.location,
      sentence_index: match.sentenceIndex, scope_start: match.sentenceIndex, scope_end: match.sentenceIndex,
      quote: match.quote, evidence: issue.message, evidence_ids: [],
      instruction: mechanicalInstruction(issue)
    });
  }
  return defects;
}

/**
 * Critiques may independently identify the same sentence or intersecting
 * sentence ranges. Merge those ranges transitively before asking for prose so
 * the provider returns one replacement with every applicable instruction.
 */
export function mergeOverlappingReportDefects(draft: ReportDraft, defects: ReportDefect[]) {
  const fields = textFields(draft);
  for (const defect of defects) assertReportDefectBounds(fields, defect);
  const sorted = [...defects].sort((a, b) => (
    a.location.localeCompare(b.location)
    || a.scope_start - b.scope_start
    || a.scope_end - b.scope_end
    || a.id.localeCompare(b.id)
  ));
  const groups: ReportDefect[][] = [];
  for (const defect of sorted) {
    const current = groups.at(-1);
    const currentEnd = current ? Math.max(...current.map((entry) => entry.scope_end)) : -1;
    if (current && current[0].location === defect.location && defect.scope_start <= currentEnd) current.push(defect);
    else groups.push([defect]);
  }
  return groups.map((group) => {
    if (group.length === 1) return group[0];
    const location = group[0].location;
    if (group.some((defect) => defect.location !== location)) {
      throw new ReportRevisionScopeError("Named defects from different locations cannot share a merged replacement scope.");
    }
    const scopeStart = Math.min(...group.map((defect) => defect.scope_start));
    const scopeEnd = Math.max(...group.map((defect) => defect.scope_end));
    const spans = sentenceSpans(fields.get(location) ?? "");
    const first = spans[scopeStart];
    const last = spans[scopeEnd];
    if (!first || !last) throw new ReportRevisionScopeError(`Merged replacement scope is outside '${location}'.`);
    return {
      id: `merged:${group.map((defect) => defect.id).join("+")}`,
      category: group[0].category,
      location,
      sentence_index: Math.min(...group.map((defect) => defect.sentence_index)),
      scope_start: scopeStart,
      scope_end: scopeEnd,
      quote: (fields.get(location) ?? "").slice(first.start, last.end),
      evidence: group.map((defect) => `[${defect.id}:${defect.category}] ${defect.evidence}`).join("\n"),
      evidence_ids: [...new Set(group.flatMap((defect) => defect.evidence_ids))],
      instruction: group.map((defect) => `[${defect.id}:${defect.category}] ${defect.instruction}`).join("\n")
    } satisfies ReportDefect;
  });
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

function assertReportDefectBounds(fields: Map<string, string>, defect: ReportDefect) {
  const value = fields.get(defect.location);
  if (value === undefined) throw new ReportRevisionScopeError(`Replacement location '${defect.location}' is not present.`);
  if (!Number.isInteger(defect.sentence_index) || !Number.isInteger(defect.scope_start) || !Number.isInteger(defect.scope_end)
    || defect.scope_end < defect.scope_start || defect.sentence_index < defect.scope_start || defect.sentence_index > defect.scope_end) {
    throw new ReportRevisionScopeError(`Invalid named scope for '${defect.id}'.`);
  }
  const spans = sentenceSpans(value);
  if (!spans[defect.scope_start] || !spans[defect.scope_end]) {
    throw new ReportRevisionScopeError(`Replacement '${defect.id}' references a sentence outside '${defect.location}'.`);
  }
}

function quoteSentenceRange(value: string, quote: string) {
  const expected = quote.trim();
  const spans = sentenceSpans(value);
  for (let start = 0; start < spans.length; start += 1) {
    for (let end = start; end < spans.length; end += 1) {
      if (value.slice(spans[start].start, spans[end].end).trim() === expected) return { start, end };
    }
  }
  return null;
}

export function normalizeReportColdReadCritique(
  draft: ReportDraft,
  critique: ReportColdReadCritique,
  movementApplicable = reportDraftMovementApplicable(draft)
): ReportCritique {
  const coordinates = new Map(reportUnitCoordinates(draft).map((coordinate) => [coordinate.token, coordinate]));
  const defects: ReportDefect[] = [];
  for (const finding of critique.defects) {
    // The dynamic provider schema excludes this category. Suppression here is
    // the fail-safe for mocks or providers that bypass structured validation.
    if (!movementApplicable && finding.category === "interpretive_gap") continue;
    const coordinate = coordinates.get(finding.address_token);
    if (!coordinate) {
      throw new ReportRevisionScopeError(`Cold-read address token '${finding.address_token}' was not supplied.`);
    }
    const localRange = quoteSentenceRange(coordinate.text, finding.quote);
    if (!localRange) {
      throw new ReportRevisionScopeError(`Cold-read quote for '${finding.id}' is not an exact sentence span at '${finding.address_token}'.`);
    }
    const scopeStart = coordinate.sentenceStartIndex + localRange.start;
    const scopeEnd = coordinate.sentenceStartIndex + localRange.end;
    defects.push({
      id: finding.id,
      category: finding.category,
      location: coordinate.location,
      sentence_index: scopeStart,
      scope_start: scopeStart,
      scope_end: scopeEnd,
      quote: finding.quote,
      evidence: finding.evidence,
      evidence_ids: finding.evidence_ids,
      instruction: finding.instruction
    });
  }
  const applicability = {
    interpretive_movement: movementApplicable ? "applicable" as const : "not_applicable" as const,
    reason: movementApplicable
      ? "The rendered unit contains at least two substantive prose paragraphs."
      : "The rendered unit contains fewer than two substantive prose paragraphs."
  };
  return { result: defects.length ? "defects" : "no_defects", applicability, defects };
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

export async function reviseReportDraftForNamedDefects(input: {
  payload: ReportGenerationPayload;
  draft: ReportDraft;
  defects: ReportDefect[];
  callModel?: ReportModelCall;
  stage?: "revise" | "cold_revise";
}) {
  const callModel = input.callModel ?? callReportModel;
  const target = writerModelTarget();
  const payload = scopeReportPayloadToUnit(input.payload);
  assertReportEvaluationPacketReady(payload);
  const defects = mergeOverlappingReportDefects(input.draft, input.defects);
  if (!defects.length) return { revised: input.draft, defects, calls: [] as ReportWriterChainResult["calls"] };
  const reviseResult = await callModel<ReportRevisionPatch>({
    ...target,
    prompt: [
      "Return replacement spans only. Do not return or regenerate the complete unit.",
      "Overlapping named defects have already been merged deterministically. Return exactly one replacement for every supplied scope in this single response. Copy defect_id, location, scope_start, and scope_end exactly. The combined instruction on a merged scope is atomic: satisfy every listed instruction in its one replacement. Any changed location/index token is rejected as scope spill.",
      "The complete unit is read-only context. Text outside named spans is structurally unavailable for revision.",
      `COMPLETE_UNIT_READ_ONLY\n${completeReportUnit(input.draft)}`,
      `NAMED_DEFECTS_AND_INSTRUCTIONS\n${JSON.stringify(defects)}`,
      `CANONICAL_OWNER_RULING\n${payload.canonicalOwnerPrompt.text}`,
      `LIVED_PROSE_OWNER_RULING\n${payload.livedProseStandard.text}`
    ].join("\n\n"),
    schemaName: "report_unit_revision_spans",
    schema: revisionPatchSchema
  });
  const calls: ReportWriterChainResult["calls"] = [{
    stage: input.stage ?? "revise", model: reviseResult.model, provider: reviseResult.provider, usage: reviseResult.usage
  }];
  return { revised: spliceReportRevision(input.draft, defects, reviseResult.value), defects, calls };
}

export async function runReportWriterChain(input: {
  payload: ReportGenerationPayload;
  failureContext?: string[];
  callModel?: ReportModelCall;
  chainKey?: string;
  checkpoint?: ReportWriterChainCheckpoint;
  persistCheckpoint?: (checkpoint: ReportWriterChainCheckpoint) => Promise<void>;
}): Promise<ReportWriterChainResult> {
  const callModel = input.callModel ?? callReportModel;
  const target = writerModelTarget();
  const payload = scopeReportPayloadToUnit(input.payload);
  // Fail closed before draft generation: a packet missing owner comparisons
  // must never consume a billed provider call.
  assertReportEvaluationPacketReady(payload);
  const critiquePrompt = loadActiveReportCritiquePrompt();
  const chainKey = input.chainKey ?? "standalone";
  const resumable = input.checkpoint?.schema === "report-writer-chain-checkpoint.v1"
    && input.checkpoint.chainKey === chainKey
    && input.checkpoint.unitId === payload.unit.unitId
    ? input.checkpoint
    : null;
  const calls: ReportWriterChainResult["calls"] = resumable ? [...resumable.calls] : [];
  const persist = async (checkpoint: Omit<ReportWriterChainCheckpoint, "schema" | "chainKey" | "unitId" | "promptVersion">) => {
    await input.persistCheckpoint?.({
      schema: "report-writer-chain-checkpoint.v1",
      chainKey,
      unitId: payload.unit.unitId,
      promptVersion: critiquePrompt.version,
      ...checkpoint,
      calls: [...checkpoint.calls]
    });
  };

  let draft = resumable?.draft;
  if (!draft) {
    const draftResult = await callModel<ReportDraft>({
      ...target,
      prompt: [reportPromptFromPayload(payload), input.failureContext?.length ? `FAILURE_CONTEXT\n${input.failureContext.join("\n")}` : "", "Return one report unit using the structured output contract."].filter(Boolean).join("\n\n"),
      schemaName: "report_unit_draft",
      schema: draftSchema
    });
    calls.push({ stage: "draft", model: draftResult.model, provider: draftResult.provider, usage: draftResult.usage });
    draft = draftResult.value;
    await persist({ completedStage: "draft", draft, calls });
  }

  const packet = reportEvaluationPacket(payload, draft);
  let critique = resumable?.critique;
  if (!critique) {
    const deterministicIssues = [
      ...validateReportDraft(draft, payload),
      ...verifyReportFactLock(draft, payload.frozenFacts).issues
    ];
    const critiqueResult = await callModel<ReportCritique>({
      ...target,
      prompt: [
        critiquePrompt.text,
        `CANONICAL_PROMPT\n${payload.canonicalOwnerPrompt.text}`,
        `LIVED_PROSE_STANDARD\n${payload.livedProseStandard.text}`,
        `NO_CLEVERNESS_TAX_OWNER_RULING\n${payload.noClevernessRuling.text}`,
        `OWNER_REVIEW_EVIDENCE\n${payload.ownerReviewEvidence.text}`,
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
    const movementApplicable = reportDraftMovementApplicable(draft);
    critique = {
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
    await persist({ completedStage: "critique", draft, critique, calls });
  }

  let revised = resumable?.revised;
  if (!revised) {
    revised = draft;
    if (critique.result !== "no_defects" && critique.defects.length > 0) {
      const revision = await reviseReportDraftForNamedDefects({ payload, draft, defects: critique.defects, callModel });
      calls.push(...revision.calls);
      revised = revision.revised;
    }
    await persist({ completedStage: "revision", draft, critique, revised, calls });
  }

  // Closing discipline: this request deliberately contains only the rendered
  // unit and the owner cold-prose ruling. Facts, prompts, comparison evidence,
  // validator output, and drafting context are excluded so none can rescue
  // prose that a reader cannot understand cold.
  const coldMovementApplicable = reportDraftMovementApplicable(revised);
  const coldCoordinates = reportUnitCoordinates(revised);
  let coldCritique = resumable?.coldCritique;
  if (!coldCritique) {
    const coldResult = await callModel<ReportColdReadCritique>({
      ...target,
      prompt: [
        payload.coldProseRuling.text,
        "Read only the rendered unit below. Return findings only; never rewrite. Every finding must copy address_token exactly from one supplied [LOCATION=...; PARAGRAPH_INDEX=...] token. These tokens are coordinates, not prose or drafting context. Quote the exact smallest sentence span at that coordinate. Never invent, combine, paraphrase, or extend an address token.",
        coldMovementApplicable
          ? "Interpretive movement is applicable. Route abrupt or disconnected movement to interpretive_gap."
          : "Interpretive movement is not applicable. Do not return interpretive_gap. Route an actual phrasing or density problem to its supported category; otherwise return no finding.",
        "Route vague referents, assembled or formal language to unnatural_phrasing or owner_voice_drift; repeated setup or explanation-after-landing to density_violation.",
        `SUPPLIED_ADDRESS_TOKENS\n${coldCoordinates.map((coordinate) => coordinate.token).join("\n")}`,
        `RENDERED_UNIT\n${completeReportUnit(revised)}`
      ].join("\n\n"),
      schemaName: "report_unit_cold_read",
      schema: coldReadCritiqueSchema(revised, coldMovementApplicable),
      validateResponse: (value) => {
        normalizeReportColdReadCritique(revised, value, coldMovementApplicable);
      }
    });
    calls.push({ stage: "cold_read", model: coldResult.model, provider: coldResult.provider, usage: coldResult.usage });
    coldCritique = normalizeReportColdReadCritique(revised, coldResult.value, coldMovementApplicable);
    await persist({ completedStage: "cold_read", draft, critique, revised, coldCritique, calls });
  }
  if (coldCritique.result !== "no_defects" && coldCritique.defects.length > 0) {
    if (resumable?.completedStage !== "cold_revision") {
      const coldRevision = await reviseReportDraftForNamedDefects({
        payload, draft: revised, defects: coldCritique.defects, callModel, stage: "cold_revise"
      });
      calls.push(...coldRevision.calls);
      revised = coldRevision.revised;
      await persist({ completedStage: "cold_revision", draft, critique, revised, coldCritique, calls });
    }
  }
  return {
    draft,
    critique: critique.defects.length ? critique : { ...critique, result: "no_defects", defects: [] },
    coldCritique: coldCritique.defects.length ? coldCritique : { ...coldCritique, result: "no_defects", defects: [] },
    revised,
    calls,
    promptVersion: critiquePrompt.version
  };
}
