import { skyBodyOrderIndex } from "../../astrologyConfig";
import { fallbackHookByKey } from "../../content/fallbackHooks";
import { lunarBeatArchetypeForKey, lunarBeatArchetypeLoreForKey, lunarBeatBodyForKey } from "../../content/lunarBeatCopy";
import type { LunarCalendarDay, LunarCalendarEvent } from "../../services/ephemeris";
import { renderGeneratedContentTemplate, type LiveGeneratedContent } from "../../services/generatedContent";
import { slugContentPart } from "../../services/generatedContentKeys";
import { interpolateTemplateString, type TemplateSlotValues } from "../../services/templateInterpolation";
import type { LocationInput } from "../../types";
import type { LunarDay, LunarDayArcPoint, LunarDayCheckpointRole, LunarDayTransit, LunarDayTransitType } from "./lunarDayTypes";

const dayMs = 86_400_000;

const seasonStartDates: Array<{ sign: string; month: number; day: number }> = [
  { sign: "Capricorn", month: 1, day: 1 },
  { sign: "Aquarius", month: 1, day: 20 },
  { sign: "Pisces", month: 2, day: 19 },
  { sign: "Aries", month: 3, day: 20 },
  { sign: "Taurus", month: 4, day: 20 },
  { sign: "Gemini", month: 5, day: 21 },
  { sign: "Cancer", month: 6, day: 21 },
  { sign: "Leo", month: 7, day: 22 },
  { sign: "Virgo", month: 8, day: 23 },
  { sign: "Libra", month: 9, day: 23 },
  { sign: "Scorpio", month: 10, day: 23 },
  { sign: "Sagittarius", month: 11, day: 22 },
  { sign: "Capricorn", month: 12, day: 21 }
];

export type ResolveLunarDayOptions = {
  day: LunarCalendarDay;
  events: LunarCalendarEvent[];
  location: LocationInput;
  timeZone: string;
  arcEnabled: boolean;
  generatedContent?: Map<string, LiveGeneratedContent>;
};

function dayKeyToUtcTime(dateKey: string) {
  const [year = 0, month = 1, day = 1] = dateKey.split("-").map(Number);

  return Date.UTC(year, month - 1, day);
}

function localDateParts(day: LunarCalendarDay, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric"
  }).formatToParts(new Date(day.date));

  return {
    year: Number(parts.find((part) => part.type === "year")?.value ?? new Date(day.date).getFullYear()),
    month: Number(parts.find((part) => part.type === "month")?.value ?? 1),
    day: Number(parts.find((part) => part.type === "day")?.value ?? 1)
  };
}

function localDateKeyFromParts(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function seasonWindowForDay(day: LunarCalendarDay, timeZone: string) {
  const parts = localDateParts(day, timeZone);
  const monthDayValue = parts.month * 100 + parts.day;
  let seasonIndex = -1;

  for (let index = seasonStartDates.length - 1; index >= 0; index -= 1) {
    const season = seasonStartDates[index];

    if (season && monthDayValue >= season.month * 100 + season.day) {
      seasonIndex = index;
      break;
    }
  }

  if (seasonIndex < 0) {
    seasonIndex = seasonStartDates.length - 1;
  }

  const season = seasonStartDates[seasonIndex] ?? seasonStartDates[0];
  const nextSeason = seasonStartDates[(seasonIndex + 1) % seasonStartDates.length] ?? seasonStartDates[1];
  const startsPreviousYear = season.month === 12 && parts.month === 1;
  const startYear = startsPreviousYear ? parts.year - 1 : parts.year;
  const endYear = nextSeason.month < season.month || (season.month === 12 && nextSeason.month === 1)
    ? startYear + 1
    : startYear;

  return {
    sign: season.sign,
    start: localDateKeyFromParts(startYear, season.month, season.day),
    end: localDateKeyFromParts(endYear, nextSeason.month, nextSeason.day)
  };
}

function lunarDayNumberFor(day: LunarCalendarDay, events: LunarCalendarEvent[]) {
  const selectedTime = new Date(day.date).getTime();
  const previousNewMoon = events
    .filter((event) => event.type === "lunation" && event.title.startsWith("New Moon") && new Date(event.startsAt).getTime() <= selectedTime + dayMs)
    .sort((first, second) => new Date(second.startsAt).getTime() - new Date(first.startsAt).getTime())[0];

  if (!previousNewMoon) {
    return Math.max(1, Math.round((day.illumination / 100) * 15));
  }

  return Math.max(1, Math.min(30, Math.floor((selectedTime - new Date(previousNewMoon.startsAt).getTime()) / dayMs) + 1));
}

function durationMinutes(start?: string, end?: string) {
  if (!start || !end) return null;

  return Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60_000));
}

function eventTransitType(event: LunarCalendarEvent): LunarDayTransitType {
  if (event.eclipseType || event.title.toLowerCase().includes("eclipse")) return "eclipse";
  if (event.type === "station" && event.title.toLowerCase().includes("retrograde") && !event.title.toLowerCase().includes("stations")) {
    return "retrograde";
  }

  return event.type === "lunation" ? "eclipse" : event.type;
}

function symbolKeyForEvent(event: LunarCalendarEvent) {
  if (event.type === "ingress" && event.planet && (event.toSign || event.sign)) {
    return `ingress.${slugContentPart(event.planet)}.${slugContentPart(event.toSign ?? event.sign ?? "")}`;
  }

  if (event.type === "aspect" && event.planets && event.aspect) {
    return `aspect.${slugContentPart(event.planets[0])}.${slugContentPart(event.aspect)}.${slugContentPart(event.planets[1])}`;
  }

  if (event.type === "station" && event.planet) {
    const motion = event.title.toLowerCase().includes("direct") ? "direct" : "retrograde";

    return `station.${slugContentPart(event.planet)}.${motion}`;
  }

  return slugContentPart(event.title);
}

function bodiesForEvent(event: LunarCalendarEvent) {
  if (event.planets) return event.planets;
  if (event.planet) return [event.planet];

  return [];
}

function relationForEvent(event: LunarCalendarEvent): LunarDayTransit["relation"] {
  const type = eventTransitType(event);

  if (type === "retrograde") return "retrograde";
  if (type === "eclipse") return "eclipse";
  if (event.type === "ingress") return "ingress";
  if (event.type === "aspect") return "aspect";

  return undefined;
}

function isDayModifier(event: LunarCalendarEvent) {
  if (event.type === "lunation") return Boolean(event.eclipseType) || event.title.toLowerCase().includes("eclipse");
  if (event.type === "aspect") return event.primary && !event.planets?.includes("Moon");
  if (event.type === "ingress" || event.type === "station") return event.primary || event.title.toLowerCase().includes("retrograde");

  return false;
}

function normalizeTransits(events: LunarCalendarEvent[]) {
  return events
    .filter(isDayModifier)
    .sort((first, second) => new Date(first.startsAt).getTime() - new Date(second.startsAt).getTime())
    .map((event): LunarDayTransit => ({
      type: eventTransitType(event),
      title: event.title,
      bodies: bodiesForEvent(event),
      symbolKey: symbolKeyForEvent(event),
      exactAt: event.startsAt,
      activeRange: event.endsAt ? { start: event.startsAt, end: event.endsAt } : undefined,
      relation: relationForEvent(event),
      sourceEvent: event
    }));
}

function recentIngressModifiers(events: LunarCalendarEvent[], selectedTime: number) {
  const recentStart = selectedTime - (7 * dayMs);
  const selectedEnd = selectedTime + dayMs;

  return events
    .filter((event) => {
      const eventTime = new Date(event.startsAt).getTime();

      return event.type === "ingress"
        && event.primary
        && eventTime >= recentStart
        && eventTime < selectedEnd;
    })
    .sort((first, second) => new Date(first.startsAt).getTime() - new Date(second.startsAt).getTime());
}

function dayModifiers(day: LunarCalendarDay, events: LunarCalendarEvent[], selectedTime: number) {
  const byId = new Map<string, LunarCalendarEvent>();

  for (const event of [...recentIngressModifiers(events, selectedTime), ...day.events]) {
    byId.set(event.id, event);
  }

  return normalizeTransits([...byId.values()]);
}

function checkpointRoleForPhase(phase: string): LunarDayCheckpointRole {
  if (phase === "New Moon") return "origin";
  if (phase === "First Quarter") return "waxingCheckpoint";
  if (phase === "Full Moon") return "culmination";
  if (phase === "Last Quarter") return "releaseCheckpoint";

  return phase.startsWith("Waning") ? "releaseCheckpoint" : "integration";
}

function previousLunation(events: LunarCalendarEvent[], selectedTime: number, prefix: string) {
  return events
    .filter((event) => event.type === "lunation" && event.title.startsWith(prefix) && new Date(event.startsAt).getTime() <= selectedTime + dayMs)
    .sort((first, second) => new Date(second.startsAt).getTime() - new Date(first.startsAt).getTime())[0] ?? null;
}

function nextLunation(events: LunarCalendarEvent[], selectedTime: number, prefix: string) {
  return events
    .filter((event) => event.type === "lunation" && event.title.startsWith(prefix) && new Date(event.startsAt).getTime() >= selectedTime - dayMs)
    .sort((first, second) => new Date(first.startsAt).getTime() - new Date(second.startsAt).getTime())[0] ?? null;
}

function nextLunationInSign(events: LunarCalendarEvent[], selectedTime: number, prefix: string, sign: string) {
  return events
    .filter((event) => (
      event.type === "lunation"
      && event.title.startsWith(prefix)
      && event.sign === sign
      && new Date(event.startsAt).getTime() >= selectedTime - dayMs
    ))
    .sort((first, second) => new Date(first.startsAt).getTime() - new Date(second.startsAt).getTime())[0] ?? null;
}

function eventSign(event: LunarCalendarEvent | null, fallback: string) {
  return event?.sign ?? fallback;
}

function oppositeSign(sign: string) {
  const signs = [
    "Aries",
    "Taurus",
    "Gemini",
    "Cancer",
    "Leo",
    "Virgo",
    "Libra",
    "Scorpio",
    "Sagittarius",
    "Capricorn",
    "Aquarius",
    "Pisces"
  ];
  const signIndex = signs.indexOf(sign);

  return signIndex >= 0 ? signs[(signIndex + 6) % signs.length] : "";
}

function isEclipseLunation(event: LunarCalendarEvent | null) {
  return Boolean(event?.eclipseType) || Boolean(event?.title.toLowerCase().includes("eclipse"));
}

function phaseTypeForMoonPhase(moonPhase: string) {
  const normalizedPhase = moonPhase.trim().toLowerCase();

  if (normalizedPhase.includes("new")) return "new-moon";
  if (normalizedPhase.includes("first quarter")) return "first-quarter";
  if (normalizedPhase.includes("full")) return "full-moon";
  if (normalizedPhase.includes("last quarter") || normalizedPhase.includes("third quarter")) return "last-quarter";
  if (normalizedPhase.includes("waning")) return "waning-other";

  return "waxing-other";
}

function quarterLunationForDay(day: LunarCalendarDay, phaseType: string) {
  if (phaseType !== "first-quarter" && phaseType !== "last-quarter") return null;

  const prefix = phaseType === "first-quarter" ? "First Quarter" : "Last Quarter";

  return day.events.find((event) => event.type === "lunation" && event.title.startsWith(prefix)) ?? null;
}

function exactLunationForDay(day: LunarCalendarDay, phaseType: string) {
  if (phaseType === "new-moon") {
    return day.events.find((event) => event.type === "lunation" && event.title.startsWith("New Moon")) ?? null;
  }

  if (phaseType === "full-moon") {
    return day.events.find((event) => event.type === "lunation" && event.title.startsWith("Full Moon")) ?? null;
  }

  return quarterLunationForDay(day, phaseType);
}

function eclipseEventForDay(day: LunarCalendarDay, arcEvents: {
  origin: LunarCalendarEvent | null;
  culmination: LunarCalendarEvent | null;
  nextNewMoon: LunarCalendarEvent | null;
}) {
  return day.events.find((event) => event.type === "lunation" && isEclipseLunation(event))
    ?? [arcEvents.origin, arcEvents.culmination, arcEvents.nextNewMoon].find((event) => (
      event?.dateKey === day.dateKey && isEclipseLunation(event)
    ))
    ?? null;
}

function moonPhaseHelperSlots(moonPhase: string): TemplateSlotValues {
  const normalizedPhase = moonPhase.trim().toLowerCase();

  if (normalizedPhase.includes("new")) {
    return {
      moonPhaseAction: "begin simply and choose the question for the next cycle",
      moonPhasePlainMeaning: "the lunar cycle is opening and the next focus is still taking shape",
      moonPhaseRole: "origin point"
    };
  }

  if (normalizedPhase.includes("waxing crescent")) {
    return {
      moonPhaseAction: "feed the new direction without forcing it to be complete",
      moonPhasePlainMeaning: "the cycle is gathering energy after the new moon",
      moonPhaseRole: "early build"
    };
  }

  if (normalizedPhase.includes("first quarter")) {
    return {
      moonPhaseAction: "make the adjustment that lets the intention keep moving",
      moonPhasePlainMeaning: "the cycle has reached a turning point where action clarifies the next step",
      moonPhaseRole: "choice point"
    };
  }

  if (normalizedPhase.includes("waxing gibbous")) {
    return {
      moonPhaseAction: "refine what is already growing and notice what needs support",
      moonPhasePlainMeaning: "the cycle is approaching its full-moon reveal",
      moonPhaseRole: "refinement phase"
    };
  }

  if (normalizedPhase.includes("full")) {
    return {
      moonPhaseAction: "name what has become visible and respond to it clearly",
      moonPhasePlainMeaning: "the lunar cycle is at a point of visibility, culmination, or emotional clarity",
      moonPhaseRole: "culmination point"
    };
  }

  if (normalizedPhase.includes("waning gibbous")) {
    return {
      moonPhaseAction: "sort what the full moon revealed and keep what is useful",
      moonPhasePlainMeaning: "the cycle is moving from revelation into understanding",
      moonPhaseRole: "meaning-making phase"
    };
  }

  if (normalizedPhase.includes("last quarter") || normalizedPhase.includes("third quarter")) {
    return {
      moonPhaseAction: "simplify and clear what no longer needs energy",
      moonPhasePlainMeaning: "the cycle has reached a clearing point before the next beginning",
      moonPhaseRole: "release checkpoint"
    };
  }

  if (normalizedPhase.includes("waning crescent")) {
    return {
      moonPhaseAction: "rest, close the loop, and let the next cycle stay quiet for now",
      moonPhasePlainMeaning: "the cycle is winding down before the next new moon",
      moonPhaseRole: "closing phase"
    };
  }

  return {
    moonPhaseAction: "notice what this phase is asking for before reacting",
    moonPhasePlainMeaning: "the lunar cycle gives the day its emotional timing",
    moonPhaseRole: "lunar timing point"
  };
}

const moonSignModes: Record<string, string> = {
  Aries: "fast, direct, and ready to act",
  Taurus: "steady, sensory, and slow to be rushed",
  Gemini: "curious, changeable, and pulled toward conversation",
  Cancer: "protective, receptive, and led by memory or mood",
  Leo: "expressive, warm, and ready to be seen",
  Virgo: "practical, observant, and focused on what can be improved",
  Libra: "relational, balancing, and aware of what feels fair",
  Scorpio: "private, intense, and drawn toward the emotional truth underneath",
  Sagittarius: "restless, candid, and looking for a wider meaning",
  Capricorn: "contained, responsible, and focused on what can hold up over time",
  Aquarius: "independent, future-minded, and needing space to think",
  Pisces: "porous, imaginative, and sensitive to what is unspoken"
};

const seasonThemes: Record<string, string> = {
  Aries: "initiation, courage, identity, and direct action",
  Taurus: "stability, embodiment, resources, and what can be sustained",
  Gemini: "language, curiosity, choices, and changing information",
  Cancer: "care, memory, belonging, and emotional safety",
  Leo: "visibility, creativity, confidence, and heartfelt expression",
  Virgo: "discernment, repair, usefulness, and everyday practice",
  Libra: "relationship, balance, fairness, and mutual consideration",
  Scorpio: "depth, honesty, privacy, and emotional complexity",
  Sagittarius: "meaning, movement, perspective, and belief",
  Capricorn: "structure, responsibility, time, and long-term consequences",
  Aquarius: "systems, friendship, difference, and collective futures",
  Pisces: "release, imagination, compassion, and what cannot be fully controlled"
};

const twoWeekArcConnections: Record<string, string> = {
  "Aries->Libra": "If you've been starting new chapters while worrying about who you're leaving behind, this Full Moon shows that the right people support your growth.",
  "Taurus->Scorpio": "Exposing where you've been accepting less because you didn't think you deserved more.",
  "Gemini->Sagittarius": "If you've been keeping your message small, what if your truth could free someone else?",
  "Cancer->Capricorn": "Where protecting yourself became isolating yourself.",
  "Leo->Aquarius": "Your people want exactly who you are, not who you think you should be.",
  "Virgo->Pisces": "You can't hate yourself into a version you'll love.",
  "Libra->Aries": "Where compromising became self-betrayal.",
  "Scorpio->Taurus": "Where holding on too tight pushes away what you want.",
  "Sagittarius->Gemini": "Your story needs updating to match who you've become.",
  "Capricorn->Cancer": "Where success was chosen over softness.",
  "Aquarius->Leo": "You can't change the world while selling a version of yourself you don't believe in.",
  "Pisces->Virgo": "Where structure will set you free."
};

const sixMonthArcConnections: Record<string, string> = {
  Capricorn: "Foundation to legacy.",
  Aquarius: "Difference to belonging.",
  Pisces: "Dream to wisdom.",
  Aries: "Courage to command.",
  Taurus: "Value to harvest.",
  Gemini: "Words to story.",
  Cancer: "Protection to belonging.",
  Leo: "Spark to radiance.",
  Virgo: "Routine to devotion.",
  Libra: "Harmony to honesty.",
  Scorpio: "Death to rebirth.",
  Sagittarius: "Journey to message."
};

function moonSignMode(sign: string) {
  return moonSignModes[sign] ?? "colored by the Moon's current sign";
}

function seasonTheme(sign: string) {
  return seasonThemes[sign] ?? "the wider tone of the current season";
}

function twoWeekArcConnection(newMoonSign: string, fullMoonSign: string) {
  return twoWeekArcConnections[`${newMoonSign}->${fullMoonSign}`] ?? null;
}

function sixMonthArcConnection(newMoonSign: string) {
  return sixMonthArcConnections[newMoonSign] ?? null;
}

function mercuryRetrogradeSlots(day: LunarCalendarDay): TemplateSlotValues {
  const mercuryRetrogradeEvent = day.events.find((event) => (
    event.type === "station"
    && event.planet === "Mercury"
    && event.title.toLowerCase().includes("retrograde")
    && !event.title.toLowerCase().includes("stations")
  )) ?? null;

  return {
    mercuryRetrograde: mercuryRetrogradeEvent ? "yes" : "no",
    mercuryRetrogradeEndsAt: mercuryRetrogradeEvent?.endsAt ?? "",
    mercuryRetrogradeEvent: mercuryRetrogradeEvent?.title ?? "",
    mercuryRxPlainFlag: mercuryRetrogradeEvent
      ? `Mercury is retrograde in ${mercuryRetrogradeEvent.sign ?? "the current sky"}, so messages, memories, or decisions may need a second pass.`
      : "",
    mercuryRetrogradeSign: mercuryRetrogradeEvent?.sign ?? "",
    mercuryRx: mercuryRetrogradeEvent ? "yes" : "no"
  };
}

function arcPointFor(event: LunarCalendarEvent | null, fallbackSign: string): LunarDayArcPoint | null {
  return event ? {
    sign: eventSign(event, fallbackSign),
    degree: null,
    datetime: event.startsAt,
    title: event.title,
    eclipseType: event.eclipseType ?? null
  } : null;
}

function contentBody(generatedContent: Map<string, LiveGeneratedContent> | undefined, keys: string[]) {
  if (!generatedContent) return null;

  for (const key of keys) {
    const body = generatedContent.get(key)?.body.trim();

    if (body) {
      return body;
    }
  }

  return null;
}

function renderedContentBody(
  generatedContent: Map<string, LiveGeneratedContent> | undefined,
  keys: string[],
  slots: TemplateSlotValues
) {
  if (!generatedContent) return null;

  for (const key of keys) {
    const body = renderGeneratedContentTemplate(generatedContent.get(key), slots)?.body.trim();

    if (body) {
      return body;
    }
  }

  return null;
}

function renderedContent(
  generatedContent: Map<string, LiveGeneratedContent> | undefined,
  keys: string[],
  slots: TemplateSlotValues
) {
  if (!generatedContent) return null;

  for (const key of keys) {
    const rendered = renderGeneratedContentTemplate(generatedContent.get(key), slots);
    const headline = rendered?.headline?.trim() ?? "";
    const summary = rendered?.summary?.trim() ?? "";
    const body = rendered?.body?.trim() ?? "";

    if (rendered && (headline || summary || body)) {
      return rendered;
    }
  }

  return null;
}

function lunarBeatBody(keys: string[]) {
  for (const key of keys) {
    const body = lunarBeatBodyForKey(key)?.trim();

    if (body) {
      return body;
    }
  }

  return null;
}

function lunarBeatArchetype(keys: string[]) {
  for (const key of keys) {
    const archetypeTitle = lunarBeatArchetypeForKey(key)?.trim();

    if (archetypeTitle) {
      return archetypeTitle;
    }
  }

  return null;
}

function lunarBeatArchetypeLore(keys: string[]) {
  for (const key of keys) {
    const archetypeLore = lunarBeatArchetypeLoreForKey(key)?.trim();

    if (archetypeLore) {
      return archetypeLore;
    }
  }

  return null;
}

function renderedFallbackHookDefinitionBody(hookContentKey: string, slots: TemplateSlotValues) {
  const hook = fallbackHookByKey(hookContentKey.replace(/^fallback-hook\//, ""));
  const body = hook?.copy.body.trim();

  if (!body) {
    return null;
  }

  return interpolateTemplateString(body, slots, {
    contentKey: hookContentKey,
    field: "body"
  }).trim() || null;
}

function renderedContentSection(
  generatedContent: Map<string, LiveGeneratedContent> | undefined,
  keys: string[],
  slots: TemplateSlotValues,
  sectionKey: string
) {
  if (!generatedContent) return null;

  for (const key of keys) {
    const rendered = renderGeneratedContentTemplate(generatedContent.get(key), slots);
    const sections = rendered?.sections;

    if (!sections || typeof sections !== "object" || Array.isArray(sections)) {
      continue;
    }

    const value = (sections as Record<string, unknown>)[sectionKey];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function renderedContentKey(
  generatedContent: Map<string, LiveGeneratedContent> | undefined,
  keys: string[],
  slots: TemplateSlotValues
) {
  if (!generatedContent) return null;

  for (const key of keys) {
    const body = renderGeneratedContentTemplate(generatedContent.get(key), slots)?.body.trim();

    if (body) {
      return { key, body };
    }
  }

  return null;
}

const activeAspectTypeOrbLimits: Record<string, number> = {
  conjunction: 4,
  sextile: 3,
  square: 4,
  trine: 4,
  opposition: 4
};

function fastestActiveAspectPlanet(aspect: LunarCalendarDay["activeAspects"][number]) {
  return [aspect.planetA, aspect.planetB]
    .map((planet) => ({ planet, order: skyBodyOrderIndex(planet) }))
    .sort((first, second) => first.order - second.order)[0]?.planet ?? null;
}

function activeAspectWindowOrb(fastestPlanet: string | null) {
  if (fastestPlanet === "Moon") {
    return 6;
  }

  return ["Sun", "Mercury", "Venus", "Mars"].includes(fastestPlanet ?? "")
    ? 3
    : 1.5;
}

function activeAspectOrbLimit(aspect: LunarCalendarDay["activeAspects"][number]) {
  const aspectTypeLimit = activeAspectTypeOrbLimits[aspect.aspectType] ?? 0;
  const speedLimit = activeAspectWindowOrb(fastestActiveAspectPlanet(aspect));

  return Math.min(aspectTypeLimit, speedLimit);
}

function significantActiveAspects(day: LunarCalendarDay) {
  return day.activeAspects
    .filter((aspect) => aspect.orb <= activeAspectOrbLimit(aspect))
    .sort((first, second) => first.orb - second.orb);
}

function lunarArcSlotsForPhase(
  moonPhase: string,
  options: {
    fallbackSign: string;
    origin: LunarCalendarEvent | null;
    culmination: LunarCalendarEvent | null;
    nextNewMoon: LunarCalendarEvent | null;
  }
): TemplateSlotValues {
  const normalizedPhase = moonPhase.trim().toLowerCase();
  const isNewMoon = normalizedPhase.includes("new");
  const isFullMoon = normalizedPhase.includes("full");
  const isWaning = normalizedPhase.includes("waning") || normalizedPhase.includes("last quarter") || normalizedPhase.includes("third quarter");
  const lunarArcDirection = isFullMoon || isWaning ? "waning" : "waxing";
  const lunarArcTarget = lunarArcDirection === "waning" ? "new moon" : "full moon";
  const lunarArcTargetEvent = lunarArcDirection === "waning" ? options.nextNewMoon : options.culmination;
  const lunarArcTargetSign = eventSign(lunarArcTargetEvent, options.fallbackSign);
  const newMoonSign = eventSign(options.origin, options.fallbackSign);
  const fullMoonSign = eventSign(options.culmination, options.fallbackSign);
  const newMoonOppositeSign = oppositeSign(newMoonSign);
  const lunarTwoWeekArcConnection = isFullMoon ? twoWeekArcConnection(newMoonSign, fullMoonSign) ?? "" : "";
  const lunarSixMonthArcConnection = sixMonthArcConnection(isFullMoon ? fullMoonSign : newMoonSign) ?? "";
  const eclipseSeasonEvents = lunarArcDirection === "waning"
    ? [options.culmination, options.nextNewMoon]
    : [options.origin, options.culmination];
  const eclipseSeasonEvent = eclipseSeasonEvents.find(isEclipseLunation) ?? null;
  const eclipseSeasonType = eclipseSeasonEvent?.eclipseType ?? "";
  const eclipseSeasonPlainFlag = eclipseSeasonEvent
    ? `This lunar arc includes ${eclipseSeasonEvent.title}, so treat the day as part of eclipse season.`
    : "";

  if (isNewMoon) {
    return {
      eclipseSeason: eclipseSeasonEvent ? "yes" : "no",
      eclipseSeasonEvent: eclipseSeasonEvent?.title ?? "",
      eclipseSeasonPlainFlag,
      eclipseSeasonType,
      arcPlainMeaning: `the cycle is opening and beginning to build toward a full-moon reveal in ${lunarArcTargetSign}`,
      lunarArcDirection,
      lunarArcTarget,
      lunarArcTargetSign,
      arcTargetSign: lunarArcTargetSign,
      lunarTwoWeekArcConnection,
      lunarSixMonthArcConnection,
      twoWeekArcConnection: lunarTwoWeekArcConnection,
      sixMonthArcConnection: lunarSixMonthArcConnection,
      lunarArcPosition: `new moon, waxing toward the full moon in ${lunarArcTargetSign}`,
      arcPosition: lunarArcDirection,
      newMoonSign,
      newMoonOppositeSign
    };
  }

  if (isFullMoon) {
    return {
      eclipseSeason: eclipseSeasonEvent ? "yes" : "no",
      eclipseSeasonEvent: eclipseSeasonEvent?.title ?? "",
      eclipseSeasonPlainFlag,
      eclipseSeasonType,
      arcPlainMeaning: `the cycle has reached its full-moon reveal and will begin clearing toward a new moon in ${lunarArcTargetSign}`,
      lunarArcDirection,
      lunarArcTarget,
      lunarArcTargetSign,
      arcTargetSign: lunarArcTargetSign,
      lunarTwoWeekArcConnection,
      lunarSixMonthArcConnection,
      twoWeekArcConnection: lunarTwoWeekArcConnection,
      sixMonthArcConnection: lunarSixMonthArcConnection,
      lunarArcPosition: `full moon, waning toward the new moon in ${lunarArcTargetSign}`,
      arcPosition: lunarArcDirection,
      newMoonSign,
      newMoonOppositeSign
    };
  }

  return {
    eclipseSeason: eclipseSeasonEvent ? "yes" : "no",
    eclipseSeasonEvent: eclipseSeasonEvent?.title ?? "",
    eclipseSeasonPlainFlag,
    eclipseSeasonType,
    arcPlainMeaning: `the cycle is ${lunarArcDirection} toward a ${lunarArcTarget} in ${lunarArcTargetSign}`,
    lunarArcDirection,
    lunarArcTarget,
    lunarArcTargetSign,
    arcTargetSign: lunarArcTargetSign,
    lunarTwoWeekArcConnection,
    lunarSixMonthArcConnection,
    twoWeekArcConnection: lunarTwoWeekArcConnection,
    sixMonthArcConnection: lunarSixMonthArcConnection,
    lunarArcPosition: `${lunarArcDirection} toward the ${lunarArcTarget} in ${lunarArcTargetSign}`,
    arcPosition: lunarArcDirection,
    newMoonSign,
    newMoonOppositeSign
  };
}

function lunarDayTemplateSlots(
  day: LunarCalendarDay,
  seasonSign: string,
  arcEvents: {
    origin: LunarCalendarEvent | null;
    culmination: LunarCalendarEvent | null;
    nextNewMoon: LunarCalendarEvent | null;
  }
): TemplateSlotValues {
  const eclipseEvent = eclipseEventForDay(day, arcEvents);

  return {
    ...lunarArcSlotsForPhase(day.moonPhase, {
      fallbackSign: day.moonSign,
      ...arcEvents
    }),
    ...moonPhaseHelperSlots(day.moonPhase),
    ...mercuryRetrogradeSlots(day),
    currentSeason: `${seasonSign} season`,
    currentSunSign: seasonSign,
    eclipseFlag: eclipseEvent ? "yes" : "no",
    eclipseType: eclipseEvent?.eclipseType ?? "",
    moonSignMode: moonSignMode(day.moonSign),
    moonSign: day.moonSign,
    moonPhase: day.moonPhase,
    oppositeSign: oppositeSign(day.moonSign),
    phaseType: phaseTypeForMoonPhase(day.moonPhase),
    season: `${seasonSign} season`,
    seasonSign,
    seasonTheme: seasonTheme(seasonSign),
    sunSign: seasonSign
  };
}

function fallbackLunarDayContent(
  generatedContent: Map<string, LiveGeneratedContent> | undefined,
  slots: TemplateSlotValues
) {
  return renderedContent(
    generatedContent,
    [
      "fallback-hook/lunar-calendar/day",
      "fallback-hook/sky.lunar-calendar-day"
    ],
    slots
  );
}

function editorialFor(
  day: LunarCalendarDay,
  seasonSign: string,
  lunation: LunarCalendarEvent | null,
  transits: LunarDayTransit[],
  arcEvents: {
    origin: LunarCalendarEvent | null;
    culmination: LunarCalendarEvent | null;
    nextNewMoon: LunarCalendarEvent | null;
  },
  generatedContent?: Map<string, LiveGeneratedContent>
): LunarDay["editorial"] {
  const phasePart = slugContentPart(day.moonPhase);
  const lunationSignPart = slugContentPart(lunation?.sign ?? day.moonSign);
  const initialPhaseType = phaseTypeForMoonPhase(day.moonPhase);
  const exactLunation = exactLunationForDay(day, initialPhaseType);
  const quarterLunation = initialPhaseType === "first-quarter" || initialPhaseType === "last-quarter" ? exactLunation : null;
  const exactQuarterSunSign = quarterLunation?.sunSign ?? null;
  const calendarSunSign = exactLunation?.sunSign ?? seasonSign;
  const calendarMoonSign = exactLunation?.sign || day.moonSign;
  const seasonPart = slugContentPart(calendarSunSign);
  const signPart = slugContentPart(calendarMoonSign);
  const slots: TemplateSlotValues = {
    ...lunarDayTemplateSlots(day, calendarSunSign, arcEvents),
    moonSign: calendarMoonSign,
    quarterMoonSign: calendarMoonSign,
    quarterSunSign: exactQuarterSunSign ?? "",
    quarterSignRule: exactQuarterSunSign
      ? `${initialPhaseType === "first-quarter" ? "First Quarter" : "Last Quarter"} archetype uses the Moon sign at exact perfection.`
      : ""
  };
  const phaseType = String(slots.phaseType ?? "");
  const newMoonSign = String(slots.newMoonSign ?? "");
  const hasExactLunationEvent = Boolean(exactLunation);
  const phaseContentKeys = (() => {
    if (!hasExactLunationEvent) return [];

    if (phaseType === "new-moon") return [`lunation/new-moon/${signPart}`];
    if (phaseType === "full-moon") return [`lunation/full-moon/${signPart}`];
    if (phaseType === "first-quarter") return [`lunation/first-quarter/${signPart}`];
    if (phaseType === "last-quarter") return [`lunation/last-quarter/${signPart}`];

    return [];
  })();
  const baseKeys = [
    `lunar.day.${day.dateKey}`,
    `lunar.day.${phasePart}.${signPart}`,
    `lunar.season.${seasonPart}.day.${phasePart}.${signPart}`
  ];
  const arcKeys = [
    `lunar.arc.${lunationSignPart}.${seasonPart}.${phasePart}`,
    `lunar.arc.${lunation?.id ?? ""}`.replace(/\.$/, "")
  ];
  const eclipseKeys = [
    `lunar.eclipse.${day.dateKey}.witness`,
    `lunar.eclipse.${lunationSignPart}.${seasonPart}.witness`
  ];
  const newBodyKeys = [
    `lunar.day.${day.dateKey}.body`,
    ...(hasExactLunationEvent && slots.eclipseFlag === "yes" ? ["lunation/eclipse"] : []),
    ...phaseContentKeys
  ];
  const phaseFallbackHookKeys = phaseContentKeys.map((key) => `fallback-hook/${key}`);
  const phaseFallbackContent = renderedContent(generatedContent, phaseFallbackHookKeys, slots);
  const fallbackArcLesson = hasExactLunationEvent && phaseType === "full-moon" && (slots.twoWeekArcConnection || slots.sixMonthArcConnection)
    ? renderedContentBody(generatedContent, [
      "fallback-hook/lunar-calendar/arc-full-moon",
      "fallback-hook/sky.lunar-arc-full-moon"
    ], slots)
      ?? renderedFallbackHookDefinitionBody("fallback-hook/lunar-calendar/arc-full-moon", slots)
    : null;
  const fallbackArcSeeded = hasExactLunationEvent && phaseType === "new-moon" && slots.sixMonthArcConnection
    ? renderedContentBody(generatedContent, [
      "fallback-hook/lunar-calendar/arc-new-moon",
      "fallback-hook/sky.lunar-arc-new-moon"
    ], slots)
      ?? renderedFallbackHookDefinitionBody("fallback-hook/lunar-calendar/arc-new-moon", slots)
    : null;
  const fallbackDay = fallbackLunarDayContent(
    generatedContent,
    slots
  );
  const fallbackDayBody = fallbackDay?.body.trim() || null;
  const transitNotes = [
    ...transits.map((transit) => {
      const copyKey = `${slugContentPart(transit.title)}__${lunationSignPart}_lunation_${seasonPart}_season`;

      return {
        transitRef: transit.sourceEvent.id,
        copyKey,
        body: contentBody(generatedContent, [copyKey])
      };
    }),
    ...significantActiveAspects(day).map((aspect) => {
      const title = `${aspect.planetA} ${aspect.aspectType} ${aspect.planetB}`;
      const authoredKey = `${slugContentPart(title)}__${lunationSignPart}_lunation_${seasonPart}_season`;
      const fallbackKey = `transit-fallback/${slugContentPart(aspect.aspectType)}`;
      const aspectSlots: TemplateSlotValues = {
        ...slots,
        applying: aspect.applying ? "yes" : "no",
        aspectType: aspect.aspectType,
        orb: aspect.orb,
        planetA: aspect.planetA,
        planetB: aspect.planetB
      };
      const resolved = renderedContentKey(generatedContent, [authoredKey, fallbackKey], aspectSlots);

      return {
        transitRef: `active-aspect.${slugContentPart(title)}`,
        copyKey: resolved?.key ?? authoredKey,
        title,
        body: resolved?.body ?? null
      };
    })
  ];

  return {
    body: renderedContentBody(generatedContent, newBodyKeys, slots)
      ?? phaseFallbackContent?.body.trim()
      ?? lunarBeatBody(phaseContentKeys)
      ?? contentBody(generatedContent, baseKeys.map((key) => `${key}.body`))
      ?? fallbackDayBody,
    archetypeTitle: phaseFallbackContent?.headline?.trim() || lunarBeatArchetype(phaseContentKeys),
    archetypeLore: phaseFallbackContent?.summary?.trim() || lunarBeatArchetypeLore(phaseContentKeys),
    practice: contentBody(generatedContent, baseKeys.map((key) => `${key}.practice`)),
    reflect: contentBody(generatedContent, baseKeys.map((key) => `${key}.reflect`)),
    ritual: contentBody(generatedContent, baseKeys.map((key) => `${key}.ritual`)),
    eclipseWitness: contentBody(generatedContent, eclipseKeys),
    callback: contentBody(generatedContent, baseKeys.map((key) => `${key}.callback`)),
    arcLesson: contentBody(generatedContent, arcKeys.map((key) => `${key}.lesson`))
      ?? fallbackArcLesson,
    arcSeeded: contentBody(generatedContent, arcKeys.map((key) => `${key}.seeded`))
      ?? fallbackArcSeeded,
    journalPrompt: renderedContentSection(generatedContent, newBodyKeys, slots, "journalPrompt")
      ?? renderedContentSection(generatedContent, baseKeys.map((key) => `${key}.body`), slots, "journalPrompt")
      ?? renderedContentSection(generatedContent, [
        "fallback-hook/lunar-calendar/day",
        "fallback-hook/sky.lunar-calendar-day"
      ], slots, "journalPrompt"),
    season: renderedContentBody(generatedContent, [`season/${seasonPart}`], slots),
    transitNotes
  };
}

export function resolveLunarDay({
  day,
  events,
  location,
  timeZone,
  arcEnabled,
  generatedContent
}: ResolveLunarDayOptions): LunarDay {
  const selectedTime = dayKeyToUtcTime(day.dateKey);
  const season = seasonWindowForDay(day, timeZone);
  const origin = previousLunation(events, selectedTime, "New Moon");
  const culmination = nextLunation(events, selectedTime, "Full Moon")
    ?? previousLunation(events, selectedTime, "Full Moon");
  const nextNewMoon = nextLunation(events, selectedTime, "New Moon");
  const sixMonthCulmination = origin
    ? nextLunationInSign(events, new Date(origin.startsAt).getTime() + (120 * dayMs), "Full Moon", eventSign(origin, day.moonSign))
    : null;
  const currentLunation = previousLunation(events, selectedTime, "New Moon")
    ?? previousLunation(events, selectedTime, "Full Moon")
    ?? null;
  const transits = dayModifiers(day, events, selectedTime);
  const hasEclipse = transits.some((transit) => transit.type === "eclipse");
  const checkpointRole = hasEclipse ? "eclipse" : checkpointRoleForPhase(day.moonPhase);
  const editorial = editorialFor(day, season.sign, currentLunation, transits, {
    origin,
    culmination,
    nextNewMoon
  }, generatedContent);

  return {
    date: day.dateKey,
    timezone: timeZone,
    location,
    traditional: {
      phase: day.moonPhase,
      moonSign: day.moonSign,
      illumination: day.illumination,
      lunarDayNumber: lunarDayNumberFor(day, events),
      voc: day.voidOfCourse?.startsAt && day.voidOfCourse.until ? {
        start: day.voidOfCourse.startsAt,
        end: day.voidOfCourse.until,
        durationMin: durationMinutes(day.voidOfCourse.startsAt, day.voidOfCourse.until),
        nextSign: day.voidOfCourse.nextSign ?? null
      } : null,
      transits,
      activeAspects: day.activeAspects
    },
    arc: arcEnabled ? {
      season,
      origin: arcPointFor(origin, day.moonSign),
      checkpoint: {
        phaseType: day.moonPhase,
        role: checkpointRole
      },
      culmination: arcPointFor(culmination, day.moonSign),
      arcSpan: "twoWeek",
      spans: {
        twoWeek: {
          origin: arcPointFor(origin, day.moonSign),
          culmination: arcPointFor(culmination, day.moonSign)
        },
        sixMonth: {
          origin: arcPointFor(origin, day.moonSign),
          culmination: arcPointFor(sixMonthCulmination, day.moonSign)
        }
      }
    } : null,
    editorial,
    source: {
      lunationId: currentLunation?.id ?? null,
      seasonId: `season.${slugContentPart(season.sign)}.${season.start}`,
      signId: slugContentPart(day.moonSign)
    }
  };
}
