import type { LunarCalendarEvent } from "../../services/ephemeris";

const SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];

export function principalLunationKind(event: LunarCalendarEvent) {
  if (event.type !== "lunation" || event.primary === false) return null;
  if (event.eclipseType === "solar" || /new moon/i.test(event.title)) return "new";
  if (event.eclipseType === "lunar" || /full moon/i.test(event.title)) return "full";
  return null;
}

export function calendarCycleLinkQuery(event: LunarCalendarEvent, link: string) {
  const at = Date.parse(event.startsAt);
  if (!Number.isFinite(at)) return null;
  const day = 86_400_000;
  if (link === "prev" && principalLunationKind(event) === "full" && event.sign) {
    // Search the same verified six-month window as the Full Moon article.
    return { kind: "new" as const, sign: event.sign, direction: "previous" as const,
      start: new Date(at - 220 * day), end: new Date(at - 120 * day) };
  }
  if (!/full moon/i.test(link)) return null;
  const sign = SIGNS.find(sign => new RegExp(`\\b${sign}\\b`, "i").test(link));
  return { kind: "full" as const, sign, direction: "next" as const,
    start: new Date(at), end: new Date(at + 40 * day) };
}

export function resolveCalendarCycleLink(event: LunarCalendarEvent, link: string, events: LunarCalendarEvent[]) {
  const query = calendarCycleLinkQuery(event, link);
  if (!query) return null;
  const at = Date.parse(event.startsAt);
  const candidates = events.filter(candidate => {
    const time = Date.parse(candidate.startsAt);
    return principalLunationKind(candidate) === query.kind
      && (!query.sign || candidate.sign?.toLowerCase() === query.sign.toLowerCase())
      && time >= query.start.getTime() && time <= query.end.getTime()
      && (query.direction === "previous" ? time < at : time > at);
  }).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  return (query.direction === "previous" ? candidates.at(-1) : candidates[0]) ?? null;
}

export function calendarLunationContextEvents(dateKey: string, events: LunarCalendarEvent[]) {
  const lunations = [...new Map(events.filter(event => principalLunationKind(event)).map(event => [event.id, event])).values()]
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  // Exact-day readings already identify their own event. On other days, keep
  // both ends of the current interval addressable, including across years.
  if (lunations.some(event => event.dateKey === dateKey)) return [];
  const previous = lunations.filter(event => event.dateKey < dateKey).at(-1);
  const next = lunations.find(event => event.dateKey > dateKey);
  return [previous && { relation: "Previous", event: previous }, next && { relation: "Next", event: next }]
    .filter((item): item is { relation: string; event: LunarCalendarEvent } => Boolean(item));
}

export function calendarLunationLinkLabel(event: LunarCalendarEvent, timeZone: string) {
  const date = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone })
    .format(new Date(event.startsAt));
  return `${event.title} · ${date}`;
}
