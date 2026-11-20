import type { CalendarPassageReviewContext } from './calendarPassageReviewRoute';

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
    throw new Error('Saved result verification failed. Reopen it from Daily writing.');
  }
  return { body: result.candidate, source: { workspaceKey, resultId: result.id, requestHash: result.requestHash, outputHash: result.outputHash } };
}
