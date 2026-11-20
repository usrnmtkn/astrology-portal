import { parseStudioPassageEdit, type StudioPassageEdit } from '../../../src/shared/studioPassageEdit';

export type CalendarPassageReviewContext = StudioPassageEdit & { writerResultId?: string };

export function parseCalendarPassageReview(hash: string): CalendarPassageReviewContext | null {
  const context = parseStudioPassageEdit(hash);
  const writerResultId = new URLSearchParams(hash.split('?')[1] ?? '').get('writerResult');
  if (!context || !writerResultId) return context;
  if (context.surface !== 'calendar' || context.sourceKey !== `calendar-passage/daily/${context.date}/${encodeURIComponent(context.timeZone)}`
    || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/iu.test(writerResultId)) return null;
  return { ...context, writerResultId };
}

// Dated passages carry their own context. Shared sources have no single reader date.
export function calendarPassageReviewParams(sourceKey: string, writerResultId?: string): URLSearchParams | null {
  const match = /^calendar-passage\/daily\/([^/]+)\/([^/]+)$/u.exec(sourceKey);
  if (!match) return null;
  try {
    const params = new URLSearchParams({ view: 'daily-sky', date: match[1],
      timeZone: decodeURIComponent(match[2]), editSource: sourceKey });
    if (writerResultId) params.set('writerResult', writerResultId);
    return parseCalendarPassageReview(`#calendar-writeups?${params}`) ? params : null;
  } catch { return null; }
}
