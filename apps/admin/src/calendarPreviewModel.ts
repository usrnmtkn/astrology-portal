import type { CalendarPreviewCalculation } from "./calendarPreviewCalculation";
import { skyForecastTemplates, type SkyForecastPeriod } from "./skyForecastTemplates";
import { lunarContentIdentity } from "./lunarCalendarContent";
import { publishedSkySummaryContent, type SummaryCompositionRow } from "./skySummaryComposition";
import { calendarSunSummary } from "../../web/src/features/calendar/calendarDaySummary";
import {
  calendarPreviewSeasons,
  calendarPreviewSign,
  calendarResolveOverviewField,
  calendarTemplateSegments,
  calendarContextualVariableNames,
  type CalendarOverviewValue
} from "../../web/src/features/calendar/calendarOverviewResolve";
import { skyDailySummaryParts } from "../../web/src/content/skyDailySummary";
import { isReaderServableGeneratedContentRow } from "../../web/src/content/generatedContentEligibility";
import { isGovernedReaderEligible } from "../../web/src/content/fallbackArchitectureV3/resolver/readerEligibility.browser";
import { calendarMoonCycleFactsForDays, type CalendarMoonCycleFacts } from "../../web/src/features/calendar/calendarMoonCycle";
import { resolveCalendarMoonFallback } from "../../web/src/features/calendar/calendarMoonFallback";
import { calendarMoonPhaseCopy } from "../../web/src/features/calendar/calendarMoonPhaseCopy";
import { calendarLunationMacroKey } from "../../web/src/features/calendar/calendarDayMoonReading";
import { calendarLocalDateKey } from "../../web/src/features/calendar/calendarPhaseLabel";
import { moonContinuationSummaryKey, moonContinuationSummaryForSign } from "../../web/src/features/calendar/moonContinuationSummaries";
import { calendarSeasonTransitionForSurface, calendarSeasonTransitionWhen, calendarSeasonTransitionKeyForSurface, calendarSeasonTransitionKeys } from "../../web/src/features/calendar/calendarSeasonTransitions";
import { moonSignTransitionKey, moonSignTransitionForPair } from "../../web/src/features/calendar/moonSignTransitions";
import { lunarSigns } from "./lunarCalendarContent";

export type CalendarPreviewRow = SummaryCompositionRow & { id: string; facts?: Record<string, unknown> | null; sections?: unknown; previewBody?: string };
export type CalendarPreviewPart = CalendarOverviewValue & { name: string };
export type CalendarPreviewValue = CalendarOverviewValue & { parts?: CalendarPreviewPart[] };
export { calendarPreviewSeasons, calendarPreviewSign, calendarResolveOverviewField, calendarTemplateSegments, calendarContextualVariableNames };

/** Annotate exact source spans without changing a byte of the assembled preview. */
export function calendarPreviewCopyParts(body: string, candidates: CalendarPreviewPart[]): CalendarPreviewPart[] {
  const spans: Array<CalendarPreviewPart & { start: number; end: number }> = [];
  for (const candidate of [...candidates].sort((a, b) => b.text.length - a.text.length)) {
    if (!candidate.text) continue;
    const start = body.indexOf(candidate.text);
    const end = start + candidate.text.length;
    if (start < 0 || spans.some(span => start < span.end && end > span.start)) continue;
    spans.push({ ...candidate, start, end });
  }
  const parts: CalendarPreviewPart[] = [];
  let cursor = 0;
  for (const { start, end, ...part } of spans.sort((a, b) => a.start - b.start)) {
    if (start > cursor) parts.push({ name: `timing${parts.length}`, text: body.slice(cursor, start), kind: "fact", sourceLabel: "Calculated timing and fixed wording" });
    parts.push(part);
    cursor = end;
  }
  if (cursor < body.length) parts.push({ name: `timing${parts.length}`, text: body.slice(cursor), kind: "fact", sourceLabel: "Calculated timing and fixed wording" });
  return parts;
}

function calendarCopyEligible(row: CalendarPreviewRow) {
  const record = (row.sections as { packageRecord?: Record<string, unknown> } | null)?.packageRecord;
  const packaged = row.id === `package:${row.content_key}` && record?.contentKey === row.content_key
    && isGovernedReaderEligible({ ...record, contentKey: row.content_key }) && row.body === record.body;
  return !row.inventory_only && (packaged || row.status === "LIVE" && row.lane === "serving" && !row.review_state)
    && isReaderServableGeneratedContentRow(row) && Boolean(row.body?.trim());
}

/** The private editor preview keeps the saved source intact for eligibility checks. */
function calendarWorkingRow(row: CalendarPreviewRow | undefined) {
  return row && row.previewBody !== undefined ? { ...row, body: row.previewBody } : row;
}

export function calendarPreviewSourceKeys(period: SkyForecastPeriod, signs: string[]) {
  return [skyForecastTemplates[period].contentKey, ...new Set(signs.filter(Boolean).flatMap(sign => {
    const slug = sign.toLowerCase();
    return [
      `fallback-hook/zodiac-season/${slug}`,
      `fallback-hook/zodiac-season-polar-axis/${slug}`,
      `cms/sky-daily-summary/sun/${slug}`,
      `cms/sky-daily-summary/moon/${slug}/regular`,
      `cms/sky-daily-summary/moon/${slug}/newMoon`,
      `cms/sky-daily-summary/moon/${slug}/fullMoon`,
      `authored/sky-lunation-macro/new-moon/${slug}`,
      `authored/sky-lunation-macro/full-moon/${slug}`,
      `authored/calendar-moon-continuation-summary/${slug}`,
      "fallback-hook/moon-phase/new-moon",
      "fallback-hook/moon-phase/waxing-crescent",
      "fallback-hook/moon-phase/first-quarter",
      "fallback-hook/moon-phase/waxing-gibbous",
      "fallback-hook/moon-phase/full-moon",
      "fallback-hook/moon-phase/disseminating",
      "fallback-hook/moon-phase/last-quarter",
      "fallback-hook/moon-phase/balsamic",
      ...(lunarSigns.includes(slug) ? [
        `authored/calendar-moon-transition/${slug}/${lunarSigns[(lunarSigns.indexOf(slug) + 1) % lunarSigns.length]}`,
        ...calendarSeasonTransitionKeys(slug, lunarSigns[(lunarSigns.indexOf(slug) + 1) % lunarSigns.length])
      ] : []),
      ...[1, 2, 3, 4].map(variant => `authored/calendar-weekly-moon/${slug}${variant === 1 ? "" : `/variant-${variant}`}`)
    ];
  }))];
}

export function calendarMoonPassages(rows: CalendarPreviewRow[], sign: string) {
  return rows.filter(row => {
    const identity = lunarContentIdentity(row.content_key);
    return identity?.family === "Moon-sign leftover" && identity.sign === sign.toLowerCase() && !identity.excluded
      && calendarCopyEligible(row);
  }).map(row => calendarWorkingRow(row)!).sort((a, b) => a.content_key.localeCompare(b.content_key));
}

function normalizedPreviewBody(value?: string | null) {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

export function calendarMoonPassageForDay(
  rows: CalendarPreviewRow[],
  sign: string,
  usedBodies: Iterable<string> = []
) {
  const used = new Set([...usedBodies].map((body) => normalizedPreviewBody(body)).filter(Boolean));
  return calendarMoonPassages(rows, sign).find((row) => !used.has(normalizedPreviewBody(row.body))) ?? null;
}

export function calendarMoonWriteupForDay(
  rows: CalendarPreviewRow[],
  day: { date: string; dateKey: string; moonSign: string; moonPhase: string; events?: Array<{ type?: string; title: string; sign?: string; eclipseType?: string }> },
  facts: CalendarMoonCycleFacts | undefined,
  seasonSummary?: string,
  usedAuthoredBodies: Iterable<string> = []
) {
  const used = new Set([...usedAuthoredBodies].map((body) => normalizedPreviewBody(body)).filter(Boolean));
  const authored = calendarMoonPassages(rows, day.moonSign).find((row) => !used.has(normalizedPreviewBody(row.body))) ?? null;
  const lunation = day.events?.find((event) => event.type === "lunation") ?? null;
  const lunationKey = calendarLunationMacroKey(lunation, day.moonSign);
  const lunationRow = lunationKey
    ? calendarWorkingRow(rows.find((row) => row.content_key === lunationKey && calendarCopyEligible(row)))
    : undefined;
  const summaryKey = moonContinuationSummaryKey(day.moonSign);
  const summaryRow = calendarWorkingRow(rows.find((row) => row.content_key === summaryKey && calendarCopyEligible(row)));
  const nextSign = facts?.nextMoonSign
    || (lunarSigns.includes(day.moonSign.toLowerCase())
      ? lunarSigns[(lunarSigns.indexOf(day.moonSign.toLowerCase()) + 1) % lunarSigns.length]
      : "");
  const transitionKey = nextSign ? moonSignTransitionKey(day.moonSign, nextSign) : "";
  const transitionRow = transitionKey
    ? calendarWorkingRow(rows.find((row) => row.content_key === transitionKey && calendarCopyEligible(row)))
    : undefined;
  const seasonTransitionKey = facts?.seasonName && facts.nextSunSign
    ? calendarSeasonTransitionKeyForSurface(facts.seasonName, facts.nextSunSign, "leftover", facts.daysUntilSeasonEnd)
    : "";
  const seasonTransitionRow = calendarWorkingRow(rows.find(row => row.content_key === seasonTransitionKey && calendarCopyEligible(row)));
  if (!facts) {
    return authored?.body
      ? { body: authored.body, contentKey: authored.content_key, kind: "authored" as const, row: authored }
      : null;
  }
  const phaseCopy = calendarMoonPhaseCopy(facts, (contentKey) => calendarWorkingRow(rows.find(row => row.content_key === contentKey && calendarCopyEligible(row)))?.body ?? "");
  const resolved = resolveCalendarMoonFallback(facts, {
    exactLunationCopy: lunationRow?.body
      ? { body: lunationRow.body, contentKey: lunationRow.content_key }
      : null,
    unusedAuthored: authored?.body
      ? { body: authored.body, contentKey: authored.content_key }
      : null,
    authoredUsedThisVisit: used.size > 0,
    authoredPhaseCopy: phaseCopy,
    seasonSummary,
    moonContinuationSummary: summaryRow?.body,
    pairTransition: transitionRow?.body,
    seasonTransition: seasonTransitionRow?.body
  });
  if (!resolved) return null;
  const candidates: CalendarPreviewPart[] = [];
  const add = (name: string, text: string | undefined, sourceKey: string | undefined, sourceLabel: string) => {
    if (text) candidates.push({ name, text, sourceKey, sourceLabel, kind: "copy" });
  };
  if (resolved.kind !== "authored" && resolved.kind !== "exact-lunation") {
    const continuation = moonContinuationSummaryForSign(facts.moonSign, summaryRow?.body, { exactFirstQuarter: facts.exactFirstQuarter });
    // Some event-specific wording is fixed in the resolver and ignores a saved
    // override. Do not present that wording as editable through the unused row.
    add("continuation", continuation, facts.exactFirstQuarter && continuation !== summaryRow?.body?.trim() ? undefined : summaryKey, "Moon continuation passage");
    add("transition", moonSignTransitionForPair(facts.moonSign, nextSign, transitionRow?.body), transitionKey, "Moon sign transition passage");
    const phaseRow = calendarWorkingRow(rows.find(row => row.content_key === phaseCopy?.contentKey && calendarCopyEligible(row)));
    const phaseSourceBody = phaseRow?.body?.trim().replaceAll("{{signTitle}}", calendarPreviewSign(facts.moonSign));
    add("phase", phaseCopy?.body, phaseRow && phaseSourceBody !== phaseCopy?.body ? undefined : phaseCopy?.contentKey, "Moon phase passage");
    add("seasonTransition", calendarSeasonTransitionForSurface({ fromSign: facts.seasonName, toSign: facts.nextSunSign,
      date: calendarSeasonTransitionWhen(facts.daysUntilSeasonEnd, facts.seasonEndDate), surface: "leftover",
      daysUntilSeasonEnd: facts.daysUntilSeasonEnd, override: seasonTransitionRow?.body }), seasonTransitionKey, "Season transition passage");
    add("season", seasonSummary, facts.seasonName ? `fallback-hook/zodiac-season/${facts.seasonName.toLowerCase()}` : undefined, "Zodiac season passage");
  }
  return {
    body: resolved.body,
    contentKey: resolved.contentKey,
    kind: resolved.kind,
    row: resolved.kind === "authored" ? authored ?? undefined : resolved.kind === "exact-lunation" ? lunationRow : undefined,
    parts: resolved.kind === "authored" || resolved.kind === "exact-lunation" ? undefined : calendarPreviewCopyParts(resolved.body, candidates)
  };
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
  const putWriteup = (name: string, writeup: ReturnType<typeof calendarMoonWriteupForDay>) => {
    put(name, writeup?.body, "copy", writeup?.contentKey);
    if (values[name] && writeup && "parts" in writeup && writeup.parts) values[name].parts = writeup.parts;
  };
  put("sunSign", sunSign, calculation ? "fact" : "example");
  put("moonSign", moonSign, calculation ? "fact" : "example");
  const content = publishedSkySummaryContent(rows.map(row => calendarWorkingRow(row)!));
  if (sunSign) {
    const parts = calculation ? calendarSunSummary(calculation.sky, content)
      : skyDailySummaryParts({ sun: { sign: sunSign }, moonIsVoid: false }, content, { openingOnly: true });
    put("sunSummary", parts.map(part => part.text).join(""), "copy", `cms/sky-daily-summary/sun/${sunSign.toLowerCase()}`);
  }
  const moonPassages = calendarMoonPassages(rows, moonSign);
  const moon = moonPassages.find(row => row.content_key === moonKey) ?? moonPassages[0];
  if (!calculation) {
    put("moonWriteup", moon?.body ?? undefined, "copy", moon?.content_key);
    put("moonFocus", calendarMoonFocus(moon), "copy", moon?.content_key);
  }
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
      const body = row?.previewBody ?? sections?.packageDraft?.body ?? row?.body;
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
    const cycleFacts = calendarMoonCycleFactsForDays(days, [
      ...(calculation.cycleEvents ?? []),
      ...events,
      ...(calculation.seasonIngresses ?? [])
    ], timeZone);
    const seasonSummary = values.openingZodiacSeason?.text?.split(/\n\n+/)[0]?.trim();
    const usedAuthoredByVisit = new Map<string, string[]>();
    const writeupsByDate = new Map<string, ReturnType<typeof calendarMoonWriteupForDay>>();
    for (const day of days) {
      const facts = cycleFacts.get(day.dateKey);
      const visitId = facts?.moonVisitId ?? `${day.moonSign}:${day.dateKey}`;
      const used = usedAuthoredByVisit.get(visitId) ?? [];
      const destackWriteup = calendarMoonWriteupForDay(rows, day, facts, seasonSummary, used);
      writeupsByDate.set(day.dateKey, destackWriteup);
      const weekday = new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone }).format(new Date(day.date)).toLowerCase();
      // Weekly overview Monday is Luna's leftover passage, even when the Day
      // destack prefers last-full-day or ingress timing on that civil date.
      const leftover = days.length === 7 && weekday === "monday" && destackWriteup?.kind !== "exact-lunation"
        ? calendarMoonPassageForDay(rows, day.moonSign, used)
        : null;
      const writeup = leftover?.body
        ? { body: leftover.body, contentKey: leftover.content_key, kind: "authored" as const, row: leftover }
        : destackWriteup;
      if (writeup?.kind === "authored") {
        usedAuthoredByVisit.set(visitId, [...used, writeup.body]);
      }
      if (days.length !== 7) continue;
      put(`${weekday}Date`, formatDate(day.date), "fact");
      put(`${weekday}MoonSign`, calendarPreviewSign(day.moonSign) || day.moonSign, "fact");
      put(`${weekday}Timing`, timedEvents(day.events) || `Moon in ${day.moonSign} at noon · ${day.moonPhase}`, "fact");
      putWriteup(`${weekday}Writeup`, writeup);
      put(`${weekday}MoonFocus`, calendarMoonFocus(writeup?.row), "copy", writeup?.contentKey);
    }
    const previewDateKey = calendarLocalDateKey(sky.generatedAt, timeZone);
    const previewDay = days.find(day => day.dateKey === previewDateKey)
      ?? days.find(day => day.moonSign.toLowerCase() === moonSign.toLowerCase());
    if (moonKey && moon) {
      put("moonWriteup", moon.body ?? undefined, "copy", moon.content_key);
      put("moonFocus", calendarMoonFocus(moon), "copy", moon.content_key);
    } else if (previewDay) {
      const writeup = writeupsByDate.get(previewDay.dateKey)
        ?? calendarMoonWriteupForDay(rows, previewDay, cycleFacts.get(previewDay.dateKey), seasonSummary);
      putWriteup("moonWriteup", writeup);
      put("moonFocus", calendarMoonFocus(writeup?.row), "copy", writeup?.contentKey);
    } else if (moon) {
      put("moonWriteup", moon.body ?? undefined, "copy", moon.content_key);
      put("moonFocus", calendarMoonFocus(moon), "copy", moon.content_key);
    }
  }
  put("keyDates", timedEvents(events), "fact");
  return values;
}
