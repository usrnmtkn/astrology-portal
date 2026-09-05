import initialReaderRows from "../content/fallbackArchitectureV3/bundled-initial-reader-rows-v3.json";
import {
  fallbackV3LunationCompact,
  loadLunationBookFallbackArchitectureV3Bundle,
  SourceGapError,
  transitSynastryFallbackRendererV3
} from "../content/fallbackArchitectureV3Runtime";
import type { LocationInput, PlanetPosition, SkySnapshot } from "../types";
import { isEligibleTransitReturn } from "./transitReturns";
import type { LunarCalendarEvent, MatchingNewMoonFact } from "./ephemeris";
import {
  cmsSurfaceKeys,
  resolveCmsSurfaceOverride,
  type CmsGeneratedContentMap
} from "../content/cmsSurfaceOverrides";
import type { ConditionalSectionReviewFlag } from "./conditionalSectionReviewQueue";
import { reportLiveOmittedSections } from "./conditionalSectionReviewReporter";
import {
  assertLunationBodyMatchesEventSky,
  lunationBlendFacts,
  wholeSignHouse
} from "./lunationEphemerisFacts";

export { assertLunationBodyMatchesEventSky, lunationBlendFacts } from "./lunationEphemerisFacts";

export type WeeklyHoroscopeWeekType =
  | "eclipse"
  | "lunation"
  | "station"
  | "headliner"
  | "standard"
  | "quiet";

export type WeeklyHoroscopeSection = {
  dateKey?: string;
  dayLabel: string;
  headline: string;
  driverLabel: string;
  timing?: string;
  body: string;
  tag?: string;
  accented: boolean;
  source: "lunation" | "station" | "return" | "heavy" | "weekly-moon";
  unit: string;
  orb?: number;
  house?: number;
  reviewFlags?: ConditionalSectionReviewFlag[];
};

export type WeeklyHoroscopeReading = {
  dateKey?: string;
  dayLabel: string;
  headline: string;
  driverLabel: string;
  timing?: string;
  body: string;
  tag?: string;
  source: WeeklyHoroscopeSection["source"];
  orb?: number;
  house?: number;
  sourceUnits: string[];
  reviewFlags?: WeeklyHoroscopeSection["reviewFlags"];
};

export function weeklyHoroscopeTagItems(tag?: string | null) {
  return (tag ?? "")
    .split(/\s*,\s*/u)
    .map((item) => item.trim())
    .filter(Boolean);
}

export type CalendarWeeklyOverview = {
  headline: string;
  overview: string;
  weeklyHeadline: string;
  weeklyOverview: string;
  mainShifts: LunarCalendarEvent[];
  mainEvent?: LunarCalendarEvent;
  source: "authored" | "generated-fallback";
  contentSource: CalendarEditorialContentSource;
  contentKey: string;
  dateRange: {
    start: string;
    end: string;
  };
  keyShiftIds: string[];
  keyShiftLabels: string[];
  provenance: CalendarEditorialProvenance;
};

export type CalendarEditorialContentSource =
  | "owner_authored"
  | "owner_approved"
  | "generated_fallback"
  | "emergency_fallback";

export type CalendarEditorialProvenance = {
  sourcePath?: string;
  sourceId?: string;
  generatedBy?: string;
  templateVersion?: string;
  reviewStatus?: string;
  approvedVia?: string;
};

export type CalendarEditorialContent = {
  contentKey: string;
  contentSource: CalendarEditorialContentSource;
  eventId?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  headline?: string;
  overview?: string;
  dailyMoonCopy?: string;
  eventCopy?: string;
  eventDetailsCopy?: string;
  keyShiftIds?: string[];
  keyShiftLabels?: string[];
  practicalActions?: string[];
  provenance: CalendarEditorialProvenance;
};

export type WeeklyEventRank = {
  eventId: string;
  baseImportance: number;
  exactnessWeight: number;
  durationWeight: number;
  rarityWeight: number;
  userVisibilityWeight: number;
  finalScore: number;
};

export type CalendarWeeklyMoonTone = {
  moonSign: string;
  headline: string;
  body: string;
  contentKey: string;
  source: "weekly-moon";
};

export type WeeklyHoroscopeAssembly = {
  status: "loading" | "ready" | "error";
  weekStart: string;
  weekEnd: string;
  weekType: WeeklyHoroscopeWeekType;
  chip: string;
  macro?: {
    headline: string;
    body: string;
  };
  horoscope: WeeklyHoroscopeReading;
  aspects: WeeklyHoroscopeReading[];
  sourceGaps: string[];
  derivation: {
    calculationTimeUtc: "16:00";
    publicationTimeLocal: "Sunday 20:00";
    contentImportCounts: typeof weeklyContentImportCounts;
  };
};

type WeeklySourceRow = {
  contentKey: string;
  surface: string;
  content_role: string;
  headline: string;
  body: string;
  weeklyHeadline?: string;
  weeklyOverview?: string;
  weekStart?: string;
  weekEnd?: string;
  mainShifts?: string[];
  mainEvent?: string;
  review_status: string;
  approved_via?: string;
  source_keys?: string[];
};

type WeeklyWindow = {
  weekStart: string;
  weekEnd: string;
  dateKeys: string[];
};

type WeeklyEphemerisData = {
  events: LunarCalendarEvent[];
  snapshots: SkySnapshot[];
  lunationEventSkies: Map<string, SkySnapshot>;
  matchingNewMoons: Map<string, MatchingNewMoonFact>;
  stationEventPositions: Map<string, PlanetPosition>;
};

type WeeklySkyLoader = (
  location: LocationInput,
  date: Date,
  options?: { includeTransitWindows?: boolean }
) => Promise<SkySnapshot>;

type TransitContact = {
  transiting: string;
  natal: string;
  aspect: MajorAspect;
  orb: number;
  sign: string;
  isRetrograde: boolean;
  unit: string;
};

type MajorAspect = "conjunction" | "sextile" | "square" | "trine" | "opposition";

const sourceRows = initialReaderRows.authoredCards.filter((row) => (
  typeof row.surface === "string" && row.surface.startsWith("weekly-")
)) as WeeklySourceRow[];
const readerEligibleReviewStatuses = new Set(["approved", "approved_reuse", "reviewed"]);
const exactAspects: Array<{ type: MajorAspect; degrees: number }> = [
  { type: "conjunction", degrees: 0 },
  { type: "sextile", degrees: 60 },
  { type: "square", degrees: 90 },
  { type: "trine", degrees: 120 },
  { type: "opposition", degrees: 180 }
];
const weekTypeLabels: Record<WeeklyHoroscopeWeekType, string> = {
  eclipse: "Eclipse week",
  lunation: "Lunation week",
  station: "Station week",
  headliner: "A significant week",
  standard: "This week",
  quiet: "A quieter week"
};
const aspectRelations: Record<MajorAspect, string> = {
  conjunction: "conjunct",
  opposition: "opposite",
  square: "square",
  trine: "trine",
  sextile: "sextile"
};
const weeklyEphemerisCache = new Map<string, Promise<WeeklyEphemerisData>>();
const maxWeeklyEphemerisCacheEntries = 12;

export const weeklyContentImportCounts = Object.freeze({
  total: sourceRows.length,
  station: sourceRows.filter((row) => row.surface === "weekly-station").length,
  openers: sourceRows.filter((row) => row.surface === "weekly-opener").length,
  overviews: sourceRows.filter((row) => row.surface === "weekly-overview").length,
  readerEligible: sourceRows.filter((row) => isReaderEligible(row)).length,
  needsReview: sourceRows.filter((row) => row.review_status === "needs_review").length
});

function isReaderEligible(row: WeeklySourceRow) {
  return readerEligibleReviewStatuses.has(row.review_status.trim().toLowerCase());
}

function contentSourceForRow(row: Pick<WeeklySourceRow, "approved_via">): CalendarEditorialContentSource {
  return /owner\s+(?:rewrite|authored|final)/iu.test(row.approved_via ?? "")
    ? "owner_authored"
    : "owner_approved";
}

function normalizeId(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "-");
}

function title(value: string) {
  return value.replace(/-/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function addUtcDays(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function zonedDateParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    hour12: false
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";

  return {
    dateKey: `${value("year")}-${value("month")}-${value("day")}`,
    weekday: value("weekday"),
    hour: Number(value("hour")) % 24
  };
}

export function weeklyWindowFor(now: Date, timeZone = "UTC"): WeeklyWindow {
  const local = zonedDateParts(now, timeZone);
  const dayIndex = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(local.weekday);
  const useUpcomingWeek = dayIndex === 0 && local.hour >= 20;
  const daysSinceMonday = dayIndex === 0 ? 6 : dayIndex - 1;
  const weekStart = addUtcDays(local.dateKey, useUpcomingWeek ? 1 : -daysSinceMonday);
  const dateKeys = Array.from({ length: 7 }, (_, index) => addUtcDays(weekStart, index));

  return {
    weekStart,
    weekEnd: dateKeys[6],
    dateKeys
  };
}

function angularSeparation(first: number, second: number) {
  const difference = Math.abs((((first - second) % 360) + 360) % 360);
  return difference > 180 ? 360 - difference : difference;
}

function ordinalHouse(house: number) {
  const remainder = house % 100;
  const suffix = remainder >= 11 && remainder <= 13
    ? "th"
    : house % 10 === 1
      ? "st"
      : house % 10 === 2
        ? "nd"
        : house % 10 === 3
          ? "rd"
          : "th";
  return `${house}${suffix}`;
}

function stationHouseTiming(
  event: LunarCalendarEvent,
  position: PlanetPosition | undefined,
  timeZone: string
) {
  if (
    !position?.transitStart
    || !position.transitEnd
    || normalizeId(position.planet) !== normalizeId(event.planet ?? "")
    || normalizeId(position.sign) !== normalizeId(event.sign ?? "")
  ) return undefined;

  const format = new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "long",
    day: "numeric",
    year: "numeric"
  });
  return `${format.format(new Date(position.transitStart))} – ${format.format(new Date(position.transitEnd))}`;
}

function weeklyEphemerisCacheKey(location: LocationInput, window: WeeklyWindow) {
  return [
    window.weekStart,
    window.weekEnd,
    location.latitude.toFixed(4),
    location.longitude.toFixed(4),
    location.timeZone || "UTC"
  ].join("|");
}

export async function loadWeeklyDailySnapshots(
  location: LocationInput,
  calculationDates: Date[],
  loadSky?: WeeklySkyLoader
) {
  const skyLoader = loadSky
    ?? (await import("./skyCalculationClient")).getAstrodienstSkyOffMainThread;
  return Promise.all(calculationDates.map((date) => skyLoader(location, date)));
}

export async function loadWeeklyStationPositions(
  location: LocationInput,
  events: LunarCalendarEvent[],
  loadSky?: WeeklySkyLoader
) {
  const skyLoader = loadSky
    ?? (await import("./skyCalculationClient")).getAstrodienstSkyOffMainThread;
  const entries = await Promise.all(
    events.filter(isExactStation).map(async (event) => {
      const eventSky = await skyLoader(
        location,
        new Date(event.startsAt),
        { includeTransitWindows: true }
      );
      const planet = normalizeId(event.planet ?? "");
      const position = eventSky.positions.find((candidate) => normalizeId(candidate.planet) === planet);
      return position ? [event.id, position] as const : null;
    })
  );
  return new Map<string, PlanetPosition>(
    entries.filter((entry): entry is readonly [string, PlanetPosition] => entry !== null)
  );
}

async function loadWeeklyEphemeris(location: LocationInput, window: WeeklyWindow): Promise<WeeklyEphemerisData> {
  const key = weeklyEphemerisCacheKey(location, window);
  const cached = weeklyEphemerisCache.get(key);
  if (cached) return cached;

  const request = (async () => {
    const calculationDates = window.dateKeys.map((dateKey) => new Date(`${dateKey}T16:00:00Z`));
    const rangeStart = new Date(`${window.weekStart}T00:00:00Z`);
    const rangeEnd = new Date(`${window.weekEnd}T23:59:59.999Z`);
    const {
      getAstrodienstSkyOffMainThread,
      getLunarCalendarRangeEventsOffMainThread,
      getMatchingNewMoonForFullMoonOffMainThread
    } = await import("./skyCalculationClient");
    const [rangeEvents, snapshots] = await Promise.all([
      getLunarCalendarRangeEventsOffMainThread(location, rangeStart, rangeEnd),
      loadWeeklyDailySnapshots(location, calculationDates, getAstrodienstSkyOffMainThread)
    ]);
    const dateKeySet = new Set(window.dateKeys);
    const events = rangeEvents
      .filter((event) => dateKeySet.has(event.dateKey))
      .sort((first, second) => first.startsAt.localeCompare(second.startsAt));
    const lunationEvents = events.filter(isPrincipalLunation);
    const lunationEventSkies = new Map<string, SkySnapshot>(
      await Promise.all(lunationEvents.map(async (event) => [
        event.id,
        await getAstrodienstSkyOffMainThread(location, new Date(event.startsAt), { includeTransitWindows: true })
      ] as const))
    );
    const matchingNewMoons = new Map<string, MatchingNewMoonFact>(
      (await Promise.all(lunationEvents.map(async (event) => {
        if (lunationKind(event) !== "full-moon" || !event.sign) return null;
        const match = await getMatchingNewMoonForFullMoonOffMainThread(location, event.startsAt, event.sign);
        return match ? [event.id, match] as const : null;
      }))).filter(
        (entry): entry is readonly [string, MatchingNewMoonFact] => entry !== null
      )
    );
    const stationEventPositions = await loadWeeklyStationPositions(
      location,
      events,
      getAstrodienstSkyOffMainThread
    );

    return { events, snapshots, lunationEventSkies, matchingNewMoons, stationEventPositions };
  })();

  weeklyEphemerisCache.set(key, request);
  void request.catch(() => {
    if (weeklyEphemerisCache.get(key) === request) {
      weeklyEphemerisCache.delete(key);
    }
  });

  if (weeklyEphemerisCache.size > maxWeeklyEphemerisCacheEntries) {
    const oldestKey = weeklyEphemerisCache.keys().next().value;
    if (oldestKey) weeklyEphemerisCache.delete(oldestKey);
  }

  return request;
}

function aspectCandidates(transit: PlanetPosition, natalTargets: PlanetPosition[], orbLimit: number) {
  if (typeof transit.longitude !== "number") return [];
  const transitLongitude = transit.longitude;

  return natalTargets.flatMap((natal) => {
    if (typeof natal.longitude !== "number") return [];
    const separation = angularSeparation(transitLongitude, natal.longitude);

    return exactAspects
      .map(({ type, degrees }) => ({
        transiting: normalizeId(transit.planet),
        natal: normalizeId(natal.planet),
        aspect: type,
        orb: Math.abs(separation - degrees),
        sign: normalizeId(transit.sign),
        isRetrograde: transit.motion === "retrograde",
        unit: `${type}:${normalizeId(natal.planet)}`
      }))
      .filter((candidate) => candidate.orb <= orbLimit);
  });
}

export function weeklyDailyTransitContacts(snapshot: SkySnapshot, natalTargets: PlanetPosition[]) {
  return snapshot.positions
    .filter((position) => position.planet !== "Moon")
    .flatMap((position) => aspectCandidates(position, natalTargets, 1))
    .sort((first, second) => first.orb - second.orb);
}

function stableVariant(seed: string): 1 | 2 | 3 {
  let hash = 2166136261;
  for (const character of seed) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return ((Math.abs(hash) % 3) + 1) as 1 | 2 | 3;
}

function isExactStation(event: LunarCalendarEvent) {
  return event.type === "station"
    && event.primary
    && (event.phase === "station-retrograde" || event.phase === "station-direct");
}

function isPrincipalLunation(event: LunarCalendarEvent) {
  if (event.type !== "lunation" || event.primary === false) return false;

  const title = event.title.toLowerCase();
  return title.startsWith("new moon")
    || title.startsWith("full moon")
    || title.includes("solar eclipse")
    || title.includes("lunar eclipse");
}

function isEclipseLunation(event: LunarCalendarEvent) {
  return event.type === "lunation"
    && (Boolean(event.eclipseType) || event.title.toLowerCase().includes("eclipse"));
}

function approvedSourceRow(contentKey: string, rows = sourceRows) {
  return rows.find((row) => row.contentKey === contentKey && isReaderEligible(row));
}

function renderStation(
  event: LunarCalendarEvent,
  risingSign?: string,
  rows = sourceRows,
  stationPosition?: PlanetPosition,
  timeZone = "UTC"
) {
  const planet = normalizeId(event.planet ?? "");
  const direction = event.direction === "retrograde" ? "rx" : "direct";
  const authored = approvedSourceRow(`authored/station/${planet}/${direction}`, rows);
  const station = authored
    ? {
      headline: authored.headline,
      driverLabel: event.title,
      timing: undefined,
      body: authored.body,
      source: "station" as const,
      house: undefined as number | undefined
    }
    : (() => {
      const rendered = transitSynastryFallbackRendererV3.renderTransitRetro({
        planet,
        sign: normalizeId(event.sign ?? ""),
        window: event.direction === "retrograde" ? "Beginning today" : "Turning direct today"
      });
      return {
        headline: rendered.headline,
        driverLabel: event.title,
        timing: undefined,
        body: rendered.body,
        source: "station" as const,
        house: undefined as number | undefined
      };
    })();
  const sign = normalizeId(event.sign ?? "");
  const house = risingSign && sign ? wholeSignHouse(sign, risingSign) : null;

  if (!house) return station;
  const timing = stationHouseTiming(event, stationPosition, timeZone);

  try {
    const houseLayer = transitSynastryFallbackRendererV3.renderTransitHouse({
      planet,
      house,
      sign,
      isRetrograde: event.direction === "retrograde"
    });
    const driverLabel = `${event.title} in your ${ordinalHouse(house)} house`;
    return {
      headline: `${station.headline} in your ${ordinalHouse(house)} house`,
      driverLabel,
      timing,
      body: `${station.body}\n\n${houseLayer.body}`,
      source: station.source,
      house
    };
  } catch (error) {
    if (!(error instanceof SourceGapError)) throw error;
    return station;
  }
}

export function resolveWeeklyStationCopy(
  event: LunarCalendarEvent,
  rows: WeeklySourceRow[] = sourceRows,
  risingSign?: string,
  stationPosition?: PlanetPosition,
  timeZone = "UTC"
) {
  return renderStation(event, risingSign, rows, stationPosition, timeZone);
}

function renderLunation(
  event: LunarCalendarEvent,
  risingSign: string,
  eventSky: SkySnapshot,
  matchingNewMoon?: MatchingNewMoonFact,
  timeZone = "UTC"
) {
  const kind = lunationKind(event);
  const blendFacts = lunationBlendFacts(eventSky, event.sign ?? "", risingSign, kind);
  const rendered = transitSynastryFallbackRendererV3.renderLunationHoroscope({
    kind,
    sign: normalizeId(event.sign ?? ""),
    risingSign: normalizeId(risingSign),
    eventDate: event.startsAt,
    matchingNewMoon,
    timeZone,
    ...blendFacts,
    weekly: true
  });
  assertLunationBodyMatchesEventSky(rendered.body, eventSky);
  void reportLiveOmittedSections(rendered.reviewFlags, {
    surface: "weekly-horoscope",
    headline: rendered.headline,
    eventDate: event.startsAt,
    eventKind: kind,
    sign: normalizeId(event.sign ?? ""),
    risingSign: normalizeId(risingSign),
    timeZone
  });

  return {
    headline: rendered.headline,
    body: rendered.body,
    source: "lunation" as const,
    reviewFlags: rendered.reviewFlags
  };
}

function lunationKind(event: LunarCalendarEvent) {
  return event.eclipseType
    ? `eclipse-${event.eclipseType}`
    : event.title.toLowerCase().includes("new")
      ? "new-moon"
      : "full-moon";
}

function weeklyTransitAspectContentKey(contact: TransitContact) {
  const direction = contact.isRetrograde ? "rx" : "direct";
  return `authored/weekly-transit-aspect/${contact.transiting}/${contact.sign}/${direction}/${contact.natal}/${contact.aspect}`;
}

function renderContact(
  contact: TransitContact,
  source: "return" | "heavy",
  variantSeed: string,
  rows: WeeklySourceRow[] = sourceRows
) {
  if (source === "return") {
    const rendered = transitSynastryFallbackRendererV3.renderTransitReturn({ planet: contact.transiting });
    return { headline: rendered.headline, body: rendered.body, source };
  }

  const weeklyAuthored = approvedSourceRow(weeklyTransitAspectContentKey(contact), rows);
  if (weeklyAuthored) {
    return {
      headline: weeklyAuthored.headline || `${title(contact.transiting)} ${aspectRelations[contact.aspect]} your ${title(contact.natal)}`,
      body: weeklyAuthored.body,
      source
    };
  }

  const rendered = transitSynastryFallbackRendererV3.renderTransitAspect({
    transiting: contact.transiting,
    natal: contact.natal,
    aspect: contact.aspect,
    sign: contact.sign,
    isRetrograde: contact.isRetrograde,
    variant: stableVariant(variantSeed)
  });
  return { headline: rendered.headline, body: rendered.body, source };
}

function weekTypeFor(events: LunarCalendarEvent[], contacts: TransitContact[]): WeeklyHoroscopeWeekType {
  if (events.some((event) => isPrincipalLunation(event) && isEclipseLunation(event))) return "eclipse";
  if (events.some(isPrincipalLunation)) return "lunation";
  if (events.some(isExactStation)) return "station";
  if (contacts.some((contact) => (
    contact.orb <= 0.25
    && (
      (contact.aspect === "conjunction" && contact.transiting === contact.natal)
      || ["saturn", "uranus", "neptune", "pluto"].includes(contact.transiting)
    )
  ))) return "headliner";
  if (events.some((event) => event.primary)) return "standard";
  return "quiet";
}

function openerFor(weekType: WeeklyHoroscopeWeekType, events: LunarCalendarEvent[], rows = sourceRows) {
  const lunation = events.find(isPrincipalLunation);
  const key = weekType === "eclipse" || weekType === "lunation"
    ? lunation?.title.toLowerCase().includes("new") ? "new-moon" : "full-moon"
    : weekType;
  const row = approvedSourceRow(`authored/week-opener/${key}`, rows);
  if (!row) return undefined;

  const mainShifts = calendarWeeklyMainShifts(events);
  const leadEvent = weekType === "station"
    ? mainShifts.find((event) => event.type === "station")
    : weekType === "eclipse" || weekType === "lunation"
      ? lunation
      : mainShifts[0];
  const leadEventTitle = calendarWeeklyEventTitle(leadEvent);

  if ((key === "new-moon" || key === "full-moon") && lunation?.sign) {
    try {
      const sign = normalizeId(lunation.sign);
      const rendered = fallbackV3LunationCompact(key, sign);

      if (!rendered) return undefined;

      return {
        headline: leadEventTitle,
        body: rendered.body,
        contentKey: rendered.contentKey,
        reviewStatus: row.review_status,
        approvedVia: row.approved_via
      };
    } catch (error) {
      if (!(error instanceof SourceGapError)) throw error;
      return undefined;
    }
  }

  const signTitle = title(normalizeId(lunation?.sign ?? ""));
  const interpolateWeeklyCopy = (value: string) => value
    .replaceAll("{{signTitle}}", signTitle)
    .replaceAll("{{leadEventTitle}}", leadEventTitle);
  const weeklyHeadline = interpolateWeeklyCopy(row.weeklyHeadline ?? row.headline);
  const weeklyOverview = interpolateWeeklyCopy(row.weeklyOverview ?? row.body);
  if (/\{\{[^}]+\}\}/.test(`${weeklyHeadline}\n${weeklyOverview}`)) return undefined;
  return {
    headline: leadEventTitle || weeklyHeadline,
    body: weeklyOverview,
    contentKey: row.contentKey,
    reviewStatus: row.review_status,
    approvedVia: row.approved_via
  };
}

export function resolveWeeklyOpener(
  weekType: WeeklyHoroscopeWeekType,
  events: LunarCalendarEvent[],
  rows: WeeklySourceRow[] = sourceRows
) {
  return openerFor(weekType, events, rows);
}

export function calendarWeekTypeFor(events: LunarCalendarEvent[]): WeeklyHoroscopeWeekType {
  if (events.some((event) => isPrincipalLunation(event) && event.eclipseType)) return "eclipse";
  if (events.some(isPrincipalLunation)) return "lunation";
  if (events.some((event) => event.type === "station")) return "station";
  if (events.some((event) => event.primary)) return "headliner";
  if (events.length > 0) return "standard";
  return "quiet";
}

function normalizedWeeklyEventTitle(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/giu, " ")
    .trim()
    .toLowerCase();
}

function weeklyEventBaseImportance(event: LunarCalendarEvent) {
  if (isPrincipalLunation(event) && isEclipseLunation(event)) return 600;
  if (isPrincipalLunation(event)) return 550;
  if (event.type === "station") return 500;
  if (event.type === "lunation") return 450;
  if (event.type === "ingress") return 400;
  if (event.type === "aspect") return 300;
  return 0;
}

export function calendarWeeklyEventRank(event: LunarCalendarEvent): WeeklyEventRank {
  const baseImportance = weeklyEventBaseImportance(event);
  const exactnessWeight = event.type === "lunation" || event.type === "station" || event.type === "aspect"
    ? 20
    : 0;
  const durationWeight = event.type === "station" || event.type === "ingress" ? 10 : 0;
  const rarityWeight = isEclipseLunation(event) ? 40 : 0;
  const userVisibilityWeight = event.primary ? 5 : 0;

  return {
    eventId: event.id,
    baseImportance,
    exactnessWeight,
    durationWeight,
    rarityWeight,
    userVisibilityWeight,
    finalScore: baseImportance
      + exactnessWeight
      + durationWeight
      + rarityWeight
      + userVisibilityWeight
  };
}

function calendarWeeklyEventTitle(event?: LunarCalendarEvent) {
  if (!event) return "";
  return event.sign
    && !event.title.toLowerCase().includes(event.sign.toLowerCase())
    && (event.type === "station" || event.type === "lunation")
      ? `${event.title} in ${event.sign}`
      : event.title;
}

export function calendarWeeklyMainShifts(events: LunarCalendarEvent[], maximum = 6) {
  const shifts = events
    .filter((event) => (
      event.type === "lunation"
      || event.type === "ingress"
      || event.type === "station"
      || (event.type === "aspect" && event.primary && !event.planets?.includes("Moon"))
    ));
  const byTitle = new Map<string, LunarCalendarEvent>();

  for (const event of shifts) {
    const titleKey = normalizedWeeklyEventTitle(event.title);
    const existing = byTitle.get(titleKey);
    const eventRank = calendarWeeklyEventRank(event);
    const existingRank = existing ? calendarWeeklyEventRank(existing) : null;

    if (
      !existing
      || (existingRank && eventRank.finalScore > existingRank.finalScore)
      || (
        existingRank
        && eventRank.finalScore === existingRank.finalScore
        && new Date(event.startsAt).getTime() < new Date(existing.startsAt).getTime()
      )
    ) {
      byTitle.set(titleKey, event);
    }
  }

  const selectedIds = new Set(
    [...byTitle.values()]
      .sort((first, second) => {
        const scoreDifference = calendarWeeklyEventRank(second).finalScore
          - calendarWeeklyEventRank(first).finalScore;

        return scoreDifference || new Date(first.startsAt).getTime() - new Date(second.startsAt).getTime();
      })
      .slice(0, Math.max(0, maximum))
      .map((event) => event.id)
  );

  return [...byTitle.values()]
    .filter((event) => selectedIds.has(event.id))
    .sort((first, second) => (
      new Date(first.startsAt).getTime() - new Date(second.startsAt).getTime()
    ));
}

export function calendarWeeklySupportingShifts(
  mainShifts: LunarCalendarEvent[],
  narrativeShifts: LunarCalendarEvent[],
  headline: string
) {
  const normalizedHeadline = normalizedWeeklyEventTitle(headline);
  const narrativeIds = new Set(narrativeShifts.map((event) => event.id));
  const candidates = mainShifts.filter((event) => (
    !narrativeIds.has(event.id)
    && normalizedWeeklyEventTitle(event.title) !== normalizedHeadline
    && !normalizedHeadline.includes(normalizedWeeklyEventTitle(event.title))
  ));
  const nonAspects = candidates.filter((event) => event.type !== "aspect");
  const aspects = candidates.filter((event) => event.type === "aspect");
  const selected = aspects.length > 0
    ? [...nonAspects.slice(0, 2), aspects[0]]
    : nonAspects.slice(0, 3);
  const selectedIds = new Set(selected.map((event) => event.id));

  return candidates.filter((event) => selectedIds.has(event.id));
}

export function calendarWeeklyNarrativeShifts(
  mainShifts: LunarCalendarEvent[],
  mainEvent?: LunarCalendarEvent
) {
  const nonAspects = mainShifts.filter((event) => event.type !== "aspect");
  const aspects = mainShifts.filter((event) => event.type === "aspect");
  const selected = new Map<string, LunarCalendarEvent>();

  const add = (event?: LunarCalendarEvent) => {
    if (event && selected.size < 3) selected.set(event.id, event);
  };

  if (nonAspects.length <= 3) {
    nonAspects.forEach(add);
  } else {
    add(nonAspects[0]);
    add(mainEvent && nonAspects.some((event) => event.id === mainEvent.id)
      ? mainEvent
      : nonAspects[Math.floor(nonAspects.length / 2)]);
    add(nonAspects.at(-1));
  }

  if (selected.size < 3) add(mainEvent);
  for (const aspect of aspects) {
    if (selected.size >= 3) break;
    add(aspect);
  }

  return mainShifts.filter((event) => selected.has(event.id));
}

export function calendarWeeklyNarrativeHeadline(
  narrativeShifts: LunarCalendarEvent[],
  fallbackHeadline: string
) {
  const titles = narrativeShifts.map((event) => {
    if (event.type === "station" && event.planet && event.direction) {
      return `${event.planet} ${event.direction}`;
    }

    if (event.type === "ingress" && event.planet && event.toSign) {
      return `${event.planet} in ${event.toSign}`;
    }

    return calendarWeeklyEventTitle(event);
  }).filter(Boolean);

  if (titles.length === 0) return fallbackHeadline;
  if (titles.length === 1) return titles[0];
  if (titles.length === 2) return `${titles[0]} and ${titles[1]}`;
  return `${titles[0]}, ${titles[1]}, and ${titles[2]}`;
}

function weeklyNarrativeBodyForEvent(
  event: LunarCalendarEvent,
  eventDescriptions: ReadonlyMap<string, string>,
  _dayGuidance: ReadonlyMap<string, string>
) {
  return eventDescriptions.get(event.id)?.trim() ?? "";
}

function normalizedCopyBigrams(value: string) {
  const words = value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/gu, " ")
    .split(/\s+/u)
    .filter(Boolean);

  return new Set(words.slice(0, -1).map((word, index) => `${word} ${words[index + 1]}`));
}

export function calendarCopySimilarity(first: string, second: string) {
  const firstBigrams = normalizedCopyBigrams(first);
  const secondBigrams = normalizedCopyBigrams(second);

  if (firstBigrams.size === 0 || secondBigrams.size === 0) return 0;

  let shared = 0;
  for (const bigram of firstBigrams) {
    if (secondBigrams.has(bigram)) shared += 1;
  }

  return shared / Math.min(firstBigrams.size, secondBigrams.size);
}

export function calendarAdjacentCopyIsDistinct(
  candidate: string,
  previous: string,
  maximumSimilarity = 0.18
) {
  if (!previous) return true;

  const formulaFamilies = (value: string) => {
    const normalized = value.normalize("NFKD").toLowerCase().replace(/[’]/gu, "'").trim();
    const families = new Set<string>();

    if (/^(?:you|your)\s+(?:may|might)\b/u.test(normalized)) families.add("modal-opening");
    if (/\bgood for\b/u.test(normalized)) families.add("good-for-list");
    if (/\byou're allowed to\b/u.test(normalized)) families.add("permission-close");
    if (
      /\b(?:mind|mental|think)\b/u.test(normalized)
      && /\b(?:feel|feeling|emotion|emotional)\b/u.test(normalized)
      && /\b(?:avoid|deflection|distraction|out of)\b/u.test(normalized)
    ) {
      families.add("thinking-to-avoid-feeling");
    }

    return families;
  };
  const candidateFamilies = formulaFamilies(candidate);
  const previousFamilies = formulaFamilies(previous);
  const repeatsFormula = [...candidateFamilies].some((family) => previousFamilies.has(family));

  return !repeatsFormula && calendarCopySimilarity(candidate, previous) < maximumSimilarity;
}

export function calendarWeeklyNarrativeBody({
  overview,
  source,
  narrativeShifts,
  eventDescriptions,
  dayGuidance
}: {
  overview: string;
  source: CalendarWeeklyOverview["source"];
  narrativeShifts: LunarCalendarEvent[];
  eventDescriptions: ReadonlyMap<string, string>;
  dayGuidance: ReadonlyMap<string, string>;
}) {
  const paragraphs: string[] = [];
  const normalizedBodies = new Set<string>();
  const addParagraph = (body: string) => {
    const trimmed = body.trim();
    const normalizedBody = trimmed.replace(/\s+/gu, " ").toLowerCase();

    if (!trimmed || normalizedBodies.has(normalizedBody)) return false;
    paragraphs.push(trimmed);
    normalizedBodies.add(normalizedBody);
    return true;
  };

  for (const event of narrativeShifts) {
    const isGeneratedPrincipalLunation = source === "generated-fallback"
      && isPrincipalLunation(event);
    const body = isGeneratedPrincipalLunation
      ? overview.trim()
      : weeklyNarrativeBodyForEvent(event, eventDescriptions, dayGuidance);
    addParagraph(body);
  }

  if (paragraphs.length >= 2) return paragraphs.join("\n\n");
  return overview.trim() || paragraphs[0] || "";
}

function exactCalendarWeeklyOverviewRow(
  weekStart: string,
  weekEnd: string,
  mainShifts: LunarCalendarEvent[],
  rows: WeeklySourceRow[],
  dailyCopy: string[]
) {
  const row = rows.find((candidate) => (
    candidate.surface === "weekly-overview"
    && candidate.weekStart === weekStart
    && candidate.weekEnd === weekEnd
    && isReaderEligible(candidate)
  ));

  if (!row?.weeklyHeadline || !row.weeklyOverview) return undefined;
  if (dailyCopy.some((body) => calendarCopySimilarity(row.weeklyOverview ?? "", body) >= 0.72)) {
    return undefined;
  }

  const actualTitles = mainShifts.map((event) => normalizedWeeklyEventTitle(event.title));
  const expectedTitles = (row.mainShifts ?? []).map(normalizedWeeklyEventTitle);
  if (
    expectedTitles.length > 0
    && (
      expectedTitles.length !== actualTitles.length
      || expectedTitles.some((expected, index) => expected !== actualTitles[index])
    )
  ) {
    return undefined;
  }

  return row;
}

export function resolveCalendarWeeklyOverview({
  weekStart,
  weekEnd,
  events,
  dailyCopy = [],
  rows = sourceRows
}: {
  weekStart: string;
  weekEnd: string;
  events: LunarCalendarEvent[];
  dailyCopy?: string[];
  rows?: WeeklySourceRow[];
}): CalendarWeeklyOverview | undefined {
  const eventsInWeek = events.filter((event) => {
    const localDateKey = event.dateKey || event.startsAt.slice(0, 10);
    return localDateKey >= weekStart && localDateKey <= weekEnd;
  });
  const mainShifts = calendarWeeklyMainShifts(eventsInWeek);
  const authored = exactCalendarWeeklyOverviewRow(weekStart, weekEnd, mainShifts, rows, dailyCopy);

  if (authored) {
    const mainEvent = authored.mainEvent
      ? mainShifts.find((event) => (
          normalizedWeeklyEventTitle(event.title) === normalizedWeeklyEventTitle(authored.mainEvent ?? "")
        ))
      : undefined;
    return {
      headline: authored.weeklyHeadline!,
      overview: authored.weeklyOverview!,
      weeklyHeadline: authored.weeklyHeadline!,
      weeklyOverview: authored.weeklyOverview!,
      mainShifts,
      mainEvent,
      source: "authored",
      contentSource: contentSourceForRow(authored),
      contentKey: authored.contentKey,
      dateRange: { start: weekStart, end: weekEnd },
      keyShiftIds: mainShifts.map((event) => event.id),
      keyShiftLabels: mainShifts.map(calendarWeeklyEventTitle),
      provenance: {
        sourcePath: "apps/web/src/content/fallbackArchitectureV3/source-rows/station-cards-week-openers-v1.json",
        sourceId: authored.contentKey,
        reviewStatus: authored.review_status,
        approvedVia: authored.approved_via
      }
    };
  }

  const fallback = openerFor(calendarWeekTypeFor(eventsInWeek), eventsInWeek, rows);
  if (!fallback) return undefined;

  const mainEvent = [...mainShifts]
    .sort((first, second) => (
      calendarWeeklyEventRank(second).finalScore - calendarWeeklyEventRank(first).finalScore
    ))[0];

  return {
    headline: fallback.headline,
    overview: fallback.body,
    weeklyHeadline: fallback.headline,
    weeklyOverview: fallback.body,
    mainShifts,
    mainEvent,
    source: "generated-fallback",
    contentSource: /owner\s+(?:rewrite|authored|final)/iu.test(fallback.approvedVia ?? "")
      ? "owner_authored"
      : "owner_approved",
    contentKey: fallback.contentKey,
    dateRange: { start: weekStart, end: weekEnd },
    keyShiftIds: mainShifts.map((event) => event.id),
    keyShiftLabels: mainShifts.map(calendarWeeklyEventTitle),
    provenance: {
      sourcePath: "apps/web/src/content/fallbackArchitectureV3/source-rows/station-cards-week-openers-v1.json",
      sourceId: fallback.contentKey,
      templateVersion: "calendar-weekly-fallback.v2",
      reviewStatus: fallback.reviewStatus,
      approvedVia: fallback.approvedVia
    }
  };
}

function weeklyVoice(body: string) {
  return body
    .replace(/\b[Tt]oday\b/g, (value) => value === "Today" ? "This week" : "this week")
    .replace(/\b[Tt]onight\b/g, (value) => value === "Tonight" ? "This week" : "this week")
    .replace(/\bthe day\b/g, "the week");
}

function eventDayLabel(dateKey: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "long",
    month: "short",
    day: "numeric"
  }).format(new Date(`${dateKey}T12:00:00Z`));
}

function isoWeekNumber(dateKey: string) {
  const date = new Date(`${dateKey}T12:00:00Z`);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86_400_000) + 1) / 7);
}

export function resolveCalendarWeeklyMoonTone({
  mondayDateKey,
  moonSign
}: {
  mondayDateKey: string;
  moonSign: string;
}): CalendarWeeklyMoonTone | undefined {
  const date = new Date(`${mondayDateKey}T12:00:00Z`);

  if (!mondayDateKey || Number.isNaN(date.getTime()) || date.getUTCDay() !== 1) {
    return undefined;
  }

  try {
    const normalizedSign = normalizeId(moonSign);
    const variant = ((isoWeekNumber(mondayDateKey) - 1) % 4) + 1;
    const rendered = transitSynastryFallbackRendererV3.renderWeeklyMoon({
      sign: normalizedSign,
      variant
    });

    return {
      moonSign: title(normalizedSign),
      headline: `Moon in ${title(normalizedSign)} sets the emotional tone`,
      body: rendered.body,
      contentKey: rendered.contentKey,
      source: "weekly-moon"
    };
  } catch (error) {
    if (!(error instanceof SourceGapError)) throw error;
    return undefined;
  }
}

type WeeklySectionCandidate = WeeklyHoroscopeSection & {
  priority: number;
  sortTime: string;
  orb?: number;
};

function composeWeeklyReading(sections: WeeklyHoroscopeSection[]): WeeklyHoroscopeReading {
  const dominant = sections.find((section) => section.accented) ?? sections[0];
  if (!dominant) {
    return {
      dayLabel: "This week",
      headline: "Your week",
      driverLabel: "this week’s transits to your natal chart",
      body: "No single transit takes over the week. Keep your schedule realistic and leave room to respond to what develops.",
      source: "weekly-moon",
      sourceUnits: []
    };
  }

  return {
    dateKey: dominant.dateKey,
    dayLabel: dominant.dayLabel,
    headline: dominant.headline || dominant.driverLabel,
    driverLabel: dominant.driverLabel,
    timing: dominant.timing,
    body: dominant.body,
    tag: dominant.tag,
    source: dominant.source,
    orb: dominant.orb,
    house: dominant.house,
    sourceUnits: [dominant.unit],
    reviewFlags: dominant.reviewFlags
  };
}

function composeWeeklyAspects(
  sections: WeeklyHoroscopeSection[],
  horoscope: WeeklyHoroscopeReading
): WeeklyHoroscopeReading[] {
  const primaryUnits = new Set(horoscope.sourceUnits);

  return sections
    .filter((section) => (
      (section.source === "heavy" || section.source === "return")
      && !primaryUnits.has(section.unit)
    ))
    .map((section) => ({
      dateKey: section.dateKey,
      dayLabel: section.dayLabel,
      headline: section.headline || section.driverLabel,
      driverLabel: section.driverLabel,
      timing: section.timing,
      body: section.body,
      tag: section.tag,
      source: section.source,
      orb: section.orb,
      house: section.house,
      sourceUnits: [section.unit]
    }));
}

export async function buildWeeklyHoroscope({
  userId,
  natalSky,
  risingSign,
  location,
  now = new Date(),
  dailyServedUnitsByDate = {},
  generatedContent,
  rows = sourceRows
}: {
  userId: string;
  natalSky: SkySnapshot;
  risingSign: string;
  location: LocationInput;
  now?: Date;
  dailyServedUnitsByDate?: Record<string, string[]>;
  generatedContent?: CmsGeneratedContentMap;
  rows?: WeeklySourceRow[];
}): Promise<WeeklyHoroscopeAssembly> {
  const timeZone = location.timeZone || "UTC";
  const window = weeklyWindowFor(now, timeZone);
  const { events, snapshots, lunationEventSkies, matchingNewMoons, stationEventPositions } = await loadWeeklyEphemeris(location, window);
  if (events.some(isPrincipalLunation)) {
    await loadLunationBookFallbackArchitectureV3Bundle();
  }
  const natalTargets = natalSky.positions.filter((position) => typeof position.longitude === "number");
  const contactsByDay = snapshots.map((snapshot) => weeklyDailyTransitContacts(snapshot, natalTargets));
  const contacts = contactsByDay.flat();
  const closestContacts = new Map<string, { contact: TransitContact; dayIndex: number }>();
  contactsByDay.forEach((dayContacts, dayIndex) => {
    dayContacts.forEach((contact) => {
      const key = `${contact.transiting}:${contact.aspect}:${contact.natal}`;
      const current = closestContacts.get(key);
      if (!current || contact.orb < current.contact.orb) {
        closestContacts.set(key, { contact, dayIndex });
      }
    });
  });
  const weekType = weekTypeFor(events, contacts);
  const sourceGaps: string[] = [];
  const candidates: WeeklySectionCandidate[] = [];
  const returnTimingEntries = [...closestContacts.entries()].filter(([, { contact }]) => (
    isEligibleTransitReturn(contact.transiting, contact.natal, contact.aspect)
  ));
  const { natalTransitTimingForOffMainThread } = await import("./skyCalculationClient");
  const returnTimings = new Map(await Promise.all(returnTimingEntries.map(async ([key, { contact, dayIndex }]) => {
    const natal = natalTargets.find((position) => normalizeId(position.planet) === contact.natal);
    const timing = typeof natal?.longitude === "number"
      ? await natalTransitTimingForOffMainThread(title(contact.transiting), natal.longitude, snapshots[dayIndex]?.generatedAt ?? now, {
          aspectDegrees: 0,
          presentationDegrees: 1,
          timeZone
        })
      : null;
    return [key, timing] as const;
  })));

  events
    .filter((event) => isPrincipalLunation(event) || isExactStation(event))
    .forEach((event) => {
      try {
        if (event.type === "lunation") {
          const eventSky = lunationEventSkies.get(event.id);
          if (!eventSky) throw new SourceGapError(`SOURCE_GAP: event-time sky missing for ${event.id}`);
          const rendered = renderLunation(
            event,
            risingSign,
            eventSky,
            matchingNewMoons.get(event.id),
            timeZone
          );
          candidates.push({
            dateKey: event.dateKey,
            dayLabel: eventDayLabel(event.dateKey),
            headline: rendered.headline,
            driverLabel: event.title,
            body: weeklyVoice(rendered.body),
            tag: event.eclipseType ? `${title(event.eclipseType)} eclipse` : event.title,
            accented: false,
            source: rendered.source,
            reviewFlags: rendered.reviewFlags,
            unit: `lunation:${event.id}`,
            priority: event.eclipseType ? 0 : 1,
            sortTime: event.startsAt
          });
        } else {
          const rendered = renderStation(
            event,
            risingSign,
            rows,
            stationEventPositions.get(event.id),
            timeZone
          );
          candidates.push({
            dateKey: event.dateKey,
            dayLabel: eventDayLabel(event.dateKey),
            headline: rendered.headline,
            driverLabel: rendered.driverLabel,
            timing: rendered.timing,
            body: weeklyVoice(rendered.body),
            tag: event.direction === "retrograde" ? "Stations retrograde" : "Stations direct",
            house: rendered.house,
            accented: false,
            source: rendered.source,
            unit: `station:${event.id}`,
            priority: 2,
            sortTime: event.startsAt
          });
        }
      } catch (error) {
        if (!(error instanceof SourceGapError)) throw error;
        sourceGaps.push(`${event.dateKey}:${error instanceof Error ? error.message : String(error)}`);
      }
    });

  [...closestContacts.entries()].forEach(([contactKey, { contact, dayIndex }]) => {
    const returnTiming = returnTimings.get(contactKey);
    const isReturn = Boolean(returnTiming);
    const isHeavy = ["saturn", "uranus", "neptune", "pluto"].includes(contact.transiting)
      && contact.orb <= 0.25;
    if (!isReturn && !isHeavy) return;
    const dateKey = window.dateKeys[dayIndex];
    if ((dailyServedUnitsByDate[dateKey] ?? []).includes(contact.unit)) return;
    const source = isReturn ? "return" : "heavy";

    try {
      const rendered = renderContact(contact, source, `${userId}:${contact.transiting}:${contact.unit}`, rows);
      candidates.push({
        dateKey,
        dayLabel: eventDayLabel(dateKey),
        headline: rendered.headline,
        driverLabel: source === "return"
          ? `${title(contact.transiting)} return`
          : `${title(contact.transiting)} ${aspectRelations[contact.aspect]} your ${title(contact.natal)}`,
        body: weeklyVoice(rendered.body),
        tag: source === "return" ? "Return" : `${title(contact.aspect)} · ${contact.orb.toFixed(2)}°`,
        timing: source === "return" && returnTiming
          ? `${returnTiming.engagementStart.slice(0, 10)} – ${returnTiming.engagementEnd.slice(0, 10)}`
          : undefined,
        accented: false,
        source: rendered.source,
        unit: source === "return"
          ? `return:${contact.transiting}`
          : `heavy:${contact.transiting}:${contact.unit}`,
        priority: source === "return" ? 3 : 4,
        sortTime: `${dateKey}T16:00:00.000Z`,
        orb: contact.orb
      });
    } catch (error) {
      if (!(error instanceof SourceGapError)) throw error;
      sourceGaps.push(`${dateKey}:${error instanceof Error ? error.message : String(error)}`);
    }
  });

  const uniqueBodies = new Set<string>();
  const capped = candidates
    .sort((first, second) => (
      first.priority - second.priority
      || (first.orb ?? 0) - (second.orb ?? 0)
      || first.sortTime.localeCompare(second.sortTime)
    ))
    .filter((candidate) => {
      const key = candidate.body.trim();
      if (uniqueBodies.has(key)) return false;
      uniqueBodies.add(key);
      return true;
    })
    .slice(0, 4);

  let sections = capped
    .sort((first, second) => first.sortTime.localeCompare(second.sortTime))
    .map(({ priority: _priority, sortTime: _sortTime, ...section }) => section);

  if (sections.length === 0) {
    const mondayMoon = snapshots[0]?.positions.find((position) => position.planet === "Moon");
    if (mondayMoon) {
      try {
        const rendered = transitSynastryFallbackRendererV3.renderWeeklyMoon({
          sign: normalizeId(mondayMoon.sign),
          variant: (isoWeekNumber(window.weekStart) % 3) + 1
        });
        sections = [{
          dayLabel: "Weekly Moon",
          headline: rendered.headline,
          driverLabel: `Moon in ${title(mondayMoon.sign)}`,
          body: rendered.body,
          tag: rendered.focus ?? undefined,
          accented: false,
          source: "weekly-moon",
          unit: `weekly-moon:${window.weekStart}:${normalizeId(mondayMoon.sign)}`
        }];
      } catch (error) {
        if (!(error instanceof SourceGapError)) throw error;
        sourceGaps.push(error instanceof Error ? error.message : String(error));
      }
    }
  }

  const accentSource = weekType === "eclipse" || weekType === "lunation"
    ? "lunation"
    : weekType === "station"
      ? "station"
      : weekType === "headliner"
        ? sections.find((section) => section.source === "return" || section.source === "heavy")?.source
        : undefined;
  const accentIndex = accentSource ? sections.findIndex((section) => section.source === accentSource) : -1;
  if (accentIndex >= 0) {
    sections = sections.map((section, index) => ({ ...section, accented: index === accentIndex }));
  }

  sections = sections.map((section) => {
    const override = resolveCmsSurfaceOverride(
      generatedContent,
      cmsSurfaceKeys.weeklySection(section.source, risingSign),
      {
        risingSign,
        date: section.dateKey ?? "",
        day: section.dayLabel,
        driver: section.driverLabel,
        timing: section.timing ?? "",
        house: section.house ?? "",
        houseOrdinal: section.house ? `${section.house}${section.house === 1 ? "st" : section.house === 2 ? "nd" : section.house === 3 ? "rd" : "th"}` : ""
      }
    );
    return override
      ? { ...section, headline: override.headline || section.headline, body: override.body }
      : section;
  });

  const macroEvent = events.find(isPrincipalLunation);
  let macro: WeeklyHoroscopeAssembly["macro"];
  if (macroEvent) {
    try {
      const rendered = transitSynastryFallbackRendererV3.renderLunationMacro({
        kind: lunationKind(macroEvent),
        sign: normalizeId(macroEvent.sign ?? "")
      });
      const override = resolveCmsSurfaceOverride(
        generatedContent,
        cmsSurfaceKeys.weeklySection("macro", risingSign),
        { risingSign, weekStart: window.weekStart, weekEnd: window.weekEnd }
      );
      macro = {
        headline: override?.headline || rendered.headline,
        body: override?.body || rendered.body
      };
    } catch (error) {
      if (!(error instanceof SourceGapError)) throw error;
      // Macro coverage is intentionally sparse. Missing units leave the existing
      // personalized weekly path unchanged and never trigger synthesized copy.
    }
  }
  const horoscope = composeWeeklyReading(sections);

  return {
    status: "ready",
    weekStart: window.weekStart,
    weekEnd: window.weekEnd,
    weekType,
    chip: weekTypeLabels[weekType],
    macro,
    horoscope,
    aspects: composeWeeklyAspects(sections, horoscope),
    sourceGaps,
    derivation: {
      calculationTimeUtc: "16:00",
      publicationTimeLocal: "Sunday 20:00",
      contentImportCounts: weeklyContentImportCounts
    }
  };
}
