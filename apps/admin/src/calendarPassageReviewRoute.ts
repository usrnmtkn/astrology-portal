import { parseStudioPassageEdit } from '../../../src/shared/studioPassageEdit';

// Dated passages carry their own context. Shared sources have no single reader date.
export function calendarPassageReviewParams(sourceKey: string): URLSearchParams | null {
  const match = /^calendar-passage\/daily\/([^/]+)\/([^/]+)$/u.exec(sourceKey);
  if (!match) return null;
  try {
    const params = new URLSearchParams({ view: 'daily-sky', date: match[1],
      timeZone: decodeURIComponent(match[2]), editSource: sourceKey });
    return parseStudioPassageEdit(`#calendar-writeups?${params}`) ? params : null;
  } catch { return null; }
}
