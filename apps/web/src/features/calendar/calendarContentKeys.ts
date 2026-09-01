import type { LunarCalendarEvent } from "../../services/ephemeris";
import {
  skyIngressContentKey,
  skyIngressInstanceContentKey,
  slugContentPart
} from "../../services/generatedContentKeys";
import { skyAspectGeneratedContentKeys } from "../../services/skyAspectContent";

export function calendarEventGeneratedContentKeys(event: LunarCalendarEvent) {
  const dateKey = event.dateKey || event.startsAt.slice(0, 10);

  if (
    event.type === "aspect"
    && event.planets
    && event.aspect
    && event.fromSign
    && event.toSign
  ) {
    const [first, second] = event.planets;

    return skyAspectGeneratedContentKeys({
      first,
      second,
      aspect: event.aspect,
      firstSign: event.fromSign,
      secondSign: event.toSign,
      targetDate: dateKey
    });
  }

  if (event.type === "ingress" && event.planet && (event.toSign || event.sign)) {
    const sign = event.toSign ?? event.sign ?? "";
    const planetPart = slugContentPart(event.planet);
    const signPart = slugContentPart(sign);
    const ingressKeys = [
      skyIngressInstanceContentKey(event.planet, sign, { targetDate: dateKey }),
      skyIngressContentKey(event.planet, sign),
      `sky-ingress-${planetPart}-${signPart}-${dateKey}`,
      `sky-ingress-${planetPart}-${signPart}`,
      `sky-${planetPart}-enters-${signPart}`,
      `sky-${planetPart}-in-${signPart}`,
      `ms/ingress/${planetPart}`,
      `fallback-hook/sky.ingress.${planetPart}`,
      `fallback-hook/sky.ingress/${planetPart}`
    ];

    return event.planet === "Sun"
      ? [...ingressKeys, `sky-season-${signPart}-${dateKey}`]
      : ingressKeys;
  }

  if (event.type === "station" && event.planet) {
    const planetPart = slugContentPart(event.planet);
    const motion = event.direction ?? (event.title.toLowerCase().includes("direct") ? "direct" : "retrograde");
    const signPart = event.sign ? slugContentPart(event.sign) : "";
    const phasePart = event.phase ? event.phase.replace(/-/g, "_") : "";
    const exactRetrogradeKeys = event.sign && event.phase === "retrograde-passage"
      ? [
          `sky.retrograde.${planetPart}.${signPart}.${phasePart}`,
          `fallback-hook/sky.retrograde/${planetPart}/${signPart}/${event.phase}`,
          `sky-retrograde-${planetPart}`,
          `ms/retrograde/${planetPart}`,
          `fallback-hook/sky.retrograde/${planetPart}`
        ]
      : [];
    const exactStationKeys = event.sign && event.phase && event.phase !== "retrograde-passage"
      ? [
          `sky.station.${planetPart}.${signPart}.${motion}`,
          `sky.retrograde.${planetPart}.${signPart}.${phasePart}`,
          `fallback-hook/sky.retrograde/${planetPart}/${signPart}/${event.phase}`,
          `fallback-hook/sky.station/${planetPart}/${motion}`
        ]
      : [];

    return [
      ...exactRetrogradeKeys,
      ...exactStationKeys
    ];
  }

  return [];
}

export function calendarTransitDetailContentKeys(event: LunarCalendarEvent) {
  return Array.from(new Set(calendarEventGeneratedContentKeys(event)));
}

export function calendarSkyV4LunationContentKey(event: LunarCalendarEvent) {
  if (event.type !== "lunation" || !event.sign) return null;
  const sign = slugContentPart(event.sign);
  if (event.eclipseType) {
    return `sky-lunation/${event.eclipseType}-eclipse/${event.dateKey}-${sign}`;
  }
  return `sky-lunation/${/new moon/iu.test(event.title) ? "new-moon" : "full-moon"}/${sign}`;
}
