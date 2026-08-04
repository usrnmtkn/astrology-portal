import { CalendarDays, ChevronLeft, ChevronRight, Loader2, MapPin, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent } from "react";
import { SegmentedControl } from "../../components/SegmentedControl";
import {
  getLunarCalendarMonth,
  getLunarCalendarWeek,
  type LunarCalendarDay,
  type LunarCalendarEvent,
  type LunarCalendarMonth as LunarCalendarMonthData
} from "../../services/ephemeris";
import { getLunarCalendarFromApi } from "../../services/calendarApi";
import {
  fallbackArchitectureV3AuthoredContentForKey,
  generatedContentParagraphs,
  type LiveGeneratedContent
} from "../../services/generatedContent";
import {
  calendarAdjacentCopyIsDistinct,
  resolveCalendarWeeklyMoonTone,
  resolveCalendarWeeklyOverview,
  type CalendarEditorialContent
} from "../../services/weeklyHoroscope";
import {
  fallbackV3HookBody,
  fallbackV3PlanetTopic,
  fallbackV3VocabularyBody,
  SourceGapError as FallbackV3SourceGapError,
  transitSynastryFallbackRendererV3 as calendarFallbackRendererV3
} from "../../content/fallbackArchitectureV3Runtime";
import { firstReaderFacingCopy, isReaderFacingCopy } from "../../content/readerSafety";
import { slugContentPart } from "../../services/generatedContentKeys";
import { resolveSkyAspectGeneratedContent } from "../../services/skyAspectContent";
import { hasMapboxToken, searchCities, type CitySuggestion } from "../../services/mapbox";
import { timeZoneForLocation, withTimeZone } from "../../services/timezones";
import type { LocationInput } from "../../types";
import { calendarEventGeneratedContentKeys } from "./calendarContentKeys";
import { calendarMoonContinuationText, calendarPhaseLabelForDay } from "./calendarPhaseLabel";
import { lunarDayGeneratedContentKeys, resolveLunarDay } from "./lunarDayResolver";
import type { LunarDay, LunarDayArcPoint } from "./lunarDayTypes";
import { sunIngressSeasonSign, sunIngressSeasonWindow } from "./seasonWindow";
import {
  resolveWeeklyDayRole,
  weeklyEventDescriptionFitsDateContext,
  weeklyFallbackGuidanceSource,
  weeklyMoonRoleOffset
} from "./weeklyDayRole";

type LunarCalendarStatus = "loading" | "ready" | "error";
type LunarCalendarViewMode = "week" | "month" | "weekly";
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
  generatedContentStatus?: "idle" | "loading" | "ready";
  onGeneratedContentRequest?: (request: { cacheKey: string; contentKeys: string[] }) => void;
  onOpenTransit?: (event: LunarCalendarEvent, description?: string) => void;
  showJournalPrompts?: boolean;
};

type LocationSearchStatus = "idle" | "loading" | "ready" | "empty" | "error";

const viewModeOptions: Array<{ value: LunarCalendarViewMode; label: string }> = [
  { value: "week", label: "Day" },
  { value: "weekly", label: "Week" },
  { value: "month", label: "Month" }
];

const calendarStorageVersion = "v8";
const calendarStorageTtlMs = 12 * 60 * 60_000;
const enableLunarArcContent = String(import.meta.env.VITE_ENABLE_LUNAR_ARC_CONTENT ?? "true").toLowerCase() !== "false";
const enableCalendarApi = import.meta.env.PROD
  || String(import.meta.env.VITE_USE_LUNAR_CALENDAR_API ?? "false").toLowerCase() === "true";

type StoredCalendarPayload = {
  savedAt: number;
  calendar: LunarCalendarMonthData;
};

function calendarRouteStateFromUrl(fallbackDate: string) {
  try {
    const cleanHash = window.location.hash.replace(/^#\/?/, "");
    const [path = "", query = ""] = cleanHash.split("?");

    if (path !== "calendar") return null;

    const params = new URLSearchParams(query);
    const rawView = params.get("view");
    const rawDate = params.get("date");
    const view: LunarCalendarViewMode = rawView === "day" || rawView === "daily" || rawView === "week"
      ? "week"
      : rawView === "weekly" || rawView === "month"
        ? rawView
        : "week";
    const date = rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate)
      ? rawDate
      : fallbackDate;

    return { view, date };
  } catch {
    return null;
  }
}

function updateCalendarRouteUrl(view: LunarCalendarViewMode, date: string, mode: "push" | "replace" = "push") {
  try {
    const url = new URL(window.location.href);
    const params = new URLSearchParams();

    params.set("view", view === "week" ? "day" : view);
    params.set("date", date);
    url.hash = `calendar?${params.toString()}`;
    window.history[mode === "replace" ? "replaceState" : "pushState"]({}, "", url.toString());
  } catch {
    // URL state is an enhancement; Calendar remains usable without history.
  }
}

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
  const weekday = start.getDay();
  const daysSinceMonday = weekday === 0 ? 6 : weekday - 1;

  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - daysSinceMonday);

  return start;
}

function isWeekBasedView(mode: LunarCalendarViewMode) {
  return mode === "week" || mode === "weekly";
}

function storageDateKey(date: Date) {
  return dateKeyFromDate(date);
}

function calendarStorageKey(
  location: LocationInput,
  mode: LunarCalendarViewMode,
  anchor: Date
) {
  // The editorial Week view requires fully hydrated event prose. Keep it
  // separate from the lighter Day cache so partial data can never flash before
  // the final weekly write-up replaces it.
  const normalizedMode = mode === "weekly" ? "weekly" : mode;
  const normalizedAnchor = isWeekBasedView(mode) ? startOfWeekDate(anchor) : monthStart(anchor);

  return [
    "tldr-lunar-calendar",
    calendarStorageVersion,
    normalizedMode,
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
  const dataMode = isWeekBasedView(mode) ? "week" : "month";
  const loadCalendar = dataMode === "week" ? getLunarCalendarWeek : getLunarCalendarMonth;

  if (!enableCalendarApi) {
    return loadCalendar(location, anchor, { detail });
  }

  try {
    return await getLunarCalendarFromApi(location, dataMode, anchor, detail);
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

function formatWeeklyDate(day: LunarCalendarDay, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    month: "short",
    day: "numeric"
  }).format(new Date(day.date));
}

function formatWeeklyRange(days: LunarCalendarDay[], timeZone: string) {
  const first = days[0];
  const last = days.at(-1);

  if (!first || !last) {
    return "";
  }

  const start = new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "short",
    day: "numeric"
  }).format(new Date(first.date));
  const end = new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(last.date));

  return `${start} – ${end}`;
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

function weeklyWriteupEvents(day: LunarCalendarDay) {
  const events = dayEventPreview(day.events).filter((event) => (
    event.dateKey === day.dateKey
    && !isActiveRetrogradeEvent(event)
    && (
      event.type === "lunation"
      || (
        event.primary
        && (
          event.type === "ingress"
          || event.type === "station"
          || (event.type === "aspect" && !event.planets?.includes("Moon"))
        )
      )
    )
  ));
  const byMovement = new Map<string, LunarCalendarEvent>();

  for (const event of events) {
    const movementKey = [
      event.type,
      event.title,
      event.planet ?? "",
      event.planets?.join("-") ?? "",
      event.aspect ?? "",
      event.sign ?? event.toSign ?? ""
    ].join("|");

    if (!byMovement.has(movementKey)) {
      byMovement.set(movementKey, event);
    }
  }

  return [...byMovement.values()];
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
    formatSelectedDay(day, timeZone),
    calendarPhaseLabelForDay(day, calendarDays),
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

  const headline = content.headline?.trim() ?? "";
  const body = content.body.trim();
  const containsEditorialMetadata = /^(?:ms|fallback-hook)\s*\//i.test(headline)
    || /\b(?:REVIEWED|DRAFT)\s*·\s*[a-z-]+\s*·\s*(?:transit|ingress|station)\s*·/u.test(body);

  if (containsEditorialMetadata) {
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
  if (
    event.type === "aspect"
    && event.planets
    && event.aspect
    && event.fromSign
    && event.toSign
  ) {
    if (!generatedContent) {
      return null;
    }

    const [first, second] = event.planets;

    return resolveSkyAspectGeneratedContent({
      generatedContent,
      first,
      second,
      aspect: event.aspect,
      firstSign: event.fromSign,
      secondSign: event.toSign,
      targetDate: event.dateKey || event.startsAt.slice(0, 10)
    })?.content ?? null;
  }

  for (const contentKey of calendarEventGeneratedContentKeys(event)) {
    const content = fallbackArchitectureV3AuthoredContentForKey(contentKey);

    if (content && contentMatchesCalendarEventFacts(event, content)) {
      return content;
    }
  }

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

function calendarStationDirectPackageDescription(event: LunarCalendarEvent, dateLine: string) {
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
    .replaceAll("{{dateLine}}", dateLine)
    .replaceAll("{{aRef}}", planetReference)
    .replaceAll("{{aTopic}}", planetTopic)
    .replace(/\s{2,}/g, " ")
    .trim();

  return isReaderFacingCopy(body) ? body : "";
}

function calendarIngressPackageDescription(event: LunarCalendarEvent, dateLine: string) {
  const sign = event.toSign ?? event.sign;

  if (!event.planet || !sign) {
    return "";
  }

  const signPart = slugContentPart(sign);
  const planetPart = slugContentPart(event.planet);
  // The former generic ingress frame was explicitly rejected because it used
  // the same "tone shifts / takes on that flavor / sign trap" construction for
  // every planet. Fail closed until an exact reviewed planet-sign row exists.
  const frame = fallbackV3HookBody(`fallback-hook/sky-event/ingress/${planetPart}/${signPart}`);
  const planetTopic = fallbackV3PlanetTopic(event.planet);
  const signNeed = fallbackV3VocabularyBody(`fallback-vocab/sign-need/${signPart}`);
  const signTrap = fallbackV3HookBody(`fallback-hook/sky-sign-trap/${signPart}`);

  if (!frame || !planetTopic || !signNeed || !signTrap) {
    return "";
  }

  const body = frame
    .replaceAll("{{dateLine}}", dateLine)
    .replaceAll("{{dateLineLower}}", `${dateLine.charAt(0).toLowerCase()}${dateLine.slice(1)}`)
    .replaceAll("{{aRef}}", event.planet)
    .replaceAll("{{signTitle}}", sign)
    .replaceAll("{{signNeed}}", signNeed)
    .replaceAll("{{aTopic}}", planetTopic)
    .replaceAll("{{signTrap}}", signTrap)
    .replace(/\s{2,}/g, " ")
    .trim();

  return isReaderFacingCopy(body) ? body : "";
}

function calendarEventPackageDescription(event: LunarCalendarEvent, dateLine = "Today") {
  if (event.type === "lunation" && event.sign) {
    try {
      const phase = calendarPhaseContentKey(lunationDisplayLabel(event));
      const rendered = calendarFallbackRendererV3.renderCalendarPhase({
        phase,
        sign: slugContentPart(event.sign)
      });

      return firstReaderFacingCopy(rendered.parts);
    } catch (error) {
      return calendarEventPackageFailure(event, error);
    }
  }

  if (event.type === "ingress" && event.planet && (event.toSign || event.sign)) {
    const sign = event.toSign ?? event.sign;

    try {
      const rendered = calendarFallbackRendererV3.renderSkyPlacement({
        planet: slugContentPart(event.planet),
        sign: slugContentPart(sign ?? "")
      });

      return firstReaderFacingCopy(rendered.parts)
        || calendarIngressPackageDescription(event, dateLine);
    } catch (error) {
      calendarEventPackageFailure(event, error);
      return calendarIngressPackageDescription(event, dateLine);
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
    return calendarStationDirectPackageDescription(event, dateLine);
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
        dateLine
      });

      return firstReaderFacingCopy(rendered.parts);
    } catch (error) {
      return calendarEventPackageFailure(event, error);
    }
  }

  return "";
}

function normalizeCalendarEventSurface(
  event: LunarCalendarEvent,
  content: LiveGeneratedContent | null,
  dateLine = "Today"
): NormalizedCalendarEventSurface {
  const generatedDescription = firstReaderFacingCopy([
    ...(event.type === "aspect" ? [] : [content?.summary]),
    ...(event.type === "aspect" && content
      ? [generatedContentParagraphs(content).join("\n\n").trim()]
      : generatedContentParagraphs(content))
  ]);
  const generatedDescriptionFitsDateContext = dateLine === "Today"
    || weeklyEventDescriptionFitsDateContext(generatedDescription);

  if (content && generatedDescription && generatedDescriptionFitsDateContext) {
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

  const packageDescription = calendarEventPackageDescription(event, dateLine);

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

function calendarCanonicalEventDateLine(event: LunarCalendarEvent, timeZone: string) {
  return `On ${new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    month: "long",
    day: "numeric"
  }).format(new Date(event.startsAt))}`;
}

function calendarEventEditorialContent(
  event: LunarCalendarEvent,
  generatedContent: Map<string, LiveGeneratedContent> | undefined,
  timeZone: string
): CalendarEditorialContent {
  const dateLine = calendarCanonicalEventDateLine(event, timeZone);
  const content = liveCalendarEventContent(generatedContent, event);
  const normalized = normalizeCalendarEventSurface(event, content, dateLine);
  const description = normalized.sections[0];
  const headline = calendarEventTitleWithSign(event, calendarEventTitle(event, content));
  const fallbackContentKey = `generated/calendar-event/${event.type}/${event.id}`;

  return {
    contentKey: description?.layer === "authored"
      ? description.sourceKeys[0] ?? `owner-approved/calendar-event/${event.id}`
      : description
        ? fallbackContentKey
        : `source-gap/calendar-event/${event.id}`,
    contentSource: description?.layer === "authored" ? "owner_approved" : "generated_fallback",
    eventId: event.id,
    dateRange: {
      start: event.startsAt,
      end: event.endsAt ?? event.startsAt
    },
    headline,
    eventCopy: description?.body ?? "",
    provenance: {
      sourceId: description?.sourceKeys[0],
      generatedBy: description?.tier,
      templateVersion: description?.layer === "fallback" ? "calendar-event-fallback.v3" : undefined,
      reviewStatus: description?.layer === "authored" ? "reader-eligible" : "assembled-fallback"
    }
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
  const weekday = new Date(weekTime).getUTCDay();
  const daysSinceMonday = weekday === 0 ? 6 : weekday - 1;
  const weekStart = weekTime - daysSinceMonday * 86_400_000;
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

export function LunarCalendar({
  location,
  onLocationChange,
  generatedContent,
  generatedContentStatus = "idle",
  onGeneratedContentRequest,
  onOpenTransit
}: LunarCalendarProps) {
  const initialRouteState = useMemo(
    () => calendarRouteStateFromUrl(todayKey(location.timeZone || "UTC")),
    [location.timeZone]
  );
  const initialDateKey = initialRouteState?.date ?? todayKey(location.timeZone || "UTC");
  const [visibleMonth, setVisibleMonth] = useState(() => monthStartFromDateKey(initialDateKey));
  const [visibleWeekDateKey, setVisibleWeekDateKey] = useState(() => initialDateKey);
  const [viewMode, setViewMode] = useState<LunarCalendarViewMode>(initialRouteState?.view ?? "week");
  const [calendar, setCalendar] = useState<LunarCalendarMonthData | null>(null);
  const [selectedCalendar, setSelectedCalendar] = useState<LunarCalendarMonthData | null>(null);
  const [status, setStatus] = useState<LunarCalendarStatus>("loading");
  const [selectedDateKey, setSelectedDateKey] = useState(initialDateKey);
  const [retryNonce, setRetryNonce] = useState(0);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const [locationQuery, setLocationQuery] = useState(location.label);
  const [locationSuggestions, setLocationSuggestions] = useState<CitySuggestion[]>([]);
  const [pendingLocation, setPendingLocation] = useState<CitySuggestion | null>(null);
  const [locationSearchStatus, setLocationSearchStatus] = useState<LocationSearchStatus>("idle");
  const monthDetailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let cancelHydration: (() => void) | null = null;
    const visibleAnchor = isWeekBasedView(viewMode) ? dateFromDateKey(visibleWeekDateKey) : visibleMonth;
    const storedCalendarKey = calendarStorageKey(location, viewMode, visibleAnchor);
    const storedCalendar = readStoredCalendar(storedCalendarKey);
    const initialDetail = viewMode === "weekly" ? "full" : "basic";

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

    loadCalendarData(location, viewMode, visibleAnchor, initialDetail)
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

        if (initialDetail === "full") {
          return;
        }

        cancelHydration = scheduleIdleTask(() => {
          loadCalendarData(location, viewMode, visibleAnchor, "full")
            .then((fullCalendar) => {
              if (!cancelled) {
                setCalendar(fullCalendar);
                writeStoredCalendar(storedCalendarKey, fullCalendar);
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
  }, [location, retryNonce, viewMode, visibleMonth, visibleWeekDateKey]);

  useEffect(() => {
    function syncCalendarRoute() {
      const routeState = calendarRouteStateFromUrl(todayKey(location.timeZone || "UTC"));

      if (!routeState) return;
      setViewMode(routeState.view);
      setSelectedDateKey(routeState.date);
      setVisibleWeekDateKey(routeState.date);
      setVisibleMonth(monthStartFromDateKey(routeState.date));
    }

    window.addEventListener("popstate", syncCalendarRoute);
    window.addEventListener("hashchange", syncCalendarRoute);

    return () => {
      window.removeEventListener("popstate", syncCalendarRoute);
      window.removeEventListener("hashchange", syncCalendarRoute);
    };
  }, [location.timeZone]);

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

    const selectedDateIsInVisibleRange = isWeekBasedView(viewMode)
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
  const generatedContentRequest = useMemo(() => {
    if (!calendar) {
      return null;
    }

    const visibleDays = viewMode === "month"
      ? calendar.days.filter((day) => day.inMonth)
      : selectedWeekDays;
    const visibleEvents = viewMode === "weekly"
      ? selectedWeekDays.flatMap(weeklyWriteupEvents)
      : viewMode === "month"
        ? monthTransitCardEvents(calendar.days)
        : weekTransitCardEvents(selectedWeekDays);
    const selectedEvents = selectedDay?.events ?? [];
    const editorialEvents = Array.from(new Map([
      ...calendar.events,
      ...(selectedCalendar?.events ?? [])
    ].map((event) => [event.id, event])).values());
    const contentKeys = [
      ...visibleEvents.flatMap(calendarEventGeneratedContentKeys),
      ...selectedEvents.flatMap(calendarEventGeneratedContentKeys),
      ...(selectedDay ? lunarDayGeneratedContentKeys(selectedDay, editorialEvents) : [])
    ].filter((contentKey) => !fallbackArchitectureV3AuthoredContentForKey(contentKey));
    const firstDate = visibleDays[0]?.dateKey ?? selectedDateKey;
    const lastDate = visibleDays.at(-1)?.dateKey ?? selectedDateKey;
    const locationKey = `${location.latitude.toFixed(3)},${location.longitude.toFixed(3)},${calendar.timeZone}`;

    return {
      cacheKey: `${locationKey}:${viewMode}:${firstDate}:${lastDate}`,
      contentKeys: Array.from(new Set(contentKeys.filter(Boolean))).sort()
    };
  }, [calendar, location.latitude, location.longitude, selectedCalendar, selectedDateKey, selectedDay, selectedWeekDays, viewMode]);
  const generatedContentRequestSignature = generatedContentRequest
    ? `${generatedContentRequest.cacheKey}:${generatedContentRequest.contentKeys.join("|")}`
    : "";

  useEffect(() => {
    if (generatedContentRequest) {
      onGeneratedContentRequest?.(generatedContentRequest);
    }
  }, [generatedContentRequestSignature, onGeneratedContentRequest]);

  const weeklyDayWriteups = useMemo(() => {
    if (!calendar) {
      return [];
    }

    let activeMoonSign = "";
    let usedMoonGuidanceKeys = new Set<string>();
    let hasVisibleMoonGuidanceInSign = false;
    const usedGuidanceBodies = new Set<string>();
    let previousGuidanceBody = "";
    const significantEventsByDate = new Map(calendar.days.map((day) => [
      day.dateKey,
      weeklyWriteupEvents(day)
    ]));

    return selectedWeekDays.map((day, weekDayIndex) => {
      const phase = calendarPhaseLabelForDay(day, calendar.days);
      const significantEvents = significantEventsByDate.get(day.dateKey) ?? [];
      const calendarDayIndex = calendar.days.findIndex((calendarDay) => calendarDay.dateKey === day.dateKey);
      const previousDay = calendarDayIndex > 0 ? calendar.days[calendarDayIndex - 1] : null;
      const nextDay = calendarDayIndex >= 0 && calendarDayIndex < calendar.days.length - 1
        ? calendar.days[calendarDayIndex + 1]
        : null;
      const role = resolveWeeklyDayRole({
        day,
        previousDay,
        significantEvents,
        previousSignificantEvents: previousDay
          ? significantEventsByDate.get(previousDay.dateKey) ?? []
          : [],
        nextSignificantEvents: nextDay
          ? significantEventsByDate.get(nextDay.dateKey) ?? []
          : [],
        isLastDay: weekDayIndex === selectedWeekDays.length - 1
      });
      const events = significantEvents.map((event) => {
        const editorial = calendarEventEditorialContent(
          event,
          generatedContent,
          zone
        );

        return {
          event,
          editorial,
          title: editorial.headline ?? event.title,
          description: editorial.eventCopy ?? ""
        };
      });
      let guidance: {
        headline: string;
        body: string;
        contentKey: string;
        source: "phase" | "moon" | "continuation";
      } | null = null;

      if (day.moonSign !== activeMoonSign) {
        activeMoonSign = day.moonSign;
        usedMoonGuidanceKeys = new Set<string>();
        hasVisibleMoonGuidanceInSign = false;
      }

      const renderMoonGuidance = () => {
        const startingVariant = weeklyMoonVariantForDate(day.dateKey) + weeklyMoonRoleOffset(role);

        for (let offset = 0; offset < 4; offset += 1) {
          try {
            const variant = ((startingVariant - 1 + offset) % 4) + 1;
            const candidate = calendarFallbackRendererV3.renderWeeklyMoon({
              sign: slugContentPart(day.moonSign),
              variant
            });

            if (
              !usedMoonGuidanceKeys.has(candidate.contentKey)
              && !usedGuidanceBodies.has(candidate.body)
              && calendarAdjacentCopyIsDistinct(candidate.body, previousGuidanceBody)
            ) {
              return {
                headline: candidate.headline,
                body: candidate.body,
                contentKey: candidate.contentKey,
                source: "moon" as const
              };
            }
          } catch (error) {
            if (!(error instanceof FallbackV3SourceGapError)) {
              throw error;
            }
          }
        }

        return null;
      };
      const renderPhaseGuidance = () => {
        try {
          const candidate = calendarFallbackRendererV3.renderCalendarPhase({
            phase: calendarPhaseContentKey(phase),
            sign: slugContentPart(day.moonSign)
          });
          const body = firstReaderFacingCopy(candidate.parts);

          if (
            body
            && !usedGuidanceBodies.has(body)
            && calendarAdjacentCopyIsDistinct(body, previousGuidanceBody)
          ) {
            return {
              headline: candidate.headline,
              body,
              contentKey: candidate.contentKey,
              source: "phase" as const
            };
          }
        } catch (error) {
          if (!(error instanceof FallbackV3SourceGapError)) {
            throw error;
          }
        }

        return null;
      };
      const preferredSource = weeklyFallbackGuidanceSource(role, hasVisibleMoonGuidanceInSign);

      if (preferredSource === "phase") {
        guidance = renderPhaseGuidance() ?? renderMoonGuidance();
      } else {
        guidance = renderMoonGuidance() ?? renderPhaseGuidance();
      }

      if (!guidance) {
        const continuationBody = calendarMoonContinuationText({
          date: day.date,
          timeZone: zone,
          moonSign: day.moonSign,
          phase,
          previousMoonSign: previousDay?.moonSign
        });

        if (continuationBody) {
          guidance = {
            headline: `Moon in ${day.moonSign}`,
            body: continuationBody,
            contentKey: `generated/calendar-moon-continuation/${day.dateKey}`,
            source: "continuation"
          };
        }
      }

      if (guidance) {
        usedGuidanceBodies.add(guidance.body);
        previousGuidanceBody = guidance.body;

        if (guidance.source === "moon") {
          usedMoonGuidanceKeys.add(guidance.contentKey);
          hasVisibleMoonGuidanceInSign = true;
        }
      }

      const showGuidance = Boolean(guidance?.body);

      return {
        day,
        phase,
        events,
        role,
        guidance,
        showGuidance
      };
    });
  }, [calendar, generatedContent, selectedWeekDays, zone]);
  const weeklyForecastEvents = weeklyDayWriteups.flatMap((writeup) => (
    writeup.events.map(({ event }) => event)
  ));
  const weeklyForecast = resolveCalendarWeeklyOverview({
    weekStart: selectedWeekDays[0]?.dateKey ?? "",
    weekEnd: selectedWeekDays.at(-1)?.dateKey ?? "",
    events: weeklyForecastEvents,
    dailyCopy: weeklyDayWriteups.flatMap((writeup) => (
      writeup.guidance?.body ? [writeup.guidance.body] : []
    ))
  });
  const weeklyMonday = weeklyDayWriteups.find(({ day }) => (
    new Date(`${day.dateKey}T12:00:00.000Z`).getUTCDay() === 1
  ));
  const weeklyMondayMoonTone = weeklyMonday
    ? resolveCalendarWeeklyMoonTone({
        mondayDateKey: weeklyMonday.day.dateKey,
        moonSign: weeklyMonday.day.moonSign
      })
    : undefined;
  const weeklyLeadMoon = weeklyDayWriteups.find((writeup) => writeup.guidance?.body)?.guidance ?? null;
  const weeklyMainShifts = weeklyForecast?.mainShifts ?? [];
  const weeklyForecastHeadline = weeklyForecast?.weeklyHeadline
    ?? weeklyLeadMoon?.headline
    ?? "Your week in the sky";
  const weeklySupportingShifts = weeklyMainShifts;
  const weeklyForecastBody = weeklyForecast?.weeklyOverview ?? "";
  const weeklyRangeLabel = formatWeeklyRange(selectedWeekDays, calendar?.timeZone ?? location.timeZone ?? "UTC");
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

      // Use the same reviewed, sign-specific aspect content selected for Sky.
      // When that exact row is unavailable, preserve Calendar coverage with
      // the package renderer instead of leaving the write-up blank.
      const editorial = calendarEventEditorialContent(event, generatedContent, zone);
      const body = editorial.eventCopy ?? "";

      if (body) {
        seenAspectKeys.add(aspectKey);
        writeups.push(body);
      }
    }

    return writeups;
  }, [generatedContent, selectedDayTransits]);
  const selectedPrimaryLunation = selectedDay ? primaryLunationForDay(selectedDay) : undefined;
  const selectedDayPhase = selectedDay && calendar
    ? calendarPhaseLabelForDay(selectedDay, calendar.days)
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
  const selectedWeekWriteup = selectedDay
    ? weeklyDayWriteups.find((writeup) => writeup.day.dateKey === selectedDay.dateKey) ?? null
    : null;
  const selectedPackageWeeklyMoon = selectedWeekWriteup
    ? selectedWeekWriteup.guidance
    : selectedDay
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
              {selectedDayBodyPresentation.main.length > 0 && (
                <section
                  className="lunar-selected-card__body-section"
                  aria-labelledby="lunar-selected-moon-heading"
                  data-guidance-key={selectedPackageWeeklyMoon?.contentKey}
                >
                  <h3 id="lunar-selected-moon-heading">Today’s Moon</h3>
                  {selectedDayBodyPresentation.main.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </section>
              )}
              {selectedDayAspectWriteups.length > 0 && (
                <section className="lunar-selected-card__body-section" aria-labelledby="lunar-selected-exact-heading">
                  <h3 id="lunar-selected-exact-heading">Exact today</h3>
                  {selectedDayAspectWriteups.map((writeup) => (
                    <p className="lunar-selected-card__aspect-writeup" key={writeup}>{writeup}</p>
                  ))}
                </section>
              )}
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
                <span className="lunar-selected-card__section-label">
                  {selectedDayTransits.every(isActiveRetrogradeEvent) ? "Longer background" : "Sky movements"}
                </span>
                {selectedDayTransits.map((event) => {
                  const editorial = calendarEventEditorialContent(
                    event,
                    generatedContent,
                    zone
                  );
                  const eventTitle = editorial.headline ?? event.title;
                  const description = editorial.eventCopy ?? "";

                  return (
                    <button
                      className={`lunar-selected-card__daily-event event-${event.type}`}
                      data-content-key={editorial.contentKey}
                      type="button"
                      key={event.id}
                      aria-label={eventTitle}
                      onClick={() => onOpenTransit?.(event, description)}
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
    updateCalendarRouteUrl(nextMode, selectedDateKey || visibleWeekDateKey);
  };
  function handleSelectDate(dateKey: string) {
    setSelectedDateKey(dateKey);
    setVisibleWeekDateKey(dateKey);
    if (!dateKeyInMonth(dateKey, visibleMonth)) {
      setVisibleMonth(monthStartFromDateKey(dateKey));
    }
    updateCalendarRouteUrl(viewMode, dateKey);

    if (viewMode === "month" && window.matchMedia("(max-width: 820px)").matches) {
      window.requestAnimationFrame(() => {
        monthDetailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }
  function handleDayKeyDown(event: KeyboardEvent<HTMLButtonElement>, dateKey: string) {
    const offset = event.key === "ArrowLeft"
      ? -1
      : event.key === "ArrowRight"
        ? 1
        : event.key === "ArrowUp"
          ? -7
          : event.key === "ArrowDown"
            ? 7
            : 0;

    if (!offset) return;

    event.preventDefault();
    const nextDateKey = dateKeyFromUtcTime(dayKeyToUtcTime(dateKey) + offset * 86_400_000);
    handleSelectDate(nextDateKey);
    window.requestAnimationFrame(() => {
      document.querySelector<HTMLButtonElement>(`[data-calendar-date="${nextDateKey}"]`)?.focus();
    });
  }
  const handleToday = () => {
    const nextDateKey = todayKey(location.timeZone || "UTC");

    setSelectedDateKey(nextDateKey);
    setVisibleWeekDateKey(nextDateKey);
    setVisibleMonth(monthStartFromDateKey(nextDateKey));
    updateCalendarRouteUrl(viewMode, nextDateKey);
  };
  const handleCalendarNavigation = (direction: -1 | 1) => {
    if (isWeekBasedView(viewMode)) {
      const nextWeekDateKey = dateKeyFromUtcTime(dayKeyToUtcTime(visibleWeekDateKey) + direction * 7 * 86_400_000);

      setVisibleWeekDateKey(nextWeekDateKey);
      setVisibleMonth(monthStartFromDateKey(nextWeekDateKey));
      const nextDateKey = selectedDateKey
        ? dateKeyFromUtcTime(dayKeyToUtcTime(selectedDateKey) + direction * 7 * 86_400_000)
        : nextWeekDateKey;
      setSelectedDateKey(nextDateKey);
      updateCalendarRouteUrl(viewMode, nextDateKey);
      return;
    }

    const nextMonth = addMonths(visibleMonth, direction);

    setVisibleMonth(nextMonth);
    setVisibleWeekDateKey(dateKeyFromDate(nextMonth));
    const nextDateKey = dateKeyFromDate(nextMonth);
    setSelectedDateKey(nextDateKey);
    updateCalendarRouteUrl(viewMode, nextDateKey);

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
            <div className="lunar-calendar-controls" aria-label={isWeekBasedView(viewMode) ? "Calendar week controls" : "Calendar month controls"}>
              <button type="button" aria-label={isWeekBasedView(viewMode) ? "Previous week" : "Previous month"} onClick={() => handleCalendarNavigation(-1)}>
                <ChevronLeft size={18} aria-hidden="true" />
              </button>
              <button type="button" className="lunar-calendar-controls__today" onClick={handleToday}>
                Today
              </button>
              <button type="button" aria-label={isWeekBasedView(viewMode) ? "Next week" : "Next month"} onClick={() => handleCalendarNavigation(1)}>
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
            id="lunar-calendar-view"
            options={viewModeOptions}
            panelId="lunar-calendar-view-panel"
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
        <div className="lunar-calendar-empty" role="alert">
          <CalendarDays size={18} aria-hidden="true" />
          <span>Calendar data could not load.</span>
          <button type="button" onClick={() => setRetryNonce((value) => value + 1)}>Retry</button>
        </div>
      )}

      {calendar && status === "ready" && (
        <div
          className={`lunar-calendar-body is-${viewMode}`}
          id="lunar-calendar-view-panel"
          role="tabpanel"
          aria-labelledby={`lunar-calendar-view-${viewMode}-tab`}
        >
      {viewMode === "week" && selectedDay && (
        <div className="lunar-calendar-week-view">
          <section className="lunar-week-strip" aria-label="Selected week">
            {selectedWeekDays.map((day, index) => {
              const isSelected = selectedDateKey === day.dateKey;
              const isToday = day.dateKey === currentDateKey;
              const dayPhase = calendarPhaseLabelForDay(day, calendar.days);
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
                  onKeyDown={(event) => handleDayKeyDown(event, day.dateKey)}
                  data-calendar-date={day.dateKey}
                  aria-label={dayLabel}
                  aria-pressed={isSelected}
                  aria-current={isToday ? "date" : undefined}
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
                  <TransitCard
                    contentStatus={generatedContentStatus}
                    event={event}
                    generatedContent={generatedContent}
                    key={event.id}
                    onOpenTransit={onOpenTransit}
                    timeZone={zone}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {viewMode === "weekly" && (
        <div className="lunar-weekly-view">
          <section
            className="lunar-weekly-hero"
            aria-labelledby="lunar-weekly-title"
            data-weekly-source={weeklyForecast?.contentSource ?? "emergency_fallback"}
            data-weekly-moon-key={weeklyMondayMoonTone?.contentKey}
          >
            <p className="lunar-weekly-hero__eyebrow">Weekly forecast</p>
            <h2 id="lunar-weekly-title">
              {weeklyForecastHeadline}
            </h2>
            {weeklyForecastBody && (
              <div className="lunar-weekly-hero__body">
                {weeklyForecastBody.split(/\n\s*\n/u).map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            )}
            {weeklySupportingShifts.length > 0 && (
              <div className="lunar-weekly-hero__shifts" aria-label="Key shifts">
                <p>Key shifts</p>
                <ul>
                  {weeklySupportingShifts.map((event) => (
                    <li key={event.id}>{calendarEventTitleWithSign(event, event.title)}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <section className="lunar-weekly-days" aria-label={`Day-by-day astrology for ${weeklyRangeLabel}`}>
            <nav className="lunar-weekly-jump" aria-label="Jump to a day">
              {weeklyDayWriteups.map(({ day, events }) => (
                <button
                  type="button"
                  key={day.dateKey}
                  aria-current={day.dateKey === currentDateKey ? "date" : undefined}
                  data-has-events={events.length > 0 ? "true" : "false"}
                  onClick={() => document.getElementById(`lunar-weekly-${day.dateKey}`)?.scrollIntoView({ behavior: "smooth", block: "start" })}
                >
                  {new Intl.DateTimeFormat("en-US", { timeZone: zone, weekday: "short" }).format(new Date(day.date))}
                  <span>{formatDayNumber(day, zone)}</span>
                </button>
              ))}
            </nav>
            <ol>
              {weeklyDayWriteups.map(({ day, events, guidance, phase, role, showGuidance }) => {
                const voidWindow = formatVoidCourseDetailWindow(day, zone);
                const visibleEvents = events;
                const isToday = day.dateKey === currentDateKey;

                return (
                  <li key={day.dateKey}>
                    <article
                      className="lunar-weekly-day"
                      data-is-today={isToday ? "true" : "false"}
                      data-weekly-day-role={role}
                      id={`lunar-weekly-${day.dateKey}`}
                    >
                      <header className="lunar-weekly-day__header">
                        <div>
                          <p>{formatWeeklyDate(day, zone)}</p>
                          <h3>Moon in {day.moonSign}</h3>
                          <div className="lunar-weekly-day__facts">
                            <span>{phase}</span>
                            <span>{day.illumination}% illuminated</span>
                            {voidWindow && <span>Void · {voidWindow}</span>}
                          </div>
                        </div>
                        <span
                          className={`lunar-moon-disc ${isWaxingPhase(phase) ? "is-waxing" : "is-waning"}`}
                          style={moonDiscStyle(day)}
                          aria-hidden="true"
                        />
                      </header>

                      {(visibleEvents.length > 0 || (showGuidance && guidance?.body)) && (
                        <div className="lunar-weekly-day__content">
                          {showGuidance && guidance?.body && (
                            <section
                              className="lunar-weekly-day__guidance"
                              data-guidance-key={guidance.contentKey}
                              data-guidance-source={guidance.source}
                            >
                              <div>{guidance.body}</div>
                            </section>
                          )}

                          {visibleEvents.length > 0 && (
                            <div className="lunar-weekly-day__events" aria-label={`${formatWeeklyDate(day, zone)} movements`}>
                              {visibleEvents.map(({ event, editorial, title, description }) => (
                                <section
                                  className={`lunar-weekly-event event-${event.type}`}
                                  data-content-key={editorial.contentKey}
                                  key={event.id}
                                >
                                  <div className="lunar-weekly-event__heading">
                                    <span aria-hidden="true">{monthCellEventLabel(event)}</span>
                                    <div>
                                      <h4>{title}</h4>
                                      <p>{formatEventTime(event.startsAt, zone)} · {transitCardStatusTag(event)}</p>
                                    </div>
                                  </div>
                                  {description && <p className="lunar-weekly-event__body">{description}</p>}
                                </section>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </article>
                  </li>
                );
              })}
            </ol>
          </section>
        </div>
      )}

      {viewMode === "month" && (
        <div className="lunar-calendar-layout">
          <div className="lunar-calendar-month-primary">
            <section className="lunar-calendar-grid-panel" aria-label={`${formatMonthLabel(visibleMonth)} lunar grid`}>
            <div className="lunar-calendar-legend" aria-label="Calendar event legend">
              <span className="lunar-calendar-legend__title">Legend:</span>
              <div className="lunar-calendar-legend__items">
                <span><span className="event-lunation" aria-hidden="true" /> Lunation</span>
                <span><span className="event-ingress" aria-hidden="true" /> Ingress</span>
                <span><span className="event-station" aria-hidden="true" /> Station</span>
                <span><span className="event-aspect" aria-hidden="true" /> Aspect</span>
                <span><span className="event-void" aria-hidden="true" /> Void</span>
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
                const dayPhase = calendarPhaseLabelForDay(day, calendar.days);
                const columnIndex = index % 7;
                const rowIndex = Math.floor(index / 7);
                const tooltipClass = [
                  columnIndex >= 5 ? "is-tooltip-left" : columnIndex <= 1 ? "is-tooltip-right" : "",
                  rowIndex === 0 ? "is-tooltip-below" : "is-tooltip-above"
                ].filter(Boolean).join(" ");
                const tooltipEvents = calendarDayTooltipEvents(day.events);
                const tooltipLines = calendarDayTooltipLines(day, tooltipEvents, zone, calendar.days);
                const dayLabel = tooltipLines.join(". ");
                const voidLabel = formatVoidCourseGridWindow(day, zone);
                const voidTooltipLabel = formatVoidCourseTooltip(day, zone);
                const previewEvents = monthGridEvents(day.events);
                const hasVoidPreview = Boolean(day.voidOfCourse && voidLabel);
                const visiblePreviewEvents = previewEvents.slice(0, hasVoidPreview ? 1 : 2);
                const showVoidPreview = hasVoidPreview && visiblePreviewEvents.length < 2;
                const hiddenPreviewCount = Math.max(
                  0,
                  previewEvents.length -
                    visiblePreviewEvents.length +
                    (hasVoidPreview && !showVoidPreview ? 1 : 0)
                );

                return (
                  <button
                    className={`lunar-calendar-day ${tooltipClass} ${day.inMonth ? "" : "is-outside"} ${isSelected ? "is-selected" : ""} ${isToday ? "is-today" : ""}`}
                    key={day.dateKey}
                    type="button"
                    onClick={() => handleSelectDate(day.dateKey)}
                    onKeyDown={(event) => handleDayKeyDown(event, day.dateKey)}
                    data-calendar-date={day.dateKey}
                    aria-pressed={isSelected}
                    aria-current={isToday ? "date" : undefined}
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
                      {visiblePreviewEvents.map((event) => (
                        <span
                          className={`lunar-calendar-event-pill event-${event.type}`}
                          key={event.id}
                          aria-hidden="true"
                        >
                          <span className="lunar-calendar-event-pill__dot" />
                          <span className="lunar-calendar-event-pill__label">{monthCellEventLabel(event)}</span>
                        </span>
                      ))}
                      {showVoidPreview && day.voidOfCourse && voidLabel && (
                        <span
                          className="lunar-calendar-event-pill event-void"
                          aria-hidden="true"
                        >
                          <span className="lunar-calendar-event-pill__dot" />
                          <span className="lunar-calendar-event-pill__label">VoC {voidLabel}</span>
                        </span>
                      )}
                      {hiddenPreviewCount > 0 && (
                        <span className="lunar-calendar-event-more" aria-hidden="true">+{hiddenPreviewCount}</span>
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

            <div className="lunar-calendar-month-detail" ref={monthDetailRef}>
              {selectedDayCard}
            </div>
          </div>

          {milestonePills}

          {monthTransitEvents.length > 0 && (
            <section className="lunar-month-transits" aria-label="This month's transits">
              <span className="lunar-calendar-upcoming__label">This month</span>
              <div className="lunar-month-transits__list">
                {monthTransitEvents.map((event) => (
                  <TransitCard
                    contentStatus={generatedContentStatus}
                    event={event}
                    generatedContent={generatedContent}
                    key={event.id}
                    onOpenTransit={onOpenTransit}
                    timeZone={zone}
                  />
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
  contentStatus,
  event,
  generatedContent,
  onOpenTransit,
  timeZone
}: {
  contentStatus: "idle" | "loading" | "ready";
  event: LunarCalendarEvent;
  generatedContent?: Map<string, LiveGeneratedContent>;
  onOpenTransit?: (event: LunarCalendarEvent, description?: string) => void;
  timeZone: string;
}) {
  const glyphParts = transitCardGlyphParts(event);
  const editorial = calendarEventEditorialContent(
    event,
    generatedContent,
    timeZone
  );
  const title = editorial.headline ?? event.title;
  const description = editorial.eventCopy ?? "";
  const isContentLoading = contentStatus === "loading" && !description;
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
      {isContentLoading ? (
        <span className="tx-body tx-body--loading" aria-label="Loading interpretation" role="status" />
      ) : description ? <p className="tx-body">{description}</p> : null}
    </>
  );

  if (onOpenTransit) {
    return (
      <button
        aria-busy={isContentLoading}
        className={`aspect-card tx-card lunar-month-transit-card lunar-month-transit-card--button event-${event.type}`}
        data-content-key={editorial.contentKey}
        onClick={() => onOpenTransit(event, description)}
        type="button"
      >
        {cardContent}
      </button>
    );
  }

  return (
    <article
      aria-busy={isContentLoading}
      className={`aspect-card tx-card lunar-month-transit-card event-${event.type}`}
      data-content-key={editorial.contentKey}
    >
      {cardContent}
    </article>
  );
}
