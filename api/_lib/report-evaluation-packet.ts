import type { ReportDraft, ReportGenerationPayload } from "./report-generation.ts";
import { REPORT_LABELED_NEGATIVE_EXAMPLES } from "./report-owner-comparison.ts";

type LocatedText = { location: string; text: string; heading: boolean };

function locatedText(draft: ReportDraft): LocatedText[] {
  return [
    { location: "headline", text: draft.headline ?? "", heading: true },
    { location: "tldr", text: draft.tldr ?? "", heading: false },
    { location: "summary", text: draft.summary ?? "", heading: false },
    { location: "body", text: draft.body ?? "", heading: false },
    { location: "action", text: draft.action ?? "", heading: false },
    { location: "timing", text: draft.timing ?? "", heading: false },
    ...(draft.sections ?? []).flatMap((section, index) => [
      { location: `sections.${index}.heading`, text: section.heading ?? "", heading: true },
      { location: `sections.${index}.body`, text: section.body ?? "", heading: false }
    ])
  ];
}

function paragraphs(value: string) {
  return value.split(/\n\s*\n/u).map((paragraph) => paragraph.trim()).filter(Boolean);
}

function excludedFromMovementCount(value: string) {
  return /^(?:#{1,6}\s|\*{0,2}astrology\b|[-*]\s+(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+\d{1,2}\b|(?:WINTER|SPRING|SUMMER|AUTUMN)\s+\d{4}\b)/iu.test(value);
}

export function reportDraftMovementApplicable(draft: ReportDraft) {
  const count = locatedText(draft).reduce((total, field) => total + (field.heading ? 0 : paragraphs(field.text)
    .filter((paragraph) => !excludedFromMovementCount(paragraph)).length), 0);
  return count >= 2;
}

export function completeReportUnit(draft: ReportDraft) {
  return locatedText(draft).flatMap((field) => paragraphs(field.text).map((text, paragraphIndex) => (
    `[LOCATION=${field.location}; PARAGRAPH_INDEX=${paragraphIndex}]\n${text}`
  ))).join("\n\n");
}

export function assertReportEvaluationPacketReady(payload: ReportGenerationPayload) {
  if (!Array.isArray(payload.ownerComparisonSet)) {
    throw new Error("REPORT_COMPARISON_SET_MISSING: ownerComparisonSet must be assembled before any provider call.");
  }
  if (payload.ownerComparisonSet.length < 2 || payload.ownerComparisonSet.length > 3) {
    throw new Error("REPORT_COMPARISON_SET_MISSING: V3 evaluation requires two or three owner comparison passages before any provider call.");
  }
  const evidenceIds = new Set<string>();
  for (const passage of payload.ownerComparisonSet) {
    if (!passage || typeof passage.evidenceId !== "string" || !passage.evidenceId.trim()
      || typeof passage.text !== "string" || !passage.text.trim()
      || typeof passage.function !== "string" || !passage.function.trim()) {
      throw new Error("REPORT_COMPARISON_SET_INVALID: every comparison passage needs evidenceId, text, and function.");
    }
    if (evidenceIds.has(passage.evidenceId)) {
      throw new Error(`REPORT_COMPARISON_SET_INVALID: duplicate evidence id '${passage.evidenceId}'.`);
    }
    evidenceIds.add(passage.evidenceId);
  }
}

export function reportEvaluationPacket(payload: ReportGenerationPayload, draft: ReportDraft) {
  assertReportEvaluationPacketReady(payload);
  const candidateParagraphs = new Set(locatedText(draft).flatMap((field) => paragraphs(field.text)));
  const ownerComparisonSet = payload.ownerComparisonSet.filter((passage) => !candidateParagraphs.has(passage.text));
  if (ownerComparisonSet.length < 2 || ownerComparisonSet.length > 3) {
    throw new Error("V3 evaluation requires two or three non-self owner comparison passages.");
  }
  return {
    completeUnit: completeReportUnit(draft),
    unitFacts: payload.frozenFacts,
    ownerComparisonSet,
    targetFunctions: [...new Set(ownerComparisonSet.map((passage) => passage.function))],
    labeledNegativeExamples: REPORT_LABELED_NEGATIVE_EXAMPLES,
    locationContract: "Return location as the exact LOCATION value supplied for the affected field. sentence_index, scope_start, and scope_end are zero-based sentence indices within that LOCATION."
  };
}
