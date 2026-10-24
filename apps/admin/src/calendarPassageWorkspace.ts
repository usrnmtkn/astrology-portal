import type { LiveGeneratedContent } from '../../web/src/services/generatedContent';
import { isContentRetired, publicationAllowsContent } from '../../web/src/content/contentPublicationState';
import { calendarMoonTransitionReading } from '../../../src/shared/features/calendar/calendarMoonTransitionReading';
import { calendarPeriodPassageValues, type CalendarPassageContext } from '../../../src/shared/features/calendar/calendarPassageAssembly';
import { calendarPassageKey, renderCalendarPassage, resolveCalendarPassage, type CalendarPassagePeriod } from '../../../src/shared/features/calendar/calendarPassageTemplates';
import { moonSignTransitionKey } from '../../../src/shared/features/calendar/moonSignTransitions';
import { calendarStudioMoonSources } from './calendarPassageSources';
import type { SkySnapshot } from '../../../src/shared/types';

export const calendarDefaultPattern = (period: CalendarPassagePeriod) => period === 'daily'
  ? '{{#sunSummary}}{{sunSummary}}{{/sunSummary}}\n\n{{#moonWriteup}}{{moonWriteup}}{{/moonWriteup}}'
  : period === 'monthly' ? '{{overview}}' : ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']
    .map(day => `{{#${day}Writeup}}{{${day}Date}}\n\n{{${day}Writeup}}{{/${day}Writeup}}`).join('\n\n');

/** Simulate one publication without mutating the reader cache or publication ledger. */
export function calendarWorkspaceReading(period: CalendarPassagePeriod, context: CalendarPassageContext, date: string,
  sky: SkySnapshot, published: Map<string, LiveGeneratedContent>, draft?: { key: string; body: string }) {
  const content = new Map(published);
  if (draft) content.set(draft.key, { ...content.get(draft.key), id: 'preview-only', contentKey: draft.key, body: draft.body,
    surface: 'sky', mode: 'feed', status: 'LIVE', eventType: null, targetDate: null, headline: null, summary: null,
    sections: null, model: null, updatedAt: '' });
  const values = calendarPeriodPassageValues(period, context, date, new Map([[date, sky]]), content, calendarStudioMoonSources(content));
  const selected = resolveCalendarPassage(period, date, context.timeZone, content, values,
    key => key !== draft?.key && isContentRetired(key));
  const body = selected?.body ?? renderCalendarPassage(calendarDefaultPattern(period), values);
  const event = context.days.find(day => day.dateKey === date)?.events.find(event => event.type === 'ingress' && event.planet === 'Moon');
  const transition = event ? calendarMoonTransitionReading(event, content,
    (key, id, updatedAt) => key === draft?.key || publicationAllowsContent(key, id, updatedAt)) : null;
  return { body, values, transition, sourceKey: selected?.contentKey ?? null,
    sourceLabel: selected ? selected.contentKey === calendarPassageKey(period) ? `Shared ${period} template` : 'Date-only passage' : 'Calendar source assembly' };
}

export function calendarWorkspaceTransitionKey(values: ReturnType<typeof calendarWorkspaceReading>['values']) {
  return values.moonSign?.text && values.nextMoonSign?.text ? moonSignTransitionKey(values.moonSign.text, values.nextMoonSign.text) : null;
}
