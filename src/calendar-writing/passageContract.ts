export type CalendarPassagePeriod = 'daily' | 'weekly' | 'monthly';
export const CALENDAR_PASSAGE_PREFIX = 'calendar-passage/';
export function calendarPassageKey(period: CalendarPassagePeriod, date?: string, timeZone?: string) {
  return `${CALENDAR_PASSAGE_PREFIX}${period}/${date ? `${date}/${encodeURIComponent(timeZone || 'UTC')}` : 'shared'}`;
}
export function calendarPassageIdentity(key: string) {
  const match = /^calendar-passage\/(daily|weekly|monthly)\/(shared|\d{4}-\d{2}-\d{2}\/[^/]+)$/u.exec(key);
  if (!match) return null;
  const period = match[1] as CalendarPassagePeriod;
  if (match[2] === 'shared') return { period, date: null, timeZone: null };
  const [date, encoded] = match[2].split('/');
  try {
    const timeZone = decodeURIComponent(encoded);
    new Intl.DateTimeFormat('en', { timeZone }).format();
    if (new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) !== date) return null;
    if (period === 'weekly' && new Date(`${date}T12:00:00Z`).getUTCDay() !== 0) return null;
    if (period === 'monthly' && !date.endsWith('-01')) return null;
    if (encodeURIComponent(timeZone) !== encoded) return null;
    return { period, date, timeZone };
  } catch { return null; }
}
export const calendarPassageVariables = [
  'date', 'sunSummary', 'moonWriteup', 'sunSign', 'moonSign', 'moonPhase', 'sunPosition',
  'nextMoonSign', 'nextMoonSignEntryTime', 'seasonName', 'weekRange', 'monthRange', 'monthName', 'overview',
  'signTitle', 'entryDate', 'exitDate', 'openingSeasonSign', 'closingSeasonSign', 'openingZodiacSeason', 'closingZodiacSeason',
  'openingZodiacSeasonPolarAxis', 'closingZodiacSeasonPolarAxis', 'seasonChangeDate',
  'lunationDates', 'planetaryChanges', 'planetaryAspects', 'newMoonSign', 'fullMoonSign', 'newMoonDate', 'fullMoonDate',
  'hasNewMoon', 'hasFullMoon', 'hasSeasonTransition', 'hasSolarEclipse', 'hasLunarEclipse',
  ...['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].flatMap(day => [`${day}Date`, `${day}Writeup`])
];
export function calendarPassageErrors(body: string) {
  const errors: string[] = [];
  if (!body.trim()) errors.push('Write a passage before publishing.');
  const stack: string[] = [];
  const tokens = body.matchAll(/\{\{\s*([#/!]?)\s*([^{}]*?)\s*\}\}/gu);
  for (const [, operator, name] of tokens) {
    if (!calendarPassageVariables.includes(name)) errors.push(`Unknown variable: ${name}. Choose a variable from the list.`);
    if (operator === '#') stack.push(name);
    if (operator === '/' && stack.pop() !== name) errors.push(`The ${name} conditional is not closed correctly.`);
    if (operator === '!') errors.push('Use named variables only; keep writing notes outside the passage.');
  }
  if (stack.length || /[{}]/u.test(body.replace(/\{\{[^{}]*\}\}/gu, ''))) errors.push('A variable or conditional is incomplete.');
  return [...new Set(errors)];
}
