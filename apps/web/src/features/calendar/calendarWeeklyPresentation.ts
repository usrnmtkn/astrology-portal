import type { LunarCalendarDay } from '../../services/ephemeris';

/** Move a complete dated weekly passage into the existing day cards without rewriting its prose.
 * Custom overview formats stay intact when their day boundaries are not unambiguous.
 */
export function calendarWeeklyDayParagraphs(
  body: string | undefined,
  days: Pick<LunarCalendarDay, 'dateKey' | 'date'>[],
  timeZone: string
): Map<string, string[]> | null {
  if (!body || days.length !== 7) return null;
  const formatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'full', timeZone });
  const labels = days.map(day => formatter.format(new Date(day.date)));
  const paragraphs = body.split(/\n\s*\n/u).filter(Boolean);
  const groups = new Map<string, string[]>();
  let index = -1;
  for (const paragraph of paragraphs) {
    const heading = labels.indexOf(paragraph.trim());
    if (heading >= 0) {
      if (heading !== index + 1 || (index >= 0 && !groups.get(days[index].dateKey)?.length)) return null;
      index = heading;
      groups.set(days[index].dateKey, []);
    } else {
      if (index < 0) return null;
      groups.get(days[index].dateKey)!.push(paragraph);
    }
  }
  return index === days.length - 1 && groups.get(days[index].dateKey)!.length ? groups : null;
}
