import weeklySourceRows from "../content/fallbackArchitectureV3/source-rows/station-cards-week-openers-v1.json";
import {
  SourceGapError,
  transitSynastryFallbackRendererV3
} from "../content/fallbackArchitectureV3Runtime";
import type { LocationInput, PlanetPosition, SkySnapshot } from "../types";
import type { LunarCalendarEvent } from "./ephemeris";

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
  body: string;
  macro?: {
    headline: string;
    body: string;
  };
  tag?: string;
  accented: boolean;
  source: "lunation" | "station" | "return" | "heavy" | "weekly-moon";
  unit: string;
};

export type WeeklyHoroscopeOpener = {
  headline: string;
  body: string;
};

export type WeeklyHoroscopeAssembly = {
  status: "loading" | "ready" | "error";
  weekStart: string;
  weekEnd: string;
  weekType: WeeklyHoroscopeWeekType;
  chip: string;
  opener?: WeeklyHoroscopeOpener;
  sections: WeeklyHoroscopeSection[];
  background?: string;
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
  review_status: string;
};

type WeeklyWindow = {
  weekStart: string;
  weekEnd: string;
  dateKeys: string[];
};

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

const sourceRows = weeklySourceRows as WeeklySourceRow[];
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
const signRulers: Record<string, string> = {
  aries: "mars",
  taurus: "venus",
  gemini: "mercury",
  cancer: "moon",
  leo: "sun",
  virgo: "mercury",
  libra: "venus",
  scorpio: "mars",
  sagittarius: "jupiter",
  capricorn: "saturn",
  aquarius: "saturn",
  pisces: "jupiter"
};
const signs = ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"];

export const weeklyContentImportCounts = Object.freeze({
  total: sourceRows.length,
  station: sourceRows.filter((row) => row.surface === "weekly-station").length,
  openers: sourceRows.filter((row) => row.surface === "weekly-opener").length,
  readerEligible: sourceRows.filter((row) => isReaderEligible(row)).length,
  needsReview: sourceRows.filter((row) => row.review_status === "needs_review").length
});

function isReaderEligible(row: WeeklySourceRow) {
  return readerEligibleReviewStatuses.has(row.review_status.trim().toLowerCase());
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

function wholeSignHouse(sign: string, risingSign: string) {
  const signIndex = signs.indexOf(normalizeId(sign));
  const risingIndex = signs.indexOf(normalizeId(risingSign));
  return signIndex < 0 || risingIndex < 0 ? null : ((signIndex - risingIndex + 12) % 12) + 1;
}

export function lunationBlendFacts(
  snapshot: SkySnapshot,
  lunationSign: string,
  risingSign: string,
  kind: string
) {
  const normalizedSign = normalizeId(lunationSign);
  const ruler = signRulers[normalizedSign] ?? null;
  const moonHouse = wholeSignHouse(normalizedSign, risingSign);
  const isFullMoon = kind === "full-moon" || kind === "eclipse-lunar";
  const sun = isFullMoon
    ? snapshot.positions.find((position) => normalizeId(position.planet) === "sun")
    : null;
  const sunHouse = sun ? wholeSignHouse(sun.sign, risingSign) : null;
  const rulerPosition = ruler && ruler !== "sun" && ruler !== "moon"
    ? snapshot.positions.find((position) => normalizeId(position.planet) === ruler)
    : null;
  const rulerHouse = rulerPosition ? wholeSignHouse(rulerPosition.sign, risingSign) : null;
  const uranus = snapshot.positions.find((position) => normalizeId(position.planet) === "uranus");
  const moon = snapshot.positions.find((position) => normalizeId(position.planet) === "moon");
  const uranusHouse = uranus ? wholeSignHouse(uranus.sign, risingSign) : null;
  const uranusSeparation = uranus && moon
    && typeof uranus.longitude === "number"
    && typeof moon.longitude === "number"
    ? angularSeparation(uranus.longitude, moon.longitude)
    : null;
  const uranusMakesCloseAspect = uranusSeparation !== null && exactAspects.some(
    ({ degrees }) => Math.abs(uranusSeparation - degrees) <= 3
  );
  const uranusIsAngular = uranusHouse !== null && [1, 4, 7, 10].includes(uranusHouse);

  return {
    moonHouse,
    sunHouse,
    ruler,
    rulerHouse,
    uranusHouse,
    uranusActive: uranusMakesCloseAspect || uranusIsAngular
  };
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

function allTransitContacts(snapshot: SkySnapshot, natalTargets: PlanetPosition[]) {
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

function approvedSourceRow(contentKey: string, rows = sourceRows) {
  return rows.find((row) => row.contentKey === contentKey && isReaderEligible(row));
}

function renderStation(event: LunarCalendarEvent, rows = sourceRows) {
  const planet = normalizeId(event.planet ?? "");
  const direction = event.direction === "retrograde" ? "rx" : "direct";
  const authored = approvedSourceRow(`authored/station/${planet}/${direction}`, rows);

  if (authored) {
    return {
      headline: authored.headline,
      body: authored.body,
      source: "station" as const
    };
  }

  const rendered = transitSynastryFallbackRendererV3.renderTransitRetro({
    planet,
    sign: normalizeId(event.sign ?? ""),
    window: event.direction === "retrograde" ? "Beginning today" : "Turning direct today"
  });

  return {
    headline: rendered.headline,
    body: rendered.body,
    source: "station" as const
  };
}

export function resolveWeeklyStationCopy(
  event: LunarCalendarEvent,
  rows: WeeklySourceRow[] = sourceRows
) {
  return renderStation(event, rows);
}

function renderLunation(event: LunarCalendarEvent, risingSign: string, eventSky: SkySnapshot) {
  const kind = lunationKind(event);
  const blendFacts = lunationBlendFacts(eventSky, event.sign ?? "", risingSign, kind);
  const rendered = transitSynastryFallbackRendererV3.renderLunationHoroscope({
    kind,
    sign: normalizeId(event.sign ?? ""),
    risingSign: normalizeId(risingSign),
    ...blendFacts
  });

  return {
    headline: rendered.headline,
    body: rendered.body,
    source: "lunation" as const
  };
}

function lunationKind(event: LunarCalendarEvent) {
  return event.eclipseType
    ? `eclipse-${event.eclipseType}`
    : event.title.toLowerCase().includes("new")
      ? "new-moon"
      : "full-moon";
}

function renderContact(contact: TransitContact, source: "return" | "heavy", variantSeed: string) {
  if (source === "return") {
    const rendered = transitSynastryFallbackRendererV3.renderTransitReturn({ planet: contact.transiting });
    return { headline: rendered.headline, body: rendered.body, source };
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
  if (events.some((event) => event.type === "lunation" && event.eclipseType)) return "eclipse";
  if (events.some((event) => event.type === "lunation")) return "lunation";
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
  const lunation = events.find((event) => event.type === "lunation");
  const key = weekType === "eclipse" || weekType === "lunation"
    ? lunation?.title.toLowerCase().includes("new") ? "new-moon" : "full-moon"
    : weekType;
  const row = approvedSourceRow(`authored/week-opener/${key}`, rows);
  if (!row) return undefined;

  const signTitle = title(normalizeId(lunation?.sign ?? ""));
  const body = row.body.replaceAll("{{signTitle}}", signTitle);
  if (/\{\{[^}]+\}\}/.test(body)) return undefined;
  return { headline: row.headline, body };
}

export function resolveWeeklyOpener(
  weekType: WeeklyHoroscopeWeekType,
  events: LunarCalendarEvent[],
  rows: WeeklySourceRow[] = sourceRows
) {
  return openerFor(weekType, events, rows);
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

type WeeklySectionCandidate = WeeklyHoroscopeSection & {
  priority: number;
  sortTime: string;
  orb?: number;
};

function bodyKey(body: string) {
  return body.trim().replace(/\s+/g, " ").toLowerCase();
}

function mergeDistinctBodies(primary: string, additions: string[]) {
  const seen = new Set(primary.split(/\n{2,}/).map(bodyKey));
  const unique = additions
    .map((body) => body.trim())
    .filter(Boolean)
    .filter((body) => {
      const key = bodyKey(body);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  return [primary.trim(), ...unique].filter(Boolean).join("\n\n");
}

function nextRetrogradeNodeSign(sign: string) {
  const index = signs.indexOf(normalizeId(sign));
  return index < 0 ? null : signs[(index + signs.length - 1) % signs.length];
}

function daysBetween(first: string, second: string) {
  return Math.round(
    (new Date(`${second}T12:00:00Z`).getTime() - new Date(`${first}T12:00:00Z`).getTime())
    / 86_400_000
  );
}

function weeklyBackground({
  events,
  snapshots,
  previousSnapshot,
  window
}: {
  events: LunarCalendarEvent[];
  snapshots: SkySnapshot[];
  previousSnapshot: SkySnapshot;
  window: WeeklyWindow;
}) {
  const monday = snapshots[0];
  if (!monday) return undefined;

  const stationPlanets = new Set(
    events.filter(isExactStation).map((event) => normalizeId(event.planet ?? ""))
  );
  const pieces: string[] = [];
  const personalIngresses = events.filter((event) => (
    event.type === "ingress"
    && ["sun", "mercury", "venus", "mars"].includes(normalizeId(event.planet ?? ""))
  ));

  for (const event of personalIngresses) {
    pieces.push(
      `${title(normalizeId(event.planet ?? ""))} enters ${title(normalizeId(event.sign ?? ""))} on ${eventDayLabel(event.dateKey)}.`
    );
  }

  const previousByPlanet = new Map(
    previousSnapshot.positions.map((position) => [normalizeId(position.planet), position])
  );
  for (const position of monday.positions) {
    if (pieces.length >= 4) break;
    const planet = normalizeId(position.planet);
    if (planet === "moon" || stationPlanets.has(planet)) continue;
    const previous = previousByPlanet.get(planet);
    if (!previous) continue;

    if (normalizeId(previous.sign) !== normalizeId(position.sign)) {
      pieces.push(
        `${title(planet)} begins the week in ${title(normalizeId(position.sign))}, a change from last week.`
      );
      continue;
    }

    if (
      position.motion === "retrograde"
      && previous.motion === "retrograde"
      && ["mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto", "chiron"].includes(planet)
    ) {
      pieces.push(`${title(planet)} remains retrograde in ${title(normalizeId(position.sign))}.`);
    }
  }

  const northNode = monday.positions.find((position) => normalizeId(position.planet) === "north-node");
  if (northNode?.transitEnd) {
    const ingressDate = northNode.transitEnd.slice(0, 10);
    const daysUntilIngress = daysBetween(window.weekEnd, ingressDate);
    if (daysUntilIngress >= 0 && daysUntilIngress <= 42) {
      const nextSign = nextRetrogradeNodeSign(northNode.sign);
      if (nextSign) {
        const countdown = daysUntilIngress <= 7
          ? "within a week"
          : `in about ${Math.max(2, Math.round(daysUntilIngress / 7))} weeks`;
        pieces.unshift(
          `The North Node changes signs ${countdown}, moving from ${title(normalizeId(northNode.sign))} into ${title(nextSign)}.`
        );
      }
    }
  }

  const unique = [...new Map(pieces.map((piece) => [bodyKey(piece), piece])).values()].slice(0, 4);
  return unique.length > 0 ? unique.join(" ") : undefined;
}

export async function buildWeeklyHoroscope({
  userId,
  natalSky,
  risingSign,
  location,
  now = new Date(),
  dailyServedUnitsByDate = {},
  rows = sourceRows,
  ephemeris
}: {
  userId: string;
  natalSky: SkySnapshot;
  risingSign: string;
  location: LocationInput;
  now?: Date;
  dailyServedUnitsByDate?: Record<string, string[]>;
  rows?: WeeklySourceRow[];
  ephemeris?: {
    getAstrodienstSky: typeof import("./ephemeris").getAstrodienstSky;
    getLunarCalendarMonth: typeof import("./ephemeris").getLunarCalendarMonth;
  };
}): Promise<WeeklyHoroscopeAssembly> {
  const timeZone = location.timeZone || "UTC";
  const window = weeklyWindowFor(now, timeZone);
  const calculationDates = window.dateKeys.map((dateKey) => new Date(`${dateKey}T16:00:00Z`));
  const {
    getAstrodienstSky,
    getLunarCalendarMonth
  } = ephemeris ?? await import("./ephemeris");
  const [calendar, ...snapshots] = await Promise.all([
    getLunarCalendarMonth(location, calculationDates[3], { detail: "full" }),
    ...calculationDates.map((date) => getAstrodienstSky(location, date, { includeTransitWindows: true }))
  ]);
  const previousSnapshot = await getAstrodienstSky(
    location,
    new Date(`${addUtcDays(window.weekStart, -7)}T16:00:00Z`),
    { includeTransitWindows: true }
  );
  const dateKeySet = new Set(window.dateKeys);
  const events = calendar.events
    .filter((event) => dateKeySet.has(event.dateKey))
    .sort((first, second) => first.startsAt.localeCompare(second.startsAt));
  const lunationEvents = events.filter((event) => event.type === "lunation");
  const lunationEventSkies = new Map<string, SkySnapshot>(
    await Promise.all(lunationEvents.map(async (event) => [
      event.id,
      await getAstrodienstSky(location, new Date(event.startsAt), { includeTransitWindows: true })
    ] as const))
  );
  const natalTargets = natalSky.positions.filter((position) => typeof position.longitude === "number");
  const contactsByDay = snapshots.map((snapshot) => allTransitContacts(snapshot, natalTargets));
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

  events
    .filter((event) => event.type === "lunation" || isExactStation(event))
    .forEach((event) => {
      try {
        if (event.type === "lunation") {
          const eventSky = lunationEventSkies.get(event.id);
          if (!eventSky) throw new SourceGapError(`SOURCE_GAP: event-time sky missing for ${event.id}`);
          const rendered = renderLunation(event, risingSign, eventSky);
          let macro: WeeklyHoroscopeSection["macro"];
          try {
            const renderedMacro = transitSynastryFallbackRendererV3.renderLunationMacro({
              kind: lunationKind(event),
              sign: normalizeId(event.sign ?? "")
            });
            macro = {
              headline: renderedMacro.headline,
              body: renderedMacro.body
            };
          } catch (error) {
            if (!(error instanceof SourceGapError)) throw error;
            // Sparse macro coverage falls back to the existing assembled card.
          }
          candidates.push({
            dateKey: event.dateKey,
            dayLabel: eventDayLabel(event.dateKey),
            headline: rendered.headline,
            driverLabel: event.title,
            body: weeklyVoice(rendered.body),
            macro,
            tag: event.eclipseType ? `${title(event.eclipseType)} eclipse` : event.title,
            accented: false,
            source: rendered.source,
            unit: `lunation:${event.id}`,
            priority: event.eclipseType ? 0 : 1,
            sortTime: event.startsAt
          });
        } else {
          const rendered = renderStation(event, rows);
          candidates.push({
            dateKey: event.dateKey,
            dayLabel: eventDayLabel(event.dateKey),
            headline: rendered.headline,
            driverLabel: event.title,
            body: weeklyVoice(rendered.body),
            tag: event.direction === "retrograde" ? "Stations retrograde" : "Stations direct",
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

  [...closestContacts.values()].forEach(({ contact, dayIndex }) => {
    const isReturn = contact.aspect === "conjunction"
      && contact.transiting === contact.natal
      && contact.orb <= 0.25;
    const isHeavy = ["saturn", "uranus", "neptune", "pluto"].includes(contact.transiting)
      && contact.orb <= 0.25;
    if (!isReturn && !isHeavy) return;
    const dateKey = window.dateKeys[dayIndex];
    if ((dailyServedUnitsByDate[dateKey] ?? []).includes(contact.unit)) return;
    const source = isReturn ? "return" : "heavy";

    try {
      const rendered = renderContact(contact, source, `${userId}:${contact.transiting}:${contact.unit}`);
      candidates.push({
        dateKey,
        dayLabel: eventDayLabel(dateKey),
        headline: rendered.headline,
        driverLabel: source === "return"
          ? `${title(contact.transiting)} return`
          : `${title(contact.transiting)} ${aspectRelations[contact.aspect]} your ${title(contact.natal)}`,
        body: weeklyVoice(rendered.body),
        tag: source === "return" ? "Return" : `${title(contact.aspect)} · ${contact.orb.toFixed(2)}°`,
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

  const lunationByDate = new Map(
    candidates
      .filter((candidate) => candidate.source === "lunation" && candidate.dateKey)
      .map((candidate) => [candidate.dateKey as string, candidate])
  );
  const mergedSameDay = candidates.filter((candidate) => {
    if (!candidate.dateKey || candidate.source === "lunation") return true;
    const lunation = lunationByDate.get(candidate.dateKey);
    if (!lunation) return true;
    lunation.body = mergeDistinctBodies(lunation.body, [candidate.body]);
    lunation.unit = `${lunation.unit}+${candidate.unit}`;
    return false;
  });

  const uniqueBodies = new Set<string>();
  const capped = mergedSameDay
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
    .map(({ priority: _priority, sortTime: _sortTime, orb: _orb, ...section }) => section);

  if (sections.length === 0) {
    const mondayMoon = snapshots[0]?.positions.find((position) => position.planet === "Moon");
    if (mondayMoon) {
      try {
        const rendered = transitSynastryFallbackRendererV3.renderWeeklyMoon({
          sign: normalizeId(mondayMoon.sign),
          variant: stableVariant(`${userId}:weekly-moon:${isoWeekNumber(window.weekStart)}:${normalizeId(mondayMoon.sign)}`)
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

  const opener = openerFor(weekType, events, rows);
  const background = weeklyBackground({
    events,
    snapshots,
    previousSnapshot,
    window
  });

  return {
    status: "ready",
    weekStart: window.weekStart,
    weekEnd: window.weekEnd,
    weekType,
    chip: weekTypeLabels[weekType],
    opener,
    sections,
    background,
    sourceGaps,
    derivation: {
      calculationTimeUtc: "16:00",
      publicationTimeLocal: "Sunday 20:00",
      contentImportCounts: weeklyContentImportCounts
    }
  };
}
