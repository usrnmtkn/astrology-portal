import type { ReportDraft, ReportGenerationPayload } from "./report-generation.ts";
import { REPORT_LABELED_NEGATIVE_EXAMPLES } from "./report-owner-comparison.js";

type LocatedText = { location: string; text: string; heading: boolean };
export type ReportUnitCoordinate = {
  token: string;
  location: string;
  paragraphIndex: number;
  sentenceStartIndex: number;
  text: string;
};
export type ReportSentenceSpan = { start: number; end: number; text: string };
export type ReportSentenceAddress = {
  id: string;
  token: string;
  location: string;
  paragraphIndex: number;
  sentenceIndex: number;
  text: string;
};

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

export function reportSentenceSpans(value: string): ReportSentenceSpan[] {
  const spans: ReportSentenceSpan[] = [];
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

function sentenceCount(value: string) {
  return reportSentenceSpans(value).length;
}

function excludedFromMovementCount(value: string) {
  return /^(?:#{1,6}\s|\*{0,2}astrology\b|[-*]\s+(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+\d{1,2}\b|(?:WINTER|SPRING|SUMMER|AUTUMN)\s+\d{4}\b)/iu.test(value);
}

export function reportDraftMovementApplicable(draft: ReportDraft) {
  const count = locatedText(draft).reduce((total, field) => total + (field.heading ? 0 : paragraphs(field.text)
    .filter((paragraph) => !excludedFromMovementCount(paragraph)).length), 0);
  return count >= 2;
}

export function reportUnitCoordinates(draft: ReportDraft): ReportUnitCoordinate[] {
  return locatedText(draft).flatMap((field) => {
    let sentenceStartIndex = 0;
    return paragraphs(field.text).map((text, paragraphIndex) => {
      const coordinate = {
        token: `[LOCATION=${field.location}; PARAGRAPH_INDEX=${paragraphIndex}]`,
        location: field.location,
        paragraphIndex,
        sentenceStartIndex,
        text
      };
      sentenceStartIndex += sentenceCount(text);
      return coordinate;
    });
  });
}

export function completeReportUnit(draft: ReportDraft) {
  return reportUnitCoordinates(draft).map((coordinate) => (
    `${coordinate.token}\n${coordinate.text}`
  )).join("\n\n");
}

export function reportUnitSentenceAddresses(draft: ReportDraft): ReportSentenceAddress[] {
  let ordinal = 0;
  return reportUnitCoordinates(draft).flatMap((coordinate) => (
    reportSentenceSpans(coordinate.text).map((span, localSentenceIndex) => {
      ordinal += 1;
      return {
        id: `S${ordinal}`,
        token: `[S${ordinal}]`,
        location: coordinate.location,
        paragraphIndex: coordinate.paragraphIndex,
        sentenceIndex: coordinate.sentenceStartIndex + localSentenceIndex,
        text: span.text
      };
    })
  ));
}

export function sentenceAddressedReportUnit(draft: ReportDraft) {
  return reportUnitSentenceAddresses(draft).map((sentence) => (
    `${sentence.token} [LOCATION=${sentence.location}; PARAGRAPH_INDEX=${sentence.paragraphIndex}] ${sentence.text}`
  )).join("\n");
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
