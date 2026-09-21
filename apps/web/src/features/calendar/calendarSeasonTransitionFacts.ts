import { calendarDayDistance } from "../../services/calendarDayDistance.js";
import { nextZodiacSignName } from "./moonSignTransitions.js";

export function calendarSeasonTransitionCountdown(daysUntilSeasonEnd: number | null | undefined) {
  if (daysUntilSeasonEnd === 0) return "today";
  if (daysUntilSeasonEnd === 1) return "in 1 day";
  if (daysUntilSeasonEnd != null && daysUntilSeasonEnd > 1) return `in ${daysUntilSeasonEnd} days`;
  return "";
}

export function calendarSeasonTransitionIsCurrent(facts: {
  daysUntilSeasonEnd?: number | null;
  isLastFullWeekendOfSeason?: boolean;
}) {
  if (facts.daysUntilSeasonEnd === 1) return true;
  if (facts.daysUntilSeasonEnd != null && facts.daysUntilSeasonEnd >= 2 && facts.daysUntilSeasonEnd <= 3) {
    return true;
  }
  return Boolean(facts.isLastFullWeekendOfSeason);
}

export function calendarSeasonTransitionFactsFromSun(input: {
  sunSign?: string;
  transitEnd?: string | null;
  asOf?: string;
  timeZone?: string;
}) {
  const timeZone = input.timeZone || "UTC";
  const fromSign = input.sunSign?.trim() || "";
  const toSign = nextZodiacSignName(fromSign);
  const asOf = input.asOf ? new Date(input.asOf) : null;
  const end = input.transitEnd ? new Date(input.transitEnd) : null;
  if (!fromSign || !toSign || !asOf || !end || !Number.isFinite(asOf.getTime()) || !Number.isFinite(end.getTime())) {
    return null;
  }
  const daysUntilSeasonEnd = calendarDayDistance(asOf, end, timeZone);
  if (!Number.isFinite(daysUntilSeasonEnd) || daysUntilSeasonEnd < 0) return null;
  const dayOfWeek = new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone }).format(asOf);
  const isLastFullWeekendOfSeason = Boolean(
    (dayOfWeek === "Saturday" && daysUntilSeasonEnd >= 2 && daysUntilSeasonEnd <= 8)
    || (dayOfWeek === "Sunday" && daysUntilSeasonEnd >= 1 && daysUntilSeasonEnd <= 7)
  );
  return {
    seasonName: fromSign,
    nextSunSign: `${toSign[0].toUpperCase()}${toSign.slice(1)}`,
    seasonEndDate: new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", timeZone }).format(end),
    daysUntilSeasonEnd,
    isLastFullWeekendOfSeason
  };
}
