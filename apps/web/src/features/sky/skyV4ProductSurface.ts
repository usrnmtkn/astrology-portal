import type { LunarCalendarEvent } from "../../services/ephemeris";
import type { PlanetPosition, SkySnapshot } from "../../types";

function normalized(value: unknown) {
  return String(value ?? "").trim().toLowerCase().replace(/\s+/gu, "-");
}

function sameUtcDay(first: string | null | undefined, second: string | null | undefined) {
  if (!first || !second) return false;
  return first.slice(0, 10) === second.slice(0, 10);
}

function calendarDayAtZone(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric"
  }).format(new Date(value));
}

export function skyV4Hemisphere(latitude: number | null | undefined) {
  if (typeof latitude !== "number" || !Number.isFinite(latitude) || latitude === 0) return "neutral";
  return latitude > 0 ? "northern" : "southern";
}

export function skyV4StationSupported(position: PlanetPosition, generatedAt: string, timeZone = "UTC") {
  return (position.residencyStations ?? []).some((station) => (
    calendarDayAtZone(station.occursAt, timeZone) === calendarDayAtZone(generatedAt, timeZone)
  ));
}

export function skyV4NodeAxis(positions: PlanetPosition[]) {
  const north = positions.find((position) => normalized(position.planet) === "north-node");
  const south = positions.find((position) => normalized(position.planet) === "south-node");
  return {
    northSign: north?.sign ?? null,
    southSign: south?.sign ?? null
  };
}

function eclipseContext(moonEvent: SkySnapshot["moonEvent"] | null | undefined, generatedAt: string) {
  if (!moonEvent?.eclipseType || !sameUtcDay(moonEvent.occursAt, generatedAt)) return [];
  return [{
    contextKind: "eclipse",
    contextBodyOrEvent: moonEvent.eclipseType === "solar" ? "Solar Eclipse" : "Lunar Eclipse",
    contextSign: moonEvent.sign,
    contextCondition: "eclipse"
  }];
}

export function skyV4PlacementContexts({
  position,
  positions,
  moonEvent,
  generatedAt
}: {
  position: PlanetPosition;
  positions: PlanetPosition[];
  moonEvent?: SkySnapshot["moonEvent"] | null;
  generatedAt: string;
}) {
  const subjectCondition = normalized(position.motion) === "retrograde" ? "retrograde" : "direct";
  const base = {
    subjectFamily: "continuous",
    subjectBody: position.planet,
    subjectSign: position.sign,
    subjectCondition
  };
  const motion = positions
    .filter((candidate) => candidate.planet !== position.planet)
    .map((candidate) => ({
      ...base,
      contextKind: "co-present-motion",
      contextBodyOrEvent: candidate.planet,
      contextSign: candidate.sign,
      contextCondition: normalized(candidate.motion) === "retrograde" ? "retrograde" : "direct"
    }));
  const ingresses = positions
    .filter((candidate) => candidate.planet !== position.planet && sameUtcDay(candidate.transitStart, generatedAt))
    .map((candidate) => ({
      ...base,
      contextKind: "ingress",
      contextBodyOrEvent: candidate.planet,
      contextSign: candidate.sign,
      contextCondition: "ingress"
    }));
  return [
    ...motion,
    ...eclipseContext(moonEvent, generatedAt).map((context) => ({ ...base, ...context })),
    ...ingresses
  ];
}

export function skyV4LunationContexts(event: LunarCalendarEvent, positions: PlanetPosition[]) {
  const subjectBody = event.eclipseType
    ? `${event.eclipseType === "solar" ? "Solar" : "Lunar"} Eclipse`
    : /new moon/iu.test(event.title)
      ? "New Moon"
      : "Full Moon";
  const subjectCondition = event.eclipseType ? "eclipse" : "lunation";
  return positions.map((position) => ({
    subjectFamily: event.eclipseType ? "eclipse" : "lunation",
    subjectBody,
    subjectSign: event.sign ?? "",
    subjectCondition,
    contextKind: "co-present-body",
    contextBodyOrEvent: position.planet,
    contextSign: position.sign,
    contextCondition: normalized(position.motion) === "retrograde" ? "retrograde" : "direct"
  }));
}

export function skyV4LunationRoute(event: LunarCalendarEvent, positions: PlanetPosition[]) {
  const sign = event.sign ?? "";
  const axis = skyV4NodeAxis(positions);
  const nodeRelation = sign && sign === axis.northSign
    ? "north-node"
    : sign && sign === axis.southSign
      ? "south-node"
      : "";
  if (event.eclipseType) {
    const eclipseType = `${event.eclipseType}-eclipse`;
    return {
      route: "eclipse",
      exactEventKey: `sky-lunation/${eclipseType}/${event.dateKey}-${normalized(sign)}`,
      eclipseType,
      eclipseSign: sign,
      nodeRelation
    };
  }
  return {
    route: /new moon/iu.test(event.title) ? "new-moon" : "full-moon",
    sign
  };
}
