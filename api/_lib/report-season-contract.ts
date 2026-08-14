export type ReportSeasonUnitId = "winter-current" | "spring" | "summer" | "autumn" | "winter-next";
export type ReportSeasonContract = { unitId: ReportSeasonUnitId; startsAt: string; endsAt: string; startMs: number; endMs: number; headingPrefix: string; dateRange: string };
type FactRecord = Record<string, unknown>;
const IDS: ReportSeasonUnitId[] = ["winter-current", "spring", "summer", "autumn", "winter-next"];
const NAMES = ["WINTER", "SPRING", "SUMMER", "AUTUMN", "WINTER"];

function record(value: unknown): FactRecord | null { return value && typeof value === "object" && !Array.isArray(value) ? value as FactRecord : null; }
function dateLabel(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error(`REPORT_PERIOD_INVALID: ${value}`);
  return `${date.toLocaleString("en-US", { month: "short", timeZone: "UTC" })} ${date.getUTCDate()}`;
}
function previousDayLabel(value: string) {
  const date = new Date(value);
  date.setUTCDate(date.getUTCDate() - 1);
  return dateLabel(date.toISOString());
}

export function reportSeasonContracts(frozenFacts: Record<string, unknown>): ReportSeasonContract[] {
  const root = record(frozenFacts.reportWindow) ?? frozenFacts;
  const periods = Array.isArray(root.periods) ? root.periods.map(record).filter(Boolean) as FactRecord[] : [];
  if (periods.length < IDS.length) throw new Error(`REPORT_PERIODS_INCOMPLETE: expected ${IDS.length} calculation-service periods, received ${periods.length}.`);
  return IDS.map((unitId, index) => {
    const startsAt = String(periods[index]?.startsAt ?? "");
    const endsAt = String(periods[index]?.endsAt ?? "");
    const startMs = Date.parse(startsAt);
    const endMs = Date.parse(endsAt);
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) throw new Error(`REPORT_PERIOD_INVALID: ${unitId}`);
    const displayYear = unitId === "winter-next" ? new Date(endsAt).getUTCFullYear() : new Date(startsAt).getUTCFullYear();
    const displayEnd = unitId === "winter-next" ? previousDayLabel(endsAt) : dateLabel(endsAt);
    return { unitId, startsAt, endsAt, startMs, endMs, headingPrefix: `${NAMES[index]} ${displayYear}`, dateRange: `${dateLabel(startsAt)} - ${displayEnd}` };
  });
}

export function reportSeasonContract(unitId: string, frozenFacts: Record<string, unknown>) {
  if (!IDS.includes(unitId as ReportSeasonUnitId)) return null;
  return reportSeasonContracts(frozenFacts).find((entry) => entry.unitId === unitId) ?? null;
}
