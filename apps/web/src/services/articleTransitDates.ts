import type { ArticleKeyDate } from "../components/ArticleKeyDates";

type TransitDates = {
  currentStart?: string;
  currentEnd?: string;
  engagementStart: string;
  engagementEnd: string;
  exactPasses: Array<{ exactAt: string }>;
  timeZone?: string;
};

/** Present verified transit boundaries in the selected location's time zone. */
export function articleTransitKeyDates(timing: TransitDates | null | undefined, referenceDate: string, timeZone = timing?.timeZone ?? "UTC"): ArticleKeyDate[] {
  if (!timing) return [];
  const format = (iso: string, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-US", { timeZone, ...options }).format(new Date(iso));
  const day = (iso: string) => format(iso, { year: "numeric", month: "2-digit", day: "2-digit" });
  const time = (iso: string) => format(iso, { hour: "numeric", minute: "2-digit", timeZoneName: "short" });
  const date = (iso: string) => format(iso, { month: "short", day: "numeric", ...(format(iso, { year: "numeric" }) !== format(referenceDate, { year: "numeric" }) ? { year: "numeric" } : {}) });
  const relative = (iso: string) => day(iso) === day(referenceDate) ? "Today" : format(iso, { weekday: "short" });
  const range = (start: string, end: string) => day(start) === day(end)
    ? `${time(start)} – ${time(end)}` : `${date(start)} · ${time(start)} – ${date(end)} · ${time(end)}`;
  const rows: ArticleKeyDate[] = [];
  if (timing.currentStart && timing.currentEnd) rows.push({
    date: date(timing.currentStart), relative: relative(timing.currentStart), label: "Current contact", occursAt: timing.currentStart,
    detail: range(timing.currentStart, timing.currentEnd),
    current: Date.parse(referenceDate) >= Date.parse(timing.currentStart) && Date.parse(referenceDate) <= Date.parse(timing.currentEnd)
  });
  timing.exactPasses.forEach((pass, index) => rows.push({ date: date(pass.exactAt), relative: relative(pass.exactAt), occursAt: pass.exactAt,
    label: `Exact · Pass ${index + 1}`, detail: time(pass.exactAt) }));
  rows.push({ date: date(timing.engagementStart), relative: relative(timing.engagementStart), label: "Full transit series", occursAt: timing.engagementStart,
    detail: `${range(timing.engagementStart, timing.engagementEnd)} · ${timing.exactPasses.length === 1 ? "one pass" : `${timing.exactPasses.length} passes`}` });
  return rows;
}
