import { calendarTimingBody } from './calendarTimingTemplates.js';
import { calendarFirstQuarterContinuationKey, calendarMoonContextBody } from "./calendarTransitionPhrases";
import type { CalendarMoonCycleFacts } from "./calendarMoonCycle";
import { calendarFirstQuarterCopy, calendarMoonPhaseCopy } from "./calendarMoonPhaseCopy";
import { calendarSeasonTransitionForSurface, calendarSeasonTransitionWhen } from "./calendarSeasonTransitions";
import { moonContinuationSummaryForSign } from "./moonContinuationSummaries";
import { moonSignTransitionForPair } from "./moonSignTransitions";

function resolvedAuthoredPhase(
  facts: CalendarMoonCycleFacts,
  options: {
    authoredPhaseCopy?: { body: string; contentKey: string } | null;
    exactQuarterCopy?: { body: string; contentKey: string } | null;
  }
) {
  if (facts.exactFirstQuarter) {
    const override = options.authoredPhaseCopy?.body.trim() || options.exactQuarterCopy?.body.trim() || "";
    if (override.includes("about a week after the New Moon")) {
      return options.authoredPhaseCopy?.body.trim()
        ? options.authoredPhaseCopy
        : options.exactQuarterCopy;
    }
    return {
      body: calendarFirstQuarterCopy,
      contentKey: "generated/calendar-moon-fallback/first-quarter"
    };
  }
  if (options.authoredPhaseCopy?.body.trim()) return options.authoredPhaseCopy;
  if (options.exactQuarterCopy?.body.trim()) return options.exactQuarterCopy;
  return calendarMoonPhaseCopy(facts, () => "");
}

export type CalendarMoonFallbackKind =
  | "exact-lunation"
  | "authored"
  | "moonChangesLaterToday"
  | "lastFullDayInMoonSign"
  | "moonContinuation"
  | "moonPhaseContinuation";

export type CalendarMoonFallbackCopy = {
  kind: CalendarMoonFallbackKind;
  body: string;
  contentKey: string;
  contextKind?: string;
};

function joinParts(...parts: Array<string | null | undefined>) {
  return parts.map((part) => part?.trim()).filter(Boolean).join(" ");
}

function parseHourFromLabel(value: string) {
  const match = value.match(/(\d{1,2}):\d{2}\s*(AM|PM)/i);
  if (!match) return null;
  const meridiem = match[2].toUpperCase();
  const raw = Number(match[1]);
  if (meridiem === "AM") return raw % 12;
  return (raw % 12) + 12;
}

function ingressHour(facts: CalendarMoonCycleFacts) {
  if (facts.moonSignExitHour != null) return facts.moonSignExitHour;
  return parseHourFromLabel(facts.nextMoonSignEntryTime);
}

function mentionsSameContext(moonText: string, contextText: string) {
  const markers = ["new moon", "full moon", "eclipse", "first quarter", "last quarter", "season"];
  const moon = moonText.toLowerCase();
  const context = contextText.toLowerCase();
  return markers.some((marker) => moon.includes(marker) && context.includes(marker));
}

function continuationOpening(facts: CalendarMoonCycleFacts, lookup?: (key: string) => string | null | undefined) {
  const visitDay = facts.moonVisitDayIndex ?? facts.moonSignDayIndex;
  const cycle = (Math.max(visitDay, 2) - 2) % 3;
  return calendarTimingBody(visitDay <= 1 ? 'firstDay' : cycle === 0 ? 'anotherDay' : cycle === 1 ? 'remains' : 'still', { ...facts }, lookup);
}

function signChangeSentence(facts: CalendarMoonCycleFacts, transition: string, lookup?: (key: string) => string | null | undefined) {
  const time = facts.nextMoonSignEntryTime;
  const hour = ingressHour(facts);
  if (!facts.nextMoonSign || !time || hour == null) return null;
  // Day and Week already display the calculated ingress and time in their
  // event rows. Keep the selected passage intact instead of introducing it
  // with another sentence announcing the same ingress.
  const passage = hour < 20 ? transition : calendarMoonContextBody("lateIngress", lookup);
  if (passage) return passage;
  // Preserve the timing-only fallback when no transition passage is available.
  const timing = hour < 6 ? 'earlyIngress' : hour < 11 ? 'morningIngress'
    : hour < 15 ? 'middayIngress' : hour < 20 ? 'eveningIngress' : 'lateIngress';
  return calendarTimingBody(timing, { ...facts }, lookup);
}

function hasExactLunarEvent(facts: CalendarMoonCycleFacts) {
  return facts.exactSolarEclipse || facts.exactLunarEclipse || facts.exactNewMoon || facts.exactFullMoon;
}

function hasTimingPrimaryStory(facts: CalendarMoonCycleFacts) {
  if (hasExactLunarEvent(facts)) return true;
  if (facts.moonChangesSignToday || facts.isLastFullDayInMoonSign) return true;
  if (facts.exactFirstQuarter || facts.exactLastQuarter) return true;
  if (facts.daysSincePreviousEclipse === 1) return true;
  if (facts.daysSincePreviousEclipse != null && facts.daysSincePreviousEclipse >= 2 && facts.daysSincePreviousEclipse <= 3) {
    return true;
  }
  if (facts.daysUntilNextEclipse === 1) return true;
  if (facts.daysUntilNextLunation === 1) return true;
  if (facts.daysUntilSeasonEnd === 1) return true;
  if (facts.isLastFullWeekendOfSeason) return true;
  if (facts.seasonName && facts.daysUntilSeasonEnd != null && facts.daysUntilSeasonEnd >= 2 && facts.daysUntilSeasonEnd <= 3) {
    return true;
  }
  return Boolean(facts.isFirstFullDayOfSeason && facts.seasonName);
}

export function calendarMoonShouldUseAuthoredWriteup(
  facts: CalendarMoonCycleFacts,
  options: {
    unusedAuthored?: { body: string; contentKey: string } | null;
    authoredUsedThisVisit?: boolean;
    authoredPhaseCopy?: { body: string; contentKey: string } | null;
    exactQuarterCopy?: { body: string; contentKey: string } | null;
    seasonSummary?: string | null;
  } = {}
) {
  if (!options.unusedAuthored?.body.trim()) return false;
  if (options.authoredUsedThisVisit) return false;
  if (hasTimingPrimaryStory(facts)) return false;
  return true;
}

function seasonTransitionContext(
  facts: CalendarMoonCycleFacts,
  options: { seasonTransition?: string | null }
) {
  return calendarSeasonTransitionForSurface({
    fromSign: facts.seasonName,
    toSign: facts.nextSunSign,
    date: calendarSeasonTransitionWhen(facts.daysUntilSeasonEnd, facts.seasonEndDate),
    surface: "leftover",
    daysUntilSeasonEnd: facts.daysUntilSeasonEnd,
    override: options.seasonTransition
  }) || "";
}

function contextCopy(
  facts: CalendarMoonCycleFacts,
  options: {
    authoredPhaseCopy?: { body: string; contentKey: string } | null;
    exactQuarterCopy?: { body: string; contentKey: string } | null;
    seasonSummary?: string | null;
    seasonTransition?: string | null;
    transitionPhrase?: (key: string) => string | null | undefined;
  }
): { kind: string; body: string } | null {
  const authoredPhase = options.authoredPhaseCopy?.body.trim() || options.exactQuarterCopy?.body.trim() || "";
  const authoredPhaseKind = facts.exactFirstQuarter
    ? "firstQuarter"
    : facts.exactLastQuarter
      ? "lastQuarter"
      : "moonPhase";
  if (facts.daysSincePreviousEclipse === 1) {
    return {
      kind: "dayAfterEclipse",
      body: calendarMoonContextBody("dayAfterEclipse", options.transitionPhrase)
    };
  }
  if (facts.daysSincePreviousEclipse != null && facts.daysSincePreviousEclipse >= 2 && facts.daysSincePreviousEclipse <= 3) {
    return {
      kind: "afterEclipse",
      body: calendarMoonContextBody("afterEclipse", options.transitionPhrase)
    };
  }
  if (facts.daysSincePreviousLunation === 1 && facts.previousLunationType === "new-moon") {
    return {
      kind: "dayAfterNewMoon",
      body: calendarMoonContextBody("dayAfterNewMoon", options.transitionPhrase)
    };
  }
  if (facts.daysSincePreviousLunation === 1 && facts.previousLunationType === "full-moon") {
    return {
      kind: "dayAfterFullMoon",
      body: calendarMoonContextBody("dayAfterFullMoon", options.transitionPhrase)
    };
  }
  if (
    facts.previousLunationType === "new-moon"
    && facts.daysSincePreviousLunation != null
    && facts.daysSincePreviousLunation >= 2
    && facts.daysSincePreviousLunation <= 3
  ) {
    return {
      kind: "afterNewMoon",
      body: calendarMoonContextBody("afterNewMoon", options.transitionPhrase)
    };
  }
  if (
    facts.previousLunationType === "full-moon"
    && facts.daysSincePreviousLunation != null
    && facts.daysSincePreviousLunation >= 2
    && facts.daysSincePreviousLunation <= 3
  ) {
    return {
      kind: "afterFullMoon",
      body: calendarMoonContextBody("afterFullMoon", options.transitionPhrase)
    };
  }
  if ((facts.exactFirstQuarter || facts.exactLastQuarter) && authoredPhase) {
    return { kind: authoredPhaseKind, body: authoredPhase };
  }
  if (facts.daysUntilNextEclipse === 1 && facts.nextEclipseType && facts.nextEclipseSign) {
    return {
      kind: "eclipseTomorrow",
      body: calendarMoonContextBody("eclipseTomorrow", options.transitionPhrase)
    };
  }
  if (facts.daysUntilNextLunation === 1 && facts.nextLunationType === "new-moon" && facts.nextLunationSign) {
    return {
      kind: "newMoonTomorrow",
      body: calendarMoonContextBody("newMoonTomorrow", options.transitionPhrase)
    };
  }
  if (facts.daysUntilNextLunation === 1 && facts.nextLunationType === "full-moon" && facts.nextLunationSign) {
    return {
      kind: "fullMoonTomorrow",
      body: calendarMoonContextBody("fullMoonTomorrow", options.transitionPhrase)
    };
  }
  if (facts.daysUntilSeasonEnd === 1 && facts.seasonName) {
    return {
      kind: "lastFullDayOfSeason",
      body: seasonTransitionContext(facts, options)
        || joinParts(calendarTimingBody('lastSeasonDay', { ...facts }, options.transitionPhrase), calendarMoonContextBody("lastFullDayOfSeason", options.transitionPhrase))
    };
  }
  if (facts.isLastFullWeekendOfSeason && facts.seasonName) {
    return {
      kind: "lastFullWeekendOfSeason",
      body: seasonTransitionContext(facts, options)
        || joinParts(calendarTimingBody('lastSeasonWeekend', { ...facts }, options.transitionPhrase), calendarMoonContextBody("lastFullWeekendOfSeason", options.transitionPhrase))
    };
  }
  if (facts.seasonName && facts.daysUntilSeasonEnd != null && facts.daysUntilSeasonEnd >= 2 && facts.daysUntilSeasonEnd <= 3) {
    return {
      kind: "finalDaysOfSeason",
      body: seasonTransitionContext(facts, options)
        || joinParts(calendarTimingBody('finalSeasonDays', { ...facts }, options.transitionPhrase), calendarMoonContextBody("finalDaysOfSeason", options.transitionPhrase))
    };
  }
  if (facts.isFirstFullDayOfSeason && facts.seasonName) {
    return {
      kind: "firstFullDayOfSeason",
      body: joinParts(
        calendarTimingBody('firstSeasonDay', { ...facts }, options.transitionPhrase),
        options.seasonSummary?.trim()
      )
    };
  }
  if (authoredPhase) {
    return { kind: authoredPhaseKind, body: authoredPhase };
  }
  return null;
}

export function resolveCalendarMoonFallback(
  facts: CalendarMoonCycleFacts,
  options: {
    exactLunationCopy?: { body: string; contentKey: string } | null;
    unusedAuthored?: { body: string; contentKey: string } | null;
    authoredUsedThisVisit?: boolean;
    authoredPhaseCopy?: { body: string; contentKey: string } | null;
    exactQuarterCopy?: { body: string; contentKey: string } | null;
    seasonSummary?: string | null;
    seasonTransition?: string | null;
    transitionPhrase?: (key: string) => string | null | undefined;
    moonContinuationSummary?: string | null;
    pairTransition?: string | null;
  } = {}
): CalendarMoonFallbackCopy | null {
  const key = (kind: CalendarMoonFallbackKind) => `generated/calendar-moon-fallback/${kind}/${facts.dateKey}`;
  options = { ...options, authoredPhaseCopy: resolvedAuthoredPhase(facts, options) };
  if (hasExactLunarEvent(facts) && options.exactLunationCopy?.body.trim()) {
    return {
      kind: "exact-lunation",
      body: options.exactLunationCopy.body.trim(),
      contentKey: options.exactLunationCopy.contentKey
    };
  }
  if (calendarMoonShouldUseAuthoredWriteup(facts, options)) {
    return {
      kind: "authored",
      body: options.unusedAuthored!.body.trim(),
      contentKey: options.unusedAuthored!.contentKey
    };
  }

  const continuation = moonContinuationSummaryForSign(facts.moonSign, options.moonContinuationSummary, {
    exactFirstQuarter: facts.exactFirstQuarter,
    firstQuarterOverride: options.transitionPhrase?.(calendarFirstQuarterContinuationKey(facts.moonSign))
  });
  const transition = facts.nextMoonSign
    ? moonSignTransitionForPair(facts.moonSign, facts.nextMoonSign, options.pairTransition)
    : "";

  const authoredPhase = options.authoredPhaseCopy?.body.trim() || options.exactQuarterCopy?.body.trim() || "";
  let moonKind: CalendarMoonFallbackKind = "moonPhaseContinuation";
  let moonBody = authoredPhase
    || calendarTimingBody('phase', { ...facts, moonPhase: facts.moonPhase.toLowerCase() }, options.transitionPhrase);
  let allowContext = !authoredPhase
    || facts.isLastFullDayInMoonSign
    || Boolean(continuation);

  if (facts.moonChangesSignToday) {
    const changed = signChangeSentence(facts, transition, options.transitionPhrase);
    if (changed) {
      moonKind = "moonChangesLaterToday";
      moonBody = changed;
      allowContext = false;
    }
  } else if (facts.isLastFullDayInMoonSign && facts.nextMoonSign) {
    moonKind = "lastFullDayInMoonSign";
    moonBody = joinParts(
      calendarTimingBody('lastFullDay', { ...facts }, options.transitionPhrase),
      continuation
    );
    allowContext = true;
  } else if ((hasExactLunarEvent(facts) || facts.exactFirstQuarter || facts.exactLastQuarter) && authoredPhase) {
    moonKind = "moonPhaseContinuation";
    moonBody = authoredPhase;
    allowContext = false;
  } else if (continuation) {
    moonKind = "moonContinuation";
    moonBody = joinParts(
      continuationOpening(facts, options.transitionPhrase),
      continuation
    );
    allowContext = true;
  }

  const context = allowContext ? contextCopy(facts, options) : null;
  const contextBody = context && !mentionsSameContext(moonBody, context.body) ? context.body : "";
  return {
    kind: moonKind,
    body: joinParts(moonBody, contextBody),
    contentKey: key(moonKind),
    contextKind: contextBody ? context?.kind : undefined
  };
}
