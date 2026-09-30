import { calendarTimingTemplates, calendarTimingKey, type CalendarTimingKind } from './calendarTimingTemplates.js';
/** Editor identities only: no reader prose is imported into the Studio shell. */
const signs = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];
export const calendarMoonContextLabels = {
  dayAfterEclipse: "Day after an eclipse",
  afterEclipse: "Two or three days after an eclipse",
  dayAfterNewMoon: "Day after a New Moon",
  dayAfterFullMoon: "Day after a Full Moon",
  afterNewMoon: "Two or three days after a New Moon",
  afterFullMoon: "Two or three days after a Full Moon",
  eclipseTomorrow: "Day before an eclipse",
  newMoonTomorrow: "Day before a New Moon",
  fullMoonTomorrow: "Day before a Full Moon",
  lastFullDayOfSeason: "Last full day of a season",
  lastFullWeekendOfSeason: "Last full weekend of a season",
  finalDaysOfSeason: "Final days of a season",
  lateIngress: "Moon changes sign late at night",
} as const;
export type CalendarMoonContextKind = keyof typeof calendarMoonContextLabels;
export const calendarMoonContextKey = (kind: CalendarMoonContextKind) => `authored/calendar-moon-context/${kind}`;
export const calendarFirstQuarterContinuationKey = (sign: string) => `authored/calendar-moon-continuation-summary/${sign.toLowerCase().trim()}/first-quarter`;
export const calendarTransitionPhraseKeys = [
  ...Object.keys(calendarTimingTemplates).map(kind => calendarTimingKey(kind as CalendarTimingKind)),
  ...signs.map(sign => `authored/calendar-moon-continuation-summary/${sign}`),
  calendarFirstQuarterContinuationKey('sagittarius'),
  ...Object.keys(calendarMoonContextLabels).map(kind => calendarMoonContextKey(kind as CalendarMoonContextKind)),
];
export type CalendarTransitionPhraseIdentity = { key: string; label: string; group: string; sign: string; when: string };
export function calendarTransitionPhraseForKey(key: string): CalendarTransitionPhraseIdentity | undefined {
  if (!calendarTransitionPhraseKeys.includes(key)) return undefined;
  const [, , sign, special] = key.split('/');
  if (key.startsWith('authored/calendar-timing/')) return { key, sign: '', label: calendarTimingTemplates[sign as CalendarTimingKind].label,
    group: 'Calculated timing templates', when: 'Edit the complete connecting sentence. Keep the named variables so signs and times follow the selected date.' };
  if (key.startsWith('authored/calendar-moon-continuation-summary/')) return {
    key, sign, label: `Moon in ${sign[0].toUpperCase()}${sign.slice(1)} · ${special ? 'First Quarter continuation' : 'Continuation'}`,
    group: 'Moon stays in a sign',
    when: special ? 'Used instead of the usual continuation on an exact First Quarter day.' : 'Used on continuation days and the last full day in this sign. The timing sentence is calculated separately.',
  };
  const kind = sign as CalendarMoonContextKind;
  return { key, sign: '', label: calendarMoonContextLabels[kind],
    group: kind.includes('Season') ? 'Season context' : kind === 'lateIngress' ? 'Moon changes sign' : 'Around New Moons, Full Moons & eclipses',
    when: kind.includes('Season') ? 'Used only when no sign-specific season transition passage is available. Edit pair-specific writing in Season transitions.' : kind === 'lateIngress' ? 'Added after the calculated sign and time for an ingress at 8 PM or later.' : 'Shown as written when this lunar event is the relevant context for the day.',
  };
}
