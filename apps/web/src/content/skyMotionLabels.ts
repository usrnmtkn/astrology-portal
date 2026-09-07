import type { LunarCalendarEvent } from "../services/ephemeris";

export type BodyMotion = "direct" | "retrograde";

// Display facts only: missing motion stays unknown and never changes a content key.
export function skyBodyLabel(body: string, motion?: BodyMotion | null) {
  return motion === "retrograde" ? `${body} Rx` : body;
}

export const skyAspectVerbs: Readonly<Record<string, string>> = {
  conjunction: "conjoins", opposition: "opposes", square: "squares",
  trine: "trines", sextile: "sextiles"
};

export function calendarMotionTitle(event: LunarCalendarEvent) {
  if (event.type !== "aspect" || !event.planets || !event.aspect) return event.title;
  return `${skyBodyLabel(event.planets[0], event.fromMotion)} ${skyAspectVerbs[event.aspect.toLowerCase()] ?? event.aspect} ${skyBodyLabel(event.planets[1], event.toMotion)}`;
}
