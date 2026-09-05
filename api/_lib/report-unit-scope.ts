import type { ReportFactor, ReportGenerationPayload } from "./report-generation.ts";
import { reportSeasonContract } from "./report-season-contract.ts";

type DateRange = { start: number; end: number };

function recordValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function reportWindow(facts: Record<string, unknown>) {
  return recordValue(facts.reportWindow) ?? facts;
}

function parsed(value: unknown) {
  const result = typeof value === "string" ? Date.parse(value) : NaN;
  return Number.isFinite(result) ? result : null;
}

export function reportUnitScopeRange(payload: ReportGenerationPayload): DateRange | null {
  const unit = payload.unit.unitId;
  if (!["winter-current", "spring", "summer", "autumn", "winter-next", "phase-1", "phase-2"].includes(unit)) return null;
  const facts = reportWindow(payload.frozenFacts);
  const start = new Date(String(facts.startsAt));
  const end = new Date(String(facts.endsAt));
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) return null;
  if (unit === "phase-1" || unit === "phase-2") {
    const midpoint = start.getTime() + Math.floor((end.getTime() - start.getTime()) / 2);
    return unit === "phase-1"
      ? { start: start.getTime(), end: midpoint }
      : { start: midpoint + 1, end: end.getTime() };
  }
  const season = reportSeasonContract(unit, payload.frozenFacts);
  return season ? { start: season.startMs, end: season.endMs } : null;
}

function sourceDates(value: unknown): number[] {
  if (Array.isArray(value)) return value.flatMap(sourceDates);
  const record = recordValue(value);
  if (!record) return [];
  return Object.entries(record).flatMap(([key, entry]) => (
    /(?:At|Date|startsAt|endsAt)$/u.test(key) && parsed(entry) !== null
      ? [parsed(entry) as number]
      : sourceDates(entry)
  ));
}

function factorInRange(factor: ReportFactor, range: DateRange) {
  if (factor.factorType === "profection-year" || factor.factorType === "sr-overlay") return true;
  const dates = sourceDates(factor.source);
  return dates.length === 0 || dates.some((date) => date >= range.start && date <= range.end);
}

function scopedWindowFacts(facts: Record<string, unknown>, range: DateRange) {
  const result = structuredClone(facts);
  for (const key of ["fastTransitKeyDates", "lunarEvents", "stations", "ingresses"] as const) {
    if (Array.isArray(result[key])) {
      result[key] = result[key].filter((entry) => sourceDates(entry).some((date) => date >= range.start && date <= range.end));
    }
  }
  if (Array.isArray(result.slowTransitArcs)) {
    result.slowTransitArcs = result.slowTransitArcs.flatMap((entry) => {
      const arc = recordValue(entry);
      if (!arc) return [];
      const passes = Array.isArray(arc.passes)
        ? arc.passes.filter((pass) => sourceDates(pass).some((date) => date >= range.start && date <= range.end))
        : [];
      return passes.length ? [{ ...arc, passes }] : [];
    });
  }
  return result;
}

export function scopeReportPayloadToUnit(payload: ReportGenerationPayload): ReportGenerationPayload {
  const range = reportUnitScopeRange(payload);
  if (!range) return structuredClone(payload);
  const factorIds = new Set(payload.factors.filter((factor) => factorInRange(factor, range)).map((factor) => factor.id));
  const scopedFacts = reportWindow(payload.frozenFacts);
  const nextWindow = scopedWindowFacts(scopedFacts, range);
  const frozenFacts = recordValue(payload.frozenFacts.reportWindow)
    ? { ...structuredClone(payload.frozenFacts), reportWindow: nextWindow }
    : nextWindow;
  return {
    ...structuredClone(payload),
    frozenFacts,
    factors: payload.factors.filter((factor) => factorIds.has(factor.id)),
    factorSelection: payload.factorSelection.filter((selection) => factorIds.has(selection.factorId)),
    manifestationSets: payload.manifestationSets.filter((item) => factorIds.has(item.factor.id)),
    sourceGaps: payload.sourceGaps.filter((gap) => factorIds.has(gap.factorId)),
    writingQueue: payload.writingQueue.filter((gap) => factorIds.has(gap.factorId)),
    technicalEvents: (payload.technicalEvents ?? []).filter((event) => {
      const exact = Date.parse(event.occursAt);
      return Number.isFinite(exact) && exact >= range.start && exact < range.end;
    })
  };
}
