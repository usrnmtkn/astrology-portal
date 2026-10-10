import type { LunarCalendarDay } from '../../../../apps/web/src/services/ephemeris';
import type { LiveGeneratedContent } from '../../../../apps/web/src/services/generatedContent';
import { slugContentPart } from '../../../../apps/web/src/services/generatedContentKeys';
import { calendarDayMoonWriting, type CalendarMoonWritingPiece } from './calendarDayMoonReading';
import type { CalendarMoonCycleFacts } from './calendarMoonCycle';
import { resolveCalendarMoonFallback } from './calendarMoonFallback';
import { calendarMoonPhaseCopy } from './calendarMoonPhaseCopy';
import { moonContinuationSummaryKey } from './moonContinuationSummaries';
import { moonSignTransitionKey } from './moonSignTransitions';
import { calendarSeasonTransitionKeyForSurface } from './calendarSeasonTransitions';

export function createCalendarMoonSources(readers: {
  hookBody: (key: string) => string;
  weeklyMoon: (sign: string, variant: number) => { contentKey: string; body: string } | null;
  lunation: (event: NonNullable<LunarCalendarDay['events'][number]>, content?: Map<string, LiveGeneratedContent> | null) => { contentKey: string; body: string } | null;
}) {
function primaryLunationForDay(day: LunarCalendarDay) {
  return day.events.find((event) => (
    event.type === "lunation"
    && (event.title.startsWith("New Moon") || event.title.startsWith("Full Moon"))
  ));
}


function calendarLiveBody(
  generatedContent: Map<string, LiveGeneratedContent> | null | undefined,
  contentKey: string,
  packaged?: string | null
) {
  return generatedContent?.get(contentKey)?.body?.trim() || packaged?.trim() || "";
}

function calendarWeeklyMoonAuthoredPassages(
  sign: string,
  generatedContent: Map<string, LiveGeneratedContent> | null | undefined
) {
  const slug = slugContentPart(sign);
  const passages: Array<{ body: string; contentKey: string }> = [];
  for (let variant = 1; variant <= 4; variant += 1) {
    const contentKey = variant === 1
      ? `authored/calendar-weekly-moon/${slug}`
      : `authored/calendar-weekly-moon/${slug}/variant-${variant}`;
    if (contentKey === "authored/calendar-weekly-moon/cancer") continue;
    const live = generatedContent?.get(contentKey)?.body?.trim();
    if (live) {
      passages.push({ body: live, contentKey });
      continue;
    }
    const rendered = readers.weeklyMoon(slug, variant);
    if (rendered?.contentKey === contentKey && rendered.body.trim()) {
      passages.push({ body: rendered.body.trim(), contentKey });
    }
  }
  const seen = new Set<string>();
  return passages.filter((passage) => {
    const key = passage.body.replace(/\s+/g, " ").trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function calendarMoonFallbackOptions(
  day: LunarCalendarDay,
  facts: CalendarMoonCycleFacts,
  generatedContent: Map<string, LiveGeneratedContent> | null | undefined,
  unusedAuthored?: { body: string; contentKey: string } | null,
  authoredUsedThisVisit = false
) {
  const lunation = primaryLunationForDay(day);
  const lunarSource = lunation ? readers.lunation(lunation, generatedContent) : null;
  const lunationKey = lunarSource?.contentKey ?? '';
  const lunationBody = lunarSource?.body ?? '';
  const seasonKey = facts.seasonName ? `fallback-hook/zodiac-season/${slugContentPart(facts.seasonName)}` : "";
  const seasonBody = seasonKey
    ? calendarLiveBody(generatedContent, seasonKey, readers.hookBody(seasonKey))
    : "";
  const summaryKey = moonContinuationSummaryKey(facts.moonSign);
  const transitionKey = facts.nextMoonSign ? moonSignTransitionKey(facts.moonSign, facts.nextMoonSign) : "";
  const authoredPhase = calendarMoonPhaseCopy(facts, (contentKey) => (
    calendarLiveBody(generatedContent, contentKey, readers.hookBody(contentKey))
  ));
  return {
    exactLunationCopy: lunationBody ? { body: lunationBody, contentKey: lunationKey } : null,
    unusedAuthored: unusedAuthored?.body?.trim() ? unusedAuthored : null,
    authoredUsedThisVisit,
    authoredPhaseCopy: authoredPhase,
    seasonSummary: seasonBody.split(/\n\n+/)[0]?.trim() || null,
    transitionPhrase: (key: string) => calendarLiveBody(generatedContent, key),
    moonContinuationSummary: calendarLiveBody(generatedContent, summaryKey) || null,
    pairTransition: transitionKey ? calendarLiveBody(generatedContent, transitionKey) || null : null,
    seasonTransition: facts.seasonName && facts.nextSunSign
      ? calendarLiveBody(
        generatedContent,
        calendarSeasonTransitionKeyForSurface(
          facts.seasonName,
          facts.nextSunSign,
          "leftover",
          facts.daysUntilSeasonEnd
        )
      ) || null
      : null
  };
}

function calendarMoonResolvedWeekly(
  day: LunarCalendarDay,
  facts: CalendarMoonCycleFacts | undefined,
  generatedContent: Map<string, LiveGeneratedContent> | null | undefined,
  usedAuthoredBodies: Iterable<string> = []
) {
  const used = new Set([...usedAuthoredBodies].map((body) => body.replace(/\s+/g, " ").trim()).filter(Boolean));
  const authored = calendarWeeklyMoonAuthoredPassages(day.moonSign, generatedContent)
    .find((passage) => !used.has(passage.body.replace(/\s+/g, " ").trim())) ?? null;
  if (!facts) {
    return authored ? { kind: "authored" as const, ...authored } : null;
  }
  return resolveCalendarMoonFallback(
    facts,
    calendarMoonFallbackOptions(day, facts, generatedContent, authored, used.size > 0)
  );
}

function calendarMoonResolvedByDate(
  days: LunarCalendarDay[],
  factsByDate: Map<string, CalendarMoonCycleFacts>,
  generatedContent?: Map<string, LiveGeneratedContent> | null
) {
  const usedByVisit = new Map<string, string[]>();
  const resolved = new Map<string, NonNullable<ReturnType<typeof calendarMoonResolvedWeekly>>>();
  for (const day of days) {
    const facts = factsByDate.get(day.dateKey);
    const visitId = facts?.moonVisitId ?? `${day.moonSign}:${day.dateKey}`;
    const used = usedByVisit.get(visitId) ?? [];
    const result = calendarMoonResolvedWeekly(day, facts, generatedContent, used);
    if (result) resolved.set(day.dateKey, result);
    if (result?.kind === "authored") {
      usedByVisit.set(visitId, [...used, result.body]);
    }
  }
  return resolved;
}

function packagedWeeklyMoon(
  day: LunarCalendarDay,
  facts?: CalendarMoonCycleFacts,
  generatedContent?: Map<string, LiveGeneratedContent> | null,
  resolvedByDate?: Map<string, NonNullable<ReturnType<typeof calendarMoonResolvedWeekly>>>
) {
  const resolved = resolvedByDate?.get(day.dateKey)
    ?? calendarMoonResolvedWeekly(day, facts, generatedContent);
  return resolved?.body ? { contentKey: resolved.contentKey, body: resolved.body } : null;
}

function moonWritingForDay(
  day: LunarCalendarDay,
  generatedContent: Map<string, LiveGeneratedContent> | null | undefined,
  leftoverFallback?: { contentKey: string; body: string } | null
) {
  const lunation = primaryLunationForDay(day);
  const lunarSource = lunation ? readers.lunation(lunation, generatedContent) : null;
  return calendarDayMoonWriting({
    moonSign: day.moonSign,
    lunation,
    lunationBody: lunarSource?.body ?? '',
    lunationContentKey: lunarSource?.contentKey,
    leftoverFallback: leftoverFallback?.body?.trim() ? leftoverFallback : null
  });
}

function calendarMoonCycleFallbackPiece(
  day: LunarCalendarDay,
  facts: CalendarMoonCycleFacts | undefined,
  generatedContent: Map<string, LiveGeneratedContent> | null | undefined
): CalendarMoonWritingPiece | null {
  if (!facts) return null;
  const fallback = resolveCalendarMoonFallback(facts, calendarMoonFallbackOptions(day, facts, generatedContent));
  return fallback?.body
    ? { role: "leftover", contentKey: fallback.contentKey, body: fallback.body }
    : null;
}

return { calendarLiveBody, calendarWeeklyMoonAuthoredPassages, calendarMoonFallbackOptions, calendarMoonResolvedWeekly, calendarMoonResolvedByDate, packagedWeeklyMoon, moonWritingForDay, calendarMoonCycleFallbackPiece };
}
export type CalendarMoonSources = ReturnType<typeof createCalendarMoonSources>;
