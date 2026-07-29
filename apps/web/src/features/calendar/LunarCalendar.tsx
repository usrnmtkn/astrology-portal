import { CalendarDays, ChevronLeft, ChevronRight, Loader2, MapPin, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { SegmentedControl } from "../../components/SegmentedControl";
import {
  getLunarCalendarMonth,
  getLunarCalendarWeek,
  type LunarCalendarDay,
  type LunarCalendarEvent,
  type LunarCalendarMonth as LunarCalendarMonthData
} from "../../services/ephemeris";
import { getLunarCalendarFromApi } from "../../services/calendarApi";
import { generatedContentParagraphs, type LiveGeneratedContent } from "../../services/generatedContent";
import {
  fallbackV3HookBody,
  fallbackV3PlanetTopic,
  SourceGapError as FallbackV3SourceGapError,
  transitSynastryFallbackRendererV3 as calendarFallbackRendererV3
} from "../../content/fallbackArchitectureV3Runtime";
import { firstReaderFacingCopy, isReaderFacingCopy } from "../../content/readerSafety";
import {
  skyAspectContentKey,
  skyAspectInstanceContentKey,
  skyIngressContentKey,
  skyIngressInstanceContentKey,
  slugContentPart
} from "../../services/generatedContentKeys";
import { hasMapboxToken, searchCities, type CitySuggestion } from "../../services/mapbox";
import { timeZoneForLocation, withTimeZone } from "../../services/timezones";
import type { LocationInput } from "../../types";
import { resolveLunarDay } from "./lunarDayResolver";
import type { LunarDay, LunarDayArcPoint } from "./lunarDayTypes";
import { sunIngressSeasonSign, sunIngressSeasonWindow } from "./seasonWindow";

type LunarCalendarStatus = "loading" | "ready" | "error";
type LunarCalendarViewMode = "week" | "month";
type CalendarEventProseLayer = "authored" | "fallback";

type NormalizedCalendarEventSection = {
  slot: "description";
  required: boolean;
  layer: CalendarEventProseLayer;
  tier: string;
  sourceKeys: string[];
  body: string;
};

type NormalizedCalendarEventSurface = {
  surface: "calendar-event";
  status: "servable" | "partial" | "not-servable";
  sections: NormalizedCalendarEventSection[];
};

type LunarCalendarProps = {
  location: LocationInput;
  onLocationChange: (location: LocationInput) => void;
  generatedContent?: Map<string, LiveGeneratedContent>;
  onOpenTransit?: (event: LunarCalendarEvent) => void;
  showJournalPrompts?: boolean;
};

type LocationSearchStatus = "idle" | "loading" | "ready" | "empty" | "error";

const viewModeOptions: Array<{ value: LunarCalendarViewMode; label: string }> = [
  { value: "week", label: "Week" },
  { value: "month", label: "Month" }
];

const calendarStorageVersion = "v6";
const calendarStorageTtlMs = 12 * 60 * 60_000;
const enableLunarArcContent = String(import.meta.env.VITE_ENABLE_LUNAR_ARC_CONTENT ?? "true").toLowerCase() !== "false";
const enableCalendarApi = import.meta.env.PROD
  || String(import.meta.env.VITE_USE_LUNAR_CALENDAR_API ?? "false").toLowerCase() === "true";

type StoredCalendarPayload = {
  savedAt: number;
  calendar: LunarCalendarMonthData;
};

function monthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function scheduleIdleTask(callback: () => void, timeout = 1_500) {
  let cancelled = false;
  let cleanup = () => {};
  let firstFrame = 0;
  let secondFrame = 0;

  const runWhenIdle = () => {
    if (cancelled) return;

    if (typeof window.requestIdleCallback === "function") {
      const task = window.requestIdleCallback(callback, { timeout });
      cleanup = () => window.cancelIdleCallback(task);
      return;
    }

    const task = window.setTimeout(callback, 600);
    cleanup = () => window.clearTimeout(task);
  };

  if (typeof window.requestAnimationFrame === "function") {
    firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(runWhenIdle);
    });
  } else {
    runWhenIdle();
  }

  return () => {
    cancelled = true;
    if (firstFrame) window.cancelAnimationFrame(firstFrame);
    if (secondFrame) window.cancelAnimationFrame(secondFrame);
    cleanup();
  };
}

function dateKeyFromDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function monthStartFromDateKey(dateKey: string) {
  const [year = new Date().getFullYear(), month = 1] = dateKey.split("-").map(Number);

  return new Date(year, month - 1, 1);
}

function dateFromDateKey(dateKey: string) {
  const [year = new Date().getFullYear(), month = 1, day = 1] = dateKey.split("-").map(Number);

  return new Date(year, month - 1, day);
}

function weeklyMoonVariantForDate(dateKey: string) {
  const date = new Date(`${dateKey}T12:00:00.000Z`);
  const day = date.getUTCDay() || 7;

  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const isoWeek = Math.ceil((((date.getTime() - yearStart.getTime()) / 86_400_000) + 1) / 7);

  // Four is the largest authored variant family. The renderer falls back to
  // the base card for signs without the selected alternate.
  return ((isoWeek - 1) % 4) + 1;
}

function startOfWeekDate(date: Date) {
  const start = new Date(date);

  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());

  return start;
}

function storageDateKey(date: Date) {
  return dateKeyFromDate(date);
}

function calendarStorageKey(
  location: LocationInput,
  mode: LunarCalendarViewMode,
  anchor: Date
) {
  const normalizedAnchor = mode === "week" ? startOfWeekDate(anchor) : monthStart(anchor);

  return [
    "tldr-lunar-calendar",
    calendarStorageVersion,
    mode,
    storageDateKey(normalizedAnchor),
    location.latitude.toFixed(4),
    location.longitude.toFixed(4),
    location.timeZone || "UTC"
  ].join("|");
}

function readStoredCalendar(key: string): LunarCalendarMonthData | null {
  try {
    const raw = window.localStorage.getItem(key);

    if (!raw) return null;

    const parsed = JSON.parse(raw) as StoredCalendarPayload;

    if (!parsed?.calendar || Date.now() - parsed.savedAt > calendarStorageTtlMs) {
      window.localStorage.removeItem(key);
      return null;
    }

    return parsed.calendar;
  } catch {
    return null;
  }
}

function writeStoredCalendar(key: string, calendar: LunarCalendarMonthData) {
  try {
    window.localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), calendar }));
  } catch {
    // Best effort cache only.
  }
}

async function loadCalendarData(
  location: LocationInput,
  mode: LunarCalendarViewMode,
  anchor: Date,
  detail: "basic" | "full"
) {
  const loadCalendar = mode === "week" ? getLunarCalendarWeek : getLunarCalendarMonth;

  if (!enableCalendarApi) {
    return loadCalendar(location, anchor, { detail });
  }

  try {
    return await getLunarCalendarFromApi(location, mode, anchor, detail);
  } catch {
    return loadCalendar(location, anchor, { detail });
  }
}

function todayKey(timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function formatMonthLabel(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric"
  }).format(date);
}

function formatMonthParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric"
  }).formatToParts(date);

  return {
    month: parts.find((part) => part.type === "month")?.value ?? "",
    year: parts.find((part) => part.type === "year")?.value ?? ""
  };
}

function formatTimeZoneLabel(timeZone?: string) {
  if (!timeZone) {
    return "";
  }

  try {
    const label = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "longGeneric"
    }).formatToParts(new Date()).find((part) => part.type === "timeZoneName")?.value;

    if (label && !label.includes("/")) {
      return label;
    }
  } catch {
    // Fall back to the readable IANA name below.
  }

  return timeZone
    .replace(/_/g, " ")
    .replace(/^America\//, "")
    .replace(/^Europe\//, "")
    .replace(/^Australia\//, "")
    .replace(/^Asia\//, "");
}

function formatDayNumber(day: LunarCalendarDay, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    day: "numeric"
  }).format(new Date(day.date));
}

function formatSelectedDay(day: LunarCalendarDay, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    month: "long",
    day: "numeric"
  }).format(new Date(day.date));
}

function formatWeekday(day: LunarCalendarDay, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short"
  }).format(new Date(day.date));
}

function formatEventDate(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric"
  }).format(new Date(value)).replace(",", " ·");
}

function formatEventTime(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatCompactEventTime(value: string, timeZone: string) {
  return formatEventTime(value, timeZone)
    .replace(/\s?AM$/, "a")
    .replace(/\s?PM$/, "p");
}

function timestampDateKey(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date(value));
}

function formatEventDateMonthDay(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "short",
    day: "numeric"
  }).format(new Date(value));
}

function formatSeasonRange(startDateKey: string, endDateKey: string, timeZone: string) {
  const start = new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "short",
    day: "numeric"
  }).format(dateFromDateKey(startDateKey));
  const end = new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "short",
    day: "numeric"
  }).format(dateFromDateKey(endDateKey));

  return `${start} – ${end}`;
}

function formatEventDateTime(value: string, timeZone: string) {
  return `${formatEventDateMonthDay(value, timeZone)}, ${formatEventTime(value, timeZone)}`;
}

function formatCompactEventDateTime(value: string, timeZone: string) {
  return `${formatEventDateMonthDay(value, timeZone)} ${formatCompactEventTime(value, timeZone)}`;
}

function eventPriority(event: LunarCalendarEvent) {
  if (event.type === "lunation") return 0;
  if ((event.type === "ingress" || event.type === "station") && event.primary) return 1;
  if (event.type === "aspect" && event.primary) return 2;
  if (event.type === "ingress" || event.type === "station") return 3;
  return 4;
}

function dayEventPreview(events: LunarCalendarEvent[]) {
  return [...events].sort((first, second) => {
    const priorityDifference = eventPriority(first) - eventPriority(second);

    if (priorityDifference !== 0) {
      return priorityDifference;
    }

    return new Date(first.startsAt).getTime() - new Date(second.startsAt).getTime();
  });
}

function monthTransitCardEvents(days: LunarCalendarDay[]) {
  return days
    .filter((day) => day.inMonth)
    .flatMap((day) => {
      const sortedEvents = dayEventPreview(day.events);
      const surfacedTransit = sortedEvents.find(isTransitCardEvent);

      return surfacedTransit ? [surfacedTransit] : [];
    })
    .sort((first, second) => new Date(first.startsAt).getTime() - new Date(second.startsAt).getTime());
}

function isTransitCardEvent(event: LunarCalendarEvent) {
  return event.primary && (event.type === "ingress" || event.type === "station");
}

function isActiveRetrogradeEvent(event: LunarCalendarEvent) {
  const title = event.title.toLowerCase();

  return event.type === "station" && title.includes("retrograde") && !title.includes("stations");
}

function activeRetrogradeUntilLabel(event: LunarCalendarEvent, timeZone: string) {
  if (!event.endsAt) {
    return "retrograde";
  }

  return `until ${formatEventDateMonthDay(event.endsAt, timeZone)}`;
}

function isExactDayEvent(event: LunarCalendarEvent, day: LunarCalendarDay) {
  return event.dateKey === day.dateKey && !isActiveRetrogradeEvent(event);
}

function removeActiveRetrogradeStationDuplicates(events: LunarCalendarEvent[], day: LunarCalendarDay) {
  const exactStationPlanets = new Set(
    events
      .filter((event) => (
        event.primary
        && event.type === "station"
        && event.planet
        && event.dateKey === day.dateKey
        && event.title.toLowerCase().includes("stations")
      ))
      .map((event) => event.planet)
  );

  if (exactStationPlanets.size === 0) {
    return events;
  }

  return events.filter((event) => !(
    isActiveRetrogradeEvent(event)
    && event.planet
    && exactStationPlanets.has(event.planet)
  ));
}

function selectedDayTransitEvents(
  day: LunarCalendarDay,
  lunarDay: ReturnType<typeof resolveLunarDay> | null,
  selectedEvents: LunarCalendarEvent[]
) {
  const transits = (lunarDay?.traditional.transits.map((transit) => transit.sourceEvent)
    ?? selectedEvents.filter(isDayCardSurfaceEvent))
    .filter((event) => isExactDayEvent(event, day) || isActiveRetrogradeEvent(event));

  return removeActiveRetrogradeStationDuplicates([...transits], day).sort((first, second) => {
    const firstIsExact = isExactDayEvent(first, day);
    const secondIsExact = isExactDayEvent(second, day);

    if (firstIsExact !== secondIsExact) {
      return firstIsExact ? -1 : 1;
    }

    const firstTime = new Date(first.startsAt).getTime();
    const secondTime = new Date(second.startsAt).getTime();

    if (firstIsExact && secondIsExact) {
      return secondTime - firstTime;
    }

    return firstTime - secondTime;
  });
}

function weekTransitCardEvents(days: LunarCalendarDay[]) {
  return days
    .flatMap((day) => {
      const sortedEvents = dayEventPreview(day.events);
      const surfacedTransit = sortedEvents.find(isTransitCardEvent);

      return surfacedTransit ? [surfacedTransit] : [];
    })
    .sort((first, second) => new Date(first.startsAt).getTime() - new Date(second.startsAt).getTime());
}

function isDayCardSurfaceEvent(event: LunarCalendarEvent) {
  if (isActiveRetrogradeEvent(event)) {
    return true;
  }

  return event.primary && (
    event.type === "ingress"
    || event.type === "station"
    || (event.type === "aspect" && !event.planets?.includes("Moon"))
  );
}

function monthGridEvents(events: LunarCalendarEvent[]) {
  const sortedEvents = dayEventPreview(events);
  const lunations = sortedEvents.filter((event) => event.type === "lunation");
  const ingresses = sortedEvents.filter((event) => event.type === "ingress" && event.primary);
  const stations = sortedEvents.filter((event) => event.type === "station" && event.primary);
  const surfacedAspect = sortedEvents.find((event) => event.type === "aspect" && event.primary && !event.planets?.includes("Moon"));

  return [...lunations, ...ingresses, ...stations, ...(surfacedAspect ? [surfacedAspect] : [])];
}

function calendarDayTooltipEvents(events: LunarCalendarEvent[]) {
  return monthGridEvents(events).filter((event) => event.type !== "lunation");
}

function calendarDayTooltipLines(
  day: LunarCalendarDay,
  events: LunarCalendarEvent[],
  timeZone: string,
  calendarDays: LunarCalendarDay[]
) {
  const voidWindow = formatVoidCourseTooltip(day, timeZone);

  return [
    phaseLabelForDay(day, calendarDays),
    `Moon in ${day.moonSign}`,
    ...events.map((event) => event.title),
    ...(voidWindow ? [`Void of course · ${voidWindow}`] : [])
  ];
}

function formatVoidCourseGridWindow(day: LunarCalendarDay, timeZone: string) {
  const voidPeriod = day.voidOfCourse;

  if (!voidPeriod?.startsAt || !voidPeriod.until) {
    return voidPeriod?.durationLabel || voidPeriod?.remainingLabel || "";
  }

  const cellDateKey = day.dateKey;
  const startsDateKey = timestampDateKey(voidPeriod.startsAt, timeZone);
  const endsDateKey = timestampDateKey(voidPeriod.until, timeZone);

  if (startsDateKey === cellDateKey && endsDateKey === cellDateKey) {
    return `${formatCompactEventTime(voidPeriod.startsAt, timeZone)}-${formatCompactEventTime(voidPeriod.until, timeZone)}`;
  }

  if (startsDateKey === cellDateKey) {
    return `from ${formatCompactEventTime(voidPeriod.startsAt, timeZone)}`;
  }

  if (endsDateKey === cellDateKey) {
    return `until ${formatCompactEventTime(voidPeriod.until, timeZone)}`;
  }

  return "all day";
}

function formatVoidCourseDetailWindow(day: LunarCalendarDay, timeZone: string) {
  const voidPeriod = day.voidOfCourse;

  if (!voidPeriod?.startsAt || !voidPeriod.until) {
    return voidPeriod?.durationLabel || voidPeriod?.remainingLabel || "";
  }

  if (timestampDateKey(voidPeriod.startsAt, timeZone) !== timestampDateKey(voidPeriod.until, timeZone)) {
    return `${formatEventDateTime(voidPeriod.startsAt, timeZone)} - ${formatEventDateTime(voidPeriod.until, timeZone)}`;
  }

  return `${formatEventTime(voidPeriod.startsAt, timeZone)} - ${formatEventTime(voidPeriod.until, timeZone)}`;
}

function formatVoidCourseTooltip(day: LunarCalendarDay, timeZone: string) {
  const detailWindow = formatVoidCourseDetailWindow(day, timeZone);
  const duration = day.voidOfCourse?.durationLabel;

  return [detailWindow, duration].filter(Boolean).join(" · ");
}

function voidCourseDescription(day: LunarCalendarDay) {
  const nextSign = day.voidOfCourse?.nextSign;

  if (!nextSign) return "";

  try {
    const rendered = calendarFallbackRendererV3.renderVoidOfCourse({
      sign: slugContentPart(day.moonSign),
      nextSign: slugContentPart(nextSign)
    });

    return firstReaderFacingCopy(rendered.parts);
  } catch (error) {
    if (error instanceof FallbackV3SourceGapError) {
      return "";
    }

    throw error;
  }
}

function voidCourseNextSignLabel(day: LunarCalendarDay) {
  const nextSign = day.voidOfCourse?.nextSign;

  if (!nextSign) return null;

  return {
    sign: nextSign,
    glyph: signGlyphs[nextSign] ?? ""
  };
}

function isEclipseLunation(event: LunarCalendarEvent | null | undefined) {
  return Boolean(event?.eclipseType) || Boolean(event?.title.toLowerCase().includes("eclipse"));
}

function eclipseKindForLunation(event: LunarCalendarEvent) {
  const title = event.title.toLowerCase();

  if (event.eclipseType) return event.eclipseType;
  if (title.includes("solar eclipse")) return "solar";
  if (title.includes("lunar eclipse")) return "lunar";

  return null;
}

function lunationDisplayLabel(event: LunarCalendarEvent) {
  return event.title.replace(/ in .+$/, "");
}

function primaryLunationForDay(day: LunarCalendarDay) {
  return day.events.find((event) => (
    event.type === "lunation"
    && (event.title.startsWith("New Moon") || event.title.startsWith("Full Moon"))
  ));
}

function phaseLabelForDay(day: LunarCalendarDay, calendarDays: LunarCalendarDay[]) {
  const lunation = primaryLunationForDay(day);

  if (lunation) {
    return lunationDisplayLabel(lunation);
  }

  if (day.moonPhase !== "Full Moon" && day.moonPhase !== "New Moon") {
    return day.moonPhase;
  }

  const dayIndex = calendarDays.findIndex((calendarDay) => calendarDay.dateKey === day.dateKey);
  const previousDay = dayIndex > 0 ? calendarDays[dayIndex - 1] : null;
  const nextDay = dayIndex >= 0 && dayIndex < calendarDays.length - 1 ? calendarDays[dayIndex + 1] : null;
  const illuminationTrend = nextDay
    ? nextDay.illumination - day.illumination
    : previousDay
      ? day.illumination - previousDay.illumination
      : 0;

  if (day.moonPhase === "Full Moon") {
    return illuminationTrend >= 0 ? "Waxing Gibbous" : "Waning Gibbous";
  }

  return illuminationTrend >= 0 ? "Waxing Crescent" : "Waning Crescent";
}

function compactEventLabel(event: LunarCalendarEvent) {
  if (event.type === "lunation") {
    const eclipseKind = eclipseKindForLunation(event);

    if (eclipseKind) return eclipseKind === "solar" ? "Solar Ecl." : "Lunar Ecl.";
    if (event.title.startsWith("New Moon")) return "New";
    if (event.title.startsWith("Full Moon")) return "Full";
    if (event.title.startsWith("First Quarter")) return "1Q";
    if (event.title.startsWith("Last Quarter")) return "3Q";
  }

  if (event.type === "ingress") {
    return `${event.glyph} ${event.toSign ?? event.sign ?? ""}`;
  }

  if (event.planets && event.aspect) {
    return `${event.glyph} ${event.aspect}`;
  }

  return event.title;
}

function monthCellEventLabel(event: LunarCalendarEvent) {
  if (event.type === "lunation") {
    return compactEventLabel(event);
  }

  if (event.type === "ingress") {
    const signGlyph = signGlyphs[event.toSign ?? event.sign ?? ""] ?? "";
    return `${event.glyph}→${signGlyph}`;
  }

  if (event.type === "station") {
    return `${event.glyph}${retrogradeGlyph}`;
  }

  if (event.type === "aspect" && event.planets && event.aspect) {
    const [firstGlyph = "", secondGlyph = ""] = Array.from(event.glyph);
    return `${firstGlyph}${aspectGlyphs[event.aspect] ?? ""}${secondGlyph}`;
  }

  return event.glyph;
}

function transitCardGlyphParts(event: LunarCalendarEvent) {
  if (event.type === "ingress") {
    return [
      { value: event.glyph, className: "" },
      { value: "\u{2192}", className: "tx-link" },
      { value: signGlyphs[event.toSign ?? event.sign ?? ""] ?? "", className: "tx-sign" }
    ].filter((part) => part.value);
  }

  if (event.type === "station") {
    return [
      { value: event.glyph, className: "" },
      { value: retrogradeGlyph, className: "tx-rx" }
    ].filter((part) => part.value);
  }

  if (event.title.toLowerCase().includes("cazimi")) {
    const [firstGlyph = ""] = Array.from(event.glyph);

    return [
      { value: firstGlyph, className: "" },
      { value: "\u{2609}", className: "tx-link" }
    ].filter((part) => part.value);
  }

  if (event.type === "aspect" && event.planets && event.aspect) {
    const [firstGlyph = "", secondGlyph = ""] = Array.from(event.glyph);

    return [
      { value: firstGlyph, className: "" },
      { value: aspectGlyphs[event.aspect] ?? "", className: "tx-link" },
      { value: secondGlyph, className: "" }
    ].filter((part) => part.value);
  }

  return Array.from(monthCellEventLabel(event)).map((glyph) => ({ value: glyph, className: "" }));
}

function transitCardStatusTag(event: LunarCalendarEvent) {
  if (event.type === "ingress") return "Ingress";
  if (isActiveRetrogradeEvent(event)) return "Retrograde";
  if (event.type === "station") return "Station";
  if (event.title.toLowerCase().includes("cazimi")) return "Cazimi";

  if (event.type === "aspect") {
    if (event.aspect === "trine" || event.aspect === "sextile") return "Soft aspect";
    if (event.aspect === "square" || event.aspect === "opposition") return "Hard aspect";
  }

  return "Transit";
}

function calendarEventGeneratedContentKeys(event: LunarCalendarEvent) {
  const dateKey = event.dateKey || event.startsAt.slice(0, 10);

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

  if (event.type === "aspect" && event.planets && event.aspect) {
    const [first, second] = event.planets;
    const firstPart = slugContentPart(first);
    const aspectPart = slugContentPart(event.aspect);
    const secondPart = slugContentPart(second);

    return [
      skyAspectInstanceContentKey(first, event.aspect, second, { targetDate: dateKey }),
      skyAspectContentKey(first, event.aspect, second),
      `sky-aspect-${firstPart}-${aspectPart}-${secondPart}-${dateKey}`,
      `sky-${firstPart}-${aspectPart}-${secondPart}`
    ];
  }

  return [];
}

function normalizedContentSlots(content: LiveGeneratedContent | null) {
  const sections = content?.sections;

  if (!sections || typeof sections !== "object" || Array.isArray(sections)) {
    return {};
  }

  const slots = (sections as Record<string, unknown>).slots;

  return slots && typeof slots === "object" && !Array.isArray(slots)
    ? slots as Record<string, unknown>
    : {};
}

function contentMatchesCalendarEventFacts(event: LunarCalendarEvent, content: LiveGeneratedContent | null) {
  if (!content) {
    return false;
  }

  const slots = normalizedContentSlots(content);
  const slotText = (key: string) => typeof slots[key] === "string" ? String(slots[key]) : "";
  const slotPlanet = slotText("planet");
  const slotSign = slotText("sign");
  const slotPhase = slotText("phase");
  const canonicalKey = typeof content.sourceSnapshot?.canonicalKey === "string" ? content.sourceSnapshot.canonicalKey : content.contentKey;

  if (event.planet && slotPlanet && slotPlanet !== event.planet) {
    return false;
  }

  if (event.sign && slotSign && slotSign !== event.sign) {
    return false;
  }

  if (event.phase && slotPhase && slotPhase !== event.phase) {
    return false;
  }

  if (event.type === "ingress" && event.planet && content.contentKey === `ms/ingress/${slugContentPart(event.planet)}`) {
    return true;
  }

  if (event.type === "station" && event.planet && event.sign && event.phase === "retrograde-passage") {
    const expected = `sky.retrograde.${slugContentPart(event.planet)}.${slugContentPart(event.sign)}.${event.phase.replace(/-/g, "_")}`;

    if (content.contentKey === `ms/retrograde/${slugContentPart(event.planet)}`) {
      return true;
    }

    return canonicalKey === expected;
  }

  if (event.type === "station" && event.planet && event.sign && event.direction && event.phase !== "retrograde-passage") {
    const planetPart = slugContentPart(event.planet);
    const signPart = slugContentPart(event.sign);
    const expected = `sky.station.${planetPart}.${signPart}.${event.direction}`;
    const expectedRetrogradePhase = event.phase
      ? `sky.retrograde.${planetPart}.${signPart}.${event.phase.replace(/-/g, "_")}`
      : "";

    return canonicalKey === expected || canonicalKey === expectedRetrogradePhase;
  }

  return true;
}

function liveCalendarEventContent(
  generatedContent: Map<string, LiveGeneratedContent> | undefined,
  event: LunarCalendarEvent
) {
  if (!generatedContent) {
    return null;
  }

  for (const contentKey of calendarEventGeneratedContentKeys(event)) {
    const content = generatedContent.get(contentKey);

    if (content && contentMatchesCalendarEventFacts(event, content)) {
      return content;
    }
  }

  return null;
}

function calendarEventContentLayer(content: LiveGeneratedContent): CalendarEventProseLayer {
  return content.contentKey.startsWith("fallback-hook/")
    || content.contentKey.startsWith("ms/")
    || content.eventType === "fallback-hook"
    ? "fallback"
    : "authored";
}

function calendarEventPackageFailure(event: LunarCalendarEvent, error: unknown) {
  if (!(error instanceof FallbackV3SourceGapError)) {
    console.warn("Calendar event package copy failed; keeping the calendar card visible.", {
      eventId: event.id,
      eventType: event.type,
      error
    });
  }

  return "";
}

function calendarStationDirectPackageDescription(event: LunarCalendarEvent) {
  if (!event.planet) {
    return "";
  }

  const frame = fallbackV3HookBody("fallback-hook/sky-event/station-direct");
  const planetTopic = fallbackV3PlanetTopic(event.planet);

  if (!frame || !planetTopic) {
    return "";
  }

  const planetReference = `${event.planet}${event.sign ? ` in ${event.sign}` : ""}`;
  const body = frame
    .replaceAll("{{dateLine}}", "This week")
    .replaceAll("{{aRef}}", planetReference)
    .replaceAll("{{aTopic}}", planetTopic)
    .replace(/\s{2,}/g, " ")
    .trim();

  return isReaderFacingCopy(body) ? body : "";
}

function calendarEventPackageDescription(event: LunarCalendarEvent) {
  if (event.type === "ingress" && event.planet && (event.toSign || event.sign)) {
    const sign = event.toSign ?? event.sign;

    try {
      const rendered = calendarFallbackRendererV3.renderSkyPlacement({
        planet: slugContentPart(event.planet),
        sign: slugContentPart(sign ?? "")
      });

      return firstReaderFacingCopy(rendered.parts);
    } catch (error) {
      return calendarEventPackageFailure(event, error);
    }
  }

  if (event.type === "station" && event.planet && event.direction === "retrograde") {
    try {
      const rendered = calendarFallbackRendererV3.renderTransitRetro({
        planet: slugContentPart(event.planet),
        sign: event.sign ? slugContentPart(event.sign) : undefined,
        window: event.retrogradeEnd ? `Until ${formatEventDate(event.retrogradeEnd, "UTC")}` : undefined,
        format: "card"
      });

      return firstReaderFacingCopy(rendered.parts);
    } catch (error) {
      return calendarEventPackageFailure(event, error);
    }
  }

  if (event.type === "station" && event.planet && event.direction === "direct") {
    return calendarStationDirectPackageDescription(event);
  }

  if (event.type === "aspect" && event.planets && event.aspect) {
    const [first, second] = event.planets;

    try {
      const rendered = calendarFallbackRendererV3.renderSkyAspectCard({
        a: slugContentPart(first),
        b: slugContentPart(second),
        aspect: slugContentPart(event.aspect),
        aSign: event.fromSign ? slugContentPart(event.fromSign) : undefined,
        bSign: event.toSign ? slugContentPart(event.toSign) : undefined,
        dateLine: "Today"
      });

      return firstReaderFacingCopy(rendered.parts);
    } catch (error) {
      return calendarEventPackageFailure(event, error);
    }
  }

  return "";
}

function normalizeCalendarEventSurface(event: LunarCalendarEvent, content: LiveGeneratedContent | null): NormalizedCalendarEventSurface {
  const generatedDescription = firstReaderFacingCopy([
    content?.summary,
    ...generatedContentParagraphs(content)
  ]);

  if (content && generatedDescription) {
    const layer = calendarEventContentLayer(content);

    return {
      surface: "calendar-event",
      status: layer === "authored" ? "servable" : "partial",
      sections: [{
        slot: "description",
        required: false,
        layer,
        tier: layer === "authored" ? "stored-source" : "v3-package",
        sourceKeys: [content.contentKey],
        body: generatedDescription
      }]
    };
  }

  const packageDescription = calendarEventPackageDescription(event);

  if (!isReaderFacingCopy(packageDescription)) {
    return {
      surface: "calendar-event",
      status: "not-servable",
      sections: []
    };
  }

  return {
    surface: "calendar-event",
    status: "partial",
    sections: [{
      slot: "description",
      required: false,
      layer: "fallback",
      tier: "v3-package",
      sourceKeys: [`fallbackArchitectureV3.calendarEvent.${event.type}`],
      body: packageDescription
    }]
  };
}

function calendarEventTitle(event: LunarCalendarEvent, content: LiveGeneratedContent | null) {
  return content?.headline?.trim() || event.title;
}

function calendarEventTitleWithSign(event: LunarCalendarEvent, title: string) {
  if (event.type !== "station" || !event.sign) {
    return title;
  }

  const normalizedTitle = title.toLowerCase();
  const normalizedSign = event.sign.toLowerCase();

  if (normalizedTitle.includes(` in ${normalizedSign}`) || normalizedTitle.includes(` enters ${normalizedSign}`)) {
    return title;
  }

  return `${title} in ${event.sign}`;
}

function textParagraphs(value?: string | null) {
  return value
    ? value.split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean)
    : [];
}

function formatEventCount(count: number) {
  return count === 1 ? "1 event" : `${count} events`;
}

const signElements: Record<string, string> = {
  Aries: "Fire",
  Taurus: "Earth",
  Gemini: "Air",
  Cancer: "Water",
  Leo: "Fire",
  Virgo: "Earth",
  Libra: "Air",
  Scorpio: "Water",
  Sagittarius: "Fire",
  Capricorn: "Earth",
  Aquarius: "Air",
  Pisces: "Water"
};

function elementClassForSign(sign: string) {
  return `is-${(signElements[sign] ?? "").toLowerCase() || "unknown"}`;
}

const signGlyphs: Record<string, string> = {
  Aries: "\u{2648}",
  Taurus: "\u{2649}",
  Gemini: "\u{264A}",
  Cancer: "\u{264B}",
  Leo: "\u{264C}",
  Virgo: "\u{264D}",
  Libra: "\u{264E}",
  Scorpio: "\u{264F}",
  Sagittarius: "\u{2650}",
  Capricorn: "\u{2651}",
  Aquarius: "\u{2652}",
  Pisces: "\u{2653}"
};

const milestoneSignGlyphs = signGlyphs;

const unicodeGlyphs = {
  conjunction: "\u{260C}",
  opposition: "\u{260D}",
  square: "\u{25A1}",
  trine: "\u{25B3}",
  sextile: "\u{26B9}",
  retrograde: "\u{211E}"
} as const;

const aspectGlyphs: Record<string, string> = {
  conjunction: unicodeGlyphs.conjunction,
  opposition: unicodeGlyphs.opposition,
  square: unicodeGlyphs.square,
  trine: unicodeGlyphs.trine,
  sextile: unicodeGlyphs.sextile
};

const retrogradeGlyph = unicodeGlyphs.retrograde;
const moonGlyph = "\u{263E}";

function isWaxingPhase(phase: string) {
  return phase.includes("Waxing") || phase.includes("First Quarter") || phase.includes("New Moon");
}

function moonDiscStyle(day: LunarCalendarDay) {
  const visible = Math.max(0, Math.min(100, day.illumination));
  const dark = 100 - visible;

  return {
    "--moon-visible": `${visible}%`,
    "--moon-dark": `${dark}%`
  } as CSSProperties;
}

function lunationDiscClass(event: LunarCalendarEvent) {
  if (event.title.startsWith("New Moon")) return "is-new";
  if (event.title.startsWith("Full Moon")) return "is-full";
  if (event.title.startsWith("Last Quarter")) return "is-waning";

  return "is-waxing";
}

function lunarDayFor(day: LunarCalendarDay, events: LunarCalendarEvent[]) {
  const selectedTime = new Date(day.date).getTime();
  const previousNewMoon = events
    .filter((event) => event.type === "lunation" && event.title.startsWith("New Moon") && new Date(event.startsAt).getTime() <= selectedTime + 86_400_000)
    .sort((first, second) => new Date(second.startsAt).getTime() - new Date(first.startsAt).getTime())[0];

  if (!previousNewMoon) {
    return Math.max(1, Math.round((day.illumination / 100) * 15));
  }

  return Math.max(1, Math.min(30, Math.floor((selectedTime - new Date(previousNewMoon.startsAt).getTime()) / 86_400_000) + 1));
}

function seasonLunarArc(day: LunarCalendarDay, events: LunarCalendarEvent[], timeZone: string) {
  const window = sunIngressSeasonWindow(day.dateKey, events);
  const selectedTime = dayKeyToUtcTime(day.dateKey);
  const startTime = dayKeyToUtcTime(window.start);
  const endTime = dayKeyToUtcTime(window.end);
  const allLunations = events
    .filter((event) => event.type === "lunation")
    .sort((first, second) => new Date(first.startsAt).getTime() - new Date(second.startsAt).getTime());
  const seasonLunations = allLunations
    .filter((event) => {
      const eventTime = dayKeyToUtcTime(event.dateKey);

      return eventTime >= startTime && eventTime < endTime;
    });
  const hasNewMoon = seasonLunations.some((event) => event.title.startsWith("New Moon"));
  const previousNewMoon = hasNewMoon
    ? null
    : allLunations
        .filter((event) => event.title.startsWith("New Moon") && dayKeyToUtcTime(event.dateKey) < startTime)
        .at(-1) ?? null;
  const lunations = previousNewMoon ? [previousNewMoon, ...seasonLunations] : seasonLunations;

  return {
    ...window,
    currentMilestone: lunations.filter((event) => dayKeyToUtcTime(event.dateKey) <= selectedTime).at(-1) ?? lunations[0] ?? null,
    lunations
  };
}

function lunarArcMilestones(lunarDay: LunarDay | null) {
  const arc = lunarDay?.arc;

  if (!arc) {
    return [];
  }

  const selectedTime = dayKeyToUtcTime(lunarDay.date) + 86_400_000;
  const milestones: Array<{
    id: string;
    group: "twoWeek" | "sixMonth";
    label: string;
    point: LunarDayArcPoint;
    discClass: string;
    isCurrent: boolean;
  }> = [];

  const pushMilestone = (
    id: string,
    group: "twoWeek" | "sixMonth",
    label: string,
    point: LunarDayArcPoint | null,
    discClass: string
  ) => {
    if (!point) return;

    milestones.push({
      id,
      group,
      label: point.title?.replace(/ in .+$/, "") ?? label,
      point,
      discClass,
      isCurrent: false
    });
  };

  pushMilestone("two-week-origin", "twoWeek", "New Moon", arc.spans.twoWeek.origin, "is-new");
  pushMilestone("two-week-culmination", "twoWeek", "Full Moon", arc.spans.twoWeek.culmination, "is-full");
  pushMilestone("six-month-culmination", "sixMonth", "Same-sign Full Moon", arc.spans.sixMonth.culmination, "is-full");

  const uniqueMilestones = milestones
    .filter((milestone, index, allMilestones) => (
      allMilestones.findIndex((candidate) => candidate.group === milestone.group && candidate.point.datetime === milestone.point.datetime) === index
    ))
    .sort((first, second) => new Date(first.point.datetime).getTime() - new Date(second.point.datetime).getTime());
  const currentMilestone = [...uniqueMilestones]
    .filter((milestone) => new Date(milestone.point.datetime).getTime() <= selectedTime)
    .at(-1);

  return uniqueMilestones.map((milestone) => ({
    ...milestone,
    isCurrent: milestone.id === currentMilestone?.id
  }));
}

function isSeasonStart(day: LunarCalendarDay) {
  return day.events.some((event) => event.type === "ingress" && event.planet === "Sun");
}

function seasonEyebrowForDay(day: LunarCalendarDay, timeZone: string, events?: LunarCalendarEvent[]) {
  const seasonSign = sunIngressSeasonSign(day.dateKey, events ?? []);

  return `${seasonSign} season${isSeasonStart(day) ? " begins" : ""}`;
}

function titleForDay(day: LunarCalendarDay) {
  const lunation = day.events.find((event) => event.type === "lunation");

  return lunation?.title ?? `Moon in ${day.moonSign}`;
}

function titleGlyphForDay(day: LunarCalendarDay) {
  const lunation = day.events.find((event) => event.type === "lunation");

  return signGlyphs[lunation?.sign ?? day.moonSign] ?? day.moonSignGlyph;
}

function calendarPhaseContentKey(phase: string) {
  const normalized = phase.toLowerCase().replace(/\s+/g, " ").trim();

  if (normalized.includes("new")) return "new-moon";
  if (normalized.includes("waxing crescent")) return "waxing-crescent";
  if (normalized.includes("first quarter")) return "first-quarter";
  if (normalized.includes("waxing gibbous")) return "waxing-gibbous";
  if (normalized.includes("full")) return "full-moon";
  if (normalized.includes("disseminating")) return "disseminating";
  if (normalized.includes("last quarter") || normalized.includes("third quarter")) return "last-quarter";
  if (normalized.includes("balsamic") || normalized.includes("waning crescent")) return "balsamic";

  return slugContentPart(phase);
}

function dayKeyToUtcTime(dateKey: string) {
  const [year = 0, month = 1, day = 1] = dateKey.split("-").map(Number);

  return Date.UTC(year, month - 1, day);
}

function relativeDayLabel(fromDateKey: string, toDateKey: string) {
  const start = dayKeyToUtcTime(fromDateKey);
  const end = dayKeyToUtcTime(toDateKey);
  const diff = Math.round((end - start) / 86_400_000);

  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  if (diff > 1) return `in ${diff} days`;
  if (diff === -1) return "yesterday";
  return `${Math.abs(diff)} days ago`;
}

function dateKeyFromUtcTime(time: number) {
  return new Date(time).toISOString().slice(0, 10);
}

function dateKeyInSameWeek(dateKey: string, weekDateKey: string) {
  const weekTime = dayKeyToUtcTime(weekDateKey);
  const weekStart = weekTime - new Date(weekTime).getUTCDay() * 86_400_000;
  const time = dayKeyToUtcTime(dateKey);

  return time >= weekStart && time < weekStart + 7 * 86_400_000;
}

function dateKeyInMonth(dateKey: string, month: Date) {
  const [year = 0, calendarMonth = 1] = dateKey.split("-").map(Number);

  return year === month.getFullYear() && calendarMonth === month.getMonth() + 1;
}

function locationFromLabel(label: string): LocationInput {
  const seed = label.trim();

  if (!seed) {
    return {
      label: "Portsmouth, New Hampshire",
      latitude: 43.0718,
      longitude: -70.7626,
      timeZone: "America/New_York"
    };
  }

  const hash = [...seed].reduce((total, char) => total + char.charCodeAt(0), 0);
  const location = {
    label: seed,
    latitude: ((hash % 1400) / 10) - 70,
    longitude: ((hash % 3000) / 10) - 150
  };

  return {
    ...location,
    timeZone: timeZoneForLocation(location)
  };
}

export function LunarCalendar({ location, onLocationChange, generatedContent, onOpenTransit }: LunarCalendarProps) {
  const [visibleMonth, setVisibleMonth] = useState(() => monthStart(new Date()));
  const [visibleWeekDateKey, setVisibleWeekDateKey] = useState(() => dateKeyFromDate(new Date()));
  const [viewMode, setViewMode] = useState<LunarCalendarViewMode>("week");
  const [calendar, setCalendar] = useState<LunarCalendarMonthData | null>(null);
  const [selectedCalendar, setSelectedCalendar] = useState<LunarCalendarMonthData | null>(null);
  const [status, setStatus] = useState<LunarCalendarStatus>("loading");
  const [selectedDateKey, setSelectedDateKey] = useState("");
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const [locationQuery, setLocationQuery] = useState(location.label);
  const [locationSuggestions, setLocationSuggestions] = useState<CitySuggestion[]>([]);
  const [pendingLocation, setPendingLocation] = useState<CitySuggestion | null>(null);
  const [locationSearchStatus, setLocationSearchStatus] = useState<LocationSearchStatus>("idle");

  useEffect(() => {
    let cancelled = false;
    let cancelHydration: (() => void) | null = null;
    const visibleAnchor = viewMode === "week" ? dateFromDateKey(visibleWeekDateKey) : visibleMonth;
    const storedCalendarKey = calendarStorageKey(location, viewMode, visibleAnchor);
    const storedCalendar = readStoredCalendar(storedCalendarKey);

    if (storedCalendar) {
      setCalendar(storedCalendar);
      setSelectedDateKey((existingKey) => {
        if (existingKey) return existingKey;

        const currentKey = todayKey(storedCalendar.timeZone);
        const defaultDay = storedCalendar.days.find((day) => day.dateKey === currentKey)
          ?? storedCalendar.days.find((day) => day.inMonth)
          ?? storedCalendar.days[0];

        if (defaultDay) {
          setVisibleWeekDateKey(defaultDay.dateKey);
        }

        return defaultDay?.dateKey || "";
      });
      setStatus("ready");
    } else {
      setStatus("loading");
    }

    loadCalendarData(location, viewMode, visibleAnchor, "basic")
      .then((nextCalendar) => {
        if (cancelled) return;

        const currentKey = todayKey(nextCalendar.timeZone);
        const defaultDay = nextCalendar.days.find((day) => day.dateKey === currentKey)
          ?? nextCalendar.days.find((day) => day.inMonth)
          ?? nextCalendar.days[0];

        setCalendar(nextCalendar);
        writeStoredCalendar(storedCalendarKey, nextCalendar);
        setSelectedDateKey((existingKey) => {
          if (existingKey) return existingKey;

          if (defaultDay) {
            setVisibleWeekDateKey(defaultDay.dateKey);
          }

          return defaultDay?.dateKey || "";
        });
        setStatus("ready");

        cancelHydration = scheduleIdleTask(() => {
          loadCalendarData(location, viewMode, visibleAnchor, "full")
            .then((fullCalendar) => {
              if (!cancelled) {
                setCalendar(fullCalendar);
              }
            })
            .catch((error) => {
              console.warn("Full lunar calendar details failed to load.", error);
            });
        });
      })
      .catch((error) => {
        console.warn("Lunar calendar failed to load.", error);
        if (!cancelled) {
          setStatus("error");
        }
      });

    return () => {
      cancelled = true;

      cancelHydration?.();
    };
  }, [location, viewMode, visibleMonth, visibleWeekDateKey]);

  useEffect(() => {
    if (!selectedDateKey) return;

    if (calendar?.days.some((day) => day.dateKey === selectedDateKey)) {
      setSelectedCalendar(calendar);
      return;
    }

    const selectedCalendarMatchesLocation = selectedCalendar
      && selectedCalendar.location.latitude === location.latitude
      && selectedCalendar.location.longitude === location.longitude
      && selectedCalendar.location.timeZone === location.timeZone;

    if (selectedCalendarMatchesLocation && selectedCalendar.days.some((day) => day.dateKey === selectedDateKey)) {
      return;
    }

    const selectedDateIsInVisibleRange = viewMode === "week"
      ? dateKeyInSameWeek(selectedDateKey, visibleWeekDateKey)
      : dateKeyInMonth(selectedDateKey, visibleMonth);

    if (selectedDateIsInVisibleRange) {
      return;
    }

    let cancelled = false;

    getLunarCalendarMonth(location, monthStartFromDateKey(selectedDateKey), { detail: "full" })
      .then((nextSelectedCalendar) => {
        if (!cancelled) {
          setSelectedCalendar(nextSelectedCalendar);
        }
      })
      .catch((error) => {
        console.warn("Selected lunar day failed to load.", error);
      });

    return () => {
      cancelled = true;
    };
  }, [calendar, location, selectedCalendar, selectedDateKey, viewMode, visibleMonth, visibleWeekDateKey]);

  useEffect(() => {
    if (!locationPickerOpen) {
      setLocationQuery(location.label);
      setPendingLocation(null);
      return;
    }

    const query = locationQuery.trim();

    if (pendingLocation && query === pendingLocation.label) {
      setLocationSuggestions((suggestions) => (
        suggestions.some((suggestion) => suggestion.label === pendingLocation.label)
          ? suggestions
          : [pendingLocation, ...suggestions]
      ));
      setLocationSearchStatus("ready");
      return;
    }

    if (query.length < 2 || !hasMapboxToken()) {
      setLocationSuggestions([]);
      setLocationSearchStatus("idle");
      return;
    }

    let cancelled = false;
    setLocationSearchStatus("loading");

    const timer = window.setTimeout(() => {
      searchCities(query)
        .then((suggestions) => {
          if (cancelled) return;
          setLocationSuggestions(suggestions);
          setLocationSearchStatus(suggestions.length > 0 ? "ready" : "empty");
        })
        .catch(() => {
          if (cancelled) return;
          setLocationSuggestions([]);
          setLocationSearchStatus("error");
        });
    }, 220);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [location.label, locationPickerOpen, locationQuery, pendingLocation]);

  const selectedDay = useMemo(() => (
    selectedCalendar?.days.find((day) => day.dateKey === selectedDateKey)
    ?? null
  ), [selectedCalendar, selectedDateKey]);

  const zone = calendar?.timeZone ?? location.timeZone ?? "UTC";
  const currentDateKey = todayKey(zone);
  const monthParts = formatMonthParts(visibleMonth);
  const visibleWeekAnchor = calendar?.days.find((day) => day.dateKey === visibleWeekDateKey)
    ?? calendar?.days.find((day) => day.inMonth)
    ?? calendar?.days[0]
    ?? null;
  const visibleWeekAnchorIndex = calendar?.days.findIndex((day) => day.dateKey === visibleWeekAnchor?.dateKey) ?? -1;
  const selectedWeekDays = visibleWeekAnchorIndex >= 0 && calendar
    ? calendar.days.slice(visibleWeekAnchorIndex - (visibleWeekAnchorIndex % 7), visibleWeekAnchorIndex - (visibleWeekAnchorIndex % 7) + 7)
    : [];
  const selectedDate = selectedDay ? new Date(selectedDay.date) : new Date();
  const arcEvents = useMemo(() => {
    const eventsById = new Map<string, LunarCalendarEvent>();

    for (const event of [...(calendar?.events ?? []), ...(selectedCalendar?.events ?? [])]) {
      eventsById.set(event.id, event);
    }

    return [...eventsById.values()];
  }, [calendar, selectedCalendar]);
  const selectedLunarDay = useMemo(() => (
    selectedDay
      ? resolveLunarDay({
          day: selectedDay,
          events: arcEvents,
          location,
          timeZone: zone,
          arcEnabled: enableLunarArcContent,
          generatedContent
        })
      : null
  ), [arcEvents, generatedContent, location, selectedDay, zone]);
  const selectedEvents = selectedDay ? dayEventPreview(selectedDay.events) : [];
  const selectedDayTransits = selectedDay
    ? selectedDayTransitEvents(selectedDay, selectedLunarDay, selectedEvents)
    : [];
  // Collective-energy write-ups for the aspects exact on the selected day. These
  // read as part of the day's narrative (appended under the main Moon write-up),
  // not as per-row call-outs. Deduped so a twice-logged aspect appears once.
  const selectedDayAspectWriteups = useMemo(() => {
    const writeups: string[] = [];
    const seenAspectKeys = new Set<string>();

    for (const event of selectedDayTransits) {
      if (event.type !== "aspect" || !event.planets || !event.aspect) {
        continue;
      }

      const aspectKey = `${event.planets[0]}-${event.aspect}-${event.planets[1]}`.toLowerCase();

      if (seenAspectKeys.has(aspectKey)) {
        continue;
      }

      const body = calendarEventPackageDescription(event);

      if (body) {
        seenAspectKeys.add(aspectKey);
        writeups.push(body);
      }
    }

    return writeups;
  }, [selectedDayTransits]);
  const selectedPrimaryLunation = selectedDay ? primaryLunationForDay(selectedDay) : undefined;
  const selectedDayPhase = selectedDay && calendar
    ? phaseLabelForDay(selectedDay, calendar.days)
    : null;
  const selectedTransitNotes = enableLunarArcContent && selectedLunarDay
    ? selectedLunarDay.editorial.transitNotes
        .map((note) => ({
          ...note,
          event: selectedDayTransits.find((event) => event.id === note.transitRef) ?? null
        }))
        .filter((note) => note.body && (note.event || note.title))
    : [];
  const selectedVoidWindow = selectedDay ? formatVoidCourseDetailWindow(selectedDay, zone) : "";
  const selectedVoidDuration = selectedDay?.voidOfCourse?.durationLabel || "";
  const selectedVoidNextSign = selectedDay ? voidCourseNextSignLabel(selectedDay) : null;
  const selectedPackageWeeklyMoon = selectedDay
    ? (() => {
        try {
          return calendarFallbackRendererV3.renderWeeklyMoon({
            sign: slugContentPart(selectedDay.moonSign),
            variant: weeklyMoonVariantForDate(selectedDay.dateKey)
          });
        } catch (error) {
          if (error instanceof FallbackV3SourceGapError) return null;
          throw error;
        }
      })()
    : null;
  const selectedDayBodyPresentation = {
    main: selectedPackageWeeklyMoon ? [selectedPackageWeeklyMoon.body] : [],
    loreTitle: null,
    lore: [],
    prompt: null,
    storyPosition: null
  };
  const selectedPackagePhase = selectedDay && selectedDayPhase
    ? (() => {
        try {
          const rendered = calendarFallbackRendererV3.renderCalendarPhase({
            phase: calendarPhaseContentKey(selectedDayPhase),
            sign: slugContentPart(selectedPrimaryLunation?.sign ?? selectedDay.moonSign)
          }) as ReturnType<typeof calendarFallbackRendererV3.renderCalendarPhase> & { tagline?: string };

          return {
            headline: rendered.headline,
            tagline: rendered.tagline ?? ""
          };
        } catch (error) {
          if (error instanceof FallbackV3SourceGapError) return null;
          throw error;
        }
      })()
    : null;
  const selectedPackageVoid = selectedDay?.voidOfCourse && selectedVoidNextSign
    ? (() => {
        try {
          return calendarFallbackRendererV3.renderVoidOfCourse({
            sign: slugContentPart(selectedDay.moonSign),
            nextSign: slugContentPart(selectedVoidNextSign.sign)
          });
        } catch (error) {
          if (error instanceof FallbackV3SourceGapError) return null;
          throw error;
        }
      })()
    : null;
  const selectedSeasonArc = selectedLunarDay?.arc ?? null;
  const selectedSeasonArcMilestones = useMemo(
    () => lunarArcMilestones(selectedLunarDay),
    [selectedLunarDay]
  );
  const selectedSixMonthArcMilestones = selectedSeasonArcMilestones.filter((milestone) => milestone.group === "sixMonth");
  // The New Moon and Full Moon that fall within the current zodiac season, shown
  // in the season chip. For Leo season these are the Leo New Moon and the
  // Aquarius Full Moon (each carries its own sign from the ephemeris).
  const selectedSeasonMoonMilestones = useMemo(() => {
    if (!selectedSeasonArc || !selectedDay) {
      return [] as Array<{ id: string; label: string; discClass: string; point: { sign: string; datetime: string }; isCurrent: boolean }>;
    }

    const startTime = dayKeyToUtcTime(selectedSeasonArc.season.start);
    const endTime = dayKeyToUtcTime(selectedSeasonArc.season.end);
    const selectedTime = dayKeyToUtcTime(selectedDay.dateKey);
    const seasonLunations = arcEvents
      .filter((event) => event.type === "lunation")
      .filter((event) => {
        const eventTime = dayKeyToUtcTime(event.dateKey);

        return eventTime >= startTime && eventTime < endTime;
      });
    const newMoon = seasonLunations.find((event) => event.title.startsWith("New Moon")) ?? null;
    const fullMoon = seasonLunations.find((event) => event.title.startsWith("Full Moon")) ?? null;

    const rows = [
      newMoon && { id: newMoon.id, label: "New Moon", discClass: "is-new", event: newMoon },
      fullMoon && { id: fullMoon.id, label: "Full Moon", discClass: "is-full", event: fullMoon }
    ].filter((row): row is { id: string; label: string; discClass: string; event: LunarCalendarEvent } => Boolean(row));

    const currentId = rows
      .filter((row) => dayKeyToUtcTime(row.event.dateKey) <= selectedTime)
      .sort((first, second) => dayKeyToUtcTime(first.event.dateKey) - dayKeyToUtcTime(second.event.dateKey))
      .at(-1)?.id ?? null;

    return rows.map((row) => ({
      id: row.id,
      label: row.label,
      discClass: row.discClass,
      point: { sign: row.event.sign ?? "", datetime: row.event.startsAt },
      isCurrent: row.id === currentId
    }));
  }, [arcEvents, selectedDay, selectedSeasonArc]);
  const monthTransitEvents = calendar ? monthTransitCardEvents(calendar.days) : [];
  const visibleWeekTransitEvents = weekTransitCardEvents(selectedWeekDays);
  const milestoneReferenceDate = visibleWeekAnchor ? new Date(visibleWeekAnchor.date) : selectedDate;
  const milestones = calendar
    ? calendar.events
        .filter((event) => event.type === "lunation")
        .filter((event) => new Date(event.startsAt).getTime() >= milestoneReferenceDate.getTime() - 6 * 60 * 60_000)
        .slice(0, 2)
    : [];
  const milestonePills = milestones.length > 0 && (
    <div className="lunar-milestones" aria-label="Upcoming lunar milestones">
      {milestones.map((event) => {
        const isPrimaryLunation = event.title.startsWith("New Moon") || event.title.startsWith("Full Moon");
        const signGlyph = isPrimaryLunation ? milestoneSignGlyphs[event.sign ?? ""] : "";

        return (
          <button type="button" key={event.id} onClick={() => handleSelectDate(event.dateKey)}>
            <span className={`lunar-moon-disc ${lunationDiscClass(event)}`} aria-hidden="true" />
            <strong>
              {lunationDisplayLabel(event)}
              {signGlyph && <span className="lunar-milestones__sign" aria-label={`in ${event.sign}`}>{signGlyph}</span>}
            </strong>
            <span className="lunar-milestones__separator" aria-hidden="true">·</span>
            <span className="lunar-milestones__date">{new Intl.DateTimeFormat("en-US", { timeZone: zone, month: "short", day: "numeric" }).format(new Date(event.startsAt))}</span>
            <span className="lunar-milestones__separator" aria-hidden="true">·</span>
            <span className="lunar-milestones__relative">{relativeDayLabel(currentDateKey, event.dateKey)}</span>
          </button>
        );
      })}
    </div>
  );
  const selectedDayCard = selectedDay && calendar && (
    <section className="lunar-selected-card" aria-label="Selected lunar day">
      <div className="lunar-selected-card__main">
        <div className="lunar-selected-card__copy">
          <span className="lunar-selected-card__eyebrow">
            {seasonEyebrowForDay(selectedDay, zone, arcEvents)}
          </span>
          <h2>
            {selectedPackagePhase?.headline ?? titleForDay(selectedDay)}
          </h2>
          {selectedPackagePhase?.tagline && (
            <small className="lunar-selected-card__phase-tagline">{selectedPackagePhase.tagline}</small>
          )}
          <p className="lunar-selected-card__meta">
            <span className={`lunar-selected-card__meta-element ${elementClassForSign(selectedDay.moonSign)}`}>
              {signElements[selectedDay.moonSign] ?? "Element"}
            </span>
            <span className="lunar-selected-card__meta-separator" aria-hidden="true">·</span>
            <span className="lunar-selected-card__meta-date">{formatSelectedDay(selectedDay, zone)}</span>
            {selectedPrimaryLunation && (
              <>
                <span className="lunar-selected-card__meta-separator" aria-hidden="true">·</span>
                <span className="lunar-selected-card__meta-time">Exact at {formatEventTime(selectedPrimaryLunation.startsAt, zone)}</span>
              </>
            )}
          </p>
          {(selectedDayBodyPresentation.main.length > 0 || selectedDayAspectWriteups.length > 0) && (
            <div className="lunar-selected-card__body">
              {selectedDayBodyPresentation.main.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              {selectedDayAspectWriteups.map((writeup) => (
                <p className="lunar-selected-card__aspect-writeup" key={writeup}>{writeup}</p>
              ))}
              {selectedDayBodyPresentation.prompt && (
                <section className="lunar-selected-card__check-in" aria-label="Check-in">
                  <span>Check-in</span>
                  <p>{selectedDayBodyPresentation.prompt}</p>
                </section>
              )}
            </div>
          )}
        </div>

        {(selectedDayTransits.length > 0 || selectedTransitNotes.length > 0 || (selectedDay.voidOfCourse && selectedVoidWindow)) && (
          <div className="lunar-selected-card__after">
            {selectedPackageVoid && selectedVoidWindow && (
              <section className="lunar-selected-card__void" aria-label="Moon void of course">
                <div className="lunar-selected-card__void-heading">
                  <span aria-hidden="true">☾</span>
                  <strong>{selectedPackageVoid.headline}</strong>
                </div>
                <p className="lunar-selected-card__void-meta">
                  <span>{selectedVoidWindow}</span>
                  {selectedVoidDuration && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{selectedVoidDuration}</span>
                    </>
                  )}
                  {selectedVoidNextSign && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="lunar-selected-card__void-next">
                        then enters
                        {selectedVoidNextSign.glyph && <span aria-hidden="true">{selectedVoidNextSign.glyph}</span>}
                        {selectedVoidNextSign.sign}
                      </span>
                    </>
                  )}
                </p>
                {selectedPackageVoid.body && <p>{selectedPackageVoid.body}</p>}
              </section>
            )}
            {selectedDayTransits.length > 0 && (
              <div className="lunar-selected-card__daily-events" aria-label="Daily transits and aspects">
                {selectedDayTransits.map((event) => {
                  const eventTitle = calendarEventTitleWithSign(event, event.title);

                  return (
                    <button
                      className={`lunar-selected-card__daily-event event-${event.type}`}
                      type="button"
                      key={event.id}
                      aria-label={eventTitle}
                      onClick={() => onOpenTransit?.(event)}
                    >
                      <span className="lunar-selected-card__daily-event-glyph" aria-hidden="true">{monthCellEventLabel(event)}</span>
                      <strong>{eventTitle}</strong>
                      <span className="lunar-selected-card__daily-event-time">
                        {isActiveRetrogradeEvent(event)
                          ? activeRetrogradeUntilLabel(event, zone)
                          : formatEventTime(event.startsAt, zone)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
            {selectedTransitNotes.length > 0 && (
              <div className="lunar-selected-card__transit-notes" aria-label="Daily transit notes">
                {selectedTransitNotes.map((note) => (
                  <section key={note.transitRef}>
                    <span>{note.event?.title ?? note.title}</span>
                    {textParagraphs(note.body ?? "").map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </section>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="lunar-selected-card__rail">
        <div className="lunar-selected-card__stats">
          <div>
            <span>Illumination</span>
            <strong>
              <span className="lunar-selected-card__stat-dial" style={{ "--ip": selectedDay.illumination } as CSSProperties} aria-hidden="true" />
              <span>{selectedDay.illumination}</span><small className="is-percent">%</small>
            </strong>
          </div>
          <div>
            <span>Lunar day</span>
            <strong><span>{selectedLunarDay?.traditional.lunarDayNumber ?? lunarDayFor(selectedDay, calendar.events)}</span> <small className="is-fraction">/ 30*</small></strong>
          </div>
        </div>
        <p className="lunar-selected-card__stats-note">* A lunar cycle runs ~29.5 days from one new moon to the next (synodic month).</p>

        {enableLunarArcContent && selectedSeasonArc && (
          <section className="lunar-selected-card__arc" aria-label={`${selectedSeasonArc.season.sign} season lunar arc`}>
            <div className="lunar-selected-card__arc-head">
              <span>{selectedSeasonArc.season.sign} season</span>
              <small>{formatSeasonRange(selectedSeasonArc.season.start, selectedSeasonArc.season.end, zone)}</small>
            </div>
            {(selectedSeasonMoonMilestones.length > 0 || selectedSixMonthArcMilestones.length > 0) && (
              <div className="lunar-selected-card__arc-milestone-groups" aria-label="Lunar arc milestones">
                {selectedSeasonMoonMilestones.length > 0 && (
                  <section>
                    <ol className="lunar-selected-card__arc-milestones">
                      {selectedSeasonMoonMilestones.map((milestone) => (
                        <li className={milestone.isCurrent ? "is-current" : ""} key={milestone.id}>
                          <span className={`lunar-moon-disc ${milestone.discClass}`} aria-hidden="true" />
                          <strong>{milestone.label} <span>{signGlyphs[milestone.point.sign] ?? ""}</span></strong>
                          <small>{formatEventDateTime(milestone.point.datetime, zone)}</small>
                        </li>
                      ))}
                    </ol>
                  </section>
                )}
                {selectedSixMonthArcMilestones.length > 0 && (
                  <section>
                    <span>Six-month arc</span>
                    <ol className="lunar-selected-card__arc-milestones">
                      {selectedSixMonthArcMilestones.map((milestone) => (
                        <li className={milestone.isCurrent ? "is-current" : ""} key={milestone.id}>
                          <span className={`lunar-moon-disc ${milestone.discClass}`} aria-hidden="true" />
                          <strong>{milestone.label} <span>{signGlyphs[milestone.point.sign] ?? ""}</span></strong>
                          <small>{formatEventDateTime(milestone.point.datetime, zone)}</small>
                        </li>
                      ))}
                    </ol>
                  </section>
                )}
              </div>
            )}
          </section>
        )}
      </div>

    </section>
  );
  const handleViewModeChange = (nextMode: LunarCalendarViewMode) => {
    if (nextMode === viewMode) return;
    setViewMode(nextMode);
  };
  function handleSelectDate(dateKey: string) {
    setSelectedDateKey(dateKey);
    setVisibleWeekDateKey(dateKey);
  }
  const handleCalendarNavigation = (direction: -1 | 1) => {
    if (viewMode === "week") {
      const nextWeekDateKey = dateKeyFromUtcTime(dayKeyToUtcTime(visibleWeekDateKey) + direction * 7 * 86_400_000);

      setVisibleWeekDateKey(nextWeekDateKey);
      setVisibleMonth(monthStartFromDateKey(nextWeekDateKey));
      setSelectedDateKey((existingKey) => {
        if (!existingKey) {
          return nextWeekDateKey;
        }

        return dateKeyFromUtcTime(dayKeyToUtcTime(existingKey) + direction * 7 * 86_400_000);
      });
      return;
    }

    const nextMonth = addMonths(visibleMonth, direction);

    setVisibleMonth(nextMonth);
    setVisibleWeekDateKey(dateKeyFromDate(nextMonth));
    setSelectedDateKey("");

  };
  const applyLocation = (nextLocation: LocationInput) => {
    onLocationChange(withTimeZone(nextLocation));
    setLocationQuery(nextLocation.label);
    setPendingLocation(null);
    setLocationSuggestions([]);
    setLocationSearchStatus("idle");
    setLocationPickerOpen(false);
  };
  const applyPendingLocation = (queryValue = locationQuery) => {
    const query = queryValue.trim();
    const nextLocation = pendingLocation
      ? {
          label: pendingLocation.label,
          latitude: pendingLocation.latitude,
          longitude: pendingLocation.longitude,
          timeZone: pendingLocation.timeZone
        }
      : locationFromLabel(query);

    applyLocation(nextLocation);
  };
  const cancelLocationPicker = () => {
    setLocationQuery(location.label);
    setPendingLocation(null);
    setLocationSuggestions([]);
    setLocationSearchStatus("idle");
    setLocationPickerOpen(false);
  };

  return (
    <section className="lunar-calendar-view" aria-label="Lunar calendar">
      <header className="lunar-calendar-header">
        <div className="lunar-calendar-title-block">
          <div className="lunar-calendar-title-row">
            <h1><span>{monthParts.month}</span> <em>{monthParts.year}</em></h1>
            <div className="lunar-calendar-controls" aria-label={viewMode === "week" ? "Calendar week controls" : "Calendar month controls"}>
              <button type="button" aria-label={viewMode === "week" ? "Previous week" : "Previous month"} onClick={() => handleCalendarNavigation(-1)}>
                <ChevronLeft size={18} aria-hidden="true" />
              </button>
              <button type="button" aria-label={viewMode === "week" ? "Next week" : "Next month"} onClick={() => handleCalendarNavigation(1)}>
                <ChevronRight size={18} aria-hidden="true" />
              </button>
            </div>
          </div>
          <div className="lunar-calendar-location">
            <button type="button" onClick={() => setLocationPickerOpen((open) => !open)}>
              <MapPin size={15} aria-hidden="true" />
              <span>{location.label} · {formatTimeZoneLabel(zone)}</span>
            </button>
            {locationPickerOpen && (
              <form
                className="lunar-location-picker"
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = event.currentTarget;
                  const input = form.elements.namedItem("location") as HTMLInputElement | null;

                  applyPendingLocation(input?.value ?? locationQuery);
                }}
              >
                <label>
                  <span>Location</span>
                  <span className="lunar-location-picker__input">
                    <Search size={15} aria-hidden="true" />
                    <input
                      name="location"
                      value={locationQuery}
                      onChange={(event) => {
                        setLocationQuery(event.target.value);
                        setPendingLocation(null);
                      }}
                      placeholder="Search for a city"
                      autoFocus
                    />
                  </span>
                </label>
                <div className="lunar-location-picker__results">
                  {!hasMapboxToken() && <span>City search is not configured.</span>}
                  {hasMapboxToken() && locationSearchStatus === "loading" && <span>Searching...</span>}
                  {hasMapboxToken() && locationSearchStatus === "empty" && <span>No cities found.</span>}
                  {hasMapboxToken() && locationSearchStatus === "error" && <span>City search failed.</span>}
                  {locationSuggestions.map((suggestion) => (
                    <button
                      type="button"
                      className={pendingLocation?.label === suggestion.label ? "is-selected" : ""}
                      key={suggestion.id}
                      onClick={() => {
                        applyLocation({
                          label: suggestion.label,
                          latitude: suggestion.latitude,
                          longitude: suggestion.longitude,
                          timeZone: suggestion.timeZone
                        });
                      }}
                    >
                      <strong>{suggestion.label}</strong>
                      <span>{formatTimeZoneLabel(suggestion.timeZone)}</span>
                    </button>
                  ))}
                </div>
                <div className="lunar-location-picker__actions">
                  <button type="button" onClick={cancelLocationPicker}>Cancel</button>
                  <button type="submit" disabled={!pendingLocation && !locationQuery.trim()}>Update</button>
                </div>
              </form>
            )}
          </div>
        </div>
        <div className="lunar-calendar-header-actions">
          <SegmentedControl
            ariaLabel="Calendar view"
            className="lunar-calendar-segmented"
            options={viewModeOptions}
            value={viewMode}
            onChange={handleViewModeChange}
          />
        </div>
      </header>

      {status === "loading" && (
        <div className="lunar-calendar-loading" role="status">
          <Loader2 size={18} aria-hidden="true" />
          <span>Calculating calendar</span>
        </div>
      )}

      {status === "error" && (
        <div className="lunar-calendar-empty" role="status">
          <CalendarDays size={18} aria-hidden="true" />
          <span>Calendar data could not load.</span>
        </div>
      )}

      {calendar && status === "ready" && (
        <div className={`lunar-calendar-body is-${viewMode}`}>
      {viewMode === "week" && selectedDay && (
        <div className="lunar-calendar-week-view">
          <section className="lunar-week-strip" aria-label="Selected week">
            {selectedWeekDays.map((day, index) => {
              const isSelected = selectedDateKey === day.dateKey;
              const isToday = day.dateKey === currentDateKey;
              const dayPhase = phaseLabelForDay(day, calendar.days);
              const marker = day.events.find((event) => event.type === "lunation");
              const tooltipClass = [
                index >= 5 ? "is-tooltip-left" : index <= 1 ? "is-tooltip-right" : "",
                "is-tooltip-below"
              ].filter(Boolean).join(" ");
              const tooltipEvents = calendarDayTooltipEvents(day.events);
              const tooltipLines = calendarDayTooltipLines(day, tooltipEvents, zone, calendar.days);
              const dayLabel = tooltipLines.join(". ");
              const voidTooltipLabel = formatVoidCourseTooltip(day, zone);
              const voidLabel = formatVoidCourseGridWindow(day, zone);
              const weekEvent = monthGridEvents(day.events).find((event) => event.type !== "lunation");

              return (
                <button
                  className={`lunar-week-day ${tooltipClass} ${isSelected ? "is-selected" : ""} ${isToday ? "is-today" : ""}`}
                  key={day.dateKey}
                  type="button"
                  onClick={() => handleSelectDate(day.dateKey)}
                  aria-label={dayLabel}
                >
                  <span className="lunar-week-day__weekday">{formatWeekday(day, zone)}</span>
                  <span className="lunar-week-day__date">{formatDayNumber(day, zone)}</span>
                  <span className={`lunar-moon-disc ${isWaxingPhase(dayPhase) ? "is-waxing" : "is-waning"}`} style={moonDiscStyle(day)} aria-hidden="true" />
                  <span className={`lunar-week-day__sign lunar-moon-sign-glyph ${elementClassForSign(day.moonSign)}`}>
                    {day.moonSignGlyph}
                  </span>
                  <span className="lunar-week-day__illumination">{day.illumination}%</span>
                  {marker && <span className="lunar-week-day__marker">{compactEventLabel(marker)}</span>}
                  {(weekEvent || (day.voidOfCourse && voidLabel)) && (
                    <span className="lunar-week-day__events" aria-hidden="true">
                      {weekEvent && (
                        <span className={`lunar-calendar-event-pill event-${weekEvent.type}`}>
                          {monthCellEventLabel(weekEvent)}
                        </span>
                      )}
                      {day.voidOfCourse && voidLabel && (
                        <span className="lunar-calendar-event-pill event-void">
                          <span>{moonGlyph}</span>
                          <span>{voidLabel}</span>
                        </span>
                      )}
                    </span>
                  )}
                  {!isSelected && (
                    <span className="lunar-calendar-day-tooltip" role="tooltip">
                      <span className="lunar-calendar-day-tooltip__phase">{dayPhase}</span>
                      <span className="lunar-calendar-day-tooltip__sign">Moon in {day.moonSign}</span>
                      {tooltipEvents.length > 0 && (
                        <span className="lunar-calendar-day-tooltip__events">
                          {tooltipEvents.map((event) => (
                            <span className="lunar-calendar-day-tooltip__event" key={event.id}>{event.title}</span>
                          ))}
                        </span>
                      )}
                      {voidTooltipLabel && (
                        <span className="lunar-calendar-day-tooltip__void">Void of course · {voidTooltipLabel}</span>
                      )}
                    </span>
                  )}
                </button>
              );
            })}
          </section>

          {milestonePills}

          {selectedDayCard}

          {visibleWeekTransitEvents.length > 0 && (
            <section className="lunar-week-transits" aria-label="Visible week transits">
              <span className="lunar-calendar-upcoming__label">This week</span>
              <div className="lunar-week-transits__list">
                {visibleWeekTransitEvents.map((event) => (
                  <TransitCard event={event} generatedContent={generatedContent} key={event.id} onOpenTransit={onOpenTransit} timeZone={zone} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {viewMode === "month" && (
        <div className="lunar-calendar-layout">
          <section className="lunar-calendar-grid-panel" aria-label={`${formatMonthLabel(visibleMonth)} lunar grid`}>
            <div className="lunar-calendar-legend" aria-label="Calendar event legend">
              <span className="lunar-calendar-legend__title">Legend:</span>
              <div className="lunar-calendar-legend__items">
                <span><span className="event-lunation" aria-hidden="true" /> Lunation</span>
                <span><span className="event-ingress" aria-hidden="true" /> Ingress</span>
                <span><span className="event-aspect" aria-hidden="true" /> Transit</span>
              </div>
            </div>
            <div className="lunar-calendar-weekdays" aria-hidden="true">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((weekday) => (
                <span key={weekday}>{weekday}</span>
              ))}
            </div>
            <div className="lunar-calendar-grid">
              {calendar.days.map((day, index) => {
                const isSelected = selectedDateKey === day.dateKey;
                const isToday = day.dateKey === currentDateKey;
                const dayPhase = phaseLabelForDay(day, calendar.days);
                const columnIndex = index % 7;
                const rowIndex = Math.floor(index / 7);
                const tooltipClass = [
                  columnIndex >= 5 ? "is-tooltip-left" : columnIndex <= 1 ? "is-tooltip-right" : "",
                  rowIndex === 0 ? "is-tooltip-below" : "is-tooltip-above"
                ].filter(Boolean).join(" ");
                const previewEvents = monthGridEvents(day.events);
                const tooltipEvents = calendarDayTooltipEvents(day.events);
                const tooltipLines = calendarDayTooltipLines(day, tooltipEvents, zone, calendar.days);
                const dayLabel = tooltipLines.join(". ");
                const voidLabel = formatVoidCourseGridWindow(day, zone);
                const voidTooltipLabel = formatVoidCourseTooltip(day, zone);

                return (
                  <button
                    className={`lunar-calendar-day ${tooltipClass} ${day.inMonth ? "" : "is-outside"} ${isSelected ? "is-selected" : ""} ${isToday ? "is-today" : ""}`}
                    key={day.dateKey}
                    type="button"
                    onClick={() => handleSelectDate(day.dateKey)}
                    aria-pressed={isSelected}
                    aria-label={dayLabel}
                  >
                    <span className="lunar-calendar-day__top">
                      <span className="lunar-calendar-day__number">{formatDayNumber(day, zone)}</span>
                    </span>
                    <span className="lunar-calendar-day__lunar">
                      <span className={`lunar-moon-disc ${isWaxingPhase(dayPhase) ? "is-waxing" : "is-waning"}`} style={moonDiscStyle(day)} aria-hidden="true" />
                      <span className={`lunar-calendar-day__moon lunar-moon-sign-glyph ${elementClassForSign(day.moonSign)}`}>
                        {day.moonSignGlyph}
                      </span>
                    </span>
                    <span className="lunar-calendar-day__phase">
                      {day.illumination}%
                    </span>
                    <span className="lunar-calendar-day__events">
                      {previewEvents.map((event) => (
                        <span
                          className={`lunar-calendar-event-pill event-${event.type}`}
                          key={event.id}
                          aria-label={event.title}
                          tabIndex={0}
                        >
                          {monthCellEventLabel(event)}
                        </span>
                      ))}
                      {day.voidOfCourse && voidLabel && (
                        <span
                          className="lunar-calendar-event-pill event-void"
                          aria-label={`Void of course · ${voidTooltipLabel || voidLabel}`}
                          tabIndex={0}
                        >
                          <span aria-hidden="true">☾</span>
                          <span>{voidLabel}</span>
                        </span>
                      )}
                    </span>
                    {!isSelected && (
                      <span className="lunar-calendar-day-tooltip" role="tooltip">
                        <span className="lunar-calendar-day-tooltip__phase">{dayPhase}</span>
                        <span className="lunar-calendar-day-tooltip__sign">Moon in {day.moonSign}</span>
                        {tooltipEvents.length > 0 && (
                          <span className="lunar-calendar-day-tooltip__events">
                            {tooltipEvents.map((event) => (
                              <span className="lunar-calendar-day-tooltip__event" key={event.id}>{event.title}</span>
                            ))}
                          </span>
                        )}
                        {voidTooltipLabel && (
                          <span className="lunar-calendar-day-tooltip__void">Void of course · {voidTooltipLabel}</span>
                        )}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          {milestonePills}

          {selectedDayCard}

          {monthTransitEvents.length > 0 && (
            <section className="lunar-month-transits" aria-label="This month's transits">
              <span className="lunar-calendar-upcoming__label">This month</span>
              <div className="lunar-month-transits__list">
                {monthTransitEvents.map((event) => (
                  <TransitCard event={event} generatedContent={generatedContent} key={event.id} onOpenTransit={onOpenTransit} timeZone={zone} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
        </div>
      )}
    </section>
  );
}

function TransitCard({
  event,
  generatedContent,
  onOpenTransit,
  timeZone
}: {
  event: LunarCalendarEvent;
  generatedContent?: Map<string, LiveGeneratedContent>;
  onOpenTransit?: (event: LunarCalendarEvent) => void;
  timeZone: string;
}) {
  const glyphParts = transitCardGlyphParts(event);
  const content = liveCalendarEventContent(generatedContent, event);
  const title = calendarEventTitleWithSign(event, calendarEventTitle(event, content));
  const normalizedEvent = normalizeCalendarEventSurface(event, content);
  const description = normalizedEvent.sections[0]?.body ?? "";
  const cardContent = (
    <>
      <span className="tx-glyphs" aria-hidden="true">
        {glyphParts.map((part, index) => (
          <span className={part.className} key={`${part.value}-${index}`}>{part.value}</span>
        ))}
      </span>
      <h3 className="tx-title">{title}</h3>
      <div className="tx-foot">
        <span className="tx-tag">{transitCardStatusTag(event)}</span>
        <span className="tx-date">{formatEventDate(event.startsAt, timeZone)} · {formatEventTime(event.startsAt, timeZone)}</span>
      </div>
      {description ? <p className="tx-body">{description}</p> : null}
    </>
  );

  if (onOpenTransit) {
    return (
      <button
        className={`aspect-card tx-card lunar-month-transit-card lunar-month-transit-card--button event-${event.type}`}
        onClick={() => onOpenTransit(event)}
        type="button"
      >
        {cardContent}
      </button>
    );
  }

  return (
    <article className={`aspect-card tx-card lunar-month-transit-card event-${event.type}`}>
      {cardContent}
    </article>
  );
}
