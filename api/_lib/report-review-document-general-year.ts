import { buildCustomerReportColophon, reportGlyphLine } from "./report-colophon.ts";
import {
  assertGeneralYearUnitOrder, chartEarnedDomainEvidence, composeDomainAttribution,
  composeSeasonAttribution, composeSeasonKeyDates, composeYearThemeAttribution,
  isSeasonUnitId, type ReportReaderProfile
} from "./report-structure.ts";
import type { BuildReviewedReportDocumentInput } from "./report-review-document.ts";
import type { ReviewedReportDocument, ReviewedUnit } from "./report-review-document.ts";
import { reportSeasonContracts } from "./report-season-contract.ts";
import { reportUnitIds } from "./report-unit-order.ts";
import { canonicalReportEvents } from "./report-events.ts";
import { REPORT_KEY_DATE_CATEGORIES } from "./report-generation.ts";

function paragraphs(value: string | undefined) { return (value ?? "").split(/\n\s*\n/gu).map((entry) => entry.trim()).filter(Boolean); }

export type BuildGeneralYearReviewedReportInput = BuildReviewedReportDocumentInput & {
  facts: Record<string, unknown>;
  readerProfile: ReportReaderProfile;
};

export function validateGeneralYearReviewedReportDocument(document: ReviewedReportDocument, facts: Record<string, unknown>) {
  const fail = (code: string, detail = "") => { throw new Error(`${code}${detail ? `: ${detail}` : ""}`); };
  if (document.cover.title !== "YOUR YEAR AHEAD REPORT") fail("REPORT_STRUCTURE_COVER_INVALID");
  if (!document.cover.periodLine || !document.cover.handleLine || !document.cover.glyphLine) fail("REPORT_STRUCTURE_COVER_FIELDS_MISSING");
  const declared = reportUnitIds("general", "12_months");
  const rendered = document.chapters.map((chapter) => chapter.id);
  if (JSON.stringify(rendered) !== JSON.stringify(declared)) fail("REPORT_STRUCTURE_ORDER_MISMATCH", rendered.join(","));
  if (document.chapters.filter((chapter) => chapter.id === "overview").length !== 1) fail("REPORT_STRUCTURE_OVERVIEW_COUNT");
  if (document.chapters.some((chapter) => chapter.title === document.cover.title)) fail("REPORT_STRUCTURE_HEADLINE_DUPLICATED");
  if (document.keyDates.length) fail("REPORT_STRUCTURE_GLOBAL_KEY_DATES_FORBIDDEN");
  const eventById = new Map(canonicalReportEvents(facts).map((event) => [event.eventId, event]));
  const seasons = new Map(reportSeasonContracts(facts).map((season) => [season.unitId, season]));
  for (const unitId of ["winter-current", "spring", "summer", "autumn", "winter-next"] as const) {
    const chapter = document.chapters.find((entry) => entry.id === unitId);
    const season = seasons.get(unitId);
    if (!chapter || !season) fail("REPORT_STRUCTURE_SEASON_MISSING", unitId);
    if (!chapter.attributionText?.trim()) fail("REPORT_STRUCTURE_SEASON_ATTRIBUTION_COUNT", `${unitId}:0`);
    if (!chapter.keyDates?.length) fail("REPORT_STRUCTURE_KEY_DATES_BLOCK_MISSING", unitId);
    for (const keyDate of chapter.keyDates ?? []) {
      if (!keyDate.date || !keyDate.title || !keyDate.paragraphs[0] || !keyDate.attributionText) fail("REPORT_STRUCTURE_KEY_DATE_INCOMPLETE", keyDate.id);
      if (!REPORT_KEY_DATE_CATEGORIES.includes(keyDate.category)) fail("REPORT_STRUCTURE_KEY_DATE_CATEGORY_INVALID", keyDate.id);
      const event = eventById.get(keyDate.eventId);
      if (!event) fail("REPORT_STRUCTURE_KEY_DATE_EVENT_UNRESOLVED", keyDate.eventId);
      const timestamp = Date.parse(event.occursAt);
      if (timestamp < season.startMs || timestamp >= season.endMs) fail("REPORT_STRUCTURE_KEY_DATE_OUT_OF_SEASON", `${keyDate.eventId}/${unitId}`);
    }
  }
  const closingRange = document.chapters.find((chapter) => chapter.id === "winter-next")?.paragraphs[0] ?? "";
  const coverEnd = document.cover.periodLine.split(" - ").at(-1) ?? "";
  const closingEnd = closingRange.split(" - ").at(-1) ?? "";
  if (!coverEnd.startsWith(closingEnd)) fail("REPORT_STRUCTURE_PERIOD_END_MISMATCH", `${coverEnd}/${closingEnd}`);
  if (!document.colophon.entries.length) fail("REPORT_STRUCTURE_COLOPHON_MISSING");
  return true;
}

/** Benchmark-derived customer document for the General 12-month product.
 * It is intentionally separate from the legacy/deep-dive builder so this
 * package cannot silently change another product's structure. */
export function buildGeneralYearReviewedReportDocument(input: BuildGeneralYearReviewedReportInput): ReviewedReportDocument {
  if (input.reportDomain !== "general" || input.reportHorizon !== "12_months") throw new Error("REPORT_STRUCTURE_PRODUCT_MISMATCH");
  if (!input.readerProfile.handle.trim()) throw new Error("REPORT_PROFILE_HANDLE_REQUIRED: choose a customer handle before report generation.");
  if (!input.readerProfile.displayName.trim()) throw new Error("REPORT_PROFILE_DISPLAY_NAME_REQUIRED: customer display name is required.");
  const declared = reportUnitIds("general", "12_months");
  const byId = new Map<string, ReviewedUnit>();
  for (const unit of input.units) {
    if (byId.has(unit.unitId)) throw new Error(`REPORT_STRUCTURE_SECTION_DUPLICATED: ${unit.unitId}`);
    byId.set(unit.unitId, unit);
  }
  for (const unitId of declared) if (!byId.has(unitId)) throw new Error(`REPORT_STRUCTURE_SECTION_MISSING: ${unitId}`);
  const unexpected = input.units.map((unit) => unit.unitId).filter((unitId) => !declared.includes(unitId));
  if (unexpected.length) throw new Error(`REPORT_STRUCTURE_SECTION_UNEXPECTED: ${unexpected.join(",")}`);
  const ordered = declared.map((unitId) => byId.get(unitId) as ReviewedUnit);
  assertGeneralYearUnitOrder(ordered.map((unit) => unit.unitId));
  const overview = byId.get("overview") as ReviewedUnit;
  const directive = overview.draft.action?.trim();
  if (!directive) throw new Error("REPORT_STRUCTURE_DIRECTIVE_MISSING: overview.action must contain the written one-sentence year directive.");
  const customerColophon = buildCustomerReportColophon({ facts: input.facts, periodStart: input.periodStart, periodEnd: input.periodEnd, displayName: input.readerProfile.displayName });
  const seasonContracts = new Map(reportSeasonContracts(input.facts).map((entry) => [entry.unitId, entry]));
  const evidence = chartEarnedDomainEvidence(input.facts);
  const storedEvidence = byId.get("domain:main")?.sourceSnapshot?.sectionSelectionEvidence;
  if (!storedEvidence) throw new Error("REPORT_STRUCTURE_DOMAIN_EVIDENCE_MISSING");
  if (JSON.stringify(storedEvidence) !== JSON.stringify(evidence)) throw new Error("REPORT_STRUCTURE_DOMAIN_EVIDENCE_MISMATCH");
  const year = Number(input.periodStart.slice(0, 4));
  const chapters = ordered.map((unit) => {
    const common = { id: unit.unitId, kicker: "General", title: unit.draft.headline ?? "", paragraphs: [unit.draft.summary ?? "", ...paragraphs(unit.draft.body)].filter(Boolean) };
    if (unit.unitId === "overview") return { ...common, kicker: "Overview", title: `${year} OVERVIEW`, paragraphs: paragraphs(unit.draft.body) };
    if (unit.unitId === "year-theme") return { ...common, attributionText: composeYearThemeAttribution(input.facts) };
    if (unit.unitId === "domain:main") return { ...common, attributionText: composeDomainAttribution(input.facts, evidence), selectionEvidence: evidence };
    if (isSeasonUnitId(unit.unitId)) {
      const contract = seasonContracts.get(unit.unitId);
      if (!contract) throw new Error(`REPORT_STRUCTURE_SEASON_CONTRACT_MISSING: ${unit.unitId}`);
      if (!(unit.draft.headline ?? "").startsWith(contract.headingPrefix)) throw new Error(`REPORT_STRUCTURE_SEASON_HEADING_INVALID: ${unit.unitId}`);
      if (unit.draft.timing !== contract.dateRange) throw new Error(`REPORT_STRUCTURE_SEASON_RANGE_INVALID: ${unit.unitId}`);
      const keyDates = composeSeasonKeyDates(unit.unitId, input.facts, unit.draft);
      if (!keyDates.length) throw new Error(`REPORT_STRUCTURE_KEY_DATES_BLOCK_MISSING: ${unit.unitId}`);
      return {
        ...common,
        paragraphs: [contract.dateRange, unit.draft.summary ?? "", ...paragraphs(unit.draft.body)].filter(Boolean),
        attributionText: composeSeasonAttribution(unit.unitId, input.facts, unit.draft),
        keyDates
      };
    }
    return common;
  });
  if (chapters.some((chapter) => chapter.title === "YOUR YEAR AHEAD REPORT")) throw new Error("REPORT_STRUCTURE_COVER_HEADLINE_DUPLICATED");
  if (chapters[0]?.title === "YOUR YEAR AHEAD REPORT") throw new Error("REPORT_STRUCTURE_OVERVIEW_HEADLINE_DUPLICATED");
  const document: ReviewedReportDocument = {
    id: input.id,
    reportType: "report",
    cover: {
      kicker: "General",
      title: "YOUR YEAR AHEAD REPORT",
      periodLine: customerColophon.periodLine,
      handleLine: `@${input.readerProfile.handle.replace(/^@/u, "")}, ${directive}`,
      glyphLine: reportGlyphLine(input.facts)
    },
    chapters,
    keyDates: [],
    colophon: { entries: customerColophon.entries },
    reviewMetadata: { factsEngine: input.factsEngine, factsHash: input.factsHash, generatedAt: input.generatedAt ?? undefined }
  };
  validateGeneralYearReviewedReportDocument(document, input.facts);
  return document;
}
