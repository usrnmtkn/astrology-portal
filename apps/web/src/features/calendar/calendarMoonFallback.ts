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

function spellCount(value: number) {
  if (value === 2) return "two";
  if (value === 3) return "three";
  return String(value);
}

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

function continuationOpening(sign: string, visitDay: number) {
  if (visitDay <= 1) return `The Moon spends the day in ${sign}.`;
  const cycle = (Math.max(visitDay, 2) - 2) % 3;
  if (cycle === 0) return `The Moon spends another day in ${sign}.`;
  if (cycle === 1) return `The Moon remains in ${sign} today.`;
  return `The Moon is still in ${sign} today.`;
}

function signChangeSentence(facts: CalendarMoonCycleFacts, transition: string) {
  const time = facts.nextMoonSignEntryTime;
  const hour = ingressHour(facts);
  if (!facts.nextMoonSign || !time || hour == null) return null;
  if (hour < 6) {
    return joinParts(
      `The Moon enters ${facts.nextMoonSign} at ${time}, so most of today belongs to ${facts.nextMoonSign}.`,
      transition
    );
  }
  if (hour < 11) {
    return joinParts(
      `The day starts in ${facts.moonSign}, then the Moon enters ${facts.nextMoonSign} at ${time}.`,
      transition
    );
  }
  if (hour < 15) {
    return joinParts(
      `The Moon starts the day in ${facts.moonSign} and enters ${facts.nextMoonSign} at ${time}.`,
      transition
    );
  }
  if (hour < 20) {
    return joinParts(
      `The Moon stays in ${facts.moonSign} through most of the day before entering ${facts.nextMoonSign} at ${time}.`,
      transition
    );
  }
  return `The Moon stays in ${facts.moonSign} for most of today and enters ${facts.nextMoonSign} at ${time}. You may notice the change more tomorrow than tonight.`;
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
      body: "The eclipse was yesterday. Treat the first reaction as information, not the final answer. Give the facts time to catch up."
    };
  }
  if (facts.daysSincePreviousEclipse != null && facts.daysSincePreviousEclipse >= 2 && facts.daysSincePreviousEclipse <= 3) {
    return {
      kind: "afterEclipse",
      body: `The eclipse was ${spellCount(facts.daysSincePreviousEclipse)} days ago. Some of the noise has cleared. Pay attention to what still matters now that the first reaction has passed.`
    };
  }
  if (facts.daysSincePreviousLunation === 1 && facts.previousLunationType === "new-moon") {
    return {
      kind: "dayAfterNewMoon",
      body: "The New Moon was yesterday. Leave the plan alone for a minute. Let it meet your actual schedule before you start fixing it."
    };
  }
  if (facts.daysSincePreviousLunation === 1 && facts.previousLunationType === "full-moon") {
    return {
      kind: "dayAfterFullMoon",
      body: "The Full Moon was yesterday. Keep the part that became clear. You do not need to turn the rest into a conclusion yet."
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
      body: `The New Moon was ${spellCount(facts.daysSincePreviousLunation)} days ago. Now you know more. Adjust the plan to fit the life you are actually living.`
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
      body: `The Full Moon was ${spellCount(facts.daysSincePreviousLunation)} days ago. The first reaction has had some time to settle. Notice what still needs your attention now.`
    };
  }
  if ((facts.exactFirstQuarter || facts.exactLastQuarter) && authoredPhase) {
    return { kind: authoredPhaseKind, body: authoredPhase };
  }
  if (facts.daysUntilNextEclipse === 1 && facts.nextEclipseType && facts.nextEclipseSign) {
    return {
      kind: "eclipseTomorrow",
      body: `The ${facts.nextEclipseType} in ${facts.nextEclipseSign} arrives tomorrow. Leave some room for the plan to change.`
    };
  }
  if (facts.daysUntilNextLunation === 1 && facts.nextLunationType === "new-moon" && facts.nextLunationSign) {
    return {
      kind: "newMoonTomorrow",
      body: `The New Moon in ${facts.nextLunationSign} arrives tomorrow. Notice what keeps asking for a different approach. You do not need the whole plan yet.`
    };
  }
  if (facts.daysUntilNextLunation === 1 && facts.nextLunationType === "full-moon" && facts.nextLunationSign) {
    return {
      kind: "fullMoonTomorrow",
      body: `The Full Moon in ${facts.nextLunationSign} arrives tomorrow. Notice what has become too obvious to keep working around.`
    };
  }
  if (facts.daysUntilSeasonEnd === 1 && facts.seasonName) {
    return {
      kind: "lastFullDayOfSeason",
      body: seasonTransitionContext(facts, options)
        || `This is the last full day of ${facts.seasonName} season. Finish what is still useful, and stop forcing the parts that clearly need a different approach.`
    };
  }
  if (facts.isLastFullWeekendOfSeason && facts.seasonName) {
    return {
      kind: "lastFullWeekendOfSeason",
      body: seasonTransitionContext(facts, options)
        || `This is the last full weekend of ${facts.seasonName} season. Use it to see what still deserves your time once the season's urgency wears off.`
    };
  }
  if (facts.seasonName && facts.daysUntilSeasonEnd != null && facts.daysUntilSeasonEnd >= 2 && facts.daysUntilSeasonEnd <= 3) {
    return {
      kind: "finalDaysOfSeason",
      body: seasonTransitionContext(facts, options)
        || `${facts.seasonName} season is in its final days. Notice what from this month is actually worth carrying forward.`
    };
  }
  if (facts.isFirstFullDayOfSeason && facts.seasonName) {
    return {
      kind: "firstFullDayOfSeason",
      body: joinParts(
        `This is the first full day of ${facts.seasonName} season.`,
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
    exactFirstQuarter: facts.exactFirstQuarter
  });
  const transition = facts.nextMoonSign
    ? moonSignTransitionForPair(facts.moonSign, facts.nextMoonSign, options.pairTransition)
    : "";

  const authoredPhase = options.authoredPhaseCopy?.body.trim() || options.exactQuarterCopy?.body.trim() || "";
  let moonKind: CalendarMoonFallbackKind = "moonPhaseContinuation";
  let moonBody = authoredPhase
    || `The Moon remains in ${facts.moonSign} today, continuing the ${facts.moonPhase.toLowerCase()} phase.`;
  let allowContext = !authoredPhase
    || facts.isLastFullDayInMoonSign
    || Boolean(continuation);

  if (facts.moonChangesSignToday) {
    const changed = signChangeSentence(facts, transition);
    if (changed) {
      moonKind = "moonChangesLaterToday";
      moonBody = changed;
      allowContext = false;
    }
  } else if (facts.isLastFullDayInMoonSign && facts.nextMoonSign) {
    moonKind = "lastFullDayInMoonSign";
    moonBody = joinParts(
      `The Moon spends the entire day in ${facts.moonSign} before it enters ${facts.nextMoonSign} tomorrow.`,
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
      continuationOpening(facts.moonSign, facts.moonVisitDayIndex ?? facts.moonSignDayIndex),
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
