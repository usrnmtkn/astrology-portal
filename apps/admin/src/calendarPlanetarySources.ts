import type { AdminDraft } from "./GeneratedContentAdminDashboard";
import { natalPlacementSigns } from "./natalPlacementSources.js";

export const calendarPlanets = ["mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto", "chiron", "lilith"] as const;
export const calendarPlanetarySigns = natalPlacementSigns;
export type CalendarPlanetaryKind = "ingress" | "station";
export type CalendarPlanetarySelection = { planet: string; sign: string; direction: "direct" | "retrograde" };
export type CalendarPlanetaryIdentity = { kind: CalendarPlanetaryKind; planet: string; sign?: string; direction?: "direct" | "retrograde"; date?: string; period?: boolean };
export const planetaryName = (value: string) => value[0]?.toUpperCase() + value.slice(1);

export function calendarPlanetaryTitle(identity: CalendarPlanetaryIdentity) {
  const planet = planetaryName(identity.planet);
  const sign = identity.sign ? planetaryName(identity.sign) : "";
  return identity.kind === "ingress" ? `${planet} enters ${sign || "a sign"}`
    : `${planet}${identity.period ? " retrograde" : ` stations ${identity.direction}`}${sign ? ` in ${sign}` : ""}`;
}

/** Browsing includes reusable station cards and whole-retrograde passages.
 * Keep this separate from exact event identity, which also controls wiring status. */
export function calendarPlanetaryListIdentity(key: string): CalendarPlanetaryIdentity | null {
  const exact = calendarPlanetaryIdentity(key);
  if (exact) return exact;
  let match = /^authored\/station\/([a-z]+)\/(rx|direct)$/.exec(key);
  if (match && validPlanet(match[1])) return { kind: "station", planet: match[1], direction: match[2] === "rx" ? "retrograde" : "direct" };
  match = /^sky\.retrograde\.([a-z]+)\.([a-z]+)\.retrograde_passage$/.exec(key)
    ?? /^fallback-hook\/sky\.retrograde\/([a-z]+)\/([a-z]+)\/retrograde-passage$/.exec(key);
  if (match && validPlanet(match[1]) && validSign(match[2])) return { kind: "station", planet: match[1], sign: match[2], direction: "retrograde", period: true };
  match = /^(?:sky\.retrograde\.|sky-retrograde-|ms\/retrograde\/|fallback-hook\/sky\.retrograde\/)([a-z]+)$/.exec(key);
  return match && validPlanet(match[1]) ? { kind: "station", planet: match[1], direction: "retrograde", period: true } : null;
}

/** Only event identities the Calendar actually reads belong in these lists. */
export function calendarPlanetaryIdentity(key: string): CalendarPlanetaryIdentity | null {
  let match = /^sky\.ingress\.([a-z]+)\.([a-z]+)(?:\.(\d{4}-\d{2}-\d{2}))?$/.exec(key)
    ?? /^sky-ingress-([a-z]+)-([a-z]+)(?:-(\d{4}-\d{2}-\d{2}))?$/.exec(key)
    ?? /^sky-([a-z]+)-(?:enters|in)-([a-z]+)$/.exec(key);
  if (match && validPlanet(match[1]) && validSign(match[2])) {
    return { kind: "ingress", planet: match[1], sign: match[2], ...(match[3] ? { date: match[3] } : {}) };
  }
  match = /^sky\.station\.([a-z]+)\.([a-z]+)\.(direct|retrograde)$/.exec(key)
    ?? /^sky\.retrograde\.([a-z]+)\.([a-z]+)\.station_(direct|retrograde)$/.exec(key)
    ?? /^fallback-hook\/sky\.retrograde\/([a-z]+)\/([a-z]+)\/station-(direct|retrograde)$/.exec(key);
  if (match && validPlanet(match[1]) && validSign(match[2])) {
    return { kind: "station", planet: match[1], sign: match[2], direction: match[3] as CalendarPlanetarySelection["direction"] };
  }
  match = /^(?:ms\/ingress\/|fallback-hook\/sky\.ingress[./])([a-z]+)$/.exec(key);
  if (match && validPlanet(match[1])) return { kind: "ingress", planet: match[1] };
  match = /^fallback-hook\/sky\.station\/([a-z]+)\/(direct|retrograde)$/.exec(key);
  if (match && validPlanet(match[1])) return { kind: "station", planet: match[1], direction: match[2] as CalendarPlanetarySelection["direction"] };
  return null;
}

const validPlanet = (value: string) => (calendarPlanets as readonly string[]).includes(value);
const validSign = (value: string) => (calendarPlanetarySigns as readonly string[]).includes(value);

export function calendarPlanetaryIdentityKeys(kind: CalendarPlanetaryKind, { planet, sign, direction }: CalendarPlanetarySelection) {
  if (!validPlanet(planet) || !validSign(sign) || !["direct", "retrograde"].includes(direction)) return [];
  return kind === "ingress" ? [
    `sky.ingress.${planet}.${sign}`, `sky-ingress-${planet}-${sign}`,
    `sky-${planet}-enters-${sign}`, `sky-${planet}-in-${sign}`
  ] : [
    `sky.station.${planet}.${sign}.${direction}`,
    `sky.retrograde.${planet}.${sign}.station_${direction}`,
    `fallback-hook/sky.retrograde/${planet}/${sign}/station-${direction}`
  ];
}

export function calendarPlanetaryDraft(kind: CalendarPlanetaryKind, selection: CalendarPlanetarySelection): AdminDraft | null {
  const contentKey = calendarPlanetaryIdentityKeys(kind, selection)[0];
  if (!contentKey) return null;
  const facts = { planet: planetaryName(selection.planet), sign: planetaryName(selection.sign),
    ...(kind === "station" ? { direction: selection.direction, phase: `station-${selection.direction}` } : {}) };
  return {
    id: null, contentKey, surface: "sky", mode: "feed", status: "DRAFT",
    headline: calendarPlanetaryTitle({ kind, ...selection }), summary: "", body: "",
    lane: "serving", reviewState: "EDITORIAL_REVIEW_REQUIRED", blockType: "calendar_event",
    promptVersion: "manual-admin", sections: { slots: facts }, facts, reviewerNotes: "",
    sourceSnapshot: { contentType: "owner-authored-calendar-event", content_role: "authored_card",
      review_status: "needs_review", authoringSource: "admin-dashboard-calendar-planetary", canonicalKey: contentKey }
  };
}
