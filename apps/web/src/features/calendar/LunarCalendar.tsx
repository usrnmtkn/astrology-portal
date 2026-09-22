import { FormattedProse } from "../../components/FormattedProse";
import { useCalendarCheckIns } from "./useCalendarCheckIns";
import { startReaderMeasurement } from "../../services/readerPerformance";
import { withRequestDeadline } from "../../services/requestDeadline";
import {
  addCalendarCheckInLibraryItem,
  removeCalendarCheckInLibraryItem,
  upsertCalendarCheckIn
} from "../../services/calendarCheckIns";
import { calendarSunSummary, calendarSkyForDay } from "./calendarDaySummary";
import { skyDailySummaryFields } from "../../content/skyDailySummaryCatalog";
import type { SkySnapshot } from "../../types";
import { CardReadMore } from "../../components/CardReadMore";
import { PageLoadError, PageLoading } from "../../components/PageLoading";
import { calendarMotionTitle } from "../../content/skyMotionLabels";
import { isDisplayRetrograde } from "../../services/astrologyDisplay";
import { CalendarCheck, CalendarDays, CalendarPlus, ChevronDown, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent } from "react";
import { SegmentedControl } from "../../components/SegmentedControl";
import {
  type LunarCalendarDay,
  type LunarCalendarEvent,
  type LunarCalendarMonth as LunarCalendarMonthData
} from "../../services/ephemeris";
import {
  getLunarCalendarMonthOffMainThread as getLunarCalendarMonth,
  getLunarCalendarRangeEventsOffMainThread as getLunarCalendarRangeEvents,
  getLunarCalendarWeekOffMainThread as getLunarCalendarWeek
} from "../../services/skyCalculationClient";
import { getLunarCalendarFromApi } from "../../services/calendarApi";
import {
  fallbackArchitectureV3AuthoredContentForKey,
  generatedContentParagraphs,
  type LiveGeneratedContent
} from "../../services/generatedContent";
import {
  type CalendarEditorialContent
} from "../../services/weeklyHoroscope";
import {
  fallbackV3HookBody,
  fallbackV3PlanetTopic,
  fallbackV3VocabularyBody,
  KNOWLEDGE_MATRIX_V9_VERSION,
  isDeferredFallbackArchitectureV3BundleLoaded,
  loadDeferredFallbackArchitectureV3Bundle,
  loadSkyPlacementFallbackArchitectureV3Bundle,
  isSkyPlacementFallbackArchitectureV3BundleLoaded,
  loadKnowledgeMatrixV9Runtime,
  skyV4ReaderRenderer,
  SourceGapError as FallbackV3SourceGapError,
  transitSynastryFallbackRendererV3 as calendarFallbackRendererV3
} from "../../content/fallbackArchitectureV3Runtime";
import {
  firstReaderFacingCopy,
  fullDetailReaderFacingCopy,
  isReaderFacingCopy
} from "../../content/readerSafety";
import { cmsSurfaceKeys, resolveCmsSurfaceOverride } from "../../content/cmsSurfaceOverrides";
import { slugContentPart } from "../../services/generatedContentKeys";
import { isContentRetired, publicationAllowsContent } from "../../content/contentPublicationState";
import { resolveCalendarAspectPublication } from "./calendarAspectPublication";
import { calendarAspectPublicationKeys, isSkyAspectRetired, resolveSkyAspectContentStudioExact, resolveSkyAspectGeneratedContent } from "../../services/skyAspectContent";
import {
  resolveApprovedExactSkyAspectCopy,
  resolveComposedSkyCalendarCard,
  selectSkyAspectCopyByPrecedence,
  type ApprovedExactSkyAspectLookup,
  type SkyCalendarComposedCardLookup
} from "../../services/skyAspectRouting";
import { zonedDateTimeToUtc } from "../../services/timezones";
import type { LocationInput } from "../../types";
import { calendarEventGeneratedContentKeys } from "./calendarContentKeys";
import { calendarDayMoonWriting, calendarLunationMacroKey, calendarMoonWritingParagraphs, calendarMoonWritingSequenceWithoutRepeat, type CalendarMoonWritingPiece } from "./calendarDayMoonReading";
import { calendarDateKeyDistance, calendarMoonCycleFactsForDays, type CalendarMoonCycleFacts } from "./calendarMoonCycle";
import { resolveCalendarMoonFallback } from "./calendarMoonFallback";
import { calendarMoonPhaseCopy } from "./calendarMoonPhaseCopy";
import { moonContinuationSummaryKey } from "./moonContinuationSummaries";
import { calendarSeasonTransitionKeyForSurface, calendarSeasonTransitionKeys } from "./calendarSeasonTransitions";
import { moonSignTransitionForPair, moonSignTransitionKey, nextZodiacSignName } from "./moonSignTransitions";
import type { SkyPlacementContentStatus } from "../sky/skyPlacementContentState";
import {
  resolveCalendarV9Transit,
  type CalendarV9TransitResolver
} from "./calendarV9Transit";
import { calendarPhaseLabelForDay } from "./calendarPhaseLabel";
import { lunarDayGeneratedContentKeys } from "./lunarDayResolver";
import type { LunarDay, LunarDayArcPoint } from "./lunarDayTypes";
import { sunIngressSeasonSign, sunIngressSeasonWindow } from "./seasonWindow";
import { calendarMonthlyOverviewContentKeys, resolveCalendarMonthlyOverview } from "./monthlyOverview";
import { AstroGlyph } from "./AstroGlyph";
import {
  CalendarCheckIn,
  CalendarMoodChip,
  calendarMoodOf
} from "./CalendarCheckIn";
import { CalendarDayGroup, CalendarDayGroupList, CalendarSeasonPill, type CalendarDayGroupRow } from "./CalendarDayGroup";
import { CalendarDayPanel } from "./CalendarDayPanel";
import { CalendarEventReading } from "./CalendarEventReading";
import { CalendarLinkedReading } from "./CalendarLinkedReading";
import { CalendarSlideout } from "./CalendarSlideout";
import { CalendarSubscribeSheet } from "./CalendarSubscribeSheet";
import { loadCalendarSubscription } from "./calendarSubscription";
import { CalendarMonthChip, eventGlyphText } from "./CalendarKindTag";
import { calendarKindFromEvent } from "./calendarKinds";
import {
  calendarMarkTone,
  daySeasonStart,
  daySurfaceEvents,
  isEclipseDay,
  isExactQuarterMoonDay,
  isLunarReturnDay,
  isMonthAgendaDay,
  isQuarterMoonLabel,
  isSpanningRetrogradeEvent,
  majorRangeEvents,
  monthAgendaEvents,
  monthCellDisplay,
  moonIngressEvent,
  moonPhaseEmoji,
  seasonLongTransits,
  weekAgendaEvents,
  weekStripDots
} from "./calendarSurfaceEvents";
import {
  journalTypeForEvent,
  lunarJournalSkyBlurbs,
  lunarJournalSkyPrompt,
  resolveLunarJournal
} from "./lunarJournal";
import {
  weeklyEventDescriptionFitsDateContext,
  weeklyLeadLunationKind
} from "./weeklyDayRole";

type LunarCalendarStatus = "loading" | "ready" | "error";
type LunarCalendarViewMode = "week" | "month" | "weekly";
type CalendarEventProseLayer = "authored" | "fallback";

type NormalizedCalendarEventSection = {
  slot: "description" | "details";
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
  sky?: SkySnapshot | null;
  location: LocationInput;
  generatedContent?: Map<string, LiveGeneratedContent>;
  generatedContentStatus?: "idle" | "loading" | "ready";
  skyPlacementContentStatus?: SkyPlacementContentStatus;
  contentVersion?: number;
  onGeneratedContentRequest?: (request: { cacheKey: string; contentKeys: string[] }) => void;
  onOpenTransit?: (event: LunarCalendarEvent, description?: string) => void;
  onSignIn?: () => void;
  showJournalPrompts?: boolean;
  natalSunSign?: string | null;
  natalMoonSign?: string | null;
};

const viewModeOptions: Array<{ value: LunarCalendarViewMode; label: string }> = [
  { value: "week", label: "Day" },
  { value: "weekly", label: "Week" },
  { value: "month", label: "Month" }
];

// v13 includes exact Moon ingresses in each local day, replacing noon-sign inference.
// Also requires calculated bounding Sun ingresses, including in basic/month
// caches. Earlier seven-day caches cannot supply a reliable season range.
const calendarStorageVersion = "v13";
const calendarStorageTtlMs = 12 * 60 * 60_000;
const enableLunarArcContent = String(import.meta.env.VITE_ENABLE_LUNAR_ARC_CONTENT ?? "true").toLowerCase() !== "false";
const enableCalendarApi = import.meta.env.PROD
  || String(import.meta.env.VITE_USE_LUNAR_CALENDAR_API ?? "false").toLowerCase() === "true";

type StoredCalendarPayload = {
  savedAt: number;
  detail: "full";
  calendar: LunarCalendarMonthData;
};

function calendarRouteStateFromUrl(fallbackDate: string) {
  try {
    const cleanHash = window.location.hash.replace(/^#\/?/, "");
    const [path = "", query = ""] = cleanHash.split("?");

    if (path !== "calendar") return null;

    const params = new URLSearchParams(query);
    const rawView = params.get("view");
    const rawDate = params.get("date") ?? new URLSearchParams(window.location.search).get("date");
    const view: LunarCalendarViewMode = rawView === "day" || rawView === "daily" || rawView === "week"
      ? "week"
      : rawView === "weekly" || rawView === "month"
        ? rawView
        : "week";
    const date = rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate)
      ? rawDate
      : fallbackDate;

    const eventId = params.get("event");
    let eventTimeZone = params.get("timeZone");
    try { if (eventTimeZone) new Intl.DateTimeFormat("en", { timeZone: eventTimeZone }); } catch { eventTimeZone = null; }
    return { view, date, eventId, eventTimeZone };
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
    const sharedDateChanged = url.searchParams.get("date") !== date;
    url.searchParams.set("date", date);
    url.hash = `calendar?${params.toString()}`;
    window.history[mode === "replace" ? "replaceState" : "pushState"]({}, "", url.toString());
    if (sharedDateChanged) window.dispatchEvent(new PopStateEvent("popstate"));
    else window.dispatchEvent(new HashChangeEvent("hashchange"));
  } catch {
    // URL state is an enhancement; Calendar remains usable without history.
  }
}

function addMonths(date: Date, amount: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + amount, 15, 12));
}

function dateKeyFromDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function monthAnchorFromDateKey(
  dateKey: string,
  _timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
) {
  const [year = new Date().getFullYear(), month = 1] = dateKey.split("-").map(Number);
  // This Date is a month identifier, not an event instant. A midpoint stays in
  // the same month in both the browser and selected zone, including UTC+14/-12.
  return new Date(Date.UTC(year, month - 1, 15, 12));
}

function dateFromDateKey(
  dateKey: string,
  timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
) {
  return zonedDateTimeToUtc(dateKey, "12:00 PM", timeZone);
}

function calendarNavUnit(mode: LunarCalendarViewMode) {
  if (mode === "week") return "day";
  if (mode === "weekly") return "week";
  return "month";
}

function isWeekBasedView(mode: LunarCalendarViewMode) {
  return mode === "week" || mode === "weekly";
}

function calendarStorageKey(
  location: LocationInput,
  mode: LunarCalendarViewMode,
  anchor: Date
) {
  // Keep view-specific caches; Day and editorial Week both store full facts
  // so passage selection never runs against a partial event list.
  const normalizedMode = mode === "weekly" ? "weekly" : mode;
  const civilKey = timestampDateKey(anchor.toISOString(), location.timeZone || "UTC");
  const civilDate = new Date(`${civilKey}T12:00:00Z`);
  const weekday = civilDate.getUTCDay();
  const normalizedKey = isWeekBasedView(mode)
    ? new Date(civilDate.getTime() - weekday * 86_400_000).toISOString().slice(0, 10)
    : `${civilKey.slice(0, 7)}-01`;

  return [
    "tldr-lunar-calendar",
    calendarStorageVersion,
    normalizedMode,
    normalizedKey,
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

    if (!parsed?.calendar || parsed.detail !== "full" || Date.now() - parsed.savedAt > calendarStorageTtlMs) {
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
    window.localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), detail: "full", calendar }));
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

function formatSlideoutDate(day: LunarCalendarDay, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(new Date(day.date));
}

function formatCheckInDate(day: LunarCalendarDay, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
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
  }).format(new Date(day.date)).slice(0, 2);
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

function abbreviateMonthName(month: string) {
  return month.length > 5 ? month.slice(0, 3) : month;
}

function formatCalendarDayHead(day: LunarCalendarDay, timeZone: string) {
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(new Date(day.date));
  const month = new Intl.DateTimeFormat("en-US", { timeZone, month: "short" }).format(new Date(day.date));
  return `${weekday}, ${month} ${formatDayNumber(day, timeZone)}`;
}

function formatCalendarWeekHead(days: LunarCalendarDay[], timeZone: string) {
  const first = days[0];
  const last = days.at(-1);
  if (!first || !last) return "";
  const startMonth = new Intl.DateTimeFormat("en-US", { timeZone, month: "short" }).format(new Date(first.date));
  const endMonth = new Intl.DateTimeFormat("en-US", { timeZone, month: "short" }).format(new Date(last.date));
  const startDay = formatDayNumber(first, timeZone);
  const endDay = formatDayNumber(last, timeZone);
  if (startMonth === endMonth) return `${startMonth} ${startDay} – ${endDay}`;
  return `${startMonth} ${startDay} – ${endMonth} ${endDay}`;
}

function formatWeekdayLong(day: LunarCalendarDay, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", { timeZone, weekday: "long" }).format(new Date(day.date));
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
  }).format(dateFromDateKey(startDateKey, timeZone));
  const end = new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "short",
    day: "numeric"
  }).format(dateFromDateKey(endDateKey, timeZone));

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

function weeklyWriteupEvents(day: LunarCalendarDay, previousDay?: LunarCalendarDay | null) {
  return daySurfaceEvents(day, previousDay);
}

function monthTransitCardEvents(days: LunarCalendarDay[]) {
  return majorRangeEvents(days.filter((day) => day.inMonth));
}

function isActiveRetrogradeEvent(event: LunarCalendarEvent) {
  return isSpanningRetrogradeEvent(event);
}

function activeRetrogradeUntilLabel(event: LunarCalendarEvent, timeZone: string) {
  if (!event.endsAt) {
    return "retrograde";
  }

  return `until ${formatEventDateMonthDay(event.endsAt, timeZone)}`;
}

function weekTransitCardEvents(days: LunarCalendarDay[]) {
  return majorRangeEvents(days);
}

function calendarDayTooltipEvents(day: LunarCalendarDay, previousDay?: LunarCalendarDay | null) {
  return daySurfaceEvents(day, previousDay).filter((event) => event.type !== "lunation");
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
    ...events.map(calendarMotionTitle),
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
  const start = formatCompactEventTime(voidPeriod.startsAt, timeZone);
  const end = formatCompactEventTime(voidPeriod.until, timeZone);

  if (startsDateKey === cellDateKey && endsDateKey === cellDateKey) {
    return `${start} - ${end}`;
  }

  if (startsDateKey === cellDateKey) {
    return `${start} - ${end} (next day)`;
  }

  if (endsDateKey === cellDateKey) {
    return `${start} (prev. day) - ${end}`;
  }

  return `${start} - ${end}`;
}

function formatVoidCourseMonthChip(day: LunarCalendarDay, timeZone: string) {
  const voidPeriod = day.voidOfCourse;
  if (!voidPeriod) return "";

  const cellDateKey = day.dateKey;
  if (voidPeriod.until && timestampDateKey(voidPeriod.until, timeZone) === cellDateKey) {
    return formatCompactEventTime(voidPeriod.until, timeZone);
  }
  if (voidPeriod.startsAt && timestampDateKey(voidPeriod.startsAt, timeZone) === cellDateKey) {
    return formatCompactEventTime(voidPeriod.startsAt, timeZone);
  }

  return "";
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
    return `${firstGlyph}${isDisplayRetrograde({ planet: event.planets[0], motion: event.fromMotion ?? "direct" }) ? retrogradeGlyph : ""}${aspectGlyphs[event.aspect] ?? ""}${secondGlyph}${isDisplayRetrograde({ planet: event.planets[1], motion: event.toMotion ?? "direct" }) ? retrogradeGlyph : ""}`;
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
      { value: isDisplayRetrograde({ planet: event.planets[0], motion: event.fromMotion ?? "direct" }) ? retrogradeGlyph : "", className: "tx-rx" },
      { value: aspectGlyphs[event.aspect] ?? "", className: "tx-link" },
      { value: secondGlyph, className: "" },
      { value: isDisplayRetrograde({ planet: event.planets[1], motion: event.toMotion ?? "direct" }) ? retrogradeGlyph : "", className: "tx-rx" }
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
  ) {
    if (!generatedContent) {
      return null;
    }

    const [first, second] = event.planets;

    const calendarPublication = resolveCalendarAspectPublication({
      generatedContent, first, second, aspect: event.aspect,
      firstSign: event.fromSign ?? "", secondSign: event.toSign ?? ""
    });
    if (calendarPublication) return calendarPublication.content;

    const exactStudio = resolveSkyAspectContentStudioExact({
      generatedContent,
      first,
      second,
      aspect: event.aspect,
      firstSign: event.fromSign ?? "",
      secondSign: event.toSign ?? "",
      targetDate: event.dateKey || event.startsAt.slice(0, 10)
    });

    if (exactStudio) {
      return exactStudio.content;
    }

    return resolveSkyAspectGeneratedContent({
      generatedContent,
      first,
      second,
      aspect: event.aspect,
      firstSign: event.fromSign ?? "",
      secondSign: event.toSign ?? "",
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

function isLilithStationEvent(event: LunarCalendarEvent) {
  return event.type === "station" && slugContentPart(event.planet ?? "") === "lilith"
    && event.phase !== "retrograde-passage" && !isActiveRetrogradeEvent(event);
}

function calendarEventPackageDescription(event: LunarCalendarEvent, dateLine = "Today", timeZone = "UTC") {
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
        sign: slugContentPart(sign ?? ""),
        surface: "calendar"
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
        window: event.retrogradeEnd ? `Until ${formatEventDate(event.retrogradeEnd, timeZone)}` : undefined,
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

type CalendarSkyAspectCandidate = {
  body: string;
  details?: string;
  layer: CalendarEventProseLayer;
  sourceKeys: string[];
  tier: string;
};

function calendarSkyAspectPackageCandidates(
  event: LunarCalendarEvent,
  dateLine: string
): {
  signSpecific: CalendarSkyAspectCandidate | null;
  phrasebook: CalendarSkyAspectCandidate | null;
} {
  const empty = { signSpecific: null, phrasebook: null };

  if (event.type !== "aspect" || !event.planets || !event.aspect) {
    return empty;
  }

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
    const body = fullDetailReaderFacingCopy(rendered.parts) ?? "";

    if (!body) {
      return empty;
    }

    const isReviewed = rendered.contentKey?.startsWith("fallback-hook/sky-aspect-") ?? false;
    const isSignSpecific = rendered.contentKey?.startsWith("fallback-hook/sky-aspect-sign/") ?? false;
    const candidate: CalendarSkyAspectCandidate = {
      body,
      layer: "fallback",
      sourceKeys: [rendered.contentKey ?? rendered.templateKey],
      tier: isReviewed ? "reviewed-sky-aspect-phrasebook-v1" : "v3-package"
    };

    if (isSignSpecific) {
      return { ...empty, signSpecific: candidate };
    }

    if (isReviewed) {
      return { ...empty, phrasebook: candidate };
    }

    return empty;
  } catch (error) {
    calendarEventPackageFailure(event, error);
    return empty;
  }
}

function weeklyLunationArticleOpening(event: LunarCalendarEvent) {
  if (event.type !== "lunation" || !event.sign) {
    return "";
  }

  const kind = weeklyLeadLunationKind(event.title);

  if (!kind) {
    return "";
  }

  try {
    const rendered = calendarFallbackRendererV3.renderLunationMacro({
      kind,
      sign: slugContentPart(event.sign)
    });

    return firstReaderFacingCopy([
      rendered.body.split(/\n{2,}/)[0],
      rendered.parts[0]
    ]);
  } catch (error) {
    return calendarEventPackageFailure(event, error);
  }
}

export function normalizeCalendarEventSurface(
  event: LunarCalendarEvent,
  content: LiveGeneratedContent | null,
  dateLine = "Today",
  knowledgeMatrixV9?: CalendarV9TransitResolver | null,
  approvedExactSkyAspectLookup?: ApprovedExactSkyAspectLookup | null,
  composedSkyCalendarCardLookup?: SkyCalendarComposedCardLookup | null,
  generatedContent?: Map<string, LiveGeneratedContent>,
  timeZone = "UTC"
): NormalizedCalendarEventSurface {
  if (event.type === "ingress" && event.planet === "Moon") {
    const from = event.fromSign ?? "";
    const to = event.toSign ?? event.sign ?? "";
    const key = moonSignTransitionKey(from, to);
    const validPair = Boolean(to) && nextZodiacSignName(from) === to.toLowerCase().trim();
    const live = generatedContent?.get(key) ?? (content?.contentKey === key ? content : null);
    const body = live && (!live.status || live.status === "LIVE")
      && publicationAllowsContent(key, live.id, live.updatedAt)
      ? live.body
      : publicationAllowsContent(key) ? moonSignTransitionForPair(from, to) : "";
    // Keep the complete Calendar unit and its lifecycle identity. A source gap
    // must not fall through to the unrelated Sky placement article.
    return validPair && isReaderFacingCopy(body) ? {
      surface: "calendar-event", status: "servable",
      sections: [{ slot: "description", required: false, layer: "authored",
        tier: "calendar-moon-transition", sourceKeys: [key], body }]
    } : { surface: "calendar-event", status: "not-servable", sections: [] };
  }

  if (event.type === "aspect" && event.planets && event.aspect && isSkyAspectRetired(event.planets[0], event.aspect, event.planets[1])) {
    return { surface: "calendar-event", status: "not-servable", sections: [] };
  }
  const generatedDescription = firstReaderFacingCopy([
    ...(event.type === "aspect" ? [] : [content?.summary]),
    ...(event.type === "aspect" && content
      ? [generatedContentParagraphs(content).join("\n\n").trim()]
      : generatedContentParagraphs(content))
  ]);
  const generatedDescriptionFitsDateContext = dateLine === "Today"
    || weeklyEventDescriptionFitsDateContext(generatedDescription);

  if (event.type === "aspect" && event.planets && event.aspect) {
    const [first, second] = event.planets;
    if (calendarAspectPublicationKeys({ first, second, aspect: event.aspect,
      firstSign: event.fromSign ?? "", secondSign: event.toSign ?? "" }).some(isContentRetired)) {
      return { surface: "calendar-event", status: "not-servable", sections: [] };
    }
    const packageCandidates = calendarSkyAspectPackageCandidates(event, dateLine);
    const composedSlots = {
      aspect: slugContentPart(event.aspect),
      dateLine,
      planetA: first,
      planetB: second,
      signA: event.fromSign,
      signB: event.toSign
    };
    const calendarPublication = resolveCalendarAspectPublication({
      generatedContent: generatedContent ?? (content ? new Map([[content.contentKey, content]]) : new Map()),
      first, second, aspect: event.aspect,
      firstSign: event.fromSign ?? "", secondSign: event.toSign ?? ""
    });
    const bundledComposed = resolveComposedSkyCalendarCard({
      aspect: event.aspect,
      first,
      heading: event.title,
      lookup: composedSkyCalendarCardLookup,
      second,
      slots: composedSlots
    });
    const composed = calendarPublication ? {
      body: calendarPublication.body,
      details: bundledComposed?.details,
      layer: "authored" as const,
      sourceKeys: [calendarPublication.content.contentKey],
      tier: "content-studio-calendar-publication-v1"
    } : bundledComposed;
    const exact = resolveApprovedExactSkyAspectCopy({
      aspect: event.aspect,
      first,
      heading: event.title,
      lookup: approvedExactSkyAspectLookup,
      second,
      slots: {
        aspect: slugContentPart(event.aspect),
        dateLine,
        planetA: first,
        planetATopic: fallbackV3PlanetTopic(first),
        planetB: second,
        planetBTopic: fallbackV3PlanetTopic(second),
        signA: event.fromSign,
        signB: event.toSign
      }
    });
    const generated = content && generatedDescription && generatedDescriptionFitsDateContext
      ? {
          body: generatedDescription,
          layer: "fallback" as const,
          sourceKeys: [content.contentKey],
          tier: "generated-sky-aspect-lint-v1"
        }
      : null;
    const studioExactResolved = content
      ? resolveSkyAspectContentStudioExact({
          generatedContent: generatedContent ?? new Map([[content.contentKey, content]]),
          first,
          second,
          aspect: event.aspect,
          firstSign: event.fromSign ?? "",
          secondSign: event.toSign ?? "",
          targetDate: event.dateKey || event.startsAt.slice(0, 10)
        })
      : null;
    const studioExact = studioExactResolved
      ? {
          body: studioExactResolved.body,
          layer: "authored" as const,
          sourceKeys: [studioExactResolved.content.contentKey],
          tier: "content-studio-exact-sky-aspect-v1"
        }
      : null;
    const selected = selectSkyAspectCopyByPrecedence<CalendarSkyAspectCandidate>({
      composed,
      signSpecific: packageCandidates.signSpecific,
      exact: studioExact ?? exact,
      phrasebook: packageCandidates.phrasebook,
      generated
    });

    if (!selected) {
      return {
        surface: "calendar-event",
        status: "not-servable",
        sections: []
      };
    }

    return {
      surface: "calendar-event",
      status: selected.layer === "authored" ? "servable" : "partial",
      sections: [
        {
          slot: "description",
          required: false,
          layer: selected.layer,
          tier: selected.tier,
          sourceKeys: selected.sourceKeys,
          body: selected.body
        },
        // Details only exists on composed two-part cards. Older single-body
        // copy renders exactly as it does today.
        ...(selected.details
          ? [{
              slot: "details" as const,
              required: false,
              layer: selected.layer,
              tier: selected.tier,
              sourceKeys: selected.sourceKeys,
              body: selected.details
            }]
          : [])
      ]
    };
  }

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

  if (isLilithStationEvent(event)) {
    // Use the same approved station unit and publication ledger as Sky detail.
    // A retired/unavailable station must not reveal older retrograde prose.
    try {
      const rendered = skyV4ReaderRenderer.renderRoute({
        route: "lilith-station", stationSupported: true
      }) as { contentKey?: string; readerParts?: string[] };
      const body = fullDetailReaderFacingCopy(rendered.readerParts ?? []);
      if (body && rendered.contentKey) {
        return {
          surface: "calendar-event", status: "servable",
          sections: [{ slot: "description", required: false, layer: "authored",
            tier: "sky-v4-canonical", sourceKeys: [rendered.contentKey], body }]
        };
      }
    } catch (error) {
      if (!(error instanceof Error) || !/^SKY_V4_(?:NOT_RELEASED|NOT_SERVABLE|SOURCE_GAP)/u.test(error.message)) throw error;
    }
    return { surface: "calendar-event", status: "not-servable", sections: [] };
  }

  const matrixResult = resolveCalendarV9Transit(event, knowledgeMatrixV9);

  if (matrixResult && isReaderFacingCopy(matrixResult.body)) {
    return {
      surface: "calendar-event",
      status: "partial",
      sections: [{
        slot: "description",
        required: false,
        layer: "fallback",
        tier: matrixResult.sourceVersion,
        sourceKeys: [matrixResult.contentKey],
        body: matrixResult.body
      }]
    };
  }

  const packageDescription = calendarEventPackageDescription(event, dateLine, timeZone);

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
  timeZone: string,
  knowledgeMatrixV9?: CalendarV9TransitResolver | null,
  approvedExactSkyAspectLookup?: ApprovedExactSkyAspectLookup | null,
  composedSkyCalendarCardLookup?: SkyCalendarComposedCardLookup | null
): CalendarEditorialContent {
  const dateLine = calendarCanonicalEventDateLine(event, timeZone);
  const content = liveCalendarEventContent(generatedContent, event);
  const normalized = normalizeCalendarEventSurface(
    event,
    content,
    dateLine,
    knowledgeMatrixV9,
    approvedExactSkyAspectLookup,
    composedSkyCalendarCardLookup,
    generatedContent,
    timeZone
  );
  const description = normalized.sections[0];
  const detailsSection = normalized.sections.find((section) => section.slot === "details");
  const isKnowledgeMatrixV9 = description?.tier === KNOWLEDGE_MATRIX_V9_VERSION;
  const isApprovedSpecificSkyAspect = event.type === "aspect"
    && [
      "composed-sky-calendar-card-v1",
      "approved-exact-sky-aspect-v1",
      "reviewed-sky-aspect-phrasebook-v1"
    ].includes(description?.tier ?? "");
  const headline = calendarEventTitleWithSign(event, calendarEventTitle(event, content));
  const fallbackContentKey = `generated/calendar-event/${event.type}/${event.id}`;

  return {
    contentKey: isKnowledgeMatrixV9 || isApprovedSpecificSkyAspect
      ? description.sourceKeys[0] ?? fallbackContentKey
      : description?.layer === "authored"
      ? description.sourceKeys[0] ?? `owner-approved/calendar-event/${event.id}`
      : description
        ? fallbackContentKey
        : `source-gap/calendar-event/${event.id}`,
    contentSource: description?.layer === "authored" || isKnowledgeMatrixV9 || isApprovedSpecificSkyAspect
      ? "owner_approved"
      : "generated_fallback",
    eventId: event.id,
    dateRange: {
      start: event.startsAt,
      end: event.endsAt ?? event.startsAt
    },
    headline,
    eventCopy: description?.body ?? "",
    eventDetailsCopy: detailsSection?.body ?? undefined,
    provenance: {
      sourceId: description?.sourceKeys[0],
      generatedBy: description?.tier,
      templateVersion: isKnowledgeMatrixV9
        ? KNOWLEDGE_MATRIX_V9_VERSION
        : description?.layer === "fallback"
          ? "calendar-event-fallback.v3"
          : undefined,
      reviewStatus: description?.layer === "authored" || isKnowledgeMatrixV9 || isApprovedSpecificSkyAspect
        ? "reader-eligible"
        : "assembled-fallback"
    }
  };
}

function calendarEventTitle(event: LunarCalendarEvent, content: LiveGeneratedContent | null) {
  if (event.type === "aspect") return calendarMotionTitle(event);
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

function monthNumberDiscClass(
  phase: string,
  isToday: boolean,
  isSeasonStart = false,
  isQuarter = false
) {
  if (isToday) return "is-today-disc";
  const normalized = phase.toLowerCase();
  if (normalized.includes("new moon")) return "is-new-disc";
  if (normalized.includes("full moon")) return "is-full-disc";
  if (isQuarter || normalized.includes("quarter")) return "is-quarter-disc";
  if (isSeasonStart) return "is-season-disc";
  return "";
}

function monthDiscClassName(
  phase: string,
  isToday: boolean,
  isSeasonStart = false,
  isQuarter = false,
  isSelected = false,
  isEclipse = false
) {
  return [
    monthNumberDiscClass(phase, isToday, isSeasonStart, isQuarter),
    isSelected ? "is-selected-ring" : "",
    isEclipse ? "is-eclipse-ring" : ""
  ].filter(Boolean).join(" ");
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

function moonDiscClass(phase: string, illumination: number) {
  const normalizedPhase = phase.toLowerCase();
  const visible = Math.max(0, Math.min(100, illumination));

  if (normalizedPhase.includes("new moon") || visible <= 1) return "is-new";
  if (normalizedPhase.includes("full moon") || visible >= 99) return "is-full";

  const direction = isWaxingPhase(phase) ? "is-waxing" : "is-waning";
  const shape = visible < 49.5
    ? "is-crescent"
    : visible > 50.5
      ? "is-gibbous"
      : "is-quarter";

  return `${direction} ${shape}`;
}

function moonDiscStyle(day: LunarCalendarDay) {
  const visible = Math.max(0, Math.min(100, day.illumination));

  return {
    "--moon-phase-scale": Math.abs(visible - 50) / 50
  } as CSSProperties;
}

function buildCalendarDayGroupRows({
  day,
  previousDay,
  phase,
  zone,
  includeSurfaceEvents,
  showMoonRow,
  natalMoonSign,
  seasonExcerpt
}: {
  day: LunarCalendarDay;
  previousDay?: LunarCalendarDay | null;
  phase: string;
  zone: string;
  includeSurfaceEvents: boolean;
  showMoonRow: boolean;
  natalMoonSign?: string | null;
  seasonExcerpt?: string;
}): CalendarDayGroupRow[] {
  const rows: CalendarDayGroupRow[] = [];
  const seasonStart = daySeasonStart(day);
  if (seasonStart) {
    rows.push({
      id: seasonStart.id,
      kind: "season",
      glyph: `☉→${signGlyphs[seasonStart.toSign ?? seasonStart.sign ?? ""] ?? ""}`,
      title: `${seasonStart.toSign ?? seasonStart.sign} season begins`,
      meta: formatCompactEventTime(seasonStart.startsAt, zone),
      excerpt: seasonExcerpt,
      event: seasonStart
    });
  }

  if (includeSurfaceEvents) {
    const moonIngress = moonIngressEvent(day, previousDay);
    if (moonIngress) {
      rows.push({
        id: moonIngress.id,
        kind: "moon",
        glyph: `☽→${signGlyphs[moonIngress.toSign ?? ""] ?? ""}`,
        title: moonIngress.title,
        meta: formatCompactEventTime(moonIngress.startsAt, zone),
        event: moonIngress
      });
    }
  }

  if (isLunarReturnDay(day, previousDay, natalMoonSign)) {
    rows.push({
      id: `${day.dateKey}-lunar-return`,
      kind: "lunar-return",
      glyph: "☽",
      title: "Your lunar return",
      meta: natalMoonSign ?? undefined
    });
  }

  const vocLabel = formatVoidCourseGridWindow(day, zone);
  if (day.voidOfCourse && vocLabel) {
    rows.push({
      id: `${day.dateKey}-voc`,
      kind: "void",
      glyph: "VOC",
      title: vocLabel
    });
  }

  const events = includeSurfaceEvents
    ? weekAgendaEvents(day, previousDay).filter((event) => !(event.type === "ingress" && event.planet === "Moon"))
    : monthAgendaEvents(day);

  for (const event of events) {
    rows.push({
      id: event.id,
      kind: calendarKindFromEvent(event),
      glyph: eventGlyphText(event),
      title: calendarMotionTitle(event).replace(/ retrograde$/i, " Rx"),
      meta: formatCompactEventTime(event.startsAt, zone),
      event
    });
  }

  if (showMoonRow) {
    const quarter = isQuarterMoonLabel(phase);
    rows.push({
      id: `${day.dateKey}-moon`,
      kind: "lunation",
      glyph: `${moonPhaseEmoji(phase)}${day.moonSignGlyph}`,
      title: quarter ? `${phase} in ${day.moonSign}` : `Moon in ${day.moonSign}`,
      meta: quarter && day.illumination != null ? `${day.illumination}% lit` : phase
    });
  }

  return rows;
}

function journalGroupCopy(
  journal: ReturnType<typeof resolveLunarJournal>,
  seasonJournal: ReturnType<typeof resolveLunarJournal>
) {
  const paragraphs = journal ? lunarJournalSkyBlurbs(journal.blocks) : [];
  const seasonExcerpt = seasonJournal ? lunarJournalSkyBlurbs(seasonJournal.blocks, 1)[0] : undefined;

  return {
    paragraphs: seasonExcerpt && paragraphs[0] === seasonExcerpt ? paragraphs.slice(1) : paragraphs,
    prompt: journal ? lunarJournalSkyPrompt(journal.blocks) || undefined : undefined,
    seasonExcerpt
  };
}

function calendarLiveBody(
  generatedContent: Map<string, LiveGeneratedContent> | null | undefined,
  contentKey: string,
  packaged?: string | null
) {
  return generatedContent?.get(contentKey)?.body?.trim() || packaged?.trim() || "";
}

function calendarWeeklyMoonAuthoredPassages(
  sign: string,
  generatedContent: Map<string, LiveGeneratedContent> | null | undefined
) {
  const slug = slugContentPart(sign);
  const passages: Array<{ body: string; contentKey: string }> = [];
  for (let variant = 1; variant <= 4; variant += 1) {
    const contentKey = variant === 1
      ? `authored/calendar-weekly-moon/${slug}`
      : `authored/calendar-weekly-moon/${slug}/variant-${variant}`;
    if (contentKey === "authored/calendar-weekly-moon/cancer") continue;
    const live = generatedContent?.get(contentKey)?.body?.trim();
    if (live) {
      passages.push({ body: live, contentKey });
      continue;
    }
    try {
      const rendered = calendarFallbackRendererV3.renderWeeklyMoon({ sign: slug, variant });
      if (rendered.contentKey === contentKey && rendered.body.trim()) {
        passages.push({ body: rendered.body.trim(), contentKey });
      }
    } catch (error) {
      if (!(error instanceof FallbackV3SourceGapError)) throw error;
    }
  }
  const seen = new Set<string>();
  return passages.filter((passage) => {
    const key = passage.body.replace(/\s+/g, " ").trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function calendarMoonFallbackOptions(
  day: LunarCalendarDay,
  facts: CalendarMoonCycleFacts,
  generatedContent: Map<string, LiveGeneratedContent> | null | undefined,
  unusedAuthored?: { body: string; contentKey: string } | null,
  authoredUsedThisVisit = false
) {
  const lunation = primaryLunationForDay(day);
  const lunationKey = calendarLunationMacroKey(lunation, day.moonSign);
  const lunationBody = lunationKey
    ? calendarLiveBody(
      generatedContent,
      lunationKey,
      fallbackArchitectureV3AuthoredContentForKey(lunationKey)?.body
    )
    : "";
  const seasonKey = facts.seasonName ? `fallback-hook/zodiac-season/${slugContentPart(facts.seasonName)}` : "";
  const seasonBody = seasonKey
    ? calendarLiveBody(generatedContent, seasonKey, fallbackV3HookBody(seasonKey))
    : "";
  const summaryKey = moonContinuationSummaryKey(facts.moonSign);
  const transitionKey = facts.nextMoonSign ? moonSignTransitionKey(facts.moonSign, facts.nextMoonSign) : "";
  const authoredPhase = calendarMoonPhaseCopy(facts, (contentKey) => (
    calendarLiveBody(generatedContent, contentKey, fallbackV3HookBody(contentKey))
  ));
  return {
    exactLunationCopy: lunationBody ? { body: lunationBody, contentKey: lunationKey } : null,
    unusedAuthored: unusedAuthored?.body?.trim() ? unusedAuthored : null,
    authoredUsedThisVisit,
    authoredPhaseCopy: authoredPhase,
    seasonSummary: seasonBody.split(/\n\n+/)[0]?.trim() || null,
    moonContinuationSummary: calendarLiveBody(generatedContent, summaryKey) || null,
    pairTransition: transitionKey ? calendarLiveBody(generatedContent, transitionKey) || null : null,
    seasonTransition: facts.seasonName && facts.nextSunSign
      ? calendarLiveBody(
        generatedContent,
        calendarSeasonTransitionKeyForSurface(
          facts.seasonName,
          facts.nextSunSign,
          "leftover",
          facts.daysUntilSeasonEnd
        )
      ) || null
      : null
  };
}

function calendarMoonResolvedWeekly(
  day: LunarCalendarDay,
  facts: CalendarMoonCycleFacts | undefined,
  generatedContent: Map<string, LiveGeneratedContent> | null | undefined,
  usedAuthoredBodies: Iterable<string> = []
) {
  const used = new Set([...usedAuthoredBodies].map((body) => body.replace(/\s+/g, " ").trim()).filter(Boolean));
  const authored = calendarWeeklyMoonAuthoredPassages(day.moonSign, generatedContent)
    .find((passage) => !used.has(passage.body.replace(/\s+/g, " ").trim())) ?? null;
  if (!facts) {
    return authored ? { kind: "authored" as const, ...authored } : null;
  }
  return resolveCalendarMoonFallback(
    facts,
    calendarMoonFallbackOptions(day, facts, generatedContent, authored, used.size > 0)
  );
}

function calendarMoonResolvedByDate(
  days: LunarCalendarDay[],
  factsByDate: Map<string, CalendarMoonCycleFacts>,
  generatedContent?: Map<string, LiveGeneratedContent> | null
) {
  const usedByVisit = new Map<string, string[]>();
  const resolved = new Map<string, NonNullable<ReturnType<typeof calendarMoonResolvedWeekly>>>();
  for (const day of days) {
    const facts = factsByDate.get(day.dateKey);
    const visitId = facts?.moonVisitId ?? `${day.moonSign}:${day.dateKey}`;
    const used = usedByVisit.get(visitId) ?? [];
    const result = calendarMoonResolvedWeekly(day, facts, generatedContent, used);
    if (result) resolved.set(day.dateKey, result);
    if (result?.kind === "authored") {
      usedByVisit.set(visitId, [...used, result.body]);
    }
  }
  return resolved;
}

function packagedWeeklyMoon(
  day: LunarCalendarDay,
  facts?: CalendarMoonCycleFacts,
  generatedContent?: Map<string, LiveGeneratedContent> | null,
  resolvedByDate?: Map<string, NonNullable<ReturnType<typeof calendarMoonResolvedWeekly>>>
) {
  const resolved = resolvedByDate?.get(day.dateKey)
    ?? calendarMoonResolvedWeekly(day, facts, generatedContent);
  return resolved?.body ? { contentKey: resolved.contentKey, body: resolved.body } : null;
}

function moonWritingForDay(
  day: LunarCalendarDay,
  generatedContent: Map<string, LiveGeneratedContent> | null | undefined,
  leftoverFallback?: { contentKey: string; body: string } | null
) {
  const lunation = primaryLunationForDay(day);
  const lunationKey = calendarLunationMacroKey(lunation, day.moonSign);
  return calendarDayMoonWriting({
    moonSign: day.moonSign,
    lunation,
    lunationBody: lunationKey
      ? calendarLiveBody(
        generatedContent,
        lunationKey,
        fallbackArchitectureV3AuthoredContentForKey(lunationKey)?.body
      )
      : "",
    leftoverFallback: leftoverFallback?.body?.trim() ? leftoverFallback : null
  });
}

function calendarMoonCycleFallbackPiece(
  day: LunarCalendarDay,
  facts: CalendarMoonCycleFacts | undefined,
  generatedContent: Map<string, LiveGeneratedContent> | null | undefined
): CalendarMoonWritingPiece | null {
  if (!facts) return null;
  const fallback = resolveCalendarMoonFallback(facts, calendarMoonFallbackOptions(day, facts, generatedContent));
  return fallback?.body
    ? { role: "leftover", contentKey: fallback.contentKey, body: fallback.body }
    : null;
}

function weekDayGroupCopy(
  journal: ReturnType<typeof resolveLunarJournal>,
  seasonJournal: ReturnType<typeof resolveLunarJournal>,
  moonPieces: CalendarMoonWritingPiece[] = []
) {
  const copy = journalGroupCopy(journal, seasonJournal);
  const moonParagraphs = calendarMoonWritingParagraphs(moonPieces, 1);
  return {
    ...copy,
    paragraphs: moonParagraphs.length ? moonParagraphs : copy.paragraphs,
    prompt: moonParagraphs.length ? undefined : copy.prompt
  };
}

function calendarEventExcerpt(
  event: LunarCalendarEvent,
  generatedContent: Parameters<typeof resolveLunarJournal>[1],
  editorialCopy?: string | null
) {
  const journal = resolveLunarJournal(event, generatedContent);
  const fromJournal = journal ? lunarJournalSkyBlurbs(journal.blocks, 1)[0] : "";
  return fromJournal || editorialCopy?.trim() || "";
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
  if (!window) return null;
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
  const dateLabel = new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "short",
    day: "numeric"
  }).format(new Date(day.date));

  return seasonSign ? `${dateLabel} · ${seasonSign} season${isSeasonStart(day) ? " begins" : ""}` : dateLabel;
}

function titleForDay(day: LunarCalendarDay) {
  const lunation = day.events.find((event) => event.type === "lunation");

  return lunation?.title ?? `Moon in ${day.moonSign}`;
}

function calculatedPhaseTitle(phase: string, sign: string) {
  const phaseLabel = /\bmoon$/iu.test(phase) ? phase : `${phase} Moon`;
  return `${phaseLabel} in ${sign}`;
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

function dateKeyFromUtcTime(time: number) {
  return new Date(time).toISOString().slice(0, 10);
}

function dateKeyInSameWeek(dateKey: string, weekDateKey: string) {
  const weekTime = dayKeyToUtcTime(weekDateKey);
  const weekday = new Date(weekTime).getUTCDay();
  const daysSinceSunday = weekday;
  const weekStart = weekTime - daysSinceSunday * 86_400_000;
  const time = dayKeyToUtcTime(dateKey);

  return time >= weekStart && time < weekStart + 7 * 86_400_000;
}

function dateKeyInMonth(dateKey: string, month: Date) {
  const [year = 0, calendarMonth = 1] = dateKey.split("-").map(Number);

  return year === month.getFullYear() && calendarMonth === month.getMonth() + 1;
}

export function LunarCalendar({
  sky,
  location,
  generatedContent,
  generatedContentStatus = "idle",
  skyPlacementContentStatus = "idle",
  contentVersion = 0,
  onGeneratedContentRequest,
  onOpenTransit,
  onSignIn,
  showJournalPrompts = true,
  natalSunSign = null,
  natalMoonSign = null
}: LunarCalendarProps) {
  const initialRouteState = useMemo(
    () => calendarRouteStateFromUrl(todayKey(location.timeZone || "UTC")),
    [location.timeZone]
  );
  const initialDateKey = initialRouteState?.date ?? todayKey(location.timeZone || "UTC");
  const [visibleMonth, setVisibleMonth] = useState(() => monthAnchorFromDateKey(
    initialDateKey,
    location.timeZone || "UTC"
  ));
  const [visibleWeekDateKey, setVisibleWeekDateKey] = useState(() => initialDateKey);
  const [viewMode, setViewMode] = useState<LunarCalendarViewMode>(initialRouteState?.view ?? "week");
  const [linkedReading, setLinkedReading] = useState(() => initialRouteState?.eventId ? initialRouteState : null);
  const [calendar, setCalendar] = useState<LunarCalendarMonthData | null>(null);
  const [selectedCalendar, setSelectedCalendar] = useState<LunarCalendarMonthData | null>(null);
  const [seasonEvents, setSeasonEvents] = useState<LunarCalendarEvent[]>([]);
  const [status, setStatus] = useState<LunarCalendarStatus>("loading");
  const [hasCalendarFacts, setHasCalendarFacts] = useState(false);
  const [calendarDetailState, setCalendarDetailState] = useState<"loading" | "ready" | "error">("loading");
  const [moonContentState, setMoonContentState] = useState<"loading" | "ready" | "error">(() =>
    isDeferredFallbackArchitectureV3BundleLoaded() && isSkyPlacementFallbackArchitectureV3BundleLoaded() ? "ready" : "loading");
  const [moonContentRetry, setMoonContentRetry] = useState(0);
  const moonContentAssetFailed = useRef(false);
  const readingMeasurement = useRef<ReturnType<typeof startReaderMeasurement> | null>(null);
  const moonContentReady = moonContentState === "ready";
  const readingState: "loading" | "ready" | "error" = moonContentState === "error" || calendarDetailState === "error" ? "error"
    : moonContentReady && calendarDetailState === "ready" ? "ready" : "loading";
  const readingReady = readingState === "ready";
  const [selectedDateKey, setSelectedDateKey] = useState(initialDateKey);
  const [retryNonce, setRetryNonce] = useState(0);
  const [knowledgeMatrixV9, setKnowledgeMatrixV9] = useState<CalendarV9TransitResolver | null>(null);
  const [approvedExactSkyAspectLookup, setApprovedExactSkyAspectLookup] = useState<ApprovedExactSkyAspectLookup | null>(null);
  const [composedSkyCalendarCardLookup, setComposedSkyCalendarCardLookup] = useState<SkyCalendarComposedCardLookup | null>(null);
  const [daySlideoutOpen, setDaySlideoutOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const [readingEvent, setReadingEvent] = useState<LunarCalendarEvent | null>(null);
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [subscribeOpen, setSubscribeOpen] = useState(false);
  const [subscribed, setSubscribed] = useState(() => Boolean(loadCalendarSubscription()));
  const retryCalendarContent = () => {
    if (calendarDetailState === "error") setRetryNonce(value => value + 1);
    // Browsers cache failed module imports. An explicit retry may need fresh HTML;
    // a request deadline can retry the still-pending import without reloading.
    if (moonContentAssetFailed.current && !checkInOpen) window.location.reload();
    else setMoonContentRetry(value => value + 1);
  };
  const checkInData = useCalendarCheckIns({
    dateKey: selectedDateKey,
    fromDateKey: viewMode === "month" ? calendar?.days[0]?.dateKey : undefined,
    toDateKey: viewMode === "month" ? calendar?.days.at(-1)?.dateKey : undefined,
    editorOpen: checkInOpen,
    closeEditor: () => setCheckInOpen(false)
  });
  const { signedIn, loadState: checkInLoadState } = checkInData;
  const libraryTags = checkInData.library.tags;
  const knownPeople = checkInData.library.people;
  const [journalPrompt, setJournalPrompt] = useState<string | null>(null);
  const [checkInTarot, setCheckInTarot] = useState(false);

  useEffect(() => {
    const finish = startReaderMeasurement("calendar.reading", moonContentReady ? "hit" : "miss");
    readingMeasurement.current = finish;
    return () => finish("cancelled");
  }, [moonContentRetry]);

  useEffect(() => {
    // On a cold visit, reserve bandwidth for calculation assets before prose.
    // Once facts have loaded, subsequent navigation keeps the warmed bundles.
    if (!hasCalendarFacts) return;
    const controller = new AbortController();
    const finish = readingMeasurement.current!;
    setMoonContentState("loading");
    moonContentAssetFailed.current = false;
    void withRequestDeadline(() => Promise.all([
      loadDeferredFallbackArchitectureV3Bundle(), loadSkyPlacementFallbackArchitectureV3Bundle()
    ]), { signal: controller.signal }).then(() => {
      if (!controller.signal.aborted) setMoonContentState("ready");
    }).catch(error => {
      finish(error?.name === "TimeoutError" ? "timeout" : controller.signal.aborted ? "cancelled" : "error");
      if (!controller.signal.aborted) {
        moonContentAssetFailed.current = error?.name !== "TimeoutError" && error?.name !== "AbortError";
        setMoonContentState("error");
      }
    });
    return () => { controller.abort(); finish("cancelled"); };
  }, [moonContentRetry, hasCalendarFacts]);

  useEffect(() => {
    if (status === "ready" && readingReady) {
      const frame = requestAnimationFrame(() => readingMeasurement.current?.("ready"));
      return () => cancelAnimationFrame(frame);
    }
  }, [status, readingReady]);

  useEffect(() => {
    if (!hasCalendarFacts || !moonContentReady) return;
    let active = true;

    void loadKnowledgeMatrixV9Runtime()
      .then((resolver) => {
        if (active) setKnowledgeMatrixV9(resolver);
      })
      .catch((error) => {
        console.warn("Calendar V9 transit copy could not load; keeping the existing package fallback.", error);
      });

    return () => {
      active = false;
    };
  }, [hasCalendarFacts, moonContentReady]);

  useEffect(() => {
    if (!hasCalendarFacts || !moonContentReady) return;
    let active = true;

    void import("../../content/skyRegistry")
      .then((registry) => {
        if (active) {
          setApprovedExactSkyAspectLookup(() => registry.approvedExactSkyAspectCopy);
          setComposedSkyCalendarCardLookup(() => registry.skyCalendarComposedCard);
        }
      })
      .catch((error) => {
        console.warn("Calendar exact Sky aspect registry could not load; keeping the approved fallback tiers.", error);
      });

    return () => {
      active = false;
    };
  }, [hasCalendarFacts, moonContentReady]);

  useEffect(() => {
    let cancelled = false;
    const visibleAnchor = isWeekBasedView(viewMode)
      ? dateFromDateKey(visibleWeekDateKey, location.timeZone || "UTC")
      : visibleMonth;
    const storedCalendarKey = calendarStorageKey(location, viewMode, visibleAnchor);
    const storedCalendar = readStoredCalendar(storedCalendarKey);
    const finishControls = startReaderMeasurement("calendar.controls", storedCalendar ? "hit" : "miss");
    // Basic facts make dates usable while prose downloads overlap the detailed
    // calculation. Reading selection is gated separately on complete facts.
    setCalendarDetailState(storedCalendar ? "ready" : "loading");

    if (storedCalendar) {
      setHasCalendarFacts(true);
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
      requestAnimationFrame(() => finishControls("ready"));
    } else {
      setCalendar(null);
      setSelectedCalendar(null);
      setSeasonEvents([]);
      setStatus("loading");
    }

    // Start both requests together so detailed facts enter the worker queue
    // before expensive Sky enrichment. Either successful response can paint
    // dates; a later basic response must never replace complete facts.
    const basicRequest = storedCalendar ? null
      : loadCalendarData(location, viewMode, visibleAnchor, "basic")
        .then(calendar => ({ calendar, detail: "basic" as const }));
    const fullRequest = loadCalendarData(location, viewMode, visibleAnchor, "full")
      .then(calendar => ({ calendar, detail: "full" as const }));
    const initialRequest = basicRequest ? Promise.any([basicRequest, fullRequest]) : fullRequest;
    initialRequest
      .then(({ calendar: nextCalendar, detail }) => {
        if (cancelled) return;

        const currentKey = todayKey(nextCalendar.timeZone);
        const defaultDay = nextCalendar.days.find((day) => day.dateKey === currentKey)
          ?? nextCalendar.days.find((day) => day.inMonth)
          ?? nextCalendar.days[0];

        setCalendar(nextCalendar);
        setHasCalendarFacts(true);
        setSelectedDateKey((existingKey) => {
          if (existingKey) return existingKey;

          if (defaultDay) {
            setVisibleWeekDateKey(defaultDay.dateKey);
          }

          return defaultDay?.dateKey || "";
        });
        setStatus("ready");
        requestAnimationFrame(() => finishControls("ready"));

        if (detail === "full") {
          setCalendarDetailState("ready");
          writeStoredCalendar(storedCalendarKey, nextCalendar);
          return;
        }

        void fullRequest
          .then(({ calendar: fullCalendar }) => {
            if (!cancelled) {
              setCalendar(fullCalendar);
              setCalendarDetailState("ready");
              writeStoredCalendar(storedCalendarKey, fullCalendar);
            }
          })
          .catch((error) => {
            console.warn("Full lunar calendar details failed to load.", error);
            if (!cancelled) {
              setCalendarDetailState("error");
              readingMeasurement.current?.("error");
            }
          });
      })
      .catch((error) => {
        finishControls("error");
        console.warn("Lunar calendar failed to load.", error);
        if (!cancelled) {
          setStatus("error");
          readingMeasurement.current?.("error");
        }
      });

    return () => {
      cancelled = true;
      finishControls("cancelled");
    };
  }, [location, retryNonce, viewMode, visibleMonth, visibleWeekDateKey]);

  useEffect(() => {
    function syncCalendarRoute() {
      const routeState = calendarRouteStateFromUrl(todayKey(location.timeZone || "UTC"));

      if (!routeState) return;
      setViewMode(routeState.view);
      setLinkedReading(routeState.eventId ? routeState : null);
      setSelectedDateKey(routeState.date);
      setVisibleWeekDateKey(routeState.date);
      setVisibleMonth(monthAnchorFromDateKey(routeState.date, location.timeZone || "UTC"));
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

    getLunarCalendarMonth(
      location,
      monthAnchorFromDateKey(selectedDateKey, location.timeZone || "UTC"),
      { detail: "full" }
    )
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
    if (!enableLunarArcContent || !selectedDateKey) {
      setSeasonEvents([]);
      return;
    }

    let cancelled = false;

    const localEvents = [
      ...(calendar?.events ?? []),
      ...(selectedCalendar?.events ?? [])
    ];
    const season = sunIngressSeasonWindow(selectedDateKey, localEvents);
    // Clear the previous selection before loading; never carry a season across
    // location/date changes or substitute static dates while facts are absent.
    setSeasonEvents([]);
    if (!season) return;

    // The day and week surfaces intentionally load a seven-day calendar for a
    // fast first paint. Fetch only the season's lunation/station feed so the
    // season chip can still name its New and Full Moon without calculating an
    // additional 42-day visual calendar.
    getLunarCalendarRangeEvents(
      location,
      new Date(season.startsAt),
      new Date(season.endsAt)
    )
      .then((events) => {
        if (!cancelled) {
          setSeasonEvents(events.filter((event) => (
            event.type === "lunation"
            && event.startsAt >= season.startsAt
            && event.startsAt < season.endsAt
          )));
        }
      })
      .catch((error) => {
        console.warn("Zodiac season lunar milestones failed to load.", error);

        if (!cancelled) {
          setSeasonEvents([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [calendar, location, selectedCalendar, selectedDateKey]);

  const selectedDay = useMemo(() => (
    calendar?.days.find((day) => day.dateKey === selectedDateKey)
    ?? selectedCalendar?.days.find((day) => day.dateKey === selectedDateKey)
    ?? null
  ), [calendar, selectedCalendar, selectedDateKey]);

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
      ? selectedWeekDays.flatMap((day, index) => weeklyWriteupEvents(day, selectedWeekDays[index - 1] ?? null))
      : viewMode === "month"
        ? monthTransitCardEvents(calendar.days)
        : [
            ...weekTransitCardEvents(selectedWeekDays),
            ...(selectedDay
              ? daySurfaceEvents(
                selectedDay,
                selectedWeekDays[selectedWeekDays.findIndex((day) => day.dateKey === selectedDay.dateKey) - 1] ?? null
              )
              : [])
          ];
    const selectedEvents = selectedDay?.events ?? [];
    const editorialEvents = Array.from(new Map([
      ...calendar.events,
      ...(selectedCalendar?.events ?? [])
    ].map((event) => [event.id, event])).values());
    const contentKeys = [
      ...visibleEvents.flatMap(calendarEventGeneratedContentKeys),
      ...selectedEvents.flatMap(calendarEventGeneratedContentKeys),
      ...skyDailySummaryFields.map(field => field.key),
      ...(selectedDay ? lunarDayGeneratedContentKeys(selectedDay, editorialEvents) : []),
      ...["new-moon", "waxing-crescent", "first-quarter", "waxing-gibbous", "full-moon", "disseminating", "last-quarter", "balsamic"]
        .map((phase) => `fallback-hook/moon-phase/${phase}`),
      ...visibleDays.flatMap((day) => {
        const seasonSignForDay = sunIngressSeasonSign(day.dateKey, calendar.events);
        return [
          ...cmsSurfaceKeys.calendarDay("moon", day.moonSign),
          ...cmsSurfaceKeys.calendarDay("phase", calendarPhaseContentKey(calendarPhaseLabelForDay(day, calendar.days))),
          ...cmsSurfaceKeys.calendarDay("continuation", day.moonSign),
          moonContinuationSummaryKey(day.moonSign),
          moonSignTransitionKey(day.moonSign, nextZodiacSignName(day.moonSign)),
          ...(seasonSignForDay
            ? calendarSeasonTransitionKeys(seasonSignForDay, nextZodiacSignName(seasonSignForDay))
            : []),
          `fallback-hook/moon-phase/${calendarPhaseContentKey(calendarPhaseLabelForDay(day, calendar.days))}`,
          `fallback-hook/moon-phase/${calendarPhaseContentKey(calendarPhaseLabelForDay(day, calendar.days))}/${slugContentPart(day.moonSign)}`,
          `authored/calendar-weekly-moon/${slugContentPart(day.moonSign)}`,
          ...[2, 3, 4].map((variant) => `authored/calendar-weekly-moon/${slugContentPart(day.moonSign)}/variant-${variant}`),
          ...(seasonSignForDay ? [`fallback-hook/zodiac-season/${slugContentPart(seasonSignForDay)}`] : []),
          ...day.events.flatMap((event) => {
            if (event.type !== "lunation" || !event.sign) return [];
            const phase = event.eclipseType === "lunar" || /full moon/i.test(event.title) ? "full-moon" : "new-moon";
            return [`authored/sky-lunation-macro/${phase}/${slugContentPart(event.sign)}`];
          })
        ];
      }),
      ...(viewMode === "month" ? calendarMonthlyOverviewContentKeys(calendar) : [])
    ].filter((contentKey) => (
      // Signed-off Studio exact revisions can supersede their bundled baseline.
      // Keep requesting these keys even when local approved prose is available.
      contentKey.startsWith("sky.aspect.") || !fallbackArchitectureV3AuthoredContentForKey(contentKey)
    ));
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

  const moonCycleFacts = useMemo(() => {
    if (!calendar) return new Map<string, CalendarMoonCycleFacts>();
    return calendarMoonCycleFactsForDays(
      calendar.days,
      [...(calendar.cycleEvents ?? []), ...calendar.events],
      zone
    );
  }, [calendar, zone]);

  const moonResolvedByDate = useMemo(() => {
    if (!calendar || calendarDetailState !== "ready" || !moonContentReady) return new Map();
    return calendarMoonResolvedByDate(calendar.days, moonCycleFacts, generatedContent);
  }, [calendar, calendarDetailState, generatedContent, moonCycleFacts, moonContentReady, contentVersion]);

  const weeklyRangeLabel = formatWeeklyRange(selectedWeekDays, calendar?.timeZone ?? location.timeZone ?? "UTC");
  const arcEvents = useMemo(() => {
    const eventsById = new Map<string, LunarCalendarEvent>();

    for (const event of [
      ...(calendar?.events ?? []),
      ...(selectedCalendar?.events ?? []),
      ...seasonEvents
    ]) {
      eventsById.set(event.id, event);
    }

    return [...eventsById.values()];
  }, [calendar, seasonEvents, selectedCalendar]);
  const selectedSky = selectedDay ? calendarSkyForDay(sky, selectedDay.dateKey, location) : null;
  const selectedMoon = selectedSky?.positions.find(position => position.planet === "Moon");
  const readingDay = selectedDay && selectedMoon ? { ...selectedDay, moonSign: selectedMoon.sign } : selectedDay;
  const sunSummary = calendarSunSummary(selectedSky, generatedContent);
  const previousSelectedDay = selectedCalendar && selectedDay
    ? selectedCalendar.days[selectedCalendar.days.findIndex((day) => day.dateKey === selectedDay.dateKey) - 1] ?? null
    : null;
  const selectedDaySurfaceEvents = selectedDay
    ? daySurfaceEvents(selectedDay, previousSelectedDay)
    : [];
  const selectedDayEventCards = selectedDaySurfaceEvents.map((event) => {
    const editorial = calendarEventEditorialContent(
      event,
      generatedContent,
      zone,
      knowledgeMatrixV9,
      approvedExactSkyAspectLookup,
      composedSkyCalendarCardLookup
    );
    const kind = calendarKindFromEvent(event);
    return {
      event,
      kind,
      isKey: kind === "key",
      title: editorial.headline ?? event.title,
      excerpt: calendarEventExcerpt(event, generatedContent, editorial.eventCopy),
      meta: formatCompactEventTime(event.startsAt, zone)
    };
  }).filter((card) => card.kind !== "moon" || Boolean(card.excerpt));
  if (selectedDay?.voidOfCourse?.startsAt) {
    selectedDayEventCards.push({
      event: {
        id: `void-${selectedDay.dateKey}`,
        type: "ingress",
        title: "Moon void of course",
        startsAt: selectedDay.voidOfCourse.startsAt,
        endsAt: selectedDay.voidOfCourse.until,
        dateKey: selectedDay.dateKey,
        glyph: "VOC",
        primary: false,
        planet: "Moon"
      },
      kind: "void" as const,
      isKey: false,
      title: "Moon void of course",
      excerpt: voidCourseDescription(selectedDay) || "",
      meta: formatVoidCourseDetailWindow(selectedDay, zone) || "All day"
    });
  }
  const selectedSeasonTransits = selectedDay
    ? seasonLongTransits({
      dateKey: selectedDay.dateKey,
      dayEvents: selectedDay.events,
      rangeEvents: arcEvents,
      skyPositions: selectedSky?.positions
    }).map((row) => ({
      id: row.id,
      glyph: row.glyph,
      title: row.title,
      meta: row.endsAt
        ? `${row.retrograde ? "Rx" : "direct"} ${formatEventDateMonthDay(row.endsAt, zone)}`
        : row.retrograde
          ? "Rx"
          : "direct",
      retrograde: row.retrograde,
      event: row.event
    }))
    : [];
  const selectedDayJournalEvent = selectedDay
    ? (selectedDaySurfaceEvents.find((event) => journalTypeForEvent(event))
      ?? selectedDay.events.find((event) => journalTypeForEvent(event))
      ?? null)
    : null;
  const selectedDayJournal = selectedDayJournalEvent
    ? resolveLunarJournal(selectedDayJournalEvent, generatedContent)
    : null;
  // Collective-energy write-ups for the aspects exact on the selected day. These
  // read as part of the day's narrative (appended under the main Moon write-up),
  // not as per-row call-outs. Deduped so a twice-logged aspect appears once.
  const selectedPrimaryLunation = selectedDay ? primaryLunationForDay(selectedDay) : undefined;
  const selectedDayPhase = selectedDay && calendar
    ? calendarPhaseLabelForDay(selectedDay, calendar.days)
    : null;
  const selectedDayPhaseSign = selectedPrimaryLunation?.sign ?? readingDay?.moonSign ?? "";
  const selectedPackageWeeklyMoon = selectedDay && calendarDetailState === "ready"
    ? packagedWeeklyMoon(
      selectedDay,
      moonCycleFacts.get(selectedDay.dateKey),
      generatedContent,
      moonResolvedByDate
    )
    : null;
  const selectedMoonWriting = readingDay && calendarDetailState === "ready" && moonContentReady
    ? moonWritingForDay(
      readingDay,
      generatedContent,
      selectedPackageWeeklyMoon
        ? { contentKey: selectedPackageWeeklyMoon.contentKey, body: selectedPackageWeeklyMoon.body }
        : null
    )
    : [];
  const selectedDayBodyPresentation = {
    main: calendarMoonWritingParagraphs(selectedMoonWriting),
    prompt: null
  };
  const readingJournal = readingEvent ? resolveLunarJournal(readingEvent, generatedContent) : null;
  const readingEditorial = readingEvent
    ? calendarEventEditorialContent(
      readingEvent,
      generatedContent,
      zone,
      knowledgeMatrixV9,
      approvedExactSkyAspectLookup,
      composedSkyCalendarCardLookup
    )
    : null;
  const selectedPackagePhase = selectedDay && selectedDayPhase
    ? (() => {
        try {
          const rendered = calendarFallbackRendererV3.renderCalendarPhase({
            phase: calendarPhaseContentKey(selectedDayPhase),
            sign: slugContentPart(selectedDayPhaseSign)
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
  const handleViewModeChange = (nextMode: LunarCalendarViewMode) => {
    if (nextMode === viewMode) return;
    setViewMode(nextMode);
    updateCalendarRouteUrl(nextMode, selectedDateKey || visibleWeekDateKey);
  };
  function handleSelectDate(dateKey: string, options?: { openSlideout?: boolean }) {
    setSelectedDateKey(dateKey);
    setVisibleWeekDateKey(dateKey);
    if (!dateKeyInMonth(dateKey, visibleMonth)) {
      setVisibleMonth(monthAnchorFromDateKey(dateKey, location.timeZone || "UTC"));
    }
    updateCalendarRouteUrl(viewMode, dateKey);
    const openSlideout = options?.openSlideout ?? (viewMode === "month" || viewMode === "weekly");
    if (openSlideout) {
      setReadingEvent(null);
      setDaySlideoutOpen(true);
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
    handleSelectDate(nextDateKey, { openSlideout: daySlideoutOpen });
    window.requestAnimationFrame(() => {
      document.querySelector<HTMLButtonElement>(`[data-calendar-date="${nextDateKey}"]`)?.focus();
    });
  }
  const handleToday = () => {
    const nextDateKey = todayKey(location.timeZone || "UTC");

    setSelectedDateKey(nextDateKey);
    setVisibleWeekDateKey(nextDateKey);
    setVisibleMonth(monthAnchorFromDateKey(nextDateKey, location.timeZone || "UTC"));
    updateCalendarRouteUrl(viewMode, nextDateKey);
  };
  const handleCalendarNavigation = (direction: -1 | 1) => {
    if (viewMode === "week") {
      const nextDateKey = dateKeyFromUtcTime(dayKeyToUtcTime(selectedDateKey || visibleWeekDateKey) + direction * 86_400_000);

      setSelectedDateKey(nextDateKey);
      setVisibleWeekDateKey(nextDateKey);
      setVisibleMonth(monthAnchorFromDateKey(nextDateKey, location.timeZone || "UTC"));
      updateCalendarRouteUrl(viewMode, nextDateKey);
      return;
    }

    if (viewMode === "weekly") {
      const nextWeekDateKey = dateKeyFromUtcTime(dayKeyToUtcTime(visibleWeekDateKey) + direction * 7 * 86_400_000);

      setVisibleWeekDateKey(nextWeekDateKey);
      setVisibleMonth(monthAnchorFromDateKey(nextWeekDateKey, location.timeZone || "UTC"));
      const nextDateKey = selectedDateKey
        ? dateKeyFromUtcTime(dayKeyToUtcTime(selectedDateKey) + direction * 7 * 86_400_000)
        : nextWeekDateKey;
      setSelectedDateKey(nextDateKey);
      updateCalendarRouteUrl(viewMode, nextDateKey);
      return;
    }

    const nextMonth = addMonths(visibleMonth, direction);

    setVisibleMonth(nextMonth);
    const nextDateKey = `${nextMonth.toISOString().slice(0, 7)}-01`;
    setVisibleWeekDateKey(nextDateKey);
    setSelectedDateKey(nextDateKey);
    updateCalendarRouteUrl(viewMode, nextDateKey);

  };
  const seasonDateKey = selectedDateKey || currentDateKey;
  const seasonSign = sunIngressSeasonSign(seasonDateKey, arcEvents);
  const seasonWindow = sunIngressSeasonWindow(seasonDateKey, arcEvents);
  const seasonDaysAway = seasonWindow
    ? calendarDateKeyDistance(seasonDateKey, seasonWindow.end)
    : null;
  const seasonDaysLeft = seasonDaysAway == null ? null : Math.max(0, seasonDaysAway);
  const openEventReading = (event: LunarCalendarEvent) => {
    setReadingEvent(event);
    setDaySlideoutOpen(false);
  };
  const openSeasonReading = () => {
    const seasonEvent = arcEvents.find((event) => (
      event.type === "ingress" && event.planet === "Sun" && (event.toSign ?? event.sign) === seasonSign
    ));
    if (seasonEvent) openEventReading(seasonEvent);
  };
  const selectedDaySkyParagraphs = selectedDayBodyPresentation.main;
  const selectedDaySkyTitle = selectedDayJournal?.headline
    ?? selectedPackagePhase?.headline
    ?? (selectedDayPhase
      ? calculatedPhaseTitle(selectedDayPhase, selectedDayPhaseSign)
      : selectedDay
        ? titleForDay(selectedDay)
        : "");
  const selectedMoonSign = readingDay?.moonSign ?? selectedDay?.moonSign ?? "";
  const selectedLunarDayNumber = selectedDay && calendar
    ? lunarDayFor(selectedDay, calendar.events)
    : null;
  const monthlyOverview = useMemo(() => {
    if (viewMode !== "month" || !calendar) return null;
    return resolveCalendarMonthlyOverview(calendar, generatedContent);
  }, [calendar, generatedContent, viewMode, contentVersion]);
  const dayPanelProps = selectedDay ? {
    checkInEntry: checkInData.value,
    contentState: readingState,
    onRetryContent: retryCalendarContent,
    dateKey: selectedDay.dateKey,
    dateLine: formatSlideoutDate(selectedDay, zone),
    elementClass: elementClassForSign(selectedMoonSign),
    elementTag: signElements[selectedMoonSign],
    events: selectedDayEventCards,
    isToday: selectedDay.dateKey === currentDateKey,
    metaLine: [
      selectedDay.illumination ? `${selectedDay.illumination}% lit` : null,
      selectedLunarDayNumber ? `Lunar day ${selectedLunarDayNumber}` : null,
      seasonSign ? `${signGlyphs[seasonSign] ?? ""} ${seasonSign} season`.trim() : null,
      selectedPrimaryLunation ? `Exact at ${formatEventTime(selectedPrimaryLunation.startsAt, zone)}` : null
    ].filter(Boolean).join(" · "),
    onCheckIn: () => setCheckInOpen(true),
    onOpenEvent: openEventReading,
    paragraphs: selectedDaySkyParagraphs,
    moonPassages: selectedMoonWriting.map((piece) => ({
      contentKey: piece.contentKey,
      paragraphs: textParagraphs(piece.body),
      role: piece.role
    })),
    phaseEmoji: selectedDay ? moonPhaseEmoji(calendarPhaseLabelForDay(selectedDay, calendar?.days ?? [])) : undefined,
    prompt: selectedDayBodyPresentation.prompt ?? undefined,
    seasonTransits: selectedSeasonTransits,
    sky: selectedSky,
    sunSummary,
    title: selectedDaySkyTitle
  } : null;
  const monthLegendNew = calendar?.days.find((day) => (
    day.inMonth && day.events.some((event) => event.type === "lunation" && /new moon/i.test(event.title))
  ));
  const monthLegendFull = calendar?.days.find((day) => (
    day.inMonth && day.events.some((event) => event.type === "lunation" && /full moon/i.test(event.title))
  ));
  const monthLegendQuarter = calendar?.days.find((day) => (
    day.inMonth && isExactQuarterMoonDay(day)
  ));
  const seasonPill = seasonSign ? (
    <CalendarSeasonPill
      daysLeft={seasonDaysLeft}
      glyph={signGlyphs[seasonSign] ?? ""}
      onClick={openSeasonReading}
      sign={seasonSign}
    />
  ) : null;

  return (
    <section className={`lunar-calendar-view is-${viewMode}`} aria-label="Lunar calendar">
      <header className="lunar-calendar-header">
        <div className="lunar-calendar-title-row">
          <h1>
            {viewMode === "weekly" && selectedWeekDays.length > 0 ? (
              <span>{formatCalendarWeekHead(selectedWeekDays, zone)}</span>
            ) : viewMode === "week" && selectedDay ? (
              <span>{formatCalendarDayHead(selectedDay, zone)}</span>
            ) : (
              <>
                <span>{abbreviateMonthName(monthParts.month)}</span>
                {" "}<em>{monthParts.year}</em>
              </>
            )}
          </h1>
          <div className="lunar-calendar-controls" aria-label={`Calendar ${calendarNavUnit(viewMode)} controls`}>
            <button type="button" aria-label={`Previous ${calendarNavUnit(viewMode)}`} onClick={() => handleCalendarNavigation(-1)}>
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
            {selectedDateKey !== currentDateKey && (
              <button type="button" aria-label="Today" className="lunar-calendar-controls__today" onClick={handleToday}>
                <RotateCcw size={16} aria-hidden="true" />
              </button>
            )}
            <button type="button" aria-label={`Next ${calendarNavUnit(viewMode)}`} onClick={() => handleCalendarNavigation(1)}>
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          </div>
          {seasonSign && (
            <button
              aria-label={
                seasonDaysLeft != null && seasonDaysLeft > 0
                  ? `${seasonSign} season · ${seasonDaysLeft} ${seasonDaysLeft === 1 ? "day" : "days"} left`
                  : `${seasonSign} season`
              }
              className="calendar-header-season"
              onClick={openSeasonReading}
              type="button"
            >
              <AstroGlyph text={signGlyphs[seasonSign] ?? ""} />
              <span>{seasonSign} season</span>
              {seasonDaysLeft != null && seasonDaysLeft > 0 && (
                <>
                  <span aria-hidden="true" className="calendar-header-season__left is-wide">
                    · {seasonDaysLeft} {seasonDaysLeft === 1 ? "day" : "days"} left
                  </span>
                  <span aria-hidden="true" className="calendar-header-season__left is-compact">
                    · {seasonDaysLeft}D left
                  </span>
                </>
              )}
            </button>
          )}
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
          <button
            aria-label={subscribed ? "Calendar subscription link" : "Add to your calendar"}
            className="lunar-calendar-subscribe"
            onClick={() => setSubscribeOpen(true)}
            type="button"
          >
            {subscribed ? <CalendarCheck size={18} aria-hidden="true" /> : <CalendarPlus size={18} aria-hidden="true" />}
          </button>
        </div>
      </header>

      {status === "loading" && (
        <div className="lunar-calendar-loading">
          <PageLoading compact message="Calculating calendar" />
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
          <CalendarWeekStrip
            calendarDays={calendar.days}
            currentDateKey={currentDateKey}
            days={selectedWeekDays}
            onKeyDown={handleDayKeyDown}
            onSelect={handleSelectDate}
            selectedDateKey={selectedDateKey}
            zone={zone}
          />

          {seasonPill}

          {dayPanelProps && (
            <CalendarDayPanel
              {...dayPanelProps}
              embedded
            />
          )}
        </div>
      )}

      {viewMode === "weekly" && (
        <div className="lunar-weekly-view">
          <CalendarWeekStrip
            calendarDays={calendar.days}
            currentDateKey={currentDateKey}
            days={selectedWeekDays}
            onKeyDown={handleDayKeyDown}
            onSelect={handleSelectDate}
            selectedDateKey={selectedDateKey}
            zone={zone}
          />
          {seasonPill}
          {!readingReady && (readingState === "loading"
            ? <PageLoading compact message="Loading this week’s readings…" />
            : <PageLoadError message="This week’s readings could not load." onRetry={retryCalendarContent} />)}
          {readingReady && <CalendarDayGroupList label={`Day-by-day astrology for ${weeklyRangeLabel}`}>
            {calendarMoonWritingSequenceWithoutRepeat(selectedWeekDays, (day) => {
              return moonWritingForDay(
                day,
                generatedContent,
                packagedWeeklyMoon(day, moonCycleFacts.get(day.dateKey), generatedContent, moonResolvedByDate)
              );
            }, (day) => calendarMoonCycleFallbackPiece(day, moonCycleFacts.get(day.dateKey), generatedContent)).map((moonPieces, index) => {
              const day = selectedWeekDays[index];
              const phase = calendarPhaseLabelForDay(day, calendar.days);
              const previousDay = index > 0 ? selectedWeekDays[index - 1] : null;
              const hasLunation = day.events.some((event) => event.type === "lunation" && event.dateKey === day.dateKey);
              const journalEvent = day.events.find((event) => journalTypeForEvent(event)) ?? null;
              const journal = journalEvent ? resolveLunarJournal(journalEvent, generatedContent) : null;
              const seasonJournal = (() => {
                const seasonStart = daySeasonStart(day);
                return seasonStart ? resolveLunarJournal(seasonStart, generatedContent) : null;
              })();
              const copy = weekDayGroupCopy(journal, seasonJournal, moonPieces);

              return (
                <CalendarDayGroup
                  dateKey={day.dateKey}
                  guidanceKey={moonPieces[0]?.contentKey}
                  isSelected={day.dateKey === selectedDateKey}
                  isToday={day.dateKey === currentDateKey}
                  key={day.dateKey}
                  number={formatDayNumber(day, zone)}
                  numberClass={monthDiscClassName(phase, day.dateKey === currentDateKey, false, isExactQuarterMoonDay(day), day.dateKey === selectedDateKey, isEclipseDay(day))}
                  onOpenEvent={() => handleSelectDate(day.dateKey)}
                  onSelectDay={() => handleSelectDate(day.dateKey)}
                  paragraphs={copy.paragraphs}
                  prompt={copy.prompt}
                  rows={buildCalendarDayGroupRows({
                    day,
                    previousDay,
                    phase,
                    zone,
                    includeSurfaceEvents: true,
                    showMoonRow: !hasLunation,
                    natalMoonSign,
                    seasonExcerpt: copy.seasonExcerpt
                  })}
                  weekday={formatWeekdayLong(day, zone)}
                />
              );
            })}
          </CalendarDayGroupList>}
        </div>
      )}

      {viewMode === "month" && (
        <div className="lunar-calendar-layout">
          {readingReady && monthlyOverview && (
            <section className="lunar-month-overview" aria-labelledby="lunar-month-overview-heading">
              <h2 className="sr-only" id="lunar-month-overview-heading">Monthly overview</h2>
              {monthlyOverview.paragraphs.map((paragraph, index) => <FormattedProse key={index} text={paragraph} />)}
            </section>
          )}
          <div className="lunar-calendar-month-primary">
            <section className="lunar-calendar-grid-panel" aria-label={`${formatMonthLabel(visibleMonth)} lunar grid`}>
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
                const previousDay = index > 0 ? calendar.days[index - 1] : null;
                const tooltipEvents = calendarDayTooltipEvents(day, previousDay);
                const tooltipLines = calendarDayTooltipLines(day, tooltipEvents, zone, calendar.days);
                const mood = calendarMoodOf(checkInData.summaries[day.dateKey]);
                const moodIndex = checkInData.summaries[day.dateKey]?.mood;
                const dayLabel = [
                  ...tooltipLines,
                  ...(mood ? [`Check-in ${mood.label}`] : [])
                ].join(". ");
                const voidLabel = formatVoidCourseMonthChip(day, zone);
                const voidTooltipLabel = formatVoidCourseTooltip(day, zone);
                const display = monthCellDisplay(day.events);
                const seasonStart = daySeasonStart(day);
                const moonEnter = moonIngressEvent(day, previousDay);
                const journaled = Boolean(checkInData.summaries[day.dateKey]);
                const lunarReturn = isLunarReturnDay(day, previousDay, natalMoonSign);
                const eclipse = isEclipseDay(day);

                return (
                  <button
                    className={`lunar-calendar-day ${tooltipClass} ${day.inMonth ? "" : "is-outside"} ${isSelected ? "is-selected" : ""} ${isToday ? "is-today" : ""} ${seasonStart ? "is-season-start" : ""}`}
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
                      <span className={`lunar-calendar-day__number ${monthDiscClassName(dayPhase, isToday, Boolean(seasonStart), isExactQuarterMoonDay(day), isSelected, eclipse)}`}>
                        {formatDayNumber(day, zone)}
                      </span>
                      <span className="lunar-calendar-day__lunar">
                        <span className={`lunar-calendar-day__moon lunar-moon-sign-glyph${moonEnter ? " is-enter" : ""}`}>
                          <AstroGlyph text={moonEnter?.toSign ? signGlyphs[moonEnter.toSign] : day.moonSignGlyph} />
                        </span>
                        <span className={`lunar-moon-emoji${eclipse ? " is-eclipse" : ""}`} aria-hidden="true">{moonPhaseEmoji(dayPhase)}</span>
                      </span>
                    </span>
                    <span className="lunar-calendar-day__events">
                      {typeof moodIndex === "number" && (
                        <CalendarMoodChip mood={moodIndex} />
                      )}
                      {seasonStart && (
                        <span className="calendar-month-chip calendar-kind calendar-kind--season is-inverted" aria-hidden="true">
                          <AstroGlyph text={`☉→${signGlyphs[seasonStart.toSign ?? seasonStart.sign ?? ""] ?? ""}`} />
                          <span className="calendar-month-chip__text">{seasonStart.toSign ?? seasonStart.sign} season</span>
                        </span>
                      )}
                      {lunarReturn && (
                        <span className="calendar-month-chip calendar-kind calendar-kind--lunar-return" aria-hidden="true">☽</span>
                      )}
                      {journaled && (
                        <span className="calendar-month-chip calendar-month-journal" aria-hidden="true" title="Journal entry">
                          <span className="calendar-month-journal__mark" />
                        </span>
                      )}
                      {day.voidOfCourse && (
                        <span className="calendar-month-chip calendar-month-voc calendar-kind calendar-kind--void" title="Moon void of course" aria-hidden="true">
                          <span className="calendar-month-chip__voc">VOC</span>
                          {voidLabel ? <span className="calendar-month-chip__text">{voidLabel}</span> : null}
                        </span>
                      )}
                      {display.chips.map((event) => (
                        <CalendarMonthChip event={event} key={event.id} />
                      ))}
                      {display.dots.length > 0 && (
                        <span className="lunar-calendar-event-dots" aria-hidden="true">
                          {display.dots.map((event) => (
                            <span className={`lunar-calendar-aspect-dot is-${calendarMarkTone(event)}`} key={event.id} />
                          ))}
                        </span>
                      )}
                      {display.overflow > 0 && (
                        <span className="lunar-calendar-event-more" aria-hidden="true">+{display.overflow}</span>
                      )}
                    </span>
                    {!isSelected && (
                      <span className="lunar-calendar-day-tooltip" role="tooltip">
                        <span className="lunar-calendar-day-tooltip__phase">{dayPhase}</span>
                        <span className="lunar-calendar-day-tooltip__sign">Moon in {day.moonSign}</span>
                        {tooltipEvents.length > 0 && (
                          <span className="lunar-calendar-day-tooltip__events">
                            {tooltipEvents.map((event) => (
                              <span className="lunar-calendar-day-tooltip__event" key={event.id}>{calendarMotionTitle(event)}</span>
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
            <div className="lunar-calendar-legend">
              <div className="lunar-calendar-legend-bar">
                <button
                  aria-expanded={legendOpen}
                  className="lunar-calendar-legend__toggle"
                  onClick={() => setLegendOpen((open) => !open)}
                  type="button"
                >
                  Legend
                  <ChevronDown size={10} aria-hidden="true" />
                </button>
                <button
                  aria-label={subscribed ? "Calendar subscription link" : "Add to your calendar"}
                  className="lunar-calendar-subscribe lunar-calendar-subscribe--inline"
                  onClick={() => setSubscribeOpen(true)}
                  type="button"
                >
                  {subscribed ? <CalendarCheck size={15} aria-hidden="true" /> : <CalendarPlus size={15} aria-hidden="true" />}
                  {subscribed ? "Calendar link" : "Subscribe"}
                </button>
              </div>
              {legendOpen && (
                <div className="lunar-calendar-legend__panel">
                  <span>
                    <span className="lunar-calendar-day__number is-today-disc">{String(Number(currentDateKey.slice(8, 10)))}</span>
                    Today
                  </span>
                  <span>
                    <span className="lunar-calendar-day__number is-new-disc">{monthLegendNew ? formatDayNumber(monthLegendNew, zone) : "●"}</span>
                    New Moon
                  </span>
                  <span>
                    <span className="lunar-calendar-day__number is-full-disc">{monthLegendFull ? formatDayNumber(monthLegendFull, zone) : "○"}</span>
                    Full Moon
                  </span>
                  <span>
                    <span className="lunar-calendar-day__number is-quarter-disc">{monthLegendQuarter ? formatDayNumber(monthLegendQuarter, zone) : "◐"}</span>
                    Quarter Moon
                  </span>
                  <span>
                    <span className="calendar-month-chip calendar-kind calendar-kind--season is-inverted" aria-hidden="true">
                      <AstroGlyph text="☉→♎" />
                    </span>
                    Season change
                  </span>
                  <span>
                    <span className="calendar-month-chip calendar-kind calendar-kind--lunar-return" aria-hidden="true">☽</span>
                    Your lunar return
                  </span>
                  <span>
                    <span className="calendar-month-chip calendar-kind calendar-kind--ingress" aria-hidden="true">
                      <AstroGlyph text="♀→♎" />
                    </span>
                    Planet enters sign
                  </span>
                  <span>
                    <span className="calendar-month-chip calendar-kind calendar-kind--station" aria-hidden="true">
                      <AstroGlyph text="♄Rx" />
                    </span>
                    Retrograde station
                  </span>
                  <span>
                    <span className="calendar-month-chip calendar-month-journal" aria-hidden="true">
                      <span className="calendar-month-journal__mark" />
                    </span>
                    Journal entry
                  </span>
                  <span>
                    <span className="calendar-month-chip calendar-kind calendar-kind--key" aria-hidden="true">⭐</span>
                    Key event
                  </span>
                  <span>
                    <span className="lunar-calendar-event-dots" aria-hidden="true">
                      <span className="lunar-calendar-aspect-dot event-aspect" />
                      <span className="lunar-calendar-aspect-dot event-aspect" />
                    </span>
                    Aspect
                  </span>
                </div>
              )}
            </div>
            </section>
            {seasonPill}
          </div>
          <section className="lunar-month-agenda" aria-label="Major events this month">
            <span className="lunar-calendar-upcoming__label">Major events this month</span>
            <CalendarDayGroupList label="Major events this month">
              {(() => {
                const agendaDays = calendar.days
                  .map((day, index) => ({ day, index, phase: calendarPhaseLabelForDay(day, calendar.days) }))
                  .filter(({ day, phase }) => isMonthAgendaDay(day, phase));
                return calendarMoonWritingSequenceWithoutRepeat(agendaDays, ({ day }) => (
                  moonWritingForDay(day, generatedContent, packagedWeeklyMoon(day, moonCycleFacts.get(day.dateKey), generatedContent, moonResolvedByDate))
                ), ({ day }) => calendarMoonCycleFallbackPiece(day, moonCycleFacts.get(day.dateKey), generatedContent)).flatMap((moonPieces, agendaIndex) => {
                const { day, index, phase } = agendaDays[agendaIndex];
                const previousDay = index > 0 ? calendar.days[index - 1] : null;
                const hasLunation = day.events.some((event) => event.type === "lunation" && event.dateKey === day.dateKey);
                const journalEvent = day.events.find((event) => journalTypeForEvent(event)) ?? null;
                const journal = journalEvent ? resolveLunarJournal(journalEvent, generatedContent) : null;
                const seasonJournal = (() => {
                  const seasonStart = daySeasonStart(day);
                  return seasonStart ? resolveLunarJournal(seasonStart, generatedContent) : null;
                })();
                const copy = weekDayGroupCopy(journal, seasonJournal, moonPieces);

                return [
                  <CalendarDayGroup
                    dateKey={day.dateKey}
                    guidanceKey={moonPieces[0]?.contentKey}
                    isSelected={day.dateKey === selectedDateKey}
                    isToday={day.dateKey === currentDateKey}
                    key={day.dateKey}
                    number={formatDayNumber(day, zone)}
                    numberClass={monthDiscClassName(phase, day.dateKey === currentDateKey, false, isExactQuarterMoonDay(day), day.dateKey === selectedDateKey, isEclipseDay(day))}
                    onOpenEvent={() => handleSelectDate(day.dateKey)}
                    onSelectDay={() => handleSelectDate(day.dateKey)}
                    paragraphs={copy.paragraphs}
                    prompt={copy.prompt}
                  rows={buildCalendarDayGroupRows({
                    day,
                    previousDay,
                    phase,
                    zone,
                    includeSurfaceEvents: false,
                    showMoonRow: isQuarterMoonLabel(phase) && !hasLunation,
                    natalMoonSign,
                    seasonExcerpt: copy.seasonExcerpt
                  })}
                    weekday={formatWeekdayLong(day, zone)}
                  />
                ];
                });
              })()}
            </CalendarDayGroupList>
          </section>
        </div>
      )}
        </div>
      )}
      {daySlideoutOpen && selectedDay && dayPanelProps && (
        <CalendarDayPanel
          {...dayPanelProps}
          onClose={() => setDaySlideoutOpen(false)}
        />
      )}
      {linkedReading?.eventId && <CalendarLinkedReading
        key={`${linkedReading.eventId}:${linkedReading.date}:${linkedReading.eventTimeZone}`}
        id={linkedReading.eventId} date={linkedReading.date} timeZone={linkedReading.eventTimeZone ?? zone}
        onClose={() => { setLinkedReading(null); updateCalendarRouteUrl(viewMode, selectedDateKey, "replace"); }}
      />}
      {readingEvent && !readingReady && (
        <CalendarSlideout label="Event reading" onClose={() => setReadingEvent(null)}>
          {readingState === "loading" ? <PageLoading compact message="Loading this reading…" /> : (
            <PageLoadError message="This reading could not load." onRetry={retryCalendarContent} />
          )}
        </CalendarSlideout>
      )}
      {readingEvent && readingReady && (
        <CalendarEventReading
          backLabel={selectedDay ? formatCheckInDate(selectedDay, zone) : undefined}
          dateLine={`${formatEventDate(readingEvent.startsAt, zone)} · ${formatEventTime(readingEvent.startsAt, zone)}`}
          element={signElements[readingEvent.sign ?? readingEvent.toSign ?? ""]}
          event={readingEvent}
          journalBlocks={readingJournal?.blocks}
          kind={calendarKindFromEvent(readingEvent)}
          onBack={selectedDay ? () => {
            setReadingEvent(null);
            setDaySlideoutOpen(true);
          } : undefined}
          onClose={() => setReadingEvent(null)}
          natalSun={natalSunSign}
          timeCity={location.label.split(",")[0]?.trim() || location.label}
          onJournalPrompt={showJournalPrompts ? (text, options) => {
            setJournalPrompt(text);
            setCheckInTarot(Boolean(options?.tarot));
            setDaySlideoutOpen(false);
            setReadingEvent(null);
            setCheckInOpen(true);
          } : undefined}
          onReadArticle={onOpenTransit ? () => onOpenTransit(readingEvent) : undefined}
          paragraphs={
            readingJournal
              ? []
              : calendarKindFromEvent(readingEvent) === "void" && selectedDay
                ? [voidCourseDescription(selectedDay)].filter(Boolean)
                : (readingEditorial?.eventCopy ?? "").split("\n").filter(Boolean)
          }
          showJournalPrompts={showJournalPrompts}
          title={readingJournal?.headline ?? readingEditorial?.headline ?? readingEvent.title}
        />
      )}
      {checkInOpen && selectedDay && checkInLoadState !== "ready" && (
        <CalendarSlideout label="Check-in" onClose={() => {
          setCheckInOpen(false);
          setJournalPrompt(null);
          setCheckInTarot(false);
        }} variant="checkin">
          {checkInLoadState === "loading" ? (
            <PageLoading compact message="Loading your check-in…" />
          ) : (
            <PageLoadError
              message="Your saved check-in could not load. Try again before editing."
              onRetry={() => {
                checkInData.retry();
              }}
            />
          )}
        </CalendarSlideout>
      )}
      {checkInOpen && selectedDay && checkInLoadState === "ready" && (
        <CalendarCheckIn
          dateKey={selectedDay.dateKey}
          dateLine={formatCheckInDate(selectedDay, zone)}
          key={`${checkInData.accountId ?? "guest"}:${selectedDay.dateKey}`}
          libraryLoadState={checkInData.libraryState}
          onRetryLibrary={checkInData.retryLibrary}
          knownPeople={knownPeople}
          libraryTags={libraryTags}
          onClose={() => {
            setCheckInOpen(false);
            setJournalPrompt(null);
            setCheckInTarot(false);
          }}
          onLibraryPersonAdd={async (name) => {
            if (signedIn) await addCalendarCheckInLibraryItem("person", name, { expectedUserId: checkInData.accountId ?? undefined });
            checkInData.updateLibrary(current => ({ ...current, people: current.people.includes(name) ? current.people : [...current.people, name] }));
          }}
          onLibraryTagAdd={async (tag) => {
            if (signedIn) await addCalendarCheckInLibraryItem("tag", tag, { expectedUserId: checkInData.accountId ?? undefined });
            checkInData.updateLibrary(current => ({ ...current, tags: current.tags.includes(tag) ? current.tags : [...current.tags, tag] }));
          }}
          onLibraryTagRemove={async (tag) => {
            if (signedIn) await removeCalendarCheckInLibraryItem("tag", tag, { expectedUserId: checkInData.accountId ?? undefined });
            checkInData.updateLibrary(current => ({ ...current, tags: current.tags.filter(item => item !== tag) }));
          }}
          onSave={async (entry) => {
            const saved = await upsertCalendarCheckIn(selectedDay.dateKey, entry, { expectedUserId: checkInData.accountId ?? undefined });
            checkInData.saved(saved);
          }}
          onSignIn={onSignIn}
          openTagSheet={checkInTarot}
          prompt={journalPrompt ?? selectedDayBodyPresentation.prompt ?? undefined}
          signedIn={signedIn}
          startStep={journalPrompt ? 4 : 0}
          tarotMode={checkInTarot}
          value={checkInData.value}
        />
      )}
      {subscribeOpen && (
        <CalendarSubscribeSheet
          onClose={() => setSubscribeOpen(false)}
          onLinkReady={() => {
            setSubscribed(true);
          }}
          timeZone={location.timeZone ?? "UTC"}
        />
      )}
    </section>
  );
}

function CalendarWeekStrip({
  days,
  selectedDateKey,
  currentDateKey,
  calendarDays,
  zone,
  onSelect,
  onKeyDown
}: {
  days: LunarCalendarDay[];
  selectedDateKey: string;
  currentDateKey: string;
  calendarDays: LunarCalendarDay[];
  zone: string;
  onSelect: (dateKey: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>, dateKey: string) => void;
}) {
  return (
    <section className="lunar-week-strip" aria-label="Selected week">
      {days.map((day, index) => {
        const isSelected = selectedDateKey === day.dateKey;
        const isToday = day.dateKey === currentDateKey;
        const dayPhase = calendarPhaseLabelForDay(day, calendarDays);
        const tooltipClass = [
          index >= 5 ? "is-tooltip-left" : index <= 1 ? "is-tooltip-right" : "",
          "is-tooltip-below"
        ].filter(Boolean).join(" ");
        const previousDay = index > 0 ? days[index - 1] : null;
        const tooltipEvents = calendarDayTooltipEvents(day, previousDay);
        const tooltipLines = calendarDayTooltipLines(day, tooltipEvents, zone, calendarDays);
        const dayLabel = tooltipLines.join(". ");
        const voidTooltipLabel = formatVoidCourseTooltip(day, zone);
        const stripDots = weekStripDots(day.events);
        const seasonStart = daySeasonStart(day);
        const moonEnter = moonIngressEvent(day, previousDay);

        return (
          <button
            className={`lunar-week-day ${tooltipClass} ${isSelected ? "is-selected" : ""} ${isToday ? "is-today" : ""} ${seasonStart ? "is-season-start" : ""}`}
            key={day.dateKey}
            type="button"
            onClick={() => onSelect(day.dateKey)}
            onKeyDown={(event) => onKeyDown(event, day.dateKey)}
            data-calendar-date={day.dateKey}
            aria-label={dayLabel}
            aria-pressed={isSelected}
            aria-current={isToday ? "date" : undefined}
          >
            <span className="lunar-week-day__weekday">{formatWeekday(day, zone)}</span>
            <span className={`lunar-week-day__date ${monthDiscClassName(dayPhase, isToday, Boolean(seasonStart), isExactQuarterMoonDay(day), isSelected, isEclipseDay(day))}`}>{formatDayNumber(day, zone)}</span>
            <span className={`lunar-moon-emoji${isEclipseDay(day) ? " is-eclipse" : ""}`} aria-hidden="true">{moonPhaseEmoji(dayPhase)}</span>
            <span className={`lunar-week-day__sign lunar-moon-sign-glyph${moonEnter ? " is-enter" : ""}`}>
              <AstroGlyph text={moonEnter?.toSign ? signGlyphs[moonEnter.toSign] : day.moonSignGlyph} />
            </span>
            {seasonStart && (
              <span className="lunar-week-day__season" aria-hidden="true">
                <AstroGlyph text={`☉→${signGlyphs[seasonStart.toSign ?? seasonStart.sign ?? ""] ?? ""}`} />
              </span>
            )}
            {stripDots.length > 0 && (
              <span className="lunar-week-day__events" aria-hidden="true">
                <span className="lunar-calendar-event-dots">
                  {stripDots.map((event) => (
                    <span className={`lunar-calendar-aspect-dot is-${calendarMarkTone(event)}`} key={event.id} />
                  ))}
                </span>
              </span>
            )}
            {!isSelected && (
              <span className="lunar-calendar-day-tooltip" role="tooltip">
                <span className="lunar-calendar-day-tooltip__phase">{dayPhase}</span>
                <span className="lunar-calendar-day-tooltip__sign">Moon in {day.moonSign}</span>
                {tooltipEvents.length > 0 && (
                  <span className="lunar-calendar-day-tooltip__events">
                    {tooltipEvents.map((event) => (
                      <span className="lunar-calendar-day-tooltip__event" key={event.id}>{calendarMotionTitle(event)}</span>
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
  );
}

function TransitCard({
  approvedExactSkyAspectLookup,
  composedSkyCalendarCardLookup,
  contentStatus,
  event,
  generatedContent,
  knowledgeMatrixV9,
  onOpenTransit,
  timeZone
}: {
  approvedExactSkyAspectLookup?: ApprovedExactSkyAspectLookup | null;
  composedSkyCalendarCardLookup?: SkyCalendarComposedCardLookup | null;
  contentStatus: "idle" | "loading" | "ready";
  event: LunarCalendarEvent;
  generatedContent?: Map<string, LiveGeneratedContent>;
  knowledgeMatrixV9?: CalendarV9TransitResolver | null;
  onOpenTransit?: (event: LunarCalendarEvent, description?: string) => void;
  timeZone: string;
}) {
  const glyphParts = transitCardGlyphParts(event);
  const editorial = calendarEventEditorialContent(
    event,
    generatedContent,
    timeZone,
    knowledgeMatrixV9,
    approvedExactSkyAspectLookup,
    composedSkyCalendarCardLookup
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
        <PageLoading compact message="Loading interpretation" />
      ) : description ? <FormattedProse className="tx-body" text={description} /> : null}
      {onOpenTransit && !isContentLoading ? <CardReadMore /> : null}
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
