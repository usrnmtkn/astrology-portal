import type { CalendarPreviewCalculation } from "./calendarPreviewCalculation";
import { skyForecastTemplates, type SkyForecastPeriod } from "./skyForecastTemplates";
import { lunarContentIdentity, lunarSigns } from "./lunarCalendarContent";
import { publishedSkySummaryContent, type SummaryCompositionRow } from "./skySummaryComposition";
import { calendarSunSummary } from "../../web/src/features/calendar/calendarDaySummary";
import { skyDailySummaryParts } from "../../web/src/content/skyDailySummary";
import { isReaderServableGeneratedContentRow } from "../../web/src/content/generatedContentEligibility";
import { isGovernedReaderEligible } from "../../web/src/content/fallbackArchitectureV3/resolver/readerEligibility.browser";

export type CalendarPreviewRow = SummaryCompositionRow & { id: string; facts?: Record<string, unknown> | null; sections?: unknown };
export type CalendarPreviewValue = { text: string; kind: "fact" | "copy" | "example"; sourceKey?: string; sourceLabel?: string };
export const calendarPreviewSign = (value: string) => lunarSigns.includes(value.toLowerCase()) ? value[0].toUpperCase() + value.slice(1).toLowerCase() : "";

export function calendarPreviewSeasons(calculation?: CalendarPreviewCalculation) {
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
  // Calendar range ends at the next local midnight; compare date keys to include an ingress late on the last day.
  const closingIndex = last ? ingresses.reduce((found, event, index) => event.dateKey <= last.dateKey ? index : found, -1) : -1;
  const closing = last ? window(closingIndex) : undefined;
  return { current, opening, closing: closing?.sign !== opening?.sign ? closing : undefined };
}

function calendarCopyEligible(row: CalendarPreviewRow) {
  const record = (row.sections as { packageRecord?: Record<string, unknown> } | null)?.packageRecord;
  const packaged = row.id === `package:${row.content_key}` && record?.contentKey === row.content_key
    && isGovernedReaderEligible({ ...record, contentKey: row.content_key }) && row.body === record.body;
  return !row.inventory_only && (packaged || row.status === "LIVE" && row.lane === "serving" && !row.review_state)
    && isReaderServableGeneratedContentRow(row) && Boolean(row.body?.trim());
}

export function calendarPreviewSourceKeys(period: SkyForecastPeriod, signs: string[]) {
  return [skyForecastTemplates[period].contentKey, ...new Set(signs.filter(Boolean).flatMap(sign => {
    const slug = sign.toLowerCase();
    return [`fallback-hook/zodiac-season/${slug}`, `fallback-hook/zodiac-season-polar-axis/${slug}`, `cms/sky-daily-summary/sun/${slug}`, ...[1, 2, 3, 4].map(variant => `authored/calendar-weekly-moon/${slug}${variant === 1 ? "" : `/variant-${variant}`}`)];
  }))];
}

export function calendarMoonPassages(rows: CalendarPreviewRow[], sign: string) {
  return rows.filter(row => {
    const identity = lunarContentIdentity(row.content_key);
    return identity?.family === "Moon-sign passages" && identity.sign === sign.toLowerCase() && !identity.excluded
      && calendarCopyEligible(row);
  }).sort((a, b) => a.content_key.localeCompare(b.content_key));
}

function calendarMoonFocus(row?: CalendarPreviewRow) {
  if (!row) return undefined;
  const sections = row.sections as { packageRecord?: { focus?: unknown } } | null;
  const snapshot = row.source_snapshot;
  const facts = row.facts;
  const focus = [sections?.packageRecord?.focus, snapshot?.focus, facts?.focus].find(value => typeof value === "string" && value.trim());
  return typeof focus === "string" ? focus.trim() : undefined;
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
  put("moonFocus", calendarMoonFocus(moon), "copy", moon?.content_key);
  if (!calculation && moonSign) {
    put("mondayMoonSign", moonSign, "example");
    put("mondayWriteup", moon?.body ?? undefined, "copy", moon?.content_key);
    put("mondayMoonFocus", calendarMoonFocus(moon), "copy", moon?.content_key);
  }
  const seasonCopy = (prefix: string, sign: string) => {
    for (const [name, family] of [["zodiacSeason", "zodiac-season"], ["zodiacSeasonPolarAxis", "zodiac-season-polar-axis"]]) {
      const key = `fallback-hook/${family}/${sign.toLowerCase()}`;
      // This is the owner editor preview. Drafts are useful here; the reader's
      // publication gate remains in calendarCopyEligible and the shared resolver.
      const row = rows.filter(row => row.content_key === key && !row.inventory_only && ["LIVE", "DRAFT"].includes(row.status))
        .sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""))[0];
      const sections = row?.sections as { packageDraft?: { body?: string }; packageRecord?: { calendarWritingSource?: { title?: string } } } | undefined;
      const body = sections?.packageDraft?.body ?? row?.body;
      if (body?.trim() && !/\{\{|\}\}/u.test(body)) {
        const variable = prefix ? `${prefix}${name[0].toUpperCase()}${name.slice(1)}` : name;
        put(variable, body, "copy", key);
        values[variable].sourceLabel = row?.id.startsWith("package:") && sections?.packageRecord?.calendarWritingSource
          ? `Existing writing · ${sections.packageRecord.calendarWritingSource.title}`
          : calendarCopyEligible(row!) ? "Saved writing" : "Saved draft";
      }
    }
  };
  put("seasonSign", sunSign, calculation ? "fact" : "example");
  seasonCopy("", sunSign);
  const seasons = calendarPreviewSeasons(calculation);
  const openingSign = seasons.opening?.sign ?? (!calculation ? sunSign : "");
  put("openingSeasonSign", openingSign, calculation ? "fact" : "example");
  put("signTitle", openingSign, calculation ? "fact" : "example");
  if (openingSign) seasonCopy("opening", openingSign);
  if (seasons.closing) {
    put("closingSeasonSign", seasons.closing.sign, "fact");
    put("hasSeasonTransition", "yes", "fact");
    seasonCopy("closing", seasons.closing.sign);
  }
  if (!calculation) return values;
  const { sky, days, events, timeZone } = calculation;
  const formatDate = (value: string) => new Intl.DateTimeFormat("en-US", { dateStyle: "full", timeZone }).format(new Date(value));
  const formatTime = (value: string) => new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short", timeZone }).format(new Date(value));
  // Passage rows begin at local midnight to describe an ongoing state, not an exact station.
  const timedEvents = (items: typeof events) => items.filter(event => event.phase !== "retrograde-passage")
    .map(event => `${formatTime(event.startsAt)} · ${event.title}`).join("\n");
  if (seasons.current) {
    put("seasonStart", formatTime(seasons.current.startsAt), "fact");
    put("seasonEnd", formatTime(seasons.current.endsAt), "fact");
  }
  if (seasons.opening) {
    put("entryDate", formatTime(seasons.opening.startsAt), "fact");
    put("exitDate", formatTime(seasons.opening.endsAt), "fact");
  }
  if (seasons.closing) put("seasonChangeDate", formatTime(seasons.closing.startsAt), "fact");
  if (days.length) {
    const timed = events.filter(event => event.phase !== "retrograde-passage");
    const lunations = timed.filter(event => event.type === "lunation" && (event.primary || event.eclipseType));
    const newMoons = lunations.filter(event => event.eclipseType === "solar" || event.glyph === "●");
    const fullMoons = lunations.filter(event => event.eclipseType === "lunar" || event.glyph === "○");
    const changes = timed.filter(event => ["ingress", "station"].includes(event.type) && event.planet !== "Moon");
    const aspects = timed.filter(event => event.type === "aspect" && !event.planets?.includes("Moon"));
    put("lunationDates", timedEvents(lunations) || "No New Moon, Full Moon, or eclipse in this period.", "fact");
    if (newMoons.length) {
      put("hasNewMoon", "yes", "fact");
      put("newMoonDate", newMoons.map(event => formatDate(event.startsAt)).join("; "), "fact");
      put("newMoonSign", [...new Set(newMoons.map(event => calendarPreviewSign(event.sign ?? "")))].filter(Boolean).join(", "), "fact");
    }
    if (fullMoons.length) {
      put("hasFullMoon", "yes", "fact");
      put("fullMoonDate", fullMoons.map(event => formatDate(event.startsAt)).join("; "), "fact");
      put("fullMoonSign", [...new Set(fullMoons.map(event => calendarPreviewSign(event.sign ?? "")))].filter(Boolean).join(", "), "fact");
    }
    if (newMoons.some(event => event.eclipseType === "solar")) put("hasSolarEclipse", "yes", "fact");
    if (fullMoons.some(event => event.eclipseType === "lunar")) put("hasLunarEclipse", "yes", "fact");
    put("planetaryChanges", timedEvents(changes) || "No planetary ingresses or stations in this period.", "fact");
    put("planetaryAspects", timedEvents(aspects) || "No exact planetary aspects in this period.", "fact");
    put("overviewKeyDates", timedEvents(timed.filter(event => lunations.includes(event) || changes.includes(event) || aspects.includes(event))) || "No exact overview events in this period.", "fact");
  }
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
    if (days.length !== 7) put("monthName", new Intl.DateTimeFormat("en-US", { month: "long", timeZone }).format(new Date(sky.generatedAt)), "fact");
    put(days.length === 7 ? "weekRange" : "monthRange", range, "fact");
    for (const day of days) {
      const weekday = new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone }).format(new Date(day.date)).toLowerCase();
      if (days.length !== 7) continue;
      put(`${weekday}Date`, formatDate(day.date), "fact");
      put(`${weekday}MoonSign`, calendarPreviewSign(day.moonSign) || day.moonSign, "fact");
      put(`${weekday}Timing`, timedEvents(day.events) || `Moon in ${day.moonSign} at noon · ${day.moonPhase}`, "fact");
      const passage = calendarMoonPassages(rows, day.moonSign)[0];
      put(`${weekday}Writeup`, passage?.body ?? undefined, "copy", passage?.content_key);
      put(`${weekday}MoonFocus`, calendarMoonFocus(passage), "copy", passage?.content_key);
    }
  }
  put("keyDates", timedEvents(events), "fact");
  return values;
}

export const calendarContextualVariableNames = [
  "signTitle", "entryDate", "exitDate", "eventDate", "eventDescription",
  "newMoonSign", "newMoonDate", "fullMoonSign", "fullMoonDate",
  "hasNewMoon", "hasFullMoon", "hasSolarEclipse", "hasLunarEclipse",
  "hasSeasonTransition", "placementFocus", "placementOpportunity", "placementChallenge", "placementPractice"
] as const;

const contextualNames = calendarContextualVariableNames;

function calendarFact(text: string | undefined, kind: CalendarPreviewValue["kind"] = "fact"): CalendarPreviewValue | undefined {
  return text ? { text, kind } : undefined;
}

function calendarTimedEvents(calculation: CalendarPreviewCalculation) {
  return calculation.events.filter(event => event.phase !== "retrograde-passage" && event.type === "lunation" && (event.primary || event.eclipseType));
}

function calendarNewMoonEvents(calculation: CalendarPreviewCalculation) {
  return calendarTimedEvents(calculation).filter(event => event.eclipseType === "solar" || event.glyph === "●");
}

function calendarFullMoonEvents(calculation: CalendarPreviewCalculation) {
  return calendarTimedEvents(calculation).filter(event => event.eclipseType === "lunar" || event.glyph === "○");
}

function calendarClearContext(values: Record<string, CalendarPreviewValue>) {
  const next = { ...values };
  for (const name of contextualNames) delete next[name];
  return next;
}

function calendarAssignFacts(values: Record<string, CalendarPreviewValue>, facts: Record<string, CalendarPreviewValue | undefined>) {
  const next = { ...values };
  for (const [name, value] of Object.entries(facts)) {
    if (value) next[name] = value;
  }
  return next;
}

function calendarSeasonContext(
  values: Record<string, CalendarPreviewValue>,
  visit: { sign: string; startsAt: string; endsAt: string } | undefined,
  calculation: CalendarPreviewCalculation | undefined,
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

function calendarLunationContext(values: Record<string, CalendarPreviewValue>, event: CalendarPreviewCalculation["events"][number], calculation: CalendarPreviewCalculation) {
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

/** Same template names, different calculated context per overview passage. */
export function calendarOverviewFieldContexts(
  field: string,
  values: Record<string, CalendarPreviewValue>,
  calculation?: CalendarPreviewCalculation
): Record<string, CalendarPreviewValue>[] {
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

export function calendarResolveOverviewField(
  field: string,
  body: string,
  values: Record<string, CalendarPreviewValue>,
  templates: Record<string, string> = {},
  calculation?: CalendarPreviewCalculation
) {
  return calendarOverviewFieldContexts(field, values, calculation)
    .map(context => calendarTemplateSegments(body, context, templates, [field]).map(segment => segment.text).join(""))
    .filter(text => text.trim())
    .join("\n\n");
}

/** Replace known named slots once; overview templates can opt into bounded recursion. */
export function calendarTemplateSegments(pattern: string, values: Record<string, CalendarPreviewValue>, templates: Record<string, string> = {}, path: string[] = []) {
  const nested = { ...values };
  for (const name in templates) if (pattern.includes(`{{${name}}}`)) nested[name] = {
    text: path.includes(name) ? `{{${name}}}` : calendarTemplateSegments(templates[name], values, templates, [...path, name]).map(segment => segment.text).join(""), kind: "copy"
  };
  // Optional sections hide only when their controlling fact is absent (for example a season change outside the week).
  const expanded = pattern.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/gu, (_block, name: string, body: string) => nested[name] ? body : "");
  return expanded.split(/(\{\{\s*[\w.]+\s*\}\})/u).filter(Boolean).map(text => {
    const name = text.match(/^\{\{\s*([\w.]+)\s*\}\}$/u)?.[1];
    return { text: name && nested[name] ? nested[name].text : text, name, value: name ? nested[name] : undefined };
  });
}
