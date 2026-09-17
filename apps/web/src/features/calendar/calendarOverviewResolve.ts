import type { LunarCalendarEvent } from "../../services/ephemeris";

const signs = ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"];

export type CalendarOverviewValue = { text: string; kind: "fact" | "copy" | "example"; sourceKey?: string; sourceLabel?: string };
export type CalendarOverviewCalculation = {
  sky: { generatedAt: string };
  days: Array<{ date: string; dateKey: string }>;
  events: LunarCalendarEvent[];
  seasonIngresses?: LunarCalendarEvent[];
  timeZone: string;
};

export const calendarPreviewSign = (value: string) => signs.includes(value.toLowerCase()) ? value[0].toUpperCase() + value.slice(1).toLowerCase() : "";

export function calendarOverviewWriting(sections: unknown): Record<string, string> {
  const value = (sections as { calendarOverview?: unknown } | null)?.calendarOverview;
  return value && typeof value === "object" && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string")) : {};
}

export function calendarPreviewSeasons(calculation?: CalendarOverviewCalculation) {
  const ingresses = [...(calculation?.seasonIngresses ?? [])].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const at = (instant: string) => ingresses.reduce((found, event, index) => event.startsAt <= instant ? index : found, -1);
  const window = (index: number) => index >= 0 && ingresses[index + 1] ? {
    sign: ingresses[index].toSign ?? ingresses[index].sign ?? "",
    startsAt: ingresses[index].startsAt, endsAt: ingresses[index + 1].startsAt
  } : undefined;
  const current = calculation ? window(at(calculation.sky.generatedAt)) : undefined;
  const first = calculation?.days[0];
  const last = calculation?.days.at(-1);
  const opening = first ? window(at(first.date)) : current;
  const closingIndex = last ? ingresses.reduce((found, event, index) => event.dateKey <= last.dateKey ? index : found, -1) : -1;
  const closing = last ? window(closingIndex) : undefined;
  return { current, opening, closing: closing?.sign !== opening?.sign ? closing : undefined };
}

export const calendarContextualVariableNames = [
  "signTitle", "entryDate", "exitDate", "eventDate", "eventDescription",
  "newMoonSign", "newMoonDate", "fullMoonSign", "fullMoonDate",
  "hasNewMoon", "hasFullMoon", "hasSolarEclipse", "hasLunarEclipse",
  "hasSeasonTransition", "placementFocus", "placementOpportunity", "placementChallenge", "placementPractice"
] as const;

function calendarFact(text: string | undefined, kind: CalendarOverviewValue["kind"] = "fact"): CalendarOverviewValue | undefined {
  return text ? { text, kind } : undefined;
}

function calendarTimedEvents(calculation: CalendarOverviewCalculation) {
  return calculation.events.filter(event => event.phase !== "retrograde-passage" && event.type === "lunation" && (event.primary || event.eclipseType));
}

function calendarNewMoonEvents(calculation: CalendarOverviewCalculation) {
  return calendarTimedEvents(calculation).filter(event => event.eclipseType === "solar" || event.glyph === "●");
}

function calendarFullMoonEvents(calculation: CalendarOverviewCalculation) {
  return calendarTimedEvents(calculation).filter(event => event.eclipseType === "lunar" || event.glyph === "○");
}

function calendarClearContext(values: Record<string, CalendarOverviewValue>) {
  const next = { ...values };
  for (const name of calendarContextualVariableNames) delete next[name];
  return next;
}

function calendarAssignFacts(values: Record<string, CalendarOverviewValue>, facts: Record<string, CalendarOverviewValue | undefined>) {
  const next = { ...values };
  for (const [name, value] of Object.entries(facts)) {
    if (value) next[name] = value;
  }
  return next;
}

function calendarSeasonContext(
  values: Record<string, CalendarOverviewValue>,
  visit: { sign: string; startsAt: string; endsAt: string } | undefined,
  calculation: CalendarOverviewCalculation | undefined,
  aliases: Record<string, string | undefined>
) {
  const next = calendarClearContext(values);
  const sign = calendarPreviewSign(visit?.sign ?? "");
  const kind = calculation ? "fact" as const : "example" as const;
  const formatTime = calculation
    ? (value: string) => new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short", timeZone: calculation.timeZone }).format(new Date(value))
    : undefined;
  return calendarAssignFacts(next, {
    signTitle: calendarFact(sign, kind),
    seasonSign: calendarFact(sign, kind),
    entryDate: formatTime && visit?.startsAt ? calendarFact(formatTime(visit.startsAt)) : undefined,
    exitDate: formatTime && visit?.endsAt ? calendarFact(formatTime(visit.endsAt)) : undefined,
    placementFocus: calendarFact(aliases.placementFocus, "copy"),
    placementOpportunity: calendarFact(aliases.placementOpportunity, "copy"),
    placementChallenge: calendarFact(aliases.placementChallenge, "copy"),
    placementPractice: calendarFact(aliases.placementPractice, "copy")
  });
}

function calendarLunationContext(values: Record<string, CalendarOverviewValue>, event: LunarCalendarEvent, calculation: CalendarOverviewCalculation) {
  const next = calendarClearContext(values);
  const sign = calendarPreviewSign(event.sign ?? "");
  const formatDate = (value: string) => new Intl.DateTimeFormat("en-US", { dateStyle: "full", timeZone: calculation.timeZone }).format(new Date(value));
  const date = formatDate(event.startsAt);
  const isSolar = event.eclipseType === "solar";
  const isLunar = event.eclipseType === "lunar";
  const isNew = isSolar || event.glyph === "●";
  return calendarAssignFacts(next, {
    signTitle: calendarFact(sign),
    eventDate: calendarFact(date),
    eventDescription: calendarFact(event.title.replace(/\.+$/u, "")),
    newMoonSign: isNew ? calendarFact(sign) : undefined,
    newMoonDate: isNew ? calendarFact(date) : undefined,
    fullMoonSign: isNew ? undefined : calendarFact(sign),
    fullMoonDate: isNew ? undefined : calendarFact(date),
    hasNewMoon: isNew ? calendarFact("yes") : undefined,
    hasFullMoon: isNew ? undefined : calendarFact("yes"),
    hasSolarEclipse: isSolar ? calendarFact("yes") : undefined,
    hasLunarEclipse: isLunar ? calendarFact("yes") : undefined
  });
}

export function calendarOverviewFieldContexts(
  field: string,
  values: Record<string, CalendarOverviewValue>,
  calculation?: CalendarOverviewCalculation
): Record<string, CalendarOverviewValue>[] {
  const seasons = calendarPreviewSeasons(calculation);
  if (field === "seasonOpening") {
    const visit = seasons.opening ?? (values.openingSeasonSign?.text || values.signTitle?.text
      ? { sign: values.openingSeasonSign?.text || values.signTitle?.text || "", startsAt: "", endsAt: "" }
      : undefined);
    return [calendarSeasonContext(values, visit, calculation, {
      placementFocus: values.openingSeasonFocus?.text ?? values.placementFocus?.text,
      placementOpportunity: values.openingSeasonOpportunity?.text ?? values.placementOpportunity?.text
    })];
  }
  if (field === "seasonOverview") {
    return [calendarSeasonContext(values, seasons.closing, calculation, {
      placementFocus: values.closingSeasonFocus?.text ?? values.placementFocus?.text,
      placementChallenge: values.closingSeasonChallenge?.text ?? values.placementChallenge?.text,
      placementPractice: values.closingSeasonPractice?.text ?? values.placementPractice?.text
    })];
  }
  if (field === "newMoonOverview" && calculation) {
    const events = calendarNewMoonEvents(calculation);
    return events.length ? events.map(event => calendarLunationContext(values, event, calculation)) : [calendarClearContext(values)];
  }
  if (field === "fullMoonOverview" && calculation) {
    const events = calendarFullMoonEvents(calculation);
    return events.length ? events.map(event => calendarLunationContext(values, event, calculation)) : [calendarClearContext(values)];
  }
  return [values];
}

export function calendarTemplateSegments(pattern: string, values: Record<string, CalendarOverviewValue>, templates: Record<string, string> = {}, path: string[] = []) {
  const nested = { ...values };
  for (const name in templates) if (pattern.includes(`{{${name}}}`)) nested[name] = {
    text: path.includes(name) ? `{{${name}}}` : calendarTemplateSegments(templates[name], values, templates, [...path, name]).map(segment => segment.text).join(""), kind: "copy"
  };
  const expanded = pattern.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/gu, (_block, name: string, body: string) => nested[name] ? body : "");
  return expanded.split(/(\{\{\s*[\w.]+\s*\}\})/u).filter(Boolean).map(text => {
    const name = text.match(/^\{\{\s*([\w.]+)\s*\}\}$/u)?.[1];
    return { text: name && nested[name] ? nested[name].text : text, name, value: name ? nested[name] : undefined };
  });
}

export function calendarResolveOverviewField(
  field: string,
  body: string,
  values: Record<string, CalendarOverviewValue>,
  templates: Record<string, string> = {},
  calculation?: CalendarOverviewCalculation
) {
  return calendarOverviewFieldContexts(field, values, calculation)
    .map(context => calendarTemplateSegments(body, context, templates, [field]).map(segment => segment.text).join(""))
    .filter(text => text.trim())
    .join("\n\n");
}
