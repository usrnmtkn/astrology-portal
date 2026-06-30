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
import { hasMapboxToken, searchCities, type CitySuggestion } from "../../services/mapbox";
import { timeZoneForLocation, withTimeZone } from "../../services/timezones";
import type { LocationInput } from "../../types";

type LunarCalendarStatus = "loading" | "ready" | "error";
type LunarCalendarViewMode = "week" | "month";

type LunarCalendarProps = {
  location: LocationInput;
  onLocationChange: (location: LocationInput) => void;
};

type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => { finished: Promise<void> };
};

type LocationSearchStatus = "idle" | "loading" | "ready" | "empty" | "error";

const viewModeOptions: Array<{ value: LunarCalendarViewMode; label: string }> = [
  { value: "week", label: "Week" },
  { value: "month", label: "Month" }
];

const calendarStorageVersion = "v3";
const calendarStorageTtlMs = 12 * 60 * 60_000;

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
  if (typeof window.requestIdleCallback === "function") {
    const task = window.requestIdleCallback(callback, { timeout });

    return () => window.cancelIdleCallback(task);
  }

  const task = window.setTimeout(callback, 300);

  return () => window.clearTimeout(task);
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
  try {
    return await getLunarCalendarFromApi(location, mode, anchor, detail);
  } catch {
    const loadCalendar = mode === "week" ? getLunarCalendarWeek : getLunarCalendarMonth;

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

function calendarDayTooltipLines(day: LunarCalendarDay, events: LunarCalendarEvent[], timeZone: string) {
  const voidWindow = formatVoidCourseTooltip(day, timeZone);

  return [
    day.moonPhase,
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
  const ingressClause = nextSign ? ` until it enters ${nextSign}` : "";

  return `The Moon has made its last major aspect in ${day.moonSign} and drifts unaspected${ingressClause}. Use it for loose ends, rest, and low-traction work.`;
}

function voidCourseNextSignLabel(day: LunarCalendarDay) {
  const nextSign = day.voidOfCourse?.nextSign;

  if (!nextSign) return null;

  return {
    sign: nextSign,
    glyph: signGlyphs[nextSign] ?? ""
  };
}

function compactEventLabel(event: LunarCalendarEvent) {
  if (event.type === "lunation") {
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
  if (event.type === "station") return "Station";
  if (event.title.toLowerCase().includes("cazimi")) return "Cazimi";

  if (event.type === "aspect") {
    if (event.aspect === "trine" || event.aspect === "sextile") return "Soft aspect";
    if (event.aspect === "square" || event.aspect === "opposition") return "Hard aspect";
  }

  return "Transit";
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

const moonSignDescriptions: Record<string, string> = {
  Aries: "The Moon in Aries moves quickly. It wants a clean decision, a direct action, and enough room to respond honestly.",
  Taurus: "The Moon in Taurus steadies the body. It favors simple pleasures, practical care, and what can be trusted over time.",
  Gemini: "The Moon in Gemini keeps the mind moving. It brings curiosity, conversation, and the need to name what is shifting.",
  Cancer: "The Moon in Cancer turns attention toward care, memory, and the places that feel emotionally safe enough to keep.",
  Leo: "The Moon in Leo warms the room. It wants expression, generosity, and a reason to let the heart be seen.",
  Virgo: "The Moon in Virgo brings attention to what needs care, order, and quiet usefulness. This is a day for noticing what is asking to be tended.",
  Libra: "The Moon in Libra looks for balance. It notices contrast, response, fairness, and the atmosphere between people.",
  Scorpio: "The Moon in Scorpio deepens the signal. It favors honesty, privacy, and the emotional truth underneath the obvious story.",
  Sagittarius: "The Moon in Sagittarius reaches for meaning. It wants distance, candor, movement, and a wider horizon.",
  Capricorn: "The Moon in Capricorn gathers itself. It favors responsibility, restraint, and the next useful step.",
  Aquarius: "The Moon in Aquarius steps back to read the pattern. It favors perspective, friendship, and a little clean distance.",
  Pisces: "The Moon in Pisces softens the edges. It favors rest, imagination, compassion, and what is felt before it is explained."
};

const moonSignPractices: Record<string, string> = {
  Aries: "Choose the one direct action that clears the room for the rest of the day.",
  Taurus: "Return to the body first. Keep one useful rhythm steady before adding more.",
  Gemini: "Name what is shifting out loud or on paper, then answer the next clear question.",
  Cancer: "Protect the tender thing without hiding from the practical next step it needs.",
  Leo: "Let the heart lead one honest expression, then make it generous enough to share.",
  Virgo: "Tend one small detail with care, especially the one that makes everything else easier.",
  Libra: "Restore balance through one clean choice, conversation, or adjustment.",
  Scorpio: "Tell the truth privately before deciding what needs to be revealed publicly.",
  Sagittarius: "Give the day a wider horizon. Move, learn, or say the honest thing plainly.",
  Capricorn: "Pick the next useful step and do it with enough restraint to make it last.",
  Aquarius: "Step back far enough to see the pattern, then choose the response that gives you room.",
  Pisces: "Soften the pace where you can. Let rest, imagination, or compassion decide the next move."
};

const seasonDescriptions: Record<string, string> = {
  Aries: "Aries season points attention toward courage, immediacy, and the first honest move.",
  Taurus: "Taurus season asks what is worth keeping, tending, and making real through steady care.",
  Gemini: "Gemini season keeps attention on language, choice, curiosity, and the stories that need air.",
  Cancer: "Cancer season turns attention toward care, memory, protection, and what deserves a safer home.",
  Leo: "Leo season brings attention to warmth, visibility, generosity, and the courage to be seen.",
  Virgo: "Virgo season asks for discernment, repair, and the small practice that makes life work better.",
  Libra: "Libra season brings attention to balance, agreement, beauty, and the space between people.",
  Scorpio: "Scorpio season asks for honesty, depth, privacy, and the truth underneath the obvious exchange.",
  Sagittarius: "Sagittarius season points attention toward meaning, movement, candor, and the larger horizon.",
  Capricorn: "Capricorn season asks what can be built, honored, completed, or carried with more integrity.",
  Aquarius: "Aquarius season brings attention to friendship, distance, pattern, and the future taking shape.",
  Pisces: "Pisces season softens attention around rest, imagination, grief, compassion, and release."
};

const planetThreads: Record<string, string> = {
  Sun: "attention and vitality",
  Mercury: "language and decisions",
  Venus: "desire and what feels worth choosing",
  Mars: "momentum and direct action",
  Jupiter: "growth and belief",
  Saturn: "structure and commitment",
  Uranus: "change and freedom",
  Neptune: "imagination and surrender",
  Pluto: "depth and lasting transformation"
};

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

function localMonthDay(day: LunarCalendarDay, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "numeric",
    day: "numeric"
  }).formatToParts(new Date(day.date));

  return {
    month: Number(parts.find((part) => part.type === "month")?.value ?? 1),
    day: Number(parts.find((part) => part.type === "day")?.value ?? 1)
  };
}

function seasonSignForDay(day: LunarCalendarDay, timeZone: string) {
  const { month, day: dayNumber } = localMonthDay(day, timeZone);
  const monthDayValue = month * 100 + dayNumber;
  const currentSeason = seasonStartDates
    .filter((season) => monthDayValue >= season.month * 100 + season.day)
    .at(-1);

  return currentSeason?.sign ?? "Capricorn";
}

function isSeasonStart(day: LunarCalendarDay) {
  return day.events.some((event) => event.type === "ingress" && event.planet === "Sun");
}

function seasonEyebrowForDay(day: LunarCalendarDay, timeZone: string) {
  const seasonSign = seasonSignForDay(day, timeZone);

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

function wovenTransitSentence(event: LunarCalendarEvent, seasonSign: string) {
  if (event.type === "ingress" && event.planet && event.toSign) {
    const planetThread = planetThreads[event.planet] ?? "the day's attention";
    const signThread = seasonDescriptions[event.toSign] ?? `${event.toSign} asks for a clearer tone.`;

    return `${event.planet} entering ${event.toSign} gives ${planetThread} a new setting, so the ${seasonSign} season theme can move through ${signThread.charAt(0).toLowerCase()}${signThread.slice(1)}`;
  }

  if (event.type === "aspect" && event.planets && event.aspect) {
    const [firstPlanet, secondPlanet] = event.planets;
    const firstThread = planetThreads[firstPlanet] ?? firstPlanet.toLowerCase();
    const secondThread = planetThreads[secondPlanet] ?? secondPlanet.toLowerCase();

    return `${event.title} colors the ${seasonSign} season read by linking ${firstThread} with ${secondThread}, making the day's choice feel more connected than isolated.`;
  }

  return "";
}

function dayCardBody(day: LunarCalendarDay, surfacedTransit: LunarCalendarEvent | undefined, timeZone: string) {
  const seasonSign = seasonSignForDay(day, timeZone);
  const moonRead = moonSignDescriptions[day.moonSign] ?? `${day.moonSign} shapes the Moon's tone for the day.`;
  const seasonRead = seasonDescriptions[seasonSign] ?? `${seasonSign} season gives the day its larger setting.`;
  const transitRead = surfacedTransit ? wovenTransitSentence(surfacedTransit, seasonSign) : "";

  return [moonRead, transitRead ? `${seasonRead} ${transitRead}` : seasonRead];
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

export function LunarCalendar({ location, onLocationChange }: LunarCalendarProps) {
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
  const selectedEvents = selectedDay ? dayEventPreview(selectedDay.events) : [];
  const selectedSurfacedTransit = selectedEvents.find(isDayCardSurfaceEvent);
  const selectedDayTransits = selectedEvents.filter(isDayCardSurfaceEvent);
  const selectedPrimaryLunation = selectedEvents.find((event) => (
    event.type === "lunation"
    && (event.title.startsWith("New Moon") || event.title.startsWith("Full Moon"))
  ));
  const selectedDayBody = selectedDay ? dayCardBody(selectedDay, selectedSurfacedTransit, zone) : [];
  const selectedVoidWindow = selectedDay ? formatVoidCourseDetailWindow(selectedDay, zone) : "";
  const selectedVoidDuration = selectedDay?.voidOfCourse?.durationLabel || "";
  const selectedVoidNextSign = selectedDay ? voidCourseNextSignLabel(selectedDay) : null;
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
            <span className={`lunar-moon-disc ${event.title.startsWith("Full") ? "is-full" : "is-waxing"}`} aria-hidden="true" />
            <strong>
              {event.title.replace(/ in .+$/, "")}
              {signGlyph && <span className="lunar-milestones__sign" aria-label={`in ${event.sign}`}>{signGlyph}</span>}
            </strong>
            <span>·</span>
            <span>{new Intl.DateTimeFormat("en-US", { timeZone: zone, month: "short", day: "numeric" }).format(new Date(event.startsAt))}</span>
            <span>·</span>
            <span>{relativeDayLabel(currentDateKey, event.dateKey)}</span>
          </button>
        );
      })}
    </div>
  );
  const selectedDayCard = selectedDay && calendar && (
    <section className="lunar-selected-card" aria-label="Selected lunar day">
      <div className="lunar-selected-card__main">
        <span className={`lunar-moon-disc lunar-selected-card__disc ${isWaxingPhase(selectedDay.moonPhase) ? "is-waxing" : "is-waning"}`} style={moonDiscStyle(selectedDay)} aria-hidden="true" />
        <div className="lunar-selected-card__copy">
          <span className="lunar-selected-card__eyebrow">
            {seasonEyebrowForDay(selectedDay, zone)}
          </span>
          <h2>{titleForDay(selectedDay)} <span>{titleGlyphForDay(selectedDay)}</span></h2>
          <p className="lunar-selected-card__meta">
            <em>{selectedDay.moonPhase}</em>
            <span className="lunar-selected-card__meta-element">{signElements[selectedDay.moonSign] ?? "Element"}</span>
            <span className="lunar-selected-card__meta-separator" aria-hidden="true">·</span>
            <span className="lunar-selected-card__meta-date">{formatSelectedDay(selectedDay, zone)}</span>
            {selectedPrimaryLunation && (
              <>
                <span className="lunar-selected-card__meta-separator" aria-hidden="true">·</span>
                <span className="lunar-selected-card__meta-time">Exact at {formatEventTime(selectedPrimaryLunation.startsAt, zone)}</span>
              </>
            )}
          </p>
          <div className="lunar-selected-card__body">
            {selectedDayBody.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          {selectedDayTransits.length > 0 && (
            <div className="lunar-selected-card__daily-events" aria-label="Daily transits and aspects">
              {selectedDayTransits.map((event) => (
                <button
                  className={`lunar-selected-card__daily-event event-${event.type}`}
                  type="button"
                  key={event.id}
                  aria-label={event.title}
                >
                  <span className="lunar-selected-card__daily-event-glyph" aria-hidden="true">{monthCellEventLabel(event)}</span>
                  <strong>{event.title}</strong>
                  <span className="lunar-selected-card__daily-event-separator" aria-hidden="true">·</span>
                  <span className="lunar-selected-card__daily-event-time">{formatEventTime(event.startsAt, zone)}</span>
                  <span aria-hidden="true">↗</span>
                </button>
              ))}
            </div>
          )}
          {selectedDay.voidOfCourse && selectedVoidWindow && (
            <section className="lunar-selected-card__void" aria-label="Moon void of course">
              <div className="lunar-selected-card__void-heading">
                <span aria-hidden="true">☾</span>
                <strong>Moon void of course</strong>
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
                      enters
                      {selectedVoidNextSign.glyph && <span aria-hidden="true">{selectedVoidNextSign.glyph}</span>}
                      {selectedVoidNextSign.sign}
                    </span>
                  </>
                )}
              </p>
              <p>{voidCourseDescription(selectedDay)}</p>
            </section>
          )}
        </div>
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
            <strong><span>{lunarDayFor(selectedDay, calendar.events)}</span> <small className="is-fraction">/ 30</small></strong>
          </div>
        </div>

        <div className="lunar-selected-card__practice">
          <span>Practice</span>
          <p>{moonSignPractices[selectedDay.moonSign] ?? "Keep the intention close today; take one small, specific step before doubt turns into delay."}</p>
        </div>
      </div>
    </section>
  );
  const handleViewModeChange = (nextMode: LunarCalendarViewMode) => {
    if (nextMode === viewMode) return;

    const updateMode = () => setViewMode(nextMode);
    const viewTransitionDocument = document as ViewTransitionDocument;

    if (typeof viewTransitionDocument.startViewTransition === "function") {
      viewTransitionDocument.startViewTransition(updateMode);
      return;
    }

    updateMode();
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
              const marker = day.events.find((event) => event.type === "lunation");
              const tooltipClass = [
                index >= 5 ? "is-tooltip-left" : index <= 1 ? "is-tooltip-right" : "",
                "is-tooltip-below"
              ].filter(Boolean).join(" ");
              const tooltipEvents = calendarDayTooltipEvents(day.events);
              const tooltipLines = calendarDayTooltipLines(day, tooltipEvents, zone);
              const dayLabel = tooltipLines.join(". ");
              const voidTooltipLabel = formatVoidCourseTooltip(day, zone);

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
                  <span className={`lunar-moon-disc ${isWaxingPhase(day.moonPhase) ? "is-waxing" : "is-waning"}`} style={moonDiscStyle(day)} aria-hidden="true" />
                  <span className="lunar-week-day__sign">{day.moonSignGlyph}</span>
                  <span className="lunar-week-day__illumination">{day.illumination}%</span>
                  {marker && <span className="lunar-week-day__marker">{compactEventLabel(marker)}</span>}
                  {!isSelected && (
                    <span className="lunar-calendar-day-tooltip" role="tooltip">
                      <span className="lunar-calendar-day-tooltip__phase">{day.moonPhase}</span>
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
                  <TransitCard event={event} key={event.id} timeZone={zone} />
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
                const columnIndex = index % 7;
                const rowIndex = Math.floor(index / 7);
                const tooltipClass = [
                  columnIndex >= 5 ? "is-tooltip-left" : columnIndex <= 1 ? "is-tooltip-right" : "",
                  rowIndex === 0 ? "is-tooltip-below" : "is-tooltip-above"
                ].filter(Boolean).join(" ");
                const previewEvents = monthGridEvents(day.events);
                const tooltipEvents = calendarDayTooltipEvents(day.events);
                const tooltipLines = calendarDayTooltipLines(day, tooltipEvents, zone);
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
                      <span className={`lunar-moon-disc ${isWaxingPhase(day.moonPhase) ? "is-waxing" : "is-waning"}`} style={moonDiscStyle(day)} aria-hidden="true" />
                      <span className="lunar-calendar-day__moon">{day.moonSignGlyph}</span>
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
                        <span className="lunar-calendar-day-tooltip__phase">{day.moonPhase}</span>
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
                  <TransitCard event={event} key={event.id} timeZone={zone} />
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

function TransitCard({ event, timeZone }: { event: LunarCalendarEvent; timeZone: string }) {
  const glyphParts = transitCardGlyphParts(event);

  return (
    <article className={`tx-card lunar-month-transit-card event-${event.type}`}>
      <span className="tx-glyphs" aria-hidden="true">
        {glyphParts.map((part, index) => (
          <span className={part.className} key={`${part.value}-${index}`}>{part.value}</span>
        ))}
      </span>
      <h3 className="tx-title">{event.title}</h3>
      <p className="tx-body">{event.description}</p>
      <div className="tx-foot">
        <span className="tx-tag">{transitCardStatusTag(event)}</span>
        <span className="tx-date">{formatEventDate(event.startsAt, timeZone)} · {formatEventTime(event.startsAt, timeZone)}</span>
      </div>
    </article>
  );
}
