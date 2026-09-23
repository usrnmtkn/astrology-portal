import { readPrivateReportDocument, readOptionalPrivateReportDocument } from "./private-report-documents.mjs";
import crypto from "node:crypto";
import type { ReportDomain } from "./report-types.js";
import type { ReportComparisonFunction } from "./report-owner-comparison.js";

export type ReportVoiceUnitType = "overview" | "theme" | "season" | "domain" | "review" | "closing";

export type ReportOwnerVoiceCorpusPassage = {
  evidenceId: string;
  reportDomain: ReportDomain;
  unitType: ReportVoiceUnitType;
  function: ReportComparisonFunction;
  sectionHeading: string;
  text: string;
  referenceFormat: "annual_report" | "weekly_forecast" | "seasonal_forecast" | "transit_forecast";
  provenance: {
    sourcePath: string;
    sourceType: "owner_authored_final";
    sourceSha256: string;
    passageSha256: string;
    sourceImageSha256?: string;
    sourceAssignment?: string;
  };
};

const OWNER_FINALS: Array<{ reportDomain: ReportDomain; sourcePath: string }> = [
  { reportDomain: "general", sourcePath: "private:report/general-2026" },
  { reportDomain: "work_money", sourcePath: "private:report/work-money-2026" },
  { reportDomain: "love_connection", sourcePath: "private:report/love-connection-2026" },
  { reportDomain: "personal_health", sourcePath: "private:report/personal-health-2026" }
];
const annualSourceParagraphs = new Map<string, string[]>();

function sha256(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function unitTypeForHeading(heading: string): ReportVoiceUnitType {
  if (/\boverview\b/iu.test(heading)) return "overview";
  if (/\bwhat 2026 is about\b/iu.test(heading)) return "theme";
  if (/\b2026 in review\b/iu.test(heading)) return "review";
  if (/\bwinter 2027\b/iu.test(heading)) return "closing";
  if (/\b(?:winter|spring|summer|autumn) 2026\b/iu.test(heading)) return "season";
  return "domain";
}

export function reportVoiceUnitType(unitId: string): ReportVoiceUnitType {
  if (unitId === "overview") return "overview";
  if (/theme/u.test(unitId)) return "theme";
  if (/review/u.test(unitId)) return "review";
  if (/winter-next|closing/u.test(unitId)) return "closing";
  if (/winter-current|spring|summer|autumn|phase|development/u.test(unitId)) return "season";
  return "domain";
}

function paragraphFunction(text: string, index: number, count: number): ReportComparisonFunction {
  if (index === 0) return "opening";
  if (index === count - 1) return "close";
  if (/\b(?:but|however|complication|pressure|cost|problem|watch|conflict|too much|not enough)\b/iu.test(text)) return "complication";
  if (/^(?:then|now|by |once |instead|later|soon|the next)/iu.test(text)) return "turn";
  return "development";
}

function eligibleParagraphs(section: string) {
  return section.split(/\n\s*\n/gu).slice(1).map((entry) => entry.trim()).filter((entry) => (
    entry.length >= 80
    && !/^\*[^*].*\*$/su.test(entry)
    && !/^\*\*Key dates\*\*$/iu.test(entry)
    && !/^- \*\*/u.test(entry)
    && entry !== "---"
  ));
}

function corpusForSource(source: { reportDomain: ReportDomain; sourcePath: string }) {
  const text = readPrivateReportDocument(source.sourcePath);
  annualSourceParagraphs.set(source.sourcePath, text.split(/\n\s*\n/gu).map((paragraph) => paragraph.trim()));
  const sourceSha256 = sha256(text);
  const sections = text.split(/(?=^## )/gmu).filter((section) => /^## /u.test(section));
  return sections.flatMap((section, sectionIndex) => {
    const heading = /^##\s+(.+)$/mu.exec(section)?.[1]?.trim() ?? "";
    const paragraphs = eligibleParagraphs(section);
    const unitType = unitTypeForHeading(heading);
    return paragraphs.map((paragraph, paragraphIndex): ReportOwnerVoiceCorpusPassage => {
      const passageSha256 = sha256(paragraph);
      return {
        evidenceId: `report-owner-v2:${source.reportDomain}:${sectionIndex}:${paragraphIndex}:${passageSha256.slice(0, 12)}`,
        reportDomain: source.reportDomain,
        unitType,
        function: paragraphFunction(paragraph, paragraphIndex, paragraphs.length),
        sectionHeading: heading,
        text: paragraph,
        referenceFormat: "annual_report",
        provenance: {
          sourcePath: source.sourcePath,
          sourceType: "owner_authored_final",
          sourceSha256,
          passageSha256
        }
      };
    });
  });
}

let cachedCorpus: ReportOwnerVoiceCorpusPassage[] | null = null;

export function reportOwnerVoiceCorpusV2() {
  if (!cachedCorpus) cachedCorpus = OWNER_FINALS.flatMap(corpusForSource);
  return structuredClone(cachedCorpus);
}

const SOCIAL_SOURCE = "private:report/social-writing-references-20260921";
const SOCIAL_ASSIGNMENT = "thread:01a0c440-92d0-7822-bda6-af3338840786";

/** Supplemental, complete screenshot transcriptions. Raw OCR is never eligible. */
export function reportOwnerSocialVoiceCorpusV1(): ReportOwnerVoiceCorpusPassage[] {
  const body = readOptionalPrivateReportDocument(SOCIAL_SOURCE);
  if (body === null) return [];
  const invalid = () => { throw new Error("REPORT_OWNER_SOCIAL_EVIDENCE_INVALID"); };
  let document;
  try { document = JSON.parse(body); }
  catch { return invalid(); }
  if (!document || document.schema !== "owner-social-references/v1" || document.role !== "register_only"
    || document.sourceAssignment !== SOCIAL_ASSIGNMENT || !Array.isArray(document.records)
    || !document.records.length) return invalid();
  const ids = new Set<string>();
  return document.records.map((entry: Record<string, unknown>): ReportOwnerVoiceCorpusPassage => {
    if (!entry || typeof entry !== "object" || typeof entry.id !== "string" || !/^social-\d{2}$/u.test(entry.id)
      || ids.has(entry.id) || typeof entry.text !== "string" || !entry.text.trim()
      || typeof entry.heading !== "string" || !entry.heading.trim()
      || !["weekly_forecast", "seasonal_forecast", "transit_forecast"].includes(String(entry.sourceFormat))
      || entry.transcription !== "visually_checked_complete_body_reflowed"
      || typeof entry.imageSha256 !== "string" || !/^[a-f0-9]{64}$/u.test(entry.imageSha256)
      || sha256(entry.text) !== entry.passageSha256) return invalid();
    ids.add(entry.id);
    return {
      evidenceId: `report-owner-social-v1:${entry.id}:${String(entry.passageSha256).slice(0, 12)}`,
      reportDomain: "general",
      unitType: "domain",
      function: "development",
      sectionHeading: entry.heading,
      text: entry.text,
      referenceFormat: entry.sourceFormat as ReportOwnerVoiceCorpusPassage["referenceFormat"],
      provenance: {
        sourcePath: SOCIAL_SOURCE,
        sourceType: "owner_authored_final",
        sourceSha256: sha256(body),
        passageSha256: entry.passageSha256 as string,
        sourceImageSha256: entry.imageSha256,
        sourceAssignment: SOCIAL_ASSIGNMENT
      }
    };
  });
}

function rankByRelevance<T>(entries: T[], text: (entry: T) => string, key: (entry: T) => string, relevanceText = "") {
  const stopWords = new Set("that this with from have been your they their them when where what which will would could should through about into more than then also only some does each these those because while there before after".split(" "));
  const terms = (value: string) => new Set((value.toLowerCase().match(/\b[a-z]{4,}\b/gu) ?? []).filter((term) => !stopWords.has(term)));
  const query = terms(relevanceText);
  const documents = entries.map((entry) => terms(text(entry)));
  const frequency = new Map<string, number>();
  for (const document of documents) for (const term of document) frequency.set(term, (frequency.get(term) ?? 0) + 1);
  return entries.map((entry, index) => ({ entry, score: [...documents[index]].reduce((score, term) => (
    query.has(term) ? score + Math.log(1 + documents.length / frequency.get(term)!) : score
  ), 0) })).sort((a, b) => b.score - a.score || key(a.entry).localeCompare(key(b.entry))).map(({ entry }) => entry);
}

export function reportOwnerVoicePassagesAreConnected(passages: ReportOwnerVoiceCorpusPassage[]) {
  if (!passages.length) return false;
  if (!cachedCorpus) reportOwnerVoiceCorpusV2();
  const source = annualSourceParagraphs.get(passages[0].provenance.sourcePath);
  return Boolean(source?.some((_, index) => passages.every((passage, offset) => (
    passage.provenance.sourcePath === passages[0].provenance.sourcePath
    && passage.sectionHeading === passages[0].sectionHeading
    && passage.text === source[index + offset]
  ))));
}

/** Read a connected development, rather than three unrelated overview lines. */
export function reportOwnerVoiceDevelopmentSetV2(relevanceText: string) {
  const sections = new Map<string, ReportOwnerVoiceCorpusPassage[]>();
  for (const passage of reportOwnerVoiceCorpusV2()) {
    if (!["theme", "season", "domain"].includes(passage.unitType)) continue;
    const key = `${passage.provenance.sourcePath}:${passage.sectionHeading}`;
    sections.set(key, [...(sections.get(key) ?? []), passage]);
  }
  const windows = [...sections.values()].flatMap((paragraphs) => paragraphs.flatMap((_, index) => (
    index + 3 <= paragraphs.length ? [paragraphs.slice(index, index + 3)] : []
  )));
  // The general corpus omits short/date-only paragraphs. Such omissions must
  // not turn a nonadjacent sequence into a purported connected development.
  const connected = windows.filter(reportOwnerVoicePassagesAreConnected);
  const selected = rankByRelevance(connected, (window) => window.map((passage) => passage.text).join("\n\n"), (window) => window[0].evidenceId, relevanceText)[0];
  if (!selected) throw new Error("REPORT_OWNER_VOICE_DEVELOPMENT_GAP");
  return selected;
}

export function reportOwnerSocialVoiceComparison(relevanceText: string, horizon: "day" | "week" | "current") {
  const corpus = reportOwnerSocialVoiceCorpusV1();
  // These are adjacent registers, never mislabeled as personalized daily or
  // third-person Friends gold examples. Format wins before topic relevance.
  const preferred = horizon === "week" ? "weekly_forecast" : "transit_forecast";
  const sameFormat = corpus.filter((passage) => passage.referenceFormat === preferred);
  return rankByRelevance(sameFormat.length ? sameFormat : corpus, (passage) => passage.text, (passage) => passage.evidenceId, relevanceText)[0] ?? null;
}

const FUNCTION_TARGETS: Record<ReportVoiceUnitType, ReportComparisonFunction[]> = {
  overview: ["opening", "development", "close"],
  theme: ["opening", "development", "complication"],
  season: ["opening", "complication", "close"],
  domain: ["opening", "development", "complication"],
  review: ["opening", "development", "close"],
  closing: ["opening", "turn", "close"]
};

/** Shared owner-final report retrieval. Optional relevance ranking preserves the default premium selection. */
export function reportOwnerVoiceComparisonSetV2(reportDomain: ReportDomain, unitId: string, options: { relevanceText?: string } = {}) {
  const unitType = reportVoiceUnitType(unitId);
  const candidates = reportOwnerVoiceCorpusV2().filter((passage) => passage.unitType === unitType);
  // Rank within the established register/function/domain constraints. Only the
  // locked brief supplies relevance; generated drafts never influence retrieval.
  if (options.relevanceText) {
    const terms = (value: string) => new Set(value.toLowerCase().match(/\b[a-z]{4,}\b/gu) ?? []);
    const query = terms(options.relevanceText);
    const documents = candidates.map((passage) => terms(passage.text));
    const score = (index: number) => [...documents[index]].reduce((total, term) => {
      if (!query.has(term)) return total;
      const frequency = documents.filter((document) => document.has(term)).length;
      return total + Math.log(1 + documents.length / frequency);
    }, 0);
    const ranked = candidates.map((passage, index) => ({ passage, score: score(index) }));
    ranked.sort((a, b) => b.score - a.score || a.passage.evidenceId.localeCompare(b.passage.evidenceId));
    candidates.splice(0, candidates.length, ...ranked.map((entry) => entry.passage));
  }
  const selected: ReportOwnerVoiceCorpusPassage[] = [];
  for (const functionTag of FUNCTION_TARGETS[unitType]) {
    const unusedSources = new Set(selected.map((passage) => passage.provenance.sourcePath));
    const choice = candidates.find((passage) => passage.function === functionTag
      && passage.reportDomain === reportDomain
      && !selected.some((entry) => entry.evidenceId === passage.evidenceId))
      ?? candidates.find((passage) => passage.function === functionTag
        && !unusedSources.has(passage.provenance.sourcePath)
        && !selected.some((entry) => entry.evidenceId === passage.evidenceId))
      ?? candidates.find((passage) => passage.function === functionTag
        && !selected.some((entry) => entry.evidenceId === passage.evidenceId));
    if (choice) selected.push(choice);
  }
  for (const fallback of candidates) {
    if (selected.length >= 3) break;
    if (!selected.some((entry) => entry.evidenceId === fallback.evidenceId)) selected.push(fallback);
  }
  if (selected.length !== 3) throw new Error(`REPORT_OWNER_VOICE_CORPUS_GAP: ${reportDomain}:${unitId}:${unitType}`);
  return selected;
}
