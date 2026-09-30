/** Existing connecting wording, exposed as templates; no placement is stored in the prose. */
export const calendarTimingTemplates = {
  firstDay: { label: 'Moon stays in a sign · first day', body: 'The Moon spends the day in {{moonSign}}.' },
  anotherDay: { label: 'Moon stays in a sign · another day', body: 'The Moon spends another day in {{moonSign}}.' },
  remains: { label: 'Moon stays in a sign · remains', body: 'The Moon remains in {{moonSign}} today.' },
  still: { label: 'Moon stays in a sign · still', body: 'The Moon is still in {{moonSign}} today.' },
  lastFullDay: { label: 'Last full day before a Moon ingress', body: 'The Moon spends the entire day in {{moonSign}} before it enters {{nextMoonSign}} tomorrow.' },
  earlyIngress: { label: 'Moon ingress before 6 AM', body: 'The Moon enters {{nextMoonSign}} at {{nextMoonSignEntryTime}}, so most of today belongs to {{nextMoonSign}}.' },
  morningIngress: { label: 'Moon ingress from 6 to 11 AM', body: 'The day starts in {{moonSign}}, then the Moon enters {{nextMoonSign}} at {{nextMoonSignEntryTime}}.' },
  middayIngress: { label: 'Moon ingress from 11 AM to 3 PM', body: 'The Moon starts the day in {{moonSign}} and enters {{nextMoonSign}} at {{nextMoonSignEntryTime}}.' },
  eveningIngress: { label: 'Moon ingress from 3 to 8 PM', body: 'The Moon stays in {{moonSign}} through most of the day before entering {{nextMoonSign}} at {{nextMoonSignEntryTime}}.' },
  lateIngress: { label: 'Moon ingress after 8 PM · timing', body: 'The Moon stays in {{moonSign}} for most of today and enters {{nextMoonSign}} at {{nextMoonSignEntryTime}}.' },
  phase: { label: 'Moon phase continuation · timing', body: 'The Moon remains in {{moonSign}} today, continuing the {{moonPhase}} phase.' },
  lastSeasonDay: { label: 'Last full day of a season · timing', body: 'This is the last full day of {{seasonName}} season.' },
  lastSeasonWeekend: { label: 'Last full weekend of a season · timing', body: 'This is the last full weekend of {{seasonName}} season.' },
  finalSeasonDays: { label: 'Final days of a season · timing', body: '{{seasonName}} season is in its final days.' },
  firstSeasonDay: { label: 'First full day of a season · timing', body: 'This is the first full day of {{seasonName}} season.' },
} as const;
export type CalendarTimingKind = keyof typeof calendarTimingTemplates;
export const calendarTimingKey = (kind: CalendarTimingKind) => `authored/calendar-timing/${kind}`;
export function calendarTimingBody(kind: CalendarTimingKind, values: Record<string, unknown>, lookup?: (key: string) => string | null | undefined) {
  const render = (body: string) => body.replace(/\{\{(\w+)\}\}/gu, (token, name) => typeof values[name] === 'string' ? String(values[name]) : token);
  const override = lookup?.(calendarTimingKey(kind));
  const rendered = override ? render(override) : '';
  return rendered && !/[{}]/u.test(rendered) ? rendered : render(calendarTimingTemplates[kind].body);
}
