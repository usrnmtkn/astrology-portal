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

function hasLunation(events: LunarCalendarEvent[]) {
  return events.some((event) => event.type === "lunation");
}

function isPeakDay(events: LunarCalendarEvent[]) {
  return hasLunation(events) || events.length >= 2;
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
  if (hasLunation(significantEvents)) {
    return "lunation";
  }

  if (significantEvents.some((event) => event.type === "station")) {
    return "station";
  }

  if (significantEvents.some((event) => event.type === "ingress" && event.planet === "Sun")) {
    return "season-opening";
  }

  if (significantEvents.length > 0) {
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

export function weeklyEventDescriptionFitsDateContext(description: string) {
  return !/\btoday\b/i.test(description);
}
