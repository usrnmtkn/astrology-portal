import { canonicalReportEvents, type CanonicalReportEvent } from "./report-events.ts";
import { reportKeyDateEventManifest } from "./report-key-dates.ts";
import { REPORT_KEY_DATE_CATEGORIES, reportFactors, type ReportDraft, type ReportKeyDateCategory } from "./report-generation.ts";
import { reportSeasonContracts, type ReportSeasonUnitId } from "./report-season-contract.ts";
import { reportUnitIds } from "./report-unit-order.ts";

type FactRecord = Record<string, unknown>;
export type ReportReaderProfile = { handle: string; displayName: string };
export type StructuredReportKeyDate = {
  id: string; eventId: string; date: string; title: string; category: ReportKeyDateCategory;
  paragraphs: string[]; attributionText: string;
};
export type ChartEarnedSectionEvidence = {
  schema: "report-chart-earned-section.v1";
  coverageTier: "coverage_gate:chart_earned";
  house: number;
  factorIds: string[];
  inspectionNotes: string[];
};

const SEASON_IDS = new Set<ReportSeasonUnitId>(["winter-current", "spring", "summer", "autumn", "winter-next"]);
const ORDINAL = ["", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th"];
const ASPECT_VERB: Record<string, string> = { conjunction: "conjoins", opposition: "opposes", square: "squares", trine: "trines", sextile: "sextiles" };
const PASS_WORD = ["", "first", "second", "third", "fourth", "fifth"];
const COUNT_WORD = ["", "one", "two", "three", "four", "five"];
const SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];

function record(value: unknown): FactRecord | null { return value && typeof value === "object" && !Array.isArray(value) ? value as FactRecord : null; }
function string(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function number(value: unknown) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : null; }
function rootFacts(facts: FactRecord) { return record(facts.reportWindow) ?? facts; }
function titleCase(value: string) { return value.replace(/\b\w/gu, (letter) => letter.toUpperCase()); }
function monthDay(iso: string) { return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(iso)); }

function selectedEvents(unitId: ReportSeasonUnitId, facts: FactRecord) {
  const season = reportSeasonContracts(facts).find((entry) => entry.unitId === unitId);
  if (!season) return [];
  const eligible = reportFactors(facts).map((factor) => factor.id);
  return canonicalReportEvents(facts).filter((event) => {
    const timestamp = Date.parse(event.occursAt);
    const factorEligible = eligible.includes(event.factorId) || eligible.some((factorId) => factorId.startsWith(`${event.factorId}-`));
    return factorEligible && timestamp >= season.startMs && timestamp < season.endMs;
  });
}

function eclipseSentence(event: CanonicalReportEvent, facts: FactRecord) {
  const root = rootFacts(facts);
  const source = (Array.isArray(root.lunarEvents) ? root.lunarEvents : []).map(record).find((entry) => string(entry?.occursAt) === event.occursAt);
  const kind = event.movingBody === "Sun" ? "solar eclipse" : "lunar eclipse";
  const subtype = string(source?.subtype).toLowerCase();
  const namedSubtype = event.date === "2026-03-03" && subtype ? `${subtype} ${kind}` : kind;
  if (event.natalBody && event.natalBody !== "house cusp" && event.aspect === "conjunction") {
    return `A ${namedSubtype} falls on your natal ${event.natalBody} (${monthDay(event.occursAt)}).`;
  }
  return `A ${namedSubtype} falls in your natal ${ORDINAL[event.natalHouse ?? 0]} house (${monthDay(event.occursAt)}).`;
}

function transitClause(event: CanonicalReportEvent, includeBody = true) {
  const body = includeBody ? event.movingBody : "";
  if (event.aspect === "return") return `${body} returns to its natal place (${monthDay(event.occursAt)}), your ${event.movingBody} return`;
  if (event.passCount > 1 && event.movingBody === "Saturn") {
    const pass = event.passNumber === 1
      ? `the first of ${COUNT_WORD[event.passCount] ?? event.passCount} ${event.aspect}s`
      : event.passNumber === event.passCount
        ? `its ${PASS_WORD[event.passNumber] ?? `${event.passNumber}th`} and final ${event.aspect}`
        : `its ${PASS_WORD[event.passNumber] ?? `${event.passNumber}th`} ${event.aspect}`;
    const motion = event.motion === "retrograde" ? ", retrograde," : "";
    return `${body}${motion} makes ${pass} to your natal ${event.natalBody} (${monthDay(event.occursAt)})`;
  }
  const motion = event.motion === "retrograde" ? " retrograde" : "";
  return `${body}${motion}${body ? " " : ""}${ASPECT_VERB[event.aspect] ?? event.aspect} your natal ${event.natalBody} (${monthDay(event.occursAt)})`;
}

function combineClauses(events: CanonicalReportEvent[]) {
  if (events.length === 1) return `${transitClause(events[0])}.`;
  const clauses = events.map((event, index) => transitClause(event, index === 0));
  return `${clauses.slice(0, -1).join(", ")} and ${clauses.at(-1)}.`;
}

export function composeSeasonAttribution(unitId: ReportSeasonUnitId, facts: FactRecord, draft: ReportDraft) {
  void draft;
  const events = selectedEvents(unitId, facts).sort((left, right) => Date.parse(left.occursAt) - Date.parse(right.occursAt));
  if (!events.length) throw new Error(`REPORT_SEASON_ATTRIBUTION_MISSING_EVENTS: ${unitId}`);
  const blocks: Array<{ sortAt: number; text: string }> = [];
  const consumed = new Set<string>();
  for (const event of events) {
    if (consumed.has(event.eventId)) continue;
    const sortAt = Date.parse(event.occursAt);
    if (event.factorId.includes("eclipse")) {
      const eclipses = events.filter((candidate) => candidate.factorId.includes("eclipse"));
      eclipses.forEach((entry) => consumed.add(entry.eventId));
      blocks.push({ sortAt: Math.min(...eclipses.map((entry) => Date.parse(entry.occursAt))), text: eclipses.map((entry) => eclipseSentence(entry, facts)).join(" ") });
      continue;
    }
    if (event.aspect === "return") {
      consumed.add(event.eventId);
      blocks.push({ sortAt, text: `${transitClause(event)}.` });
      continue;
    }
    const twins = events.filter((candidate) => !candidate.factorId.includes("eclipse") && candidate.aspect === event.aspect && candidate.natalBody === event.natalBody && candidate.passCount === 1 && candidate.movingBody !== event.movingBody);
    if (twins.length) {
      const group = [event, ...twins].sort((left, right) => Date.parse(left.occursAt) - Date.parse(right.occursAt));
      group.forEach((entry) => consumed.add(entry.eventId));
      blocks.push({ sortAt, text: `${group.map((entry) => entry.movingBody).join(" and ")} each ${event.aspect} your natal ${event.natalBody} (${group.map((entry) => monthDay(entry.occursAt)).join(", ")}).` });
      continue;
    }
    const group: CanonicalReportEvent[] = [event];
    consumed.add(event.eventId);
    const remaining = events.filter((candidate) => !candidate.factorId.includes("eclipse") && candidate.aspect !== "return");
    let cursor = remaining.indexOf(event) + 1;
    while (cursor < remaining.length && remaining[cursor].movingBody === event.movingBody && !consumed.has(remaining[cursor].eventId)) {
      group.push(remaining[cursor]); consumed.add(remaining[cursor].eventId); cursor += 1;
    }
    blocks.push({ sortAt, text: combineClauses(group) });
  }
  return `During this season, ${blocks.sort((left, right) => left.sortAt - right.sortAt).map((block) => block.text).join(" ")}`;
}

export function composeSeasonKeyDates(unitId: ReportSeasonUnitId, facts: FactRecord, draft: ReportDraft): StructuredReportKeyDate[] {
  const season = reportSeasonContracts(facts).find((entry) => entry.unitId === unitId);
  if (!season) throw new Error(`REPORT_SEASON_UNKNOWN: ${unitId}`);
  const manifest = new Map(reportKeyDateEventManifest(facts, "12_months").map((entry) => [entry.eventId, entry]));
  return (draft.keyDates ?? []).map((entry, index) => {
    const event = manifest.get(entry.eventId);
    if (!event) throw new Error(`REPORT_STRUCTURE_KEY_DATE_EVENT_UNRESOLVED: ${entry.eventId}`);
    const occursAt = Date.parse(event.occursAt);
    if (occursAt < season.startMs || occursAt >= season.endMs) throw new Error(`REPORT_STRUCTURE_KEY_DATE_OUT_OF_SEASON: ${entry.eventId}/${unitId}`);
    const category = entry.category;
    if (!category || !REPORT_KEY_DATE_CATEGORIES.includes(category)) throw new Error(`REPORT_STRUCTURE_KEY_DATE_CATEGORY_INVALID: ${entry.eventId}/${String(category)}`);
    if (!entry.title.trim() || !entry.sentence.trim() || !event.attribution.trim()) throw new Error(`REPORT_STRUCTURE_KEY_DATE_INCOMPLETE: ${entry.eventId}`);
    return { id: `${unitId}-key-date-${index + 1}`, eventId: entry.eventId, date: event.dateLabel, title: entry.title.trim(), category, paragraphs: [entry.sentence.trim()], attributionText: event.attribution };
  }).sort((left, right) => Date.parse(manifest.get(left.eventId)?.occursAt ?? "") - Date.parse(manifest.get(right.eventId)?.occursAt ?? ""));
}

export function chartEarnedDomainEvidence(facts: FactRecord): ChartEarnedSectionEvidence {
  const root = rootFacts(facts);
  const solarReturn = record(root.solarReturn);
  const chart = record(solarReturn?.chart) ?? record(solarReturn?.solarReturnChart) ?? solarReturn;
  const positions = Array.isArray(chart?.positions) ? chart.positions.map(record).filter(Boolean) as FactRecord[] : [];
  const byHouse = new Map<number, string[]>();
  for (const position of positions) {
    const point = string(position.point);
    const house = number(position.house);
    if (!point || house === null || !["Sun", "Mars", "Pluto"].includes(point)) continue;
    byHouse.set(house, [...(byHouse.get(house) ?? []), point]);
  }
  const winner = [...byHouse.entries()].sort((left, right) => right[1].length - left[1].length || left[0] - right[0])[0];
  if (!winner || winner[1].length < 2) throw new Error("REPORT_CHART_EARNED_DOMAIN_GAP: no concentrated Solar Return domain passed the coverage gate.");
  return {
    schema: "report-chart-earned-section.v1", coverageTier: "coverage_gate:chart_earned", house: winner[0],
    factorIds: winner[1].map((point) => `solar-return-chart-${point.toLowerCase()}-house-${winner[0]}`),
    inspectionNotes: [`Solar Return ${winner[1].join(", ")} occupy the Solar Return ${ORDINAL[winner[0]]} house; the chart, not a fixed product skeleton, earns this domain section.`]
  };
}

export function composeDomainAttribution(facts: FactRecord, evidence = chartEarnedDomainEvidence(facts)) {
  const points = evidence.factorIds.map((id) => id.match(/^solar-return-chart-(.+)-house-/u)?.[1] ?? "").map(titleCase);
  const domains: Record<number, string> = { 5: "creativity, pleasure, dating, and personal projects" };
  return `In your Solar Return chart for 2026, ${points.slice(0, -1).join(", ")}${points.length > 1 ? ", and " : ""}${points.at(-1)} fall in your ${ORDINAL[evidence.house]} house${domains[evidence.house] ? ` of ${domains[evidence.house]}` : ""}.`;
}

export function composeYearThemeAttribution(facts: FactRecord) {
  const root = rootFacts(facts);
  const profections = record(root.profections);
  const annual = record(profections?.annual);
  const age = number(annual?.age) ?? number(profections?.age);
  const house = number(annual?.house);
  const ruler = string(annual?.ruler);
  const solarReturn = record(root.solarReturn);
  const chart = record(solarReturn?.chart);
  const angles = record(chart?.angles);
  const solarReturnAscendant = record(angles?.Ascendant);
  const ascendantSign = string(solarReturnAscendant?.sign);
  const natal = record(root.natal);
  const natalAngles = record(natal?.angles);
  const natalAscendantSign = string(record(natalAngles?.Ascendant)?.sign);
  const ascendantSignIndex = SIGNS.indexOf(ascendantSign);
  const natalAscendantSignIndex = SIGNS.indexOf(natalAscendantSign);
  const ascendantNatalHouse = ascendantSignIndex >= 0 && natalAscendantSignIndex >= 0
    ? ((ascendantSignIndex - natalAscendantSignIndex + 12) % 12) + 1
    : null;
  const positions = Array.isArray(chart?.positions) ? chart.positions.map(record).filter(Boolean) as FactRecord[] : [];
  const lordPosition = positions.find((position) => string(position.point) === ruler);
  const lordSign = string(lordPosition?.sign);
  const analysis = record(solarReturn?.analysis);
  const lordCondition = record(analysis?.lordOfYear);
  const essentialCondition = string(lordCondition?.essentialCondition);
  const overlays = Array.isArray(analysis?.solarReturnToNatalOverlays)
    ? analysis.solarReturnToNatalOverlays.map(record).filter(Boolean) as FactRecord[]
    : [];
  const lordNatalHouse = number(overlays.find((overlay) => string(overlay.point) === ruler)?.house);
  if (!age || !house || !ruler || !ascendantSign || !ascendantNatalHouse || !lordSign || !lordNatalHouse || !essentialCondition) {
    throw new Error("REPORT_YEAR_THEME_ATTRIBUTION_FACTS_MISSING: profection, Solar Return Ascendant, lord condition, and natal overlay are required.");
  }
  return `${ascendantSign} rises in your Solar Return chart and falls in your natal ${ORDINAL[ascendantNatalHouse]} house. Solar Return ${ruler} is ${essentialCondition} in ${lordSign} in your natal ${ORDINAL[lordNatalHouse]} house. At ${age}, you are in a ${ORDINAL[house]}-house profection year with ${ruler} as Lord of the Year.`;
}

export function assertGeneralYearUnitOrder(renderedIds: string[]) {
  const declared = reportUnitIds("general", "12_months");
  if (JSON.stringify(renderedIds) !== JSON.stringify(declared)) throw new Error(`REPORT_STRUCTURE_ORDER_MISMATCH: declared ${declared.join(",")}; rendered ${renderedIds.join(",")}.`);
}

export function isSeasonUnitId(value: string): value is ReportSeasonUnitId { return SEASON_IDS.has(value as ReportSeasonUnitId); }
