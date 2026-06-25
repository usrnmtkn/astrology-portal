import { CalendarDays, ChevronLeft, ChevronRight, Loader2, MapPin, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { SegmentedControl } from "../../components/SegmentedControl";
import {
  getLunarCalendarMonth,
  type LunarCalendarDay,
  type LunarCalendarEvent,
  type LunarCalendarMonth as LunarCalendarMonthData
} from "../../services/ephemeris";
import { hasMapboxToken, searchCities, type CitySuggestion } from "../../services/mapbox";
import { withTimeZone } from "../../services/timezones";
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

function monthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
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

function eventPriority(event: LunarCalendarEvent) {
  if (event.type === "lunation") return 0;
  if (event.type === "ingress" && event.primary) return 1;
  if (event.type === "aspect" && event.primary) return 2;
  if (event.type === "ingress") return 3;
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

function isMonthGridEvent(event: LunarCalendarEvent) {
  return event.type === "lunation";
}

function isTransitCardEvent(event: LunarCalendarEvent) {
  return event.primary && event.type !== "lunation";
}

function compactEventLabel(event: LunarCalendarEvent) {
  if (event.type === "lunation") {
    if (event.title.startsWith("New Moon")) return "New Moon";
    if (event.title.startsWith("Full Moon")) return "Full Moon";
    if (event.title.startsWith("First Quarter")) return "First Qtr";
    if (event.title.startsWith("Last Quarter")) return "Last Qtr";
  }

  if (event.type === "ingress") {
    return `${event.glyph} ${event.toSign ?? event.sign ?? ""}`;
  }

  if (event.planets && event.aspect) {
    return `${event.glyph} ${event.aspect}`;
  }

  return event.title;
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

  return {
    "--moon-visible": `${visible}%`
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

export function LunarCalendar({ location, onLocationChange }: LunarCalendarProps) {
  const [visibleMonth, setVisibleMonth] = useState(() => monthStart(new Date()));
  const [viewMode, setViewMode] = useState<LunarCalendarViewMode>("week");
  const [calendar, setCalendar] = useState<LunarCalendarMonthData | null>(null);
  const [status, setStatus] = useState<LunarCalendarStatus>("loading");
  const [selectedDateKey, setSelectedDateKey] = useState("");
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const [locationQuery, setLocationQuery] = useState(location.label);
  const [locationSuggestions, setLocationSuggestions] = useState<CitySuggestion[]>([]);
  const [locationSearchStatus, setLocationSearchStatus] = useState<LocationSearchStatus>("idle");

  useEffect(() => {
    let cancelled = false;

    setStatus("loading");
    getLunarCalendarMonth(location, visibleMonth)
      .then((nextCalendar) => {
        if (cancelled) return;

        const currentKey = todayKey(nextCalendar.timeZone);
        const defaultDay = nextCalendar.days.find((day) => day.dateKey === currentKey && day.inMonth)
          ?? nextCalendar.days.find((day) => day.inMonth)
          ?? nextCalendar.days[0];

        setCalendar(nextCalendar);
        setSelectedDateKey((existingKey) => (
          nextCalendar.days.some((day) => day.dateKey === existingKey)
            ? existingKey
            : defaultDay?.dateKey ?? ""
        ));
        setStatus("ready");
      })
      .catch((error) => {
        console.warn("Lunar calendar failed to load.", error);
        if (!cancelled) {
          setStatus("error");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [location, visibleMonth]);

  useEffect(() => {
    if (!locationPickerOpen) {
      setLocationQuery(location.label);
      return;
    }

    const query = locationQuery.trim();

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
  }, [location.label, locationPickerOpen, locationQuery]);

  const selectedDay = useMemo(() => (
    calendar?.days.find((day) => day.dateKey === selectedDateKey)
    ?? calendar?.days.find((day) => day.inMonth)
    ?? null
  ), [calendar, selectedDateKey]);
  const zone = calendar?.timeZone ?? location.timeZone ?? "UTC";
  const currentDateKey = todayKey(zone);
  const monthParts = formatMonthParts(visibleMonth);
  const selectedIndex = calendar?.days.findIndex((day) => day.dateKey === selectedDay?.dateKey) ?? -1;
  const selectedWeekDays = selectedIndex >= 0 && calendar
    ? calendar.days.slice(selectedIndex - (selectedIndex % 7), selectedIndex - (selectedIndex % 7) + 7)
    : [];
  const selectedDate = selectedDay ? new Date(selectedDay.date) : new Date();
  const selectedEvents = selectedDay ? dayEventPreview(selectedDay.events) : [];
  const selectedSurfacedTransit = selectedEvents.find(isTransitCardEvent);
  const selectedDayBody = selectedDay ? dayCardBody(selectedDay, selectedSurfacedTransit, zone) : [];
  const selectedDateLabel = selectedDay ? formatSelectedDay(selectedDay, zone) : "";
  const monthTransitEvents = calendar
    ? calendar.events.filter((event) => {
        const eventDay = calendar.days.find((day) => day.dateKey === event.dateKey);

        return Boolean(eventDay?.inMonth) && isTransitCardEvent(event);
      })
    : [];
  const milestones = calendar
    ? calendar.events
        .filter((event) => event.type === "lunation")
        .filter((event) => new Date(event.startsAt).getTime() >= selectedDate.getTime() - 6 * 60 * 60_000)
        .slice(0, 2)
    : [];
  const selectedDayCard = selectedDay && calendar && (
    <section className="lunar-selected-card" aria-label="Selected lunar day">
      <div className="lunar-selected-card__main">
        <span className={`lunar-moon-disc lunar-selected-card__disc ${isWaxingPhase(selectedDay.moonPhase) ? "is-waxing" : "is-waning"}`} style={moonDiscStyle(selectedDay)} aria-hidden="true" />
        <div className="lunar-selected-card__copy">
          <span className="lunar-selected-card__eyebrow">
            {seasonEyebrowForDay(selectedDay, zone)}
          </span>
          <h2>{titleForDay(selectedDay)} <span>{selectedDay.moonSignGlyph}</span></h2>
          <p className="lunar-selected-card__meta">
            <em>{selectedDay.moonPhase}</em>
            <span>{signElements[selectedDay.moonSign] ?? "Element"}</span>
            <span>·</span>
            <span>{formatSelectedDay(selectedDay, zone)}</span>
          </p>
          <div className="lunar-selected-card__body">
            {selectedDayBody.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </div>
      </div>

      <div className="lunar-selected-card__stats">
        <div>
          <span>Illumination</span>
          <strong>{selectedDay.illumination}<small>%</small></strong>
        </div>
        <div>
          <span>Lunar day</span>
          <strong>{lunarDayFor(selectedDay, calendar.events)}<small>/ 30</small></strong>
        </div>
      </div>

      <div className="lunar-selected-card__practice">
        <span>Practice</span>
        <p>{moonSignPractices[selectedDay.moonSign] ?? "Keep the intention close today; take one small, specific step before doubt turns into delay."}</p>
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
  const applyLocation = (nextLocation: LocationInput) => {
    onLocationChange(withTimeZone(nextLocation));
    setLocationQuery(nextLocation.label);
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
            <div className="lunar-calendar-controls" aria-label="Calendar month controls">
              <button type="button" aria-label="Previous month" onClick={() => setVisibleMonth((month) => addMonths(month, -1))}>
                <ChevronLeft size={18} aria-hidden="true" />
              </button>
              <button type="button" aria-label="Next month" onClick={() => setVisibleMonth((month) => addMonths(month, 1))}>
                <ChevronRight size={18} aria-hidden="true" />
              </button>
            </div>
          </div>
          <div className="lunar-calendar-location">
            <button type="button" onClick={() => setLocationPickerOpen((open) => !open)}>
              <MapPin size={15} aria-hidden="true" />
              <span>{location.label} · {zone.replace(/_/g, " ")}</span>
            </button>
            {locationPickerOpen && (
              <form
                className="lunar-location-picker"
                onSubmit={(event) => {
                  event.preventDefault();
                  const [firstSuggestion] = locationSuggestions;
                  if (firstSuggestion) {
                    applyLocation(firstSuggestion);
                  }
                }}
              >
                <label>
                  <span>Location</span>
                  <span className="lunar-location-picker__input">
                    <Search size={15} aria-hidden="true" />
                    <input
                      value={locationQuery}
                      onChange={(event) => setLocationQuery(event.target.value)}
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
                    <button type="button" key={suggestion.id} onClick={() => applyLocation(suggestion)}>
                      <strong>{suggestion.label}</strong>
                      <span>{suggestion.timeZone ?? ""}</span>
                    </button>
                  ))}
                </div>
              </form>
            )}
          </div>
        </div>
        <SegmentedControl
          ariaLabel="Calendar view"
          className="lunar-calendar-segmented"
          options={viewModeOptions}
          value={viewMode}
          onChange={handleViewModeChange}
        />
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
          {selectedDay && (
            <div className="lunar-calendar-selected-readout" aria-live="polite">
              <span>Selected:</span>
              <strong>{selectedDateLabel}</strong>
            </div>
          )}
      {viewMode === "week" && selectedDay && (
        <div className="lunar-calendar-week-view">
          <section className="lunar-week-strip" aria-label="Selected week">
            {selectedWeekDays.map((day) => {
              const isSelected = selectedDay.dateKey === day.dateKey;
              const isToday = day.dateKey === currentDateKey;
              const marker = day.events.find((event) => event.type === "lunation");

              return (
                <button
                  className={`lunar-week-day ${isSelected ? "is-selected" : ""} ${isToday ? "is-today" : ""}`}
                  key={day.dateKey}
                  type="button"
                  onClick={() => setSelectedDateKey(day.dateKey)}
                >
                  <span className="lunar-week-day__weekday">{formatWeekday(day, zone)}</span>
                  <span className="lunar-week-day__date">{formatDayNumber(day, zone)}</span>
                  <span className={`lunar-moon-disc ${isWaxingPhase(day.moonPhase) ? "is-waxing" : "is-waning"}`} style={moonDiscStyle(day)} aria-hidden="true" />
                  <span className="lunar-week-day__sign">{day.moonSignGlyph}</span>
                  {marker && <span className="lunar-week-day__marker">{compactEventLabel(marker)}</span>}
                </button>
              );
            })}
          </section>

          {milestones.length > 0 && (
            <div className="lunar-milestones" aria-label="Upcoming lunar milestones">
              {milestones.map((event) => (
                <button type="button" key={event.id} onClick={() => setSelectedDateKey(event.dateKey)}>
                  <span className={`lunar-moon-disc ${event.title.startsWith("Full") ? "is-full" : "is-waxing"}`} aria-hidden="true" />
                  <strong>{event.title.replace(/ in .+$/, "")}</strong>
                  <span>·</span>
                  <span>{new Intl.DateTimeFormat("en-US", { timeZone: zone, month: "short", day: "numeric" }).format(new Date(event.startsAt))}</span>
                  <span>·</span>
                  <span>{relativeDayLabel(currentDateKey, event.dateKey)}</span>
                </button>
              ))}
            </div>
          )}

          {selectedDayCard}
        </div>
      )}

      {viewMode === "month" && (
        <div className="lunar-calendar-layout">
          <section className="lunar-calendar-grid-panel" aria-label={`${formatMonthLabel(visibleMonth)} lunar grid`}>
            <div className="lunar-calendar-legend" aria-label="Calendar event legend">
              <span><span className="event-lunation" aria-hidden="true" /> Lunation</span>
              <span><span className="event-ingress" aria-hidden="true" /> Ingress</span>
              <span><span className="event-aspect" aria-hidden="true" /> Transit</span>
            </div>
            <div className="lunar-calendar-weekdays" aria-hidden="true">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((weekday) => (
                <span key={weekday}>{weekday}</span>
              ))}
            </div>
            <div className="lunar-calendar-grid">
              {calendar.days.map((day) => {
                const isSelected = selectedDay?.dateKey === day.dateKey;
                const isToday = day.dateKey === currentDateKey;
                const previewEvents = dayEventPreview(day.events.filter(isMonthGridEvent));
                const dayLabel = `${formatSelectedDay(day, zone)}. Moon in ${day.moonSign}. ${previewEvents.length} calendar events.`;

                return (
                  <button
                    className={`lunar-calendar-day ${day.inMonth ? "" : "is-outside"} ${isSelected ? "is-selected" : ""} ${isToday ? "is-today" : ""}`}
                    key={day.dateKey}
                    type="button"
                    onClick={() => setSelectedDateKey(day.dateKey)}
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
                      {day.illumination}% lit
                    </span>
                    <span className="lunar-calendar-day__events">
                      {previewEvents.slice(0, 2).map((event) => (
                        <span
                          className={`lunar-calendar-event-pill event-${event.type}`}
                          key={event.id}
                          title={event.title}
                          aria-label={event.title}
                        >
                          {compactEventLabel(event)}
                        </span>
                      ))}
                      {previewEvents.length > 2 && <span className="lunar-calendar-event-more">+{previewEvents.length - 2} more</span>}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {selectedDayCard}

          <section className="lunar-month-transits" aria-label="This month's transits">
            <span className="lunar-calendar-upcoming__label">This month</span>
            <div className="lunar-month-transits__list">
              {monthTransitEvents.map((event) => (
                <MonthTransitCard event={event} key={event.id} timeZone={zone} />
              ))}
            </div>
          </section>
        </div>
      )}
        </div>
      )}
    </section>
  );
}

function MonthTransitCard({ event, timeZone }: { event: LunarCalendarEvent; timeZone: string }) {
  return (
    <article className={`lunar-month-transit-card event-${event.type}`}>
      <span className="lunar-month-transit-card__glyph">{event.glyph}</span>
      <div className="lunar-month-transit-card__body">
        <div className="lunar-month-transit-card__header">
          <h3>{event.title}</h3>
          <p className="lunar-month-transit-card__date">{formatEventDate(event.startsAt, timeZone)}</p>
        </div>
        <p>{event.description}</p>
      </div>
      <button className="lunar-month-transit-card__more" type="button">
        Read more ↗
      </button>
    </article>
  );
}
