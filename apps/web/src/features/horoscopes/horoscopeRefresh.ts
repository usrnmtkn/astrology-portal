import { zonedDateTimeToUtc } from "../../services/timezones";
import { HOROSCOPE_SIGNS, horoscopeSignLabel, type HoroscopeWindow } from "../../content/horoscopeEditions.mjs";

function civilDate(at: string, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(at));
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find(part => part.type === type)!.value);
  return new Date(Date.UTC(value("year"), value("month") - 1, value("day")));
}

/** Destination labels follow the edition's civil week and zone, including DST. */
export function horoscopeNavigationLabel(period: string, at: string | null, timeZone: string, window?: HoroscopeWindow | null) {
  if (period === 'seasonal') {
    if (!at || !window?.seasonSign) return '';
    const direction = Date.parse(at) < Date.parse(window.startsAt) ? -1 : 1;
    return `${horoscopeSignLabel(HOROSCOPE_SIGNS[(HOROSCOPE_SIGNS.indexOf(window.seasonSign) + direction + 12) % 12])} season`;
  }
  if (!at) return '';
  const date = civilDate(at, timeZone);
  if (period === 'monthly') return date.toLocaleDateString('en-US', {month:'long', timeZone:'UTC'});
  const format = new Intl.DateTimeFormat('en-US', {month:'short', day:'numeric', timeZone:'UTC'});
  if (period !== 'weekly') return format.format(date);
  const firstDay = window ? civilDate(window.startsAt, timeZone).getUTCDay() : 1;
  date.setUTCDate(date.getUTCDate() - (date.getUTCDay() - firstDay + 7) % 7);
  const last = new Date(date); last.setUTCDate(last.getUTCDate() + 6);
  return format.formatRange(date, last);
}

/** Navigate an unpublished civil period without borrowing another reading's window. */
export function adjacentHoroscopeReference(period: string, at: string, timeZone: string, direction: -1 | 1) {
  if (!["daily", "weekly", "monthly"].includes(period)) return null;
  const date = civilDate(at, timeZone);
  if (period === 'monthly') date.setUTCDate(1);
  if (period === "monthly") date.setUTCMonth(date.getUTCMonth() + direction);
  else date.setUTCDate(date.getUTCDate() + direction * (period === "weekly" ? 7 : 1));
  return zonedDateTimeToUtc(date.toISOString().slice(0, 10), "12:00 PM", timeZone).toISOString();
}

/** Find the next civil-date boundary, including DST and zones that skip midnight. */
export function nextHoroscopeRefresh(timeZone: string, endsAt?: string, now = Date.now()) {
  const format = new Intl.DateTimeFormat('en-CA', {timeZone, year:'numeric', month:'2-digit', day:'2-digit'});
  const today = format.format(now);
  let before = now, after = now + 36 * 60 * 60 * 1000;
  while (after - before > 1) {
    const middle = Math.floor((before + after) / 2);
    if (format.format(middle) === today) before = middle;
    else after = middle;
  }
  const editionEnd = Date.parse(endsAt ?? '');
  // A stale edition must not trigger an immediate, repeating fetch loop.
  return editionEnd > now ? Math.min(after, editionEnd) : after;
}
