import type { LunarCalendarEvent } from "./ephemeris.js";

const slug = (value: string) => value.trim().toLowerCase().replace(/\s+/gu, "-");

function eventIdentity(event: LunarCalendarEvent) {
  if (event.type === "aspect") return null;
  const point = event.type === "lunation"
    ? /first quarter/iu.test(event.title) ? "first-quarter" : /last|third quarter/iu.test(event.title) ? "last-quarter"
      : /new moon/iu.test(event.title) ? "new-moon" : /full moon/iu.test(event.title) ? "full-moon" : ""
    : slug(event.planet ?? "");
  const variant = event.type === "station" ? event.phase ?? event.direction ?? "" : slug(event.toSign ?? event.sign ?? "");
  return point && variant ? { type: event.type, point, variant } : null;
}

export function calendarSkyEventRoute(event: LunarCalendarEvent) {
  const identity = eventIdentity(event);
  return identity ? `sky/event/${identity.type}/${identity.point}/${identity.variant}/at/${encodeURIComponent(event.startsAt)}` : null;
}

export function parseCalendarSkyEventRoute(route: string) {
  const match = /^sky\/event\/(ingress|station|lunation)\/([a-z-]+)\/([a-z-]+)\/at\/([^/]+)$/u.exec(route);
  if (!match) return null;
  let at: string;
  try { at = decodeURIComponent(match[4]); } catch { return null; }
  const date = new Date(at);
  if (!Number.isFinite(+date) || date.getUTCFullYear() < 1800 || date.getUTCFullYear() > 2399) return null;
  return { type: match[1], point: match[2], variant: match[3], date };
}

export function calendarSkyEventMatches(route: NonNullable<ReturnType<typeof parseCalendarSkyEventRoute>>, event: LunarCalendarEvent) {
  const identity = eventIdentity(event);
  // Month and week grids can refine the same second from different brackets.
  return identity?.type === route.type && identity.point === route.point && identity.variant === route.variant
    && Math.abs(Date.parse(event.startsAt) - +route.date) <= 2000;
}
