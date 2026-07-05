import type { LunarCalendarDay, LunarCalendarEvent } from "../../services/ephemeris";
import { renderGeneratedContentTemplate, type LiveGeneratedContent } from "../../services/generatedContent";
import { slugContentPart } from "../../services/generatedContentKeys";
import type { TemplateSlotValues } from "../../services/templateInterpolation";
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

function lunarDayTemplateSlots(
  day: LunarCalendarDay
): TemplateSlotValues {
  return {
    moonSign: day.moonSign,
    moonPhase: day.moonPhase
  };
}

function fallbackLunarDayContent(
  generatedContent: Map<string, LiveGeneratedContent> | undefined,
  slots: TemplateSlotValues
) {
  return renderGeneratedContentTemplate(
    generatedContent?.get("fallback-hook/sky.lunar-calendar-day"),
    slots
  );
}

function editorialFor(
  day: LunarCalendarDay,
  seasonSign: string,
  lunation: LunarCalendarEvent | null,
  transits: LunarDayTransit[],
  generatedContent?: Map<string, LiveGeneratedContent>
): LunarDay["editorial"] {
  const seasonPart = slugContentPart(seasonSign);
  const signPart = slugContentPart(day.moonSign);
  const phasePart = slugContentPart(day.moonPhase);
  const lunationSignPart = slugContentPart(lunation?.sign ?? day.moonSign);
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
  const fallbackDay = fallbackLunarDayContent(
    generatedContent,
    lunarDayTemplateSlots(day)
  );
  const fallbackDayBody = fallbackDay?.body.trim() || null;

  return {
    body: contentBody(generatedContent, baseKeys.map((key) => `${key}.body`)) ?? fallbackDayBody,
    practice: contentBody(generatedContent, baseKeys.map((key) => `${key}.practice`)),
    reflect: contentBody(generatedContent, baseKeys.map((key) => `${key}.reflect`)),
    ritual: contentBody(generatedContent, baseKeys.map((key) => `${key}.ritual`)),
    eclipseWitness: contentBody(generatedContent, eclipseKeys),
    callback: contentBody(generatedContent, baseKeys.map((key) => `${key}.callback`)),
    arcLesson: contentBody(generatedContent, arcKeys.map((key) => `${key}.lesson`)),
    arcSeeded: contentBody(generatedContent, arcKeys.map((key) => `${key}.seeded`)),
    transitNotes: transits.map((transit) => {
      const copyKey = `${slugContentPart(transit.title)}__${lunationSignPart}_lunation_${seasonPart}_season`;

      return {
        transitRef: transit.sourceEvent.id,
        copyKey,
        body: contentBody(generatedContent, [copyKey])
      };
    })
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
  const sixMonthCulmination = origin
    ? nextLunationInSign(events, new Date(origin.startsAt).getTime() + (120 * dayMs), "Full Moon", eventSign(origin, day.moonSign))
    : null;
  const currentLunation = previousLunation(events, selectedTime, "New Moon")
    ?? previousLunation(events, selectedTime, "Full Moon")
    ?? null;
  const transits = dayModifiers(day, events, selectedTime);
  const hasEclipse = transits.some((transit) => transit.type === "eclipse");
  const checkpointRole = hasEclipse ? "eclipse" : checkpointRoleForPhase(day.moonPhase);
  const editorial = editorialFor(day, season.sign, currentLunation, transits, generatedContent);

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
      transits
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
