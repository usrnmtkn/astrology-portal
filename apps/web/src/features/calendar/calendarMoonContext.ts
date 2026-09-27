import type { CalendarMoonCycleFacts } from './calendarMoonCycle.js';
import { hasTemplateSlots, interpolateTemplateString } from '../../services/templateInterpolation.js';
import { isRejectedCalendarMoonCopy } from './calendarMoonCopyRevisions.js';

export const CALENDAR_MOON_CONTEXT_PREFIX = 'authored/calendar-moon-context/';

/** Editable context templates. Revision originals and review state are retained separately. */
export const calendarMoonContextTemplates = {
  dayAfterEclipse: 'The eclipse was yesterday. Treat the first reaction as information, not the final answer. Give the facts time to catch up.',
  afterEclipse: 'The eclipse was {{daysSincePreviousEclipse}} days ago. Some of the noise has cleared. Pay attention to what still matters now that the first reaction has passed.',
  dayAfterNewMoon: 'The New Moon was yesterday. Leave the plan alone for a minute. Let it meet your actual schedule before you start fixing it.',
  dayAfterFullMoon: "Yesterday was the [Full Moon in {{previousLunationSign}}]({{previousLunationUrl}}), on {{previousLunationDate}}. Full Moons are a point of reflection in the lunar cycle: a chance to notice what is developing in your life and how you feel about it. A realization may take time to understand; there is no requirement to make a decision today.",
  afterNewMoon: 'The New Moon was {{daysSincePreviousLunation}} days ago. Now you know more. Adjust the plan to fit the life you are actually living.',
  afterFullMoon: "The [Full Moon in {{previousLunationSign}}]({{previousLunationUrl}}) was on {{previousLunationDate}}, {{daysSincePreviousLunation}} days ago. The waning phase that follows is associated with reflection and release. If that Full Moon brought a concern or a desire into focus, you can return to it with more time to consider what you need.",
  eclipseTomorrow: 'The {{nextEclipseType}} in {{nextEclipseSign}} arrives tomorrow. Leave some room for the plan to change.',
  newMoonTomorrow: 'The New Moon in {{nextLunationSign}} arrives tomorrow. Notice what keeps asking for a different approach. You do not need the whole plan yet.',
  fullMoonTomorrow: 'The Full Moon in {{nextLunationSign}} arrives tomorrow. Notice what has become too obvious to keep working around.'
} as const;

export type CalendarMoonContextKind = keyof typeof calendarMoonContextTemplates;
export const calendarMoonContextKey = (kind: CalendarMoonContextKind) => `${CALENDAR_MOON_CONTEXT_PREFIX}${kind.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}`;
export const calendarMoonContextKeys = Object.keys(calendarMoonContextTemplates).map(kind => calendarMoonContextKey(kind as CalendarMoonContextKind));

export const calendarMoonWritingVariables = [
  'date', 'dayOfWeek', 'moonSign', 'moonPhase', 'nextMoonSign', 'nextMoonSignEntryDate', 'nextMoonSignEntryTime',
  'previousLunationSign', 'previousLunationDate', 'daysSincePreviousLunation',
  'nextLunationSign', 'nextLunationDate', 'daysUntilNextLunation',
  'previousEclipseType', 'previousEclipseSign', 'previousEclipseDate', 'daysSincePreviousEclipse',
  'nextEclipseType', 'nextEclipseSign', 'nextEclipseDate', 'daysUntilNextEclipse',
  'seasonName', 'seasonEndDate', 'nextSunSign',
  'previousLunationUrl', 'nextLunationUrl', 'previousEclipseUrl', 'nextEclipseUrl'
] as const;

/** Only calculated facts are allowed to fill editorial variables. */
export function renderCalendarMoonWriting(body: string, contentKey: string, facts: Partial<CalendarMoonCycleFacts>) {
  const slots = Object.fromEntries(calendarMoonWritingVariables.map(name => [name, facts[name]]));
  for (const name of ['daysSincePreviousLunation', 'daysSincePreviousEclipse']) {
    if (slots[name] === 2) slots[name] = 'two';
    if (slots[name] === 3) slots[name] = 'three';
  }
  const rendered = interpolateTemplateString(body, slots, { contentKey, field: 'body' }).trim();
  return hasTemplateSlots(rendered) ? '' : rendered;
}

export function calendarMoonContextCopy(kind: CalendarMoonContextKind, facts: CalendarMoonCycleFacts, lookup?: (key: string) => string | null | undefined) {
  const contentKey = calendarMoonContextKey(kind);
  const override = lookup?.(contentKey);
  const template = override && !isRejectedCalendarMoonCopy(contentKey, override) ? override : calendarMoonContextTemplates[kind];
  const body = renderCalendarMoonWriting(template, contentKey, facts);
  return body ? { kind, contentKey, body } : null;
}
