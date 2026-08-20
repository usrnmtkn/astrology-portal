import { isReportSynthesisUnit, manifestationEnumerationSize, type ReportDraft, type ReportGenerationPayload, type ReportValidationIssue } from "./report-generation.js";
import { callProductionReportModel, writerModelTarget, type ReportModelCall, type ReportModelUsage } from "./report-model-client.js";
import { prepareReportProductionKernel, reportProductionValidation } from "./report-production-gate.js";
import { loadVersionedReportPrompt, REPORT_REDUNDANCY_PROMPT_PATH } from "./report-prompt-versions.js";

export type AssembledReportUnit = {
  unitId: string;
  draft: ReportDraft;
};

export type ReportAssemblyValidationOptions = {
  enforceSeasonStructure?: boolean;
  allowSynthesisRepetition?: boolean;
};

export type ReportAssemblyIssue = ReportValidationIssue & {
  unitId: string;
  location: string;
  sentenceIndex: number;
  scopeStart: number;
  scopeEnd: number;
  quote: string;
  relatedUnitIds?: string[];
};

export type ReportAssemblyDeduplication = {
  code: "repeated_exact_sentence" | "repeated_near_sentence";
  unitId: string;
  relatedUnitIds: string[];
  location: string;
  sentenceIndex: number;
  quote: string;
};

export type ReportAssemblyCoherenceScope = {
  unitId: string;
  location: string;
  paragraphIndex: number;
  scopeStart: number;
  scopeEnd: number;
  quote: string;
  reasons: Array<"internal_whitespace" | "dangling_connector" | "orphaned_pronoun" | "interior_sentence_removed">;
};

export type ReportAssemblyMechanicalRepair = {
  unitId: string;
  location: string;
  paragraphIndex: number;
  reasons: Array<"internal_whitespace" | "dangling_connector">;
  before: string;
  after: string;
};

export type ReportRedundancyFinding = {
  id: string;
  category: "semantic_duplication" | "menu_repetition" | "signature_phrase_repetition" | "mechanism_certainty" | "eclipse_arc_continuity" | "stop_after_landing";
  unit_id: string;
  related_unit_ids: string[];
  location: string;
  sentence_index: number;
  scope_start: number;
  scope_end: number;
  quote: string;
  evidence: string;
  instruction: string;
};

type LocatedField = {
  unitId: string;
  location: string;
  text: string;
  heading: boolean;
  keyDateBlock: boolean;
};

type LocatedSentence = LocatedField & {
  sentenceIndex: number;
  quote: string;
  normalized: string;
  tokens: string[];
};

export const REPORT_LEVEL_LEXICAL_BUDGETS = {
  terms: [
    { id: "application", terms: ["application"], cap: 3 },
    { id: "application_proposal_project", terms: ["application", "proposal", "project"], cap: 8 },
    { id: "private_public", terms: ["private", "public"], cap: 12 },
    { id: "different_terms_old_arrangement", terms: ["different terms", "old arrangement"], cap: 4 }
  ],
  signaturePhrases: [
    { phrase: "ordinary week", cap: 1 },
    { phrase: "one easy yes", cap: 1 },
    { phrase: "wednesday still has one afternoon", cap: 0 }
  ],
  mayPerThousandWords: 20
} as const;

const DATE_LABEL_SOURCE = "(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|SEPT|OCT|NOV|DEC)\\s+\\d{1,2}(?:,?\\s+\\d{4})?";
const DATE_LABEL_AT_START = new RegExp(`^${DATE_LABEL_SOURCE}\\b`, "iu");
const DATE_LABEL_GLOBAL = new RegExp(`\\b${DATE_LABEL_SOURCE}\\b`, "giu");

function fields(unit: AssembledReportUnit): LocatedField[] {
  const draft = unit.draft;
  return [
    { unitId: unit.unitId, location: "headline", text: draft.headline ?? "", heading: true, keyDateBlock: false },
    { unitId: unit.unitId, location: "tldr", text: draft.tldr ?? "", heading: false, keyDateBlock: false },
    { unitId: unit.unitId, location: "summary", text: draft.summary ?? "", heading: false, keyDateBlock: false },
    { unitId: unit.unitId, location: "body", text: draft.body ?? "", heading: false, keyDateBlock: unit.unitId === "key-dates" },
    { unitId: unit.unitId, location: "action", text: draft.action ?? "", heading: false, keyDateBlock: false },
    { unitId: unit.unitId, location: "timing", text: draft.timing ?? "", heading: false, keyDateBlock: false },
    ...(draft.sections ?? []).flatMap((section, index) => {
      const heading = section.heading ?? "";
      const keyDateBlock = unit.unitId === "key-dates" || /^key dates$/iu.test(heading.trim());
      return [
        { unitId: unit.unitId, location: `sections.${index}.heading`, text: heading, heading: true, keyDateBlock: false },
        { unitId: unit.unitId, location: `sections.${index}.body`, text: section.body ?? "", heading: false, keyDateBlock }
      ];
    })
  ];
}

function sentenceSpans(text: string) {
  return [...text.matchAll(/[^.!?]+[.!?]?/gu)].flatMap((match) => {
    const raw = match[0];
    const quote = raw.trim();
    if (!quote) return [];
    const leading = raw.indexOf(quote);
    return [{ quote, start: (match.index ?? 0) + leading, end: (match.index ?? 0) + leading + quote.length }];
  });
}

function sentenceQuotes(text: string) {
  return sentenceSpans(text).map((span) => span.quote);
}

function normalizedText(value: string) {
  return value
    .replace(/[*_#`]/gu, " ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, " ")
    .trim()
    .replace(/\s+/gu, " ");
}

function wordTokens(value: string) {
  return normalizedText(value).split(" ").filter((token) => token.length > 2);
}

function similarity(left: string[], right: string[]) {
  const a = new Set(left);
  const b = new Set(right);
  const union = new Set([...a, ...b]);
  if (!union.size) return 0;
  let intersection = 0;
  for (const token of a) if (b.has(token)) intersection += 1;
  return intersection / union.size;
}

function sentences(units: AssembledReportUnit[]) {
  return units.flatMap((unit) => fields(unit).flatMap((field) => field.heading || field.keyDateBlock
    ? []
    : sentenceQuotes(field.text).map((quote, sentenceIndex) => ({
      ...field,
      sentenceIndex,
      quote,
      normalized: normalizedText(quote),
      tokens: wordTokens(quote)
    })))).filter((sentence) => sentence.tokens.length >= 3 && !/^\*?(?:provenance|governance|astrology)\b/iu.test(sentence.quote));
}

function headingKey(value: string) {
  const normalized = normalizedText(value);
  const season = /^(winter|spring|summer|autumn)\s+\d{4}\b/u.exec(normalized);
  return season?.[0] ?? normalized;
}

function issue(
  input: Omit<ReportAssemblyIssue, "severity">,
  severity: "error" | "warning" = "warning"
): ReportAssemblyIssue {
  return { ...input, severity };
}

function markdownBalanced(value: string) {
  const withoutEscapes = value.replace(/\\[*_`]/gu, "");
  const doubleStars = withoutEscapes.match(/\*\*/gu)?.length ?? 0;
  const singleStars = withoutEscapes.replace(/\*\*/gu, "").match(/\*/gu)?.length ?? 0;
  const backticks = withoutEscapes.match(/`/gu)?.length ?? 0;
  return doubleStars % 2 === 0 && singleStars % 2 === 0 && backticks % 2 === 0;
}

function validateHeadings(units: AssembledReportUnit[], issues: ReportAssemblyIssue[]) {
  for (const unit of units) {
    const seen = new Map<string, LocatedField>();
    for (const field of fields(unit).filter((candidate) => candidate.heading && candidate.text.trim())) {
      const key = headingKey(field.text);
      const first = seen.get(key);
      if (first) {
        issues.push(issue({
          code: "duplicate_heading",
          message: `Duplicate assembled heading '${field.text}' repeats ${first.location}.`,
          unitId: unit.unitId,
          location: field.location,
          sentenceIndex: 0,
          scopeStart: 0,
          scopeEnd: 0,
          quote: field.text
        }));
      } else seen.set(key, field);
    }
  }
}

function plainKeyDateRecord(value: string) {
  return value.trim().replace(/^[-*]\s+/u, "").replaceAll("**", "").replace(/^\*|\*$/gu, "").trim();
}

function validateKeyDates(units: AssembledReportUnit[], issues: ReportAssemblyIssue[]) {
  const parentHeadings = new Set(units
    .filter((unit) => unit.unitId !== "key-dates")
    .flatMap((unit) => fields(unit).filter((field) => field.heading && field.text.trim()).map((field) => normalizedText(field.text))));
  for (const unit of units) {
    const seenLabels = new Map<string, LocatedField>();
    const seenTitles = new Map<string, LocatedField>();
    const seenSentences = new Map<string, LocatedField>();
    for (const field of fields(unit).filter((candidate) => candidate.keyDateBlock && candidate.text.trim())) {
      const records = field.text.split(/\n\s*\n/u).map((record) => record.trim()).filter(Boolean);
      for (const [recordIndex, record] of records.entries()) {
        const plain = plainKeyDateRecord(record);
        const labels = [...plain.matchAll(DATE_LABEL_GLOBAL)].map((match) => match[0].toUpperCase().replace(/\s+/gu, " "));
        if (!DATE_LABEL_AT_START.test(plain)) {
          issues.push(issue({
            code: "missing_key_date_label",
            message: `Key-date record does not begin with a date label in ${unit.unitId}.`,
            unitId: unit.unitId, location: field.location, sentenceIndex: recordIndex,
            scopeStart: recordIndex, scopeEnd: recordIndex, quote: record
          }));
        }
        if (labels.length > 1) {
          issues.push(issue({
            code: "fused_key_date_slots",
            message: `Key-date record contains ${labels.length} concatenated date labels: ${labels.join(", ")}.`,
            unitId: unit.unitId, location: field.location, sentenceIndex: recordIndex,
            scopeStart: recordIndex, scopeEnd: recordIndex, quote: record
          }));
        }
        for (const label of labels) {
          const first = seenLabels.get(label);
          if (first) {
            issues.push(issue({
              code: "duplicate_key_date_label",
              message: `Key-date label ${label} repeats within ${unit.unitId}.`,
              unitId: unit.unitId, location: field.location, sentenceIndex: recordIndex,
              scopeStart: recordIndex, scopeEnd: recordIndex, quote: record
            }));
          } else seenLabels.set(label, field);
        }
        const parts = plain.split("·").map((part) => part.trim());
        const sentenceCount = parts[2] ? sentenceQuotes(parts[2]).length : 0;
        if (parts.length !== 4 || !parts.every(Boolean) || sentenceCount !== 1) {
          issues.push(issue({
            code: "assembled_key_date_format",
            message: "Assembled key dates require DATE · TITLE · one sentence · attribution, one record per paragraph.",
            unitId: unit.unitId, location: field.location, sentenceIndex: recordIndex,
            scopeStart: recordIndex, scopeEnd: recordIndex, quote: record
          }));
        }
        if (parts.length === 4) {
          const titleWords = parts[1].match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)?/gu)?.length ?? 0;
          if (titleWords < 2 || titleWords > 8) {
            issues.push(issue({
              code: "key_date_title_length",
              message: `Key-date title '${parts[1]}' must contain 2–8 words.`,
              unitId: unit.unitId, location: field.location, sentenceIndex: recordIndex,
              scopeStart: recordIndex, scopeEnd: recordIndex, quote: record
            }, "error"));
          }
          const readerSentence = parts[2];
          if (!/^\p{Lu}/u.test(readerSentence)
            || !/[.!?]["'’”)]?$/u.test(readerSentence)
            || /^(?:together,|saturn also\b|this sextile\b)/iu.test(readerSentence)) {
            issues.push(issue({
              code: "key_date_incomplete_sentence",
              message: "Key-date reader sentence must be complete, standalone prose with no dangling connector.",
              unitId: unit.unitId, location: field.location, sentenceIndex: recordIndex,
              scopeStart: recordIndex, scopeEnd: recordIndex, quote: record
            }, "error"));
          }
          const titleKey = normalizedText(parts[1]);
          const sentenceKey = normalizedText(parts[2]);
          if (titleKey && parentHeadings.has(titleKey)) {
            issues.push(issue({
              code: "key_date_title_reuses_section_heading",
              message: `Key-date title '${parts[1]}' repeats a report section heading.`,
              unitId: unit.unitId, location: field.location, sentenceIndex: recordIndex,
              scopeStart: recordIndex, scopeEnd: recordIndex, quote: record
            }, "error"));
          }
          if (titleKey) {
            if (seenTitles.has(titleKey)) {
              issues.push(issue({
                code: "duplicate_key_date_title",
                message: `Key-date title '${parts[1]}' repeats within ${unit.unitId}.`,
                unitId: unit.unitId, location: field.location, sentenceIndex: recordIndex,
                scopeStart: recordIndex, scopeEnd: recordIndex, quote: record
              }, "error"));
            } else seenTitles.set(titleKey, field);
          }
          if (sentenceKey) {
            if (seenSentences.has(sentenceKey)) {
              issues.push(issue({
                code: "duplicate_key_date_sentence",
                message: "Key-date reader sentence repeats within the report.",
                unitId: unit.unitId, location: field.location, sentenceIndex: recordIndex,
                scopeStart: recordIndex, scopeEnd: recordIndex, quote: record
              }, "error"));
            } else seenSentences.set(sentenceKey, field);
          }
        }
      }
    }
  }
}

function validateMarkdown(units: AssembledReportUnit[], issues: ReportAssemblyIssue[]) {
  for (const unit of units) {
    for (const field of fields(unit).filter((candidate) => candidate.text.trim())) {
      if (!markdownBalanced(field.text) || /[^\n]\*\*(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|SEPT|OCT|NOV|DEC)\s+\d{1,2}\b/iu.test(field.text)) {
        issues.push(issue({
          code: "malformed_markdown",
          message: `Malformed or concatenated Markdown in ${unit.unitId} ${field.location}.`,
          unitId: unit.unitId, location: field.location, sentenceIndex: 0,
          scopeStart: 0, scopeEnd: Math.max(0, sentenceQuotes(field.text).length - 1), quote: field.text
        }));
      }
    }
  }
}

const SEASON_UNIT_IDS = new Set(["winter-current", "spring", "summer", "autumn", "winter-next"]);
const ASSEMBLED_DATE_RANGE = /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}(?:,?\s+\d{4})?\s*(?:-|–|to)\s*(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}(?:,?\s+\d{4})?\b/iu;

function validateSeasonStructure(units: AssembledReportUnit[], issues: ReportAssemblyIssue[]) {
  for (const unit of units.filter((candidate) => SEASON_UNIT_IDS.has(candidate.unitId))) {
    const expectedSeason = unit.unitId === "winter-current" || unit.unitId === "winter-next"
      ? "WINTER"
      : unit.unitId.toUpperCase();
    const headline = unit.draft.headline?.trim() ?? "";
    if (!new RegExp(`^${expectedSeason}\\s+\\d{4}\\b`, "u").test(headline)) {
      issues.push(issue({
        code: "missing_season_heading",
        message: `${unit.unitId} must preserve its season/year heading through assembly.`,
        unitId: unit.unitId, location: "headline", sentenceIndex: 0, scopeStart: 0, scopeEnd: 0, quote: headline
      }, "error"));
    }
    const timing = unit.draft.timing?.trim() ?? "";
    if (!ASSEMBLED_DATE_RANGE.test(timing)) {
      issues.push(issue({
        code: "missing_season_date_range",
        message: `${unit.unitId} must preserve its explicit date range through assembly.`,
        unitId: unit.unitId, location: "timing", sentenceIndex: 0, scopeStart: 0, scopeEnd: 0, quote: timing
      }, "error"));
    }
  }
}

export function validateReportKeyDateFormat(draft: ReportDraft, sourceUnits: AssembledReportUnit[] = []) {
  const units = [...sourceUnits, { unitId: "key-dates", draft }];
  const issues: ReportAssemblyIssue[] = [];
  validateKeyDates(units, issues);
  validateMarkdown(units, issues);
  return issues;
}

function validateRepeatedSentences(
  units: AssembledReportUnit[],
  issues: ReportAssemblyIssue[],
  allowSynthesisRepetition = false
) {
  const all = sentences(units);
  for (let index = 0; index < all.length; index += 1) {
    const current = all[index];
    for (let priorIndex = 0; priorIndex < index; priorIndex += 1) {
      const prior = all[priorIndex];
      if (current.unitId === prior.unitId && current.location === prior.location && current.sentenceIndex === prior.sentenceIndex) continue;
      const exact = current.normalized === prior.normalized;
      const adjacentSameField = current.unitId === prior.unitId && current.location === prior.location
        && current.sentenceIndex === prior.sentenceIndex + 1;
      const nearThreshold = adjacentSameField ? 0.7 : 0.88;
      const near = current.tokens.length >= 12 && prior.tokens.length >= 12 && similarity(current.tokens, prior.tokens) >= nearThreshold;
      if (!exact && !near) continue;
      const acrossUnits = current.unitId !== prior.unitId;
      if (allowSynthesisRepetition && acrossUnits
        && (isReportSynthesisUnit(current.unitId) || isReportSynthesisUnit(prior.unitId))) {
        continue;
      }
      issues.push(issue({
        code: exact ? "repeated_exact_sentence" : "repeated_near_sentence",
        message: `${exact ? "Exact" : "Near-exact"} sentence repetition between ${prior.unitId} and ${current.unitId}.`,
        unitId: current.unitId,
        relatedUnitIds: [prior.unitId],
        location: current.location,
        sentenceIndex: current.sentenceIndex,
        scopeStart: current.sentenceIndex,
        scopeEnd: current.sentenceIndex,
        quote: current.quote
      }, acrossUnits ? "error" : "warning"));
      break;
    }
  }
}

function occurrences(value: string, phrase: string) {
  const pattern = new RegExp(`(^|[^a-z0-9])${phrase.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}([^a-z0-9]|$)`, "giu");
  return value.match(pattern)?.length ?? 0;
}

function matchingSentences(all: LocatedSentence[], terms: readonly string[]) {
  return all.filter((sentence) => terms.some((term) => occurrences(sentence.quote, term) > 0));
}

function validateLexicalBudgets(units: AssembledReportUnit[], issues: ReportAssemblyIssue[]) {
  const all = sentences(units);
  for (const budget of REPORT_LEVEL_LEXICAL_BUDGETS.terms) {
    let count = 0;
    for (const sentence of matchingSentences(all, budget.terms)) {
      count += budget.terms.reduce((sum, term) => sum + occurrences(sentence.quote, term), 0);
      if (count <= budget.cap) continue;
      issues.push(issue({
        code: "report_lexical_budget",
        message: `Report-level lexical budget '${budget.id}' exceeds ${budget.cap}.`,
        unitId: sentence.unitId, location: sentence.location, sentenceIndex: sentence.sentenceIndex,
        scopeStart: sentence.sentenceIndex, scopeEnd: sentence.sentenceIndex, quote: sentence.quote
      }));
    }
  }
  for (const budget of REPORT_LEVEL_LEXICAL_BUDGETS.signaturePhrases) {
    let count = 0;
    for (const sentence of matchingSentences(all, [budget.phrase])) {
      count += occurrences(sentence.quote, budget.phrase);
      if (count <= budget.cap) continue;
      issues.push(issue({
        code: "signature_phrase_budget",
        message: `Owner-signature phrase '${budget.phrase}' exceeds its report cap of ${budget.cap}.`,
        unitId: sentence.unitId, location: sentence.location, sentenceIndex: sentence.sentenceIndex,
        scopeStart: sentence.sentenceIndex, scopeEnd: sentence.sentenceIndex, quote: sentence.quote
      }));
    }
  }
  const wordCount = units.flatMap((unit) => fields(unit).filter((field) => !field.heading).flatMap((field) => wordTokens(field.text))).length;
  const modalCap = Math.max(4, Math.ceil((wordCount / 1_000) * REPORT_LEVEL_LEXICAL_BUDGETS.mayPerThousandWords));
  let mayCount = 0;
  for (const sentence of all) {
    mayCount += occurrences(sentence.quote, "may");
    if (mayCount <= modalCap) continue;
    issues.push(issue({
      code: "report_modal_budget",
      message: `Report-level 'may' budget exceeds ${modalCap} for ${wordCount} words. Reserve possibility language for manifestations, not mechanisms.`,
      unitId: sentence.unitId, location: sentence.location, sentenceIndex: sentence.sentenceIndex,
      scopeStart: sentence.sentenceIndex, scopeEnd: sentence.sentenceIndex, quote: sentence.quote
    }));
  }
}

function menuTokens(sentence: LocatedSentence) {
  if (manifestationEnumerationSize(sentence.quote) < 2) return [];
  const stop = new Set(["and", "or", "the", "your", "you", "may", "might", "could", "can", "because", "when", "while", "that", "this", "with", "from", "into", "need", "needs"]);
  return [...new Set(sentence.tokens.filter((token) => !stop.has(token)))];
}

function validateMenus(units: AssembledReportUnit[], issues: ReportAssemblyIssue[]) {
  const menus = sentences(units).map((sentence) => ({
    sentence,
    itemCount: manifestationEnumerationSize(sentence.quote),
    tokens: menuTokens(sentence)
  })).filter((entry) => entry.itemCount >= 2);
  for (let index = 0; index < menus.length; index += 1) {
    const current = menus[index];
    if (current.itemCount > 3) {
      issues.push(issue({
        code: "report_menu_density",
        message: "Report-level menu discipline prefers the strongest two or three chart-earned items at the primary anchor.",
        unitId: current.sentence.unitId, location: current.sentence.location, sentenceIndex: current.sentence.sentenceIndex,
        scopeStart: current.sentence.sentenceIndex, scopeEnd: current.sentence.sentenceIndex, quote: current.sentence.quote
      }));
    }
    for (let priorIndex = 0; priorIndex < index; priorIndex += 1) {
      const prior = menus[priorIndex];
      if (similarity(current.tokens, prior.tokens) < 0.45) continue;
      issues.push(issue({
        code: "report_repeated_menu",
        message: `Manifestation menu repeats the anchor already used in ${prior.sentence.unitId}. Later sections must refer back without re-listing.`,
        unitId: current.sentence.unitId, relatedUnitIds: [prior.sentence.unitId],
        location: current.sentence.location, sentenceIndex: current.sentence.sentenceIndex,
        scopeStart: current.sentence.sentenceIndex, scopeEnd: current.sentence.sentenceIndex, quote: current.sentence.quote
      }));
      break;
    }
  }
}

export function validateAssembledReport(
  units: AssembledReportUnit[],
  options: ReportAssemblyValidationOptions = {}
) {
  const issues: ReportAssemblyIssue[] = [];
  validateHeadings(units, issues);
  validateKeyDates(units, issues);
  validateMarkdown(units, issues);
  if (options.enforceSeasonStructure) validateSeasonStructure(units, issues);
  validateRepeatedSentences(units, issues, options.allowSynthesisRepetition);
  validateLexicalBudgets(units, issues);
  validateMenus(units, issues);
  return issues;
}

function setDraftField(draft: ReportDraft, location: string, value: string) {
  if (location === "headline" || location === "tldr" || location === "summary"
    || location === "body" || location === "action" || location === "timing") {
    draft[location] = value;
    return;
  }
  const match = /^sections\.(\d+)\.(heading|body)$/u.exec(location);
  if (!match) throw new Error(`REPORT_ASSEMBLY_DEDUPLICATION_LOCATION_INVALID: ${location}`);
  const index = Number(match[1]);
  const key = match[2] as "heading" | "body";
  const section = draft.sections?.[index];
  if (!section) throw new Error(`REPORT_ASSEMBLY_DEDUPLICATION_LOCATION_INVALID: ${location}`);
  section[key] = value;
}

function removeSentence(draft: ReportDraft, location: string, sentenceIndex: number) {
  const holder = fields({ unitId: "deduplication", draft }).find((field) => field.location === location);
  if (!holder) throw new Error(`REPORT_ASSEMBLY_DEDUPLICATION_LOCATION_INVALID: ${location}`);
  const span = sentenceSpans(holder.text)[sentenceIndex];
  if (!span) throw new Error(`REPORT_ASSEMBLY_DEDUPLICATION_SENTENCE_INVALID: ${location}[${sentenceIndex}]`);
  const next = `${holder.text.slice(0, span.start)}${holder.text.slice(span.end)}`.trim();
  setDraftField(draft, location, next);
}

function coherenceScopesForField(unitId: string, location: string, value: string, removalIndexes: number[] = []): ReportAssemblyCoherenceScope[] {
  const spans = sentenceSpans(value);
  let sentenceOffset = 0;
  return value.split(/\n\s*\n/gu).flatMap((rawParagraph, paragraphIndex) => {
    const paragraph = rawParagraph.trim();
    if (!paragraph) return [];
    const paragraphSentences = sentenceSpans(paragraph);
    const scopeStart = sentenceOffset;
    const scopeEnd = sentenceOffset + Math.max(0, paragraphSentences.length - 1);
    const reasons: ReportAssemblyCoherenceScope["reasons"] = [];
    if (/[ \t]{2,}/u.test(paragraph)) reasons.push("internal_whitespace");
    if (/^(?:but|and|so|however|therefore|also)\b/iu.test(paragraph)) reasons.push("dangling_connector");
    if (removalIndexes.length && /^(?:this|that|these|those|it|they)\b/iu.test(paragraph)) reasons.push("orphaned_pronoun");
    if (removalIndexes.some((index) => index > scopeStart && index <= scopeStart + paragraphSentences.length)) {
      reasons.push("interior_sentence_removed");
    }
    if (!reasons.length) {
      sentenceOffset += paragraphSentences.length;
      return [];
    }
    sentenceOffset += paragraphSentences.length;
    // Keep the full-field parser and paragraph parser in lockstep. A mismatch
    // means the paragraph cannot be safely addressed for a bounded splice.
    if (!spans[scopeStart] || !spans[scopeEnd]) {
      throw new Error(`REPORT_ASSEMBLY_COHERENCE_SCOPE_INVALID: ${unitId}:${location}:${paragraphIndex}`);
    }
    return [{ unitId, location, paragraphIndex, scopeStart, scopeEnd, quote: paragraph, reasons }];
  });
}

/**
 * Finds post-dedup holes without interpreting astrology. Only mechanical
 * evidence is eligible here: whitespace left at a cut boundary, a connector
 * with no preceding sentence, or a pronoun whose antecedent was removed.
 */
export function detectPostDedupCoherenceScopes(
  units: AssembledReportUnit[],
  removals: ReportAssemblyDeduplication[] = []
) {
  const removalIndexes = new Map<string, number[]>();
  for (const removal of removals) {
    const key = `${removal.unitId}\u0000${removal.location}`;
    removalIndexes.set(key, [...(removalIndexes.get(key) ?? []), removal.sentenceIndex]);
  }
  return units.flatMap((unit) => fields(unit).flatMap((field) => (
    field.heading || field.keyDateBlock || !field.text.trim()
      ? []
      : coherenceScopesForField(unit.unitId, field.location, field.text, removalIndexes.get(`${unit.unitId}\u0000${field.location}`) ?? [])
  )));
}

export function normalizePostDedupWhitespace(value: string) {
  return value.split(/\n\s*\n/gu)
    .map((paragraph) => paragraph.replace(/[ \t]+/gu, " ").trim())
    .filter(Boolean)
    .join("\n\n");
}

export function normalizeAssembledReportWhitespace(units: AssembledReportUnit[]) {
  return units.map((unit) => {
    const draft = structuredClone(unit.draft);
    for (const field of fields({ unitId: unit.unitId, draft }).filter((entry) => !entry.heading && !entry.keyDateBlock && entry.text.trim())) {
      setDraftField(draft, field.location, normalizePostDedupWhitespace(field.text));
    }
    return { ...unit, draft };
  });
}

function capitalizeFirstLetter(value: string) {
  return value.replace(/\p{Ll}/u, (letter) => letter.toLocaleUpperCase());
}

/**
 * Repairs only representation damage left by deterministic sentence removal:
 * repeated whitespace and a connector stranded at the start of a paragraph.
 * No astrology, interpretation, or substantive sentence text is generated.
 */
export function repairMechanicalPostDedupSeams(
  units: AssembledReportUnit[],
  removals: ReportAssemblyDeduplication[] = []
) {
  const repaired = structuredClone(units);
  const repairs: ReportAssemblyMechanicalRepair[] = [];
  const scopes = detectPostDedupCoherenceScopes(repaired, removals);
  for (const scope of scopes) {
    if (scope.reasons.some((reason) => reason === "orphaned_pronoun" || reason === "interior_sentence_removed")) continue;
    const unit = repaired.find((candidate) => candidate.unitId === scope.unitId);
    if (!unit) continue;
    const field = fields(unit).find((candidate) => candidate.location === scope.location);
    if (!field) continue;
    const paragraphs = field.text.split(/\n\s*\n/gu);
    const before = paragraphs[scope.paragraphIndex] ?? "";
    let after = before.replace(/[ \t]+/gu, " ").trim();
    if (scope.reasons.includes("dangling_connector")) {
      after = after.replace(/^(?:but|and|so|however|therefore|also)(?:,\s*|\s+)/iu, "");
      after = capitalizeFirstLetter(after);
    }
    if (!after || after === before) continue;
    paragraphs[scope.paragraphIndex] = after;
    setDraftField(unit.draft, scope.location, paragraphs.map((paragraph) => paragraph.trim()).filter(Boolean).join("\n\n"));
    repairs.push({
      unitId: scope.unitId,
      location: scope.location,
      paragraphIndex: scope.paragraphIndex,
      reasons: scope.reasons.filter((reason): reason is "internal_whitespace" | "dangling_connector" => (
        reason === "internal_whitespace" || reason === "dangling_connector"
      )),
      before,
      after
    });
  }
  return {
    units: repaired,
    repairs,
    remaining: detectPostDedupCoherenceScopes(repaired, removals)
  };
}

/**
 * Removes only the later sentence in blocking cross-unit exact/near-exact
 * pairs. No prose is generated: every operation is a deletion at a
 * deterministic persisted coordinate.
 */
export function deduplicateAssembledReport(
  units: AssembledReportUnit[],
  options: ReportAssemblyValidationOptions = {}
) {
  const deduplicated = structuredClone(units);
  const removals: ReportAssemblyDeduplication[] = [];
  for (let pass = 0; pass < 20; pass += 1) {
    const repeated = validateAssembledReport(deduplicated, options).filter((entry) => (
      entry.severity === "error"
      && (entry.code === "repeated_exact_sentence" || entry.code === "repeated_near_sentence")
    ));
    if (!repeated.length) return {
      units: deduplicated,
      removals,
      coherenceScopes: detectPostDedupCoherenceScopes(deduplicated, removals)
    };
    const grouped = new Map<string, ReportAssemblyIssue[]>();
    for (const entry of repeated) {
      const key = `${entry.unitId}\u0000${entry.location}`;
      grouped.set(key, [...(grouped.get(key) ?? []), entry]);
    }
    for (const entries of grouped.values()) {
      const unit = deduplicated.find((candidate) => candidate.unitId === entries[0].unitId);
      if (!unit) throw new Error(`REPORT_ASSEMBLY_DEDUPLICATION_UNIT_MISSING: ${entries[0].unitId}`);
      const unique = [...new Map(entries.map((entry) => [entry.sentenceIndex, entry])).values()]
        .sort((left, right) => right.sentenceIndex - left.sentenceIndex);
      for (const entry of unique) {
        removeSentence(unit.draft, entry.location, entry.sentenceIndex);
        removals.push({
          code: entry.code as ReportAssemblyDeduplication["code"],
          unitId: entry.unitId,
          relatedUnitIds: entry.relatedUnitIds ?? [],
          location: entry.location,
          sentenceIndex: entry.sentenceIndex,
          quote: entry.quote
        });
      }
    }
  }
  throw new Error("REPORT_ASSEMBLY_DEDUPLICATION_EXHAUSTED: repeated sentences remain after 20 deterministic passes.");
}

export const REPORT_REDUNDANCY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["result", "findings"],
  properties: {
    result: { type: "string", enum: ["no_findings", "findings"] },
    findings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "category", "unit_id", "related_unit_ids", "location", "sentence_index", "scope_start", "scope_end", "quote", "evidence", "instruction"],
        properties: {
          id: { type: "string" },
          category: { type: "string", enum: ["semantic_duplication", "menu_repetition", "signature_phrase_repetition", "mechanism_certainty", "eclipse_arc_continuity", "stop_after_landing"] },
          unit_id: { type: "string" },
          related_unit_ids: { type: "array", items: { type: "string" } },
          location: { type: "string" },
          sentence_index: { type: "integer", minimum: 0 },
          scope_start: { type: "integer", minimum: 0 },
          scope_end: { type: "integer", minimum: 0 },
          quote: { type: "string" },
          evidence: { type: "string" },
          instruction: { type: "string" }
        }
      }
    }
  }
};

function completeReport(units: AssembledReportUnit[]) {
  return units.map((unit) => [
    `[UNIT=${unit.unitId}]`,
    ...fields(unit).filter((field) => field.text.trim()).map((field) => `[LOCATION=${field.location}]\n${field.text}`)
  ].join("\n\n")).join("\n\n---\n\n");
}

function assertFindingLocations(units: AssembledReportUnit[], findings: ReportRedundancyFinding[]) {
  const unitMap = new Map(units.map((unit) => [unit.unitId, unit]));
  for (const finding of findings) {
    const unit = unitMap.get(finding.unit_id);
    if (!unit) throw new Error(`REPORT_REDUNDANCY_SCOPE_INVALID: unknown unit '${finding.unit_id}'.`);
    const field = fields(unit).find((candidate) => candidate.location === finding.location);
    if (!field) throw new Error(`REPORT_REDUNDANCY_SCOPE_INVALID: unknown location '${finding.location}' in '${finding.unit_id}'.`);
    const spans = sentenceQuotes(field.text);
    if (finding.scope_start > finding.scope_end || finding.scope_end >= spans.length) {
      throw new Error(`REPORT_REDUNDANCY_SCOPE_INVALID: sentence scope is outside '${finding.unit_id}:${finding.location}'.`);
    }
    if (!spans.slice(finding.scope_start, finding.scope_end + 1).join(" ").includes(finding.quote.trim())) {
      throw new Error(`REPORT_REDUNDANCY_SCOPE_INVALID: quote does not match '${finding.unit_id}:${finding.location}'.`);
    }
  }
}

function discardStaleRedundancyFindings(units: AssembledReportUnit[], findings: ReportRedundancyFinding[]) {
  const unitMap = new Map(units.map((unit) => [unit.unitId, unit]));
  return findings.filter((finding) => {
    const unit = unitMap.get(finding.unit_id);
    if (!unit) return true;
    const quote = finding.quote.trim();
    if (!quote) return true;
    return fields(unit).some((field) => field.text.includes(quote));
  });
}

export async function runReportRedundancyPass(input: {
  units: AssembledReportUnit[];
  payload: ReportGenerationPayload;
  callModel?: ReportModelCall;
}): Promise<{ findings: ReportRedundancyFinding[]; usage: ReportModelUsage; promptVersion: string }> {
  const prompt = loadVersionedReportPrompt(REPORT_REDUNDANCY_PROMPT_PATH);
  const target = writerModelTarget();
  const response = await (input.callModel ?? callProductionReportModel)<{ result: "no_findings" | "findings"; findings: ReportRedundancyFinding[] }>({
    ...target,
    prompt: [
      prompt.text,
      `NO_CLEVERNESS_TAX_OWNER_RULING\n${input.payload.noClevernessRuling.text}`,
      `OWNER_REVIEW_EVIDENCE\n${input.payload.ownerReviewEvidence.text}`,
      `CANONICAL_PROMPT\n${input.payload.canonicalOwnerPrompt.text}`,
      `FROZEN_FACTS\n${JSON.stringify(input.payload.frozenFacts)}`,
      `COMPLETE_ASSEMBLED_REPORT\n${completeReport(input.units)}`,
      "Return findings only. Never write replacement prose."
    ].join("\n\n"),
    schemaName: "report_redundancy_pass",
    schema: REPORT_REDUNDANCY_SCHEMA,
    productionKernel: prepareReportProductionKernel(input.payload, "REVIEWER", reportProductionValidation())
  });
  const findings = discardStaleRedundancyFindings(
    input.units,
    response.value.result === "no_findings" ? [] : response.value.findings
  );
  assertFindingLocations(input.units, findings);
  return { findings, usage: response.usage, promptVersion: prompt.version };
}
