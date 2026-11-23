export function calendarReadingUrl(origin: string, date: string, eventId: string, timeZone: string) {
  const url = new URL("/", origin);
  url.searchParams.set("date", date);
  url.hash = `calendar?${new URLSearchParams({ view: eventId.startsWith("week-") ? "weekly" : "day", date, event: eventId, timeZone })}`;
  return url.href;
}

export function calendarFeedDescription(body: string, url: string) {
  return [body, url && `Read more: ${url}`].filter(Boolean).join("\n\n");
}

export type CalendarSubscriptionReading = {
  id: string; title: string; body: string; start: string; end: string; allDay: boolean;
  url: string; sourceUrl?: string; cancelled?: boolean;
};
