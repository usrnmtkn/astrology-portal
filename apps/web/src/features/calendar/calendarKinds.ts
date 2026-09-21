import type { LunarCalendarEvent } from "../../services/ephemeris";
import { isHandoffKeyEvent } from "./calendarHandoff";

export type CalendarEventKind =
  | "lunation"
  | "eclipse"
  | "moon"
  | "ingress"
  | "station"
  | "aspect"
  | "key"
  | "season"
  | "void"
  | "lunar-return"
  | "affirmation"
  | "note";

export function calendarKindLabel(kind: CalendarEventKind, event?: LunarCalendarEvent) {
  if (kind === "lunation") {
    const title = event?.title ?? "";
    if (/new moon/i.test(title)) return "Lunation";
    if (/full moon/i.test(title)) return "Lunation";
    return "Lunation";
  }
  if (kind === "eclipse") return "Eclipse";
  if (kind === "moon") return "Moon";
  if (kind === "ingress") return event?.planet === "Sun" ? "Season begins" : "Transit";
  if (kind === "station") return "Station";
  if (kind === "aspect") {
    const aspect = event?.aspect?.toLowerCase() ?? "";
    if (aspect === "square" || aspect === "opposition") return "Hard aspect";
    if (aspect === "trine" || aspect === "sextile") return "Soft aspect";
    return "Aspect";
  }
  if (kind === "key") return "Key event";
  if (kind === "season") return "Season begins";
  if (kind === "void") return "Void of course";
  if (kind === "lunar-return") return "Lunar return";
  if (kind === "affirmation") return "Note";
  return "Note";
}

export function calendarKindFromEvent(event: LunarCalendarEvent, dateKey = event.dateKey): CalendarEventKind {
  if (event.eclipseType || /eclipse/i.test(event.title)) return "eclipse";
  if (/void of course/i.test(event.title)) return "void";
  if (isHandoffKeyEvent(event, dateKey)) return "key";
  if (event.type === "lunation") return "lunation";
  if (event.type === "station") return "station";
  if (event.type === "ingress" && event.planet === "Sun") return "season";
  if (event.type === "ingress" && event.planet === "Moon") return "moon";
  if (event.type === "ingress") return "ingress";
  if (event.type === "aspect") return "aspect";
  return "note";
}

export function calendarKindClass(kind: CalendarEventKind) {
  return `calendar-kind calendar-kind--${kind}`;
}
