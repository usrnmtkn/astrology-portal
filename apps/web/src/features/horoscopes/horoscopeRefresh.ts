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
