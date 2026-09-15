import type { CalendarPreviewCalculation } from "./calendarPreviewCalculation";
import { skyForecastTemplates, type SkyForecastPeriod } from "./skyForecastTemplates";
import { lunarContentIdentity, lunarSigns } from "./lunarCalendarContent";
import { publishedSkySummaryContent, type SummaryCompositionRow } from "./skySummaryComposition";
import { calendarSunSummary } from "../../web/src/features/calendar/calendarDaySummary";
import { skyDailySummaryParts } from "../../web/src/content/skyDailySummary";
import { isReaderServableGeneratedContentRow } from "../../web/src/content/generatedContentEligibility";
import { isGovernedReaderEligible } from "../../web/src/content/fallbackArchitectureV3/resolver/readerEligibility.browser";

export type CalendarPreviewRow = SummaryCompositionRow & { id: string; facts?: Record<string, unknown> | null; sections?: unknown };
export type CalendarPreviewValue = { text: string; kind: "fact" | "copy" | "example"; sourceKey?: string };
export const calendarPreviewSign = (value: string) => lunarSigns.includes(value.toLowerCase()) ? value[0].toUpperCase() + value.slice(1).toLowerCase() : "";

export function calendarPreviewSourceKeys(period: SkyForecastPeriod, signs: string[]) {
  return [skyForecastTemplates[period].contentKey, ...new Set(signs.filter(Boolean).flatMap(sign => {
    const slug = sign.toLowerCase();
    return [`cms/sky-daily-summary/sun/${slug}`, ...[1, 2, 3, 4].map(variant => `authored/calendar-weekly-moon/${slug}${variant === 1 ? "" : `/variant-${variant}`}`)];
  }))];
}

export function calendarMoonPassages(rows: CalendarPreviewRow[], sign: string) {
  return rows.filter(row => {
    const identity = lunarContentIdentity(row.content_key);
    const record = (row.sections as { packageRecord?: Record<string, unknown> } | null)?.packageRecord;
    const packaged = row.id === `package:${row.content_key}` && record?.contentKey === row.content_key
      && isGovernedReaderEligible({ ...record, contentKey: row.content_key }) && row.body === record.body;
    return identity?.family === "Moon-sign passages" && identity.sign === sign.toLowerCase() && !identity.excluded
      && !row.inventory_only && (packaged || row.status === "LIVE" && row.lane === "serving" && !row.review_state)
      && isReaderServableGeneratedContentRow(row) && Boolean(row.body?.trim());
  }).sort((a, b) => a.content_key.localeCompare(b.content_key));
}

export function calendarPreviewValues({ sunSign, moonSign, calculation, rows, moonKey }: {
  sunSign: string; moonSign: string; calculation?: CalendarPreviewCalculation; rows: CalendarPreviewRow[]; moonKey?: string;
}) {
  const values: Record<string, CalendarPreviewValue> = {};
  const put = (name: string, text: string | undefined, kind: CalendarPreviewValue["kind"], sourceKey?: string) => {
    if (text) values[name] = { text, kind, sourceKey };
  };
  put("sunSign", sunSign, calculation ? "fact" : "example");
  put("moonSign", moonSign, calculation ? "fact" : "example");
  const content = publishedSkySummaryContent(rows);
  if (sunSign) {
    const parts = calculation ? calendarSunSummary(calculation.sky, content)
      : skyDailySummaryParts({ sun: { sign: sunSign }, moonIsVoid: false }, content, { openingOnly: true });
    put("sunSummary", parts.map(part => part.text).join(""), "copy", `cms/sky-daily-summary/sun/${sunSign.toLowerCase()}`);
  }
  const moonPassages = calendarMoonPassages(rows, moonSign);
  const moon = moonPassages.find(row => row.content_key === moonKey) ?? moonPassages[0];
  put("moonWriteup", moon?.body ?? undefined, "copy", moon?.content_key);
  if (!calculation) return values;
  const { sky, days, events, timeZone } = calculation;
  const formatDate = (value: string) => new Intl.DateTimeFormat("en-US", { dateStyle: "full", timeZone }).format(new Date(value));
  const formatTime = (value: string) => new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short", timeZone }).format(new Date(value));
  put("date", formatDate(sky.generatedAt), "fact");
  put("timeZone", timeZone, "fact");
  put("asOf", formatTime(sky.generatedAt), "fact");
  put("utcTime", sky.generatedAt, "fact");
  for (const name of ["Sun", "Moon"]) {
    const position = sky.positions.find(position => position.planet === name);
    if (position) put(`${name.toLowerCase()}Degree`, `${position.degree.toFixed(2)}°`, "fact");
  }
  put("moonPhase", sky.moonPhase, "fact");
  put("retrogradePlanets", sky.positions.filter(position => position.motion === "retrograde").map(position => position.planet).join(", ") || "None", "fact");
  if (sky.moonSignTransition) put("moonIngress", `${sky.moonSignTransition.from} → ${sky.moonSignTransition.to} · ${formatTime(sky.moonSignTransition.occursAt)}`, "fact");
  if (days.length) {
    const range = `${formatDate(days[0].date)} – ${formatDate(days[days.length - 1].date)}`;
    put(days.length === 7 ? "weekRange" : "monthRange", range, "fact");
    for (const day of days) {
      const weekday = new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone }).format(new Date(day.date)).toLowerCase();
      if (days.length !== 7) continue;
      put(`${weekday}Date`, formatDate(day.date), "fact");
      put(`${weekday}MoonSign`, day.moonSign, "fact");
      put(`${weekday}Timing`, day.events.map(event => `${formatTime(event.startsAt)} · ${event.title}`).join("\n") || `Moon in ${day.moonSign} at noon · ${day.moonPhase}`, "fact");
      const passage = calendarMoonPassages(rows, day.moonSign)[0];
      put(`${weekday}Writeup`, passage?.body ?? undefined, "copy", passage?.content_key);
    }
  }
  put("keyDates", events.map(event => `${formatTime(event.startsAt)} · ${event.title}`).join("\n"), "fact");
  return values;
}

/** Replace known named slots once; unknown slots and tokens inside saved prose remain visible. */
export function calendarTemplateSegments(pattern: string, values: Record<string, CalendarPreviewValue>) {
  return pattern.split(/(\{\{\s*[\w.]+\s*\}\})/u).filter(Boolean).map(text => {
    const name = text.match(/^\{\{\s*([\w.]+)\s*\}\}$/u)?.[1];
    return { text: name && values[name] ? values[name].text : text, name, value: name ? values[name] : undefined };
  });
}
