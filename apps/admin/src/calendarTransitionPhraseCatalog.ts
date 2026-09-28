import { calendarTransitionPhraseKeys, calendarTransitionPhraseForKey, type CalendarMoonContextKind } from '../../web/src/features/calendar/calendarTransitionPhraseIdentity';
import { calendarMoonContextPhrases } from '../../web/src/features/calendar/calendarTransitionPhrases';
import { moonContinuationSummaries, moonContinuationOnFirstQuarter } from '../../web/src/features/calendar/moonContinuationSummaries';
export { calendarTransitionPhraseKeys };
export const calendarTransitionPhrases = calendarTransitionPhraseKeys.map(key => {
  const identity = calendarTransitionPhraseForKey(key)!;
  const body = key.startsWith('authored/calendar-moon-context/') ? calendarMoonContextPhrases[key.split('/')[2] as CalendarMoonContextKind].body
    : key.endsWith('/first-quarter') ? moonContinuationOnFirstQuarter[identity.sign] : moonContinuationSummaries[identity.sign];
  return { ...identity, body };
});
