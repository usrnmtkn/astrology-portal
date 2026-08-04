import type { LunarCalendarDay, LunarCalendarEvent } from "../../services/ephemeris";

function exactPrincipalLunation(day: LunarCalendarDay) {
  return day.events.find((event) => (
    event.type === "lunation"
    && (event.title.startsWith("New Moon") || event.title.startsWith("Full Moon"))
  ));
}

function principalLunationLabel(event: LunarCalendarEvent) {
  return event.title.replace(/ in .+$/, "");
}

export function calendarLocalDateKey(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date(value));
}

export function calendarPhaseLabelForDay(
  day: LunarCalendarDay,
  calendarDays: LunarCalendarDay[]
) {
  const lunation = exactPrincipalLunation(day);

  if (lunation) {
    return principalLunationLabel(lunation);
  }

  const dayIndex = calendarDays.findIndex((calendarDay) => calendarDay.dateKey === day.dateKey);
  const previousDay = dayIndex > 0 ? calendarDays[dayIndex - 1] : null;
  const nextDay = dayIndex >= 0 && dayIndex < calendarDays.length - 1 ? calendarDays[dayIndex + 1] : null;
  const illuminationTrend = nextDay
    ? nextDay.illumination - day.illumination
    : previousDay
      ? day.illumination - previousDay.illumination
      : 0;
  const isWaxing = illuminationTrend >= 0;

  if (day.illumination >= 50) {
    return isWaxing ? "Waxing Gibbous" : "Waning Gibbous";
  }

  return isWaxing ? "Waxing Crescent" : "Waning Crescent";
}
