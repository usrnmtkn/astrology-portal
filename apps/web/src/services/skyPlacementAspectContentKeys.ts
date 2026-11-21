import type { SkyPlacementAspectEvent } from "../types";
import { calendarLocalDateKey } from "../features/calendar/calendarPhaseLabel";
import { calendarAspectPublicationKeys, skyAspectGeneratedContentKeys } from "./skyAspectContent";

export function placementAspectIdentity(event: SkyPlacementAspectEvent, timeZone: string) {
  return { first: event.planet, second: event.otherPlanet, aspect: event.aspect,
    firstSign: event.fromSign ?? "", secondSign: event.toSign ?? "",
    firstMotion: event.fromMotion, secondMotion: event.toMotion,
    targetDate: calendarLocalDateKey(event.occursAt, timeZone) };
}

export function skyAspectReadingContentKeys(identity: Parameters<typeof skyAspectGeneratedContentKeys>[0]) {
  return [...calendarAspectPublicationKeys(identity), ...skyAspectGeneratedContentKeys(identity)];
}

export function skyPlacementInSignAspectContentKeys(events: SkyPlacementAspectEvent[], timeZone = "UTC") {
  return [...new Set(events.flatMap(event => skyAspectReadingContentKeys(placementAspectIdentity(event, timeZone))))];
}
