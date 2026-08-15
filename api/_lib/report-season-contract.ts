export type ReportSeasonUnitId = "winter-current" | "spring" | "summer" | "autumn" | "winter-next";
export type ReportSeasonContract = { unitId: ReportSeasonUnitId; startsAt: string; endsAt: string; startMs: number; endMs: number; headingPrefix: string; dateRange: string };
type FactRecord = Record<string, unknown>;
const IDS: ReportSeasonUnitId[] = ["winter-current", "spring", "summer", "autumn", "winter-next"];
const NAMES = ["WINTER", "SPRING", "SUMMER", "AUTUMN", "WINTER"];

function record(value: unknown): FactRecord | null { return value && typeof value === "object" && !Array.isArray(value) ? value as FactRecord : null; }
function dateParts(value: string, timeZone: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error(`REPORT_PERIOD_INVALID: ${value}`);
  const parts = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return { month: get("month"), day: Number(get("day")), year: Number(get("year")) };
}
function dateLabel(value: string, timeZone: string) {
  const parts = dateParts(value, timeZone);
  return `${parts.month} ${parts.day}`;
}
function previousLocalDayLabel(value: string, timeZone: string) {
  return dateLabel(new Date(Date.parse(value) - 24 * 60 * 60 * 1000).toISOString(), timeZone);
}
function factTimeZone(frozenFacts: Record<string, unknown>) {
  const root = record(frozenFacts.reportWindow) ?? frozenFacts;
  const solarReturn = record(root.solarReturn);
  const location = record(solarReturn?.location) ?? record(root.location);
  const provenance = record(root.fixtureProvenance);
  const value = location?.timeZone ?? provenance?.timeZone;
  return typeof value === "string" && value.trim() ? value : "UTC";
}

export function reportSeasonContracts(frozenFacts: Record<string, unknown>): ReportSeasonContract[] {
  const root = record(frozenFacts.reportWindow) ?? frozenFacts;
  const timeZone = factTimeZone(frozenFacts);
  const periods = Array.isArray(root.periods) ? root.periods.map(record).filter(Boolean) as FactRecord[] : [];
  if (periods.length < IDS.length) throw new Error(`REPORT_PERIODS_INCOMPLETE: expected ${IDS.length} calculation-service periods, received ${periods.length}.`);
  return IDS.map((unitId, index) => {
    const startsAt = String(periods[index]?.startsAt ?? "");
    const endsAt = String(periods[index]?.endsAt ?? "");
    const startMs = Date.parse(startsAt);
    const endMs = Date.parse(endsAt);
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) throw new Error(`REPORT_PERIOD_INVALID: ${unitId}`);
    const displayYear = unitId === "winter-next" ? dateParts(endsAt, timeZone).year : dateParts(startsAt, index === 0 ? "UTC" : timeZone).year;
    // Calculation periods are half-open [startsAt, endsAt). Adjacent seasons
    // display their shared boundary date; only the report's final season turns
    // the exclusive end instant into the preceding local calendar date.
    const displayEnd = unitId === "winter-next" ? previousLocalDayLabel(endsAt, timeZone) : dateLabel(endsAt, timeZone);
    const displayStart = dateLabel(startsAt, index === 0 ? "UTC" : timeZone);
    return { unitId, startsAt, endsAt, startMs, endMs, headingPrefix: `${NAMES[index]} ${displayYear}`, dateRange: `${displayStart} - ${displayEnd}` };
  });
}

export function reportSeasonContract(unitId: string, frozenFacts: Record<string, unknown>) {
  if (!IDS.includes(unitId as ReportSeasonUnitId)) return null;
  return reportSeasonContracts(frozenFacts).find((entry) => entry.unitId === unitId) ?? null;
}
