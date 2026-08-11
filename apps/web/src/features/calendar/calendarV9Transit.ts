import type { LunarCalendarEvent } from "../../services/ephemeris";

export type CalendarV9TransitFacts = {
  planet: string;
  transitSign: string;
  eventType: "direct" | "ingress" | "retrograde" | "station";
};

export type CalendarV9TransitResult = {
  body: string;
  contentKey: string;
  governance: "owner-approved";
  sourceVersion: string;
  sourceRow: number;
};

export type CalendarV9TransitResolver = {
  renderTransitMeaning(facts: CalendarV9TransitFacts): CalendarV9TransitResult | null;
};

function matrixPlanetName(planet: string) {
  const normalized = planet.trim().toLowerCase();

  if (normalized === "lilith" || normalized === "black moon lilith") {
    return "Black Moon Lilith";
  }

  if (normalized === "north node" || normalized === "south node" || normalized === "lunar nodes") {
    return "Lunar Nodes";
  }

  return planet;
}

export function calendarV9TransitFacts(event: LunarCalendarEvent): CalendarV9TransitFacts | null {
  if (!event.planet) {
    return null;
  }

  const transitSign = event.toSign ?? event.sign;

  if (!transitSign) {
    return null;
  }

  if (event.type === "ingress") {
    return {
      planet: matrixPlanetName(event.planet),
      transitSign,
      eventType: "ingress"
    };
  }

  if (event.type !== "station") {
    return null;
  }

  const eventType = event.phase === "retrograde-passage"
    ? "retrograde"
    : event.direction === "direct" || event.phase === "station-direct"
      ? "direct"
      : "station";

  return {
    planet: matrixPlanetName(event.planet),
    transitSign,
    eventType
  };
}

export function resolveCalendarV9Transit(
  event: LunarCalendarEvent,
  resolver: CalendarV9TransitResolver | null | undefined
) {
  const facts = calendarV9TransitFacts(event);

  return facts && resolver ? resolver.renderTransitMeaning(facts) : null;
}
