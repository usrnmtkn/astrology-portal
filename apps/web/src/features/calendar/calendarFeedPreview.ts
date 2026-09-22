/// <reference lib="es2022.intl" />
/** Calendar subscriptions explicitly use excerpts; the full reader copy is untouched. */
export function calendarFeedExcerpt(body: string, sentenceCount = 3) {
  // Convert formatting to plain text for calendar clients, preserving the words.
  const plain = body.replace(/\[([^\]]+)\]\([^\n)]+\)/gu, "$1")
    .replace(/^\s{0,3}#{1,6}\s+.*$/gmu, "")
    .replace(/\*\*([^*]+)\*\*/gu, "$1").replace(/__([^_]+)__/gu, "$1")
    .replace(/\*([^*\n]+)\*/gu, "$1").replace(/`([^`]+)`/gu, "$1")
    .trim();
  if (!plain) return "";
  let count = 0;
  for (const part of new Intl.Segmenter("en", { granularity: "sentence" }).segment(plain)) {
    if (part.segment.trim() && ++count === sentenceCount) return plain.slice(0, part.index + part.segment.length).trim();
  }
  return plain;
}

export function calendarReadingUrl(origin: string, date: string, eventId: string, timeZone: string) {
  const url = new URL("/", origin);
  url.searchParams.set("date", date);
  url.hash = `calendar?${new URLSearchParams({ view: eventId.startsWith("week-") ? "weekly" : "day", date, event: eventId, timeZone })}`;
  return url.href;
}

export function calendarFeedDescription(body: string, url: string) {
  return [calendarFeedExcerpt(body), url && `Read more: ${url}`].filter(Boolean).join("\n\n");
}

export type CalendarSubscriptionReading = {
  id: string; title: string; body: string; start: string; end: string; allDay: boolean;
  url: string; sourceUrl?: string; cancelled?: boolean;
};
