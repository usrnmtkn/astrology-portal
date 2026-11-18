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

export type CalendarDailyReviewDraft = {
  body: string;
  source: { workspaceKey: string; resultId: string; requestHash: string; outputHash: string };
};

// Only the selected passage crosses into the reader editor. Requests, references,
// provider responses and earlier results remain in the private writing workspace.
export function calendarDailyReviewDraft(row: any, context: CalendarPassageReviewContext): CalendarDailyReviewDraft {
  const workspaceKey = `studio-writing-profile/calendar/daily-draft/${context.date}/${encodeURIComponent(context.timeZone)}`;
  const results = row?.sections?.run?.results;
  const matches = Array.isArray(results) ? results.filter(result => result.id === context.writerResultId) : [];
  const result = matches[0];
  if (context.surface !== 'calendar' || !context.writerResultId
    || context.sourceKey !== `calendar-passage/daily/${context.date}/${encodeURIComponent(context.timeZone)}`
    || row?.content_key !== workspaceKey || row.status !== 'DRAFT' || row.lane !== 'reference' || row.body !== ''
    || matches.length !== 1 || result?.status !== 'needs_review' || result.response?.status !== 'completed'
    || result.facts?.date !== context.date || result.facts?.timeZone !== context.timeZone
    || typeof result.candidate !== 'string' || !result.candidate.trim()
    || !/^[a-f0-9]{64}$/u.test(result.requestHash) || !/^[a-f0-9]{64}$/u.test(result.outputHash)) {
    throw new Error('The selected writer result could not be verified for this date and time zone. Return to Daily writing and reopen its saved result.');
  }
  return { body: result.candidate, source: { workspaceKey, resultId: result.id, requestHash: result.requestHash, outputHash: result.outputHash } };
}
