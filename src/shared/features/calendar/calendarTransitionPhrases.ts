import { calendarMoonContextKey, type CalendarMoonContextKind } from './calendarTransitionPhraseIdentity.js';
export { calendarMoonContextKey, calendarFirstQuarterContinuationKey, calendarTransitionPhraseKeys, type CalendarMoonContextKind } from './calendarTransitionPhraseIdentity.js';

/** Existing reader wording; published Studio replacements are selected by exact key. */
export const calendarMoonContextPhrases: Record<CalendarMoonContextKind, { body: string }> = {
  dayAfterEclipse: { body: "Treat the first reaction as information, not the final answer. Give the facts time to catch up." },
  afterEclipse: { body: "Some of the noise has cleared. Pay attention to what still matters now that the first reaction has passed." },
  dayAfterNewMoon: { body: "Leave the plan alone for a minute. Let it meet your actual schedule before you start fixing it." },
  dayAfterFullMoon: { body: "Keep the part that became clear. You do not need to turn the rest into a conclusion yet." },
  afterNewMoon: { body: "Now you know more. Adjust the plan to fit the life you are actually living." },
  afterFullMoon: { body: "The first reaction has had some time to settle. Notice what still needs your attention now." },
  eclipseTomorrow: { body: "Leave some room for the plan to change." },
  newMoonTomorrow: { body: "Notice what keeps asking for a different approach. You do not need the whole plan yet." },
  fullMoonTomorrow: { body: "Notice what has become too obvious to keep working around." },
  lastFullDayOfSeason: { body: "Finish what is still useful, and stop forcing the parts that clearly need a different approach." },
  lastFullWeekendOfSeason: { body: "Use it to see what still deserves your time once the season's urgency wears off." },
  finalDaysOfSeason: { body: "Notice what from this month is actually worth carrying forward." },
  lateIngress: { body: "You may notice the change more tomorrow than tonight." },
};
export function calendarMoonContextBody(kind: CalendarMoonContextKind, lookup?: (key: string) => string | null | undefined) {
  return lookup?.(calendarMoonContextKey(kind))?.trim() || calendarMoonContextPhrases[kind].body;
}
