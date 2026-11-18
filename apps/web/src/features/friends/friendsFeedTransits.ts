import { personalDayBounds, personalDateKey, shiftPersonalDateKey } from "../../services/personalDailyTransits";

/** Keep the leading ranked influence as well as every distinct exact event. */
export function selectFriendsFeedTransits<T extends { dailyPeak?: { exactToday: string[] } }>(transits: T[], limit = 4) {
  const selected = new Set(transits.filter(transit => transit.dailyPeak?.exactToday.length));
  if (transits[0]) selected.add(transits[0]);
  for (const transit of transits) {
    if (selected.size >= limit) break;
    selected.add(transit);
  }
  return transits.filter(transit => selected.has(transit));
}

export function groupFriendsFeedCards<T extends { id: string; startsAt: string; exactAt: string[]; priorityIndex?: number }>(cards: T[], now: string, timeZone: string) {
  const today = personalDateKey(now, timeZone);
  const yesterday = shiftPersonalDateKey(today, -1);
  const eventAt = (card: T) => friendsFeedExactToday(card.exactAt, now, timeZone)[0] ?? card.startsAt;
  const grouped = new Map<string, T[]>();
  const ordered = [...cards].sort((a, b) => personalDateKey(eventAt(b), timeZone).localeCompare(personalDateKey(eventAt(a), timeZone))
    || (a.priorityIndex ?? 0) - (b.priorityIndex ?? 0));
  for (const card of ordered) {
    const at = eventAt(card), key = personalDateKey(at, timeZone);
    const label = key === today ? "Today" : key === yesterday ? "Yesterday"
      : new Date(at).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone });
    grouped.set(label, [...(grouped.get(label) ?? []), card]);
  }
  return [...grouped];
}

export function friendsFeedExactToday(exactAt: string[], now: string, timeZone: string) {
  const { start, end } = personalDayBounds(now, timeZone);
  return exactAt.filter(at => Date.parse(at) >= +start && Date.parse(at) < +end).sort();
}

