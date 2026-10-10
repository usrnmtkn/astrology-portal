import { calendarTemplateSegments, type CalendarOverviewValue } from './calendarOverviewResolve.js';
import type { LiveGeneratedContent } from '../../../../apps/web/src/services/generatedContent';
import { isContentRetired } from '../../../../apps/web/src/content/contentPublicationState.js';

export * from '../../../calendar-writing/passageContract.js';
import { calendarPassageKey, calendarPassageIdentity, calendarPassageErrors, type CalendarPassagePeriod } from '../../../calendar-writing/passageContract.js';
export function renderCalendarPassage(body: string, values: Record<string, CalendarOverviewValue>) {
  if (calendarPassageErrors(body).length) return null;
  // Absent conditional facts are valid; unresolved required slots are not silently erased.
  const rendered = calendarTemplateSegments(body, values).map(segment => segment.text).join('').trim();
  if (/\{\{|\}\}/u.test(rendered)) return null;
  return rendered || null;
}
export function resolveCalendarPassage(period: CalendarPassagePeriod, date: string, timeZone: string,
  content: ReadonlyMap<string, LiveGeneratedContent> | undefined, values: Record<string, CalendarOverviewValue>) {
  for (const key of [calendarPassageKey(period, date, timeZone), calendarPassageKey(period)]) {
    if (isContentRetired(key)) continue; // Returning a dated edition to the shared template is explicit retirement.
    const row = content?.get(key);
    if (!row || row.status !== 'LIVE') continue;
    const body = renderCalendarPassage(row.body || '', values);
    if (body) return { contentKey: key, body, paragraphs: body.split(/\n\s*\n/u).filter(Boolean) };
  }
  return null;
}
export function calendarPassageRecord(key: string, body: string) {
  if (!calendarPassageIdentity(key)) throw new Error('Invalid Calendar passage identity.');
  return { contentKey: key, content_role: 'full_copy', headline: 'Calendar assembled passage', body, body_you: body,
    review_status: 'needs_review', source_package: 'calendar-passage-v1', surface: 'sky',
    render_policy: 'calendar-passage-v1', source_keys: [key] };
}
