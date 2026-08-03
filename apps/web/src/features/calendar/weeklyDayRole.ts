import type { LunarCalendarDay, LunarCalendarEvent } from "../../services/ephemeris";

export type WeeklyDayRole =
  | "lunation"
  | "station"
  | "season-opening"
  | "major-event"
  | "preparation"
  | "integration"
  | "moon-ingress"
  | "weekly-handoff"
  | "full-day-moon";

export type WeeklyGuidanceSource = "event" | "phase" | "moon";

type WeeklyDayRoleContext = {
  day: LunarCalendarDay;
  previousDay: LunarCalendarDay | null;
  significantEvents: LunarCalendarEvent[];
  previousSignificantEvents: LunarCalendarEvent[];
  nextSignificantEvents: LunarCalendarEvent[];
  isLastDay: boolean;
};

function isPrimaryLunation(event: LunarCalendarEvent) {
  if (event.type !== "lunation" || event.primary === false) {
    return false;
  }

  const title = event.title.toLowerCase();

  return title.startsWith("new moon")
    || title.startsWith("full moon")
    || title.includes("solar eclipse")
    || title.includes("lunar eclipse");
}

function roleEligibleEvents(events: LunarCalendarEvent[]) {
  return events.filter((event) => event.type !== "lunation" || isPrimaryLunation(event));
}

function hasLunation(events: LunarCalendarEvent[]) {
  return events.some(isPrimaryLunation);
}

function isPeakDay(events: LunarCalendarEvent[]) {
  const eligibleEvents = roleEligibleEvents(events);

  return hasLunation(eligibleEvents) || eligibleEvents.length >= 2;
}

function isMoonIngressDay(day: LunarCalendarDay, previousDay: LunarCalendarDay | null) {
  const exactMoonIngress = day.events.some((event) => (
    event.type === "ingress" && event.planet === "Moon"
  ));

  return exactMoonIngress || Boolean(previousDay && previousDay.moonSign !== day.moonSign);
}

export function resolveWeeklyDayRole({
  day,
  previousDay,
  significantEvents,
  previousSignificantEvents,
  nextSignificantEvents,
  isLastDay
}: WeeklyDayRoleContext): WeeklyDayRole {
  const eligibleEvents = roleEligibleEvents(significantEvents);

  if (hasLunation(eligibleEvents)) {
    return "lunation";
  }

  if (eligibleEvents.some((event) => event.type === "station")) {
    return "station";
  }

  if (eligibleEvents.some((event) => event.type === "ingress" && event.planet === "Sun")) {
    return "season-opening";
  }

  if (eligibleEvents.length > 0) {
    return "major-event";
  }

  if (isPeakDay(previousSignificantEvents)) {
    return "integration";
  }

  if (isPeakDay(nextSignificantEvents)) {
    return "preparation";
  }

  if (isMoonIngressDay(day, previousDay)) {
    return "moon-ingress";
  }

  if (isLastDay) {
    return "weekly-handoff";
  }

  return "full-day-moon";
}

export function preferredWeeklyGuidanceSource(role: WeeklyDayRole): WeeklyGuidanceSource {
  if (
    role === "lunation"
    || role === "preparation"
    || role === "integration"
  ) {
    return "phase";
  }

  if (
    role === "station"
    || role === "season-opening"
    || role === "major-event"
  ) {
    return "event";
  }

  return "moon";
}

export function weeklyFallbackGuidanceSource(
  role: WeeklyDayRole,
  hasVisibleMoonGuidanceInSign: boolean
): Exclude<WeeklyGuidanceSource, "event"> {
  if (role === "lunation") {
    return "phase";
  }

  if (!hasVisibleMoonGuidanceInSign) {
    return "moon";
  }

  return preferredWeeklyGuidanceSource(role) === "phase" ? "phase" : "moon";
}

export function weeklyMoonRoleOffset(role: WeeklyDayRole) {
  if (role === "full-day-moon") return 1;
  if (role === "weekly-handoff") return 2;

  return 0;
}

export function weeklyLeadLunationKind(title: string): "new-moon" | "full-moon" | null {
  const normalizedTitle = title.toLowerCase();

  if (normalizedTitle.includes("new moon") || normalizedTitle.includes("solar eclipse")) {
    return "new-moon";
  }

  if (normalizedTitle.includes("full moon") || normalizedTitle.includes("lunar eclipse")) {
    return "full-moon";
  }

  return null;
}

export function weeklyEventDescriptionFitsDateContext(description: string) {
  return !/\btoday\b/i.test(description);
}
