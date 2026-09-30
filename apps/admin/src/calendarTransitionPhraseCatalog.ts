import { calendarTimingTemplates, type CalendarTimingKind } from '../../web/src/features/calendar/calendarTimingTemplates.js';
import { calendarTransitionPhraseKeys, calendarTransitionPhraseForKey, type CalendarMoonContextKind } from '../../web/src/features/calendar/calendarTransitionPhraseIdentity.js';
import { calendarMoonContextPhrases } from '../../web/src/features/calendar/calendarTransitionPhrases.js';
import { moonContinuationSummaries, moonContinuationOnFirstQuarter } from '../../web/src/features/calendar/moonContinuationSummaries.js';
export { calendarTransitionPhraseKeys };
export const calendarTransitionPhrases = calendarTransitionPhraseKeys.map(key => {
  const identity = calendarTransitionPhraseForKey(key)!;
  const body = key.startsWith('authored/calendar-timing/') ? calendarTimingTemplates[key.split('/')[2] as CalendarTimingKind].body : key.startsWith('authored/calendar-moon-context/') ? calendarMoonContextPhrases[key.split('/')[2] as CalendarMoonContextKind].body
    : key.endsWith('/first-quarter') ? moonContinuationOnFirstQuarter[identity.sign] : moonContinuationSummaries[identity.sign];
  return { ...identity, body };
});
