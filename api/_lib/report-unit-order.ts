import type { ReportDomain, ReportHorizon } from "./report-types.ts";

const UNITS: Record<ReportHorizon, readonly string[]> = {
  "1_month": ["overview", "what-matters-most", "domain:main", "key-dates"],
  "4_months": ["overview", "period-theme", "development:1", "development:2", "key-dates", "closing-synthesis"],
  "6_months": ["overview", "period-theme", "phase-1", "phase-2", "key-dates", "review"],
  "12_months": ["overview", "year-theme", "domain:main", "winter-current", "spring", "summer", "autumn", "money", "key-dates", "review-current-year", "winter-next"]
};
const PERSONAL_HEALTH_YEAR = ["overview", "year-theme", "domain:main", "winter-current", "spring", "summer", "autumn", "health-capacity", "key-dates", "review-current-year", "winter-next"];

export function reportUnitIds(domain: ReportDomain, horizon: ReportHorizon) {
  return [...(domain === "personal_health" && horizon === "12_months" ? PERSONAL_HEALTH_YEAR : UNITS[horizon])];
}

export function reportUnitDisplayOrder(domain: ReportDomain, horizon: ReportHorizon, unitId: string) {
  const index = reportUnitIds(domain, horizon).indexOf(unitId);
  if (index < 0) throw new Error(`REPORT_UNIT_ORDER_UNKNOWN: ${domain}/${horizon}/${unitId}`);
  return index;
}
