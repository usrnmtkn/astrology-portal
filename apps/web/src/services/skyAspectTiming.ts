import type { SkySnapshot } from "../types";

export type SkyAspect = SkySnapshot["aspects"][number];
export type SkyAspectTimingGroup = "this-week" | "this-season" | "undercurrent";

const FORBIDDEN_TIMING_LANGUAGE = /\b(?:orb|applying|separating|weather|forecast|climate|window|degrees?)\b|°|\bRight now\b/iu;

function validDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function safeTimeZone(timeZone?: string) {
  if (!timeZone) return undefined;
  try {
    new Intl.DateTimeFormat(undefined, { timeZone }).format(new Date(0));
    return timeZone;
  } catch {
    return undefined;
  }
}

function weekday(date: Date, timeZone?: string) {
  return new Intl.DateTimeFormat(undefined, { weekday: "long", timeZone: safeTimeZone(timeZone) }).format(date);
}

function monthDay(date: Date, timeZone?: string) {
  return new Intl.DateTimeFormat(undefined, { month: "long", day: "numeric", timeZone: safeTimeZone(timeZone) }).format(date);
}

export function localDateParts(date: Date, timeZone?: string) {
  return Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    timeZone: safeTimeZone(timeZone)
  }).formatToParts(date).map((part) => [part.type, part.value]));
}

function sameLocalDate(first: Date, second: Date, timeZone?: string) {
  const firstParts = localDateParts(first, timeZone);
  const secondParts = localDateParts(second, timeZone);
  return firstParts.year === secondParts.year
    && firstParts.month === secondParts.month
    && firstParts.day === secondParts.day;
}

export function timingGroupLabel(group?: SkyAspectTimingGroup | null) {
  if (group === "this-week") return "This week";
  if (group === "this-season") return "This season";
  if (group === "undercurrent") return "The undercurrent";
  return null;
}

export function skyAspectLifecycleLine(aspect: SkyAspect, referenceInput: string | Date) {
  const timing = aspect.timing;
  const timeZone = timing?.timeZone;
  const exact = validDate(timing?.exactPasses?.[Math.max(0, (timing?.passIndex ?? 1) - 1)]?.exactAt ?? aspect.exactAt);
  const end = validDate(timing?.engagementEnd);
  const reference = new Date(referenceInput);

  if (!timing || !exact || Number.isNaN(reference.getTime())) return null;

  let line: string;
  if (sameLocalDate(exact, reference, timeZone)) {
    line = timing.group === "this-week" ? `Exact ${weekday(exact, timeZone)}.` : `Exact ${monthDay(exact, timeZone)}.`;
  } else if (timing.phase === "building") {
    line = timing.buildsAllWeek && timing.group === "this-week"
      ? "Building all week."
      : `Building through ${timing.group === "this-week" ? weekday(exact, timeZone) : monthDay(exact, timeZone)}.`;
  } else if (timing.phase === "fading" && end) {
    line = `Fading through ${timing.group === "this-week" ? weekday(end, timeZone) : monthDay(end, timeZone)}.`;
  } else {
    line = timing.group === "this-week" ? `Exact ${weekday(exact, timeZone)}.` : `Exact ${monthDay(exact, timeZone)}.`;
  }

  return FORBIDDEN_TIMING_LANGUAGE.test(line) ? null : line;
}

export function skyAspectMultiPassLine(aspect: SkyAspect) {
  const timing = aspect.timing;
  const passes = timing?.exactPasses ?? [];
  const index = timing?.passIndex ?? 0;
  if (passes.length < 2 || !Number.isInteger(index) || index < 1 || index > passes.length) return null;
  const times = passes.map(pass => validDate(pass.exactAt)?.getTime());
  if (times.some((time, i) => time === undefined || (i > 0 && time <= times[i - 1]!))) return null;
  return `Pass ${index} of ${passes.length}.`;
}

export function skyAspectCycleLocationLine(aspect: SkyAspect) {
  const cycle = aspect.timing?.cycleLocation;
  if (!cycle || aspect.timing?.group !== "undercurrent" || cycle.ambiguous) return null;

  let line: string | null = null;
  if (aspect.type === "conjunction" && cycle.previousYear && cycle.cycleYears) {
    line = `A new ${cycle.cycleYears}-year cycle between ${aspect.from} and ${aspect.to} begins here; the last one started in ${cycle.previousYear}.`;
  } else if (cycle.previousYear) {
    line = cycle.nextYear
      ? `These two last met like this in ${cycle.previousYear} and will not again until ${cycle.nextYear}.`
      : `These two last met like this in ${cycle.previousYear}.`;
  }

  return line && !FORBIDDEN_TIMING_LANGUAGE.test(line) ? line : null;
}

export function skyAspectRelationLine(aspect: SkyAspect) {
  const relation = aspect.timing?.relation;
  if (!relation || aspect.timing?.group !== "this-week") return null;
  const line = `${relation.fastPlanet} is also triggering the ${relation.undercurrentA}-${relation.undercurrentB} undercurrent this week.`;
  return FORBIDDEN_TIMING_LANGUAGE.test(line) ? null : line;
}

export function skyAspectNarrativeTimingLines(aspect: SkyAspect, referenceInput: string | Date) {
  return [
    skyAspectLifecycleLine(aspect, referenceInput),
    skyAspectMultiPassLine(aspect),
    skyAspectCycleLocationLine(aspect),
    skyAspectRelationLine(aspect)
  ].filter((line): line is string => Boolean(line));
}

export function timingStringIsReaderSafe(value: string) {
  return !FORBIDDEN_TIMING_LANGUAGE.test(value);
}

export function skyAspectDateRange(aspect: { timing?: { timeZone?: string } | null }, start: Date, end: Date) {
  const timeZone = aspect.timing?.timeZone;
  const startParts = localDateParts(start, timeZone);
  const endParts = localDateParts(end, timeZone);
  const sameYear = startParts.year === endParts.year;
  const sameMonth = sameYear && startParts.month === endParts.month;
  const startLabel = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    ...(!sameYear ? { year: "numeric" as const } : {}),
    timeZone: safeTimeZone(timeZone)
  }).format(start);
  // Intl's day + year combination without a month can produce ICU fallback
  // output such as "2026 (day: 8)". Format complete dates or explicit parts.
  if (sameLocalDate(start, end, timeZone)) {
    return new Intl.DateTimeFormat(undefined, {
      month: "short", day: "numeric", year: "numeric", timeZone: safeTimeZone(timeZone)
    }).format(start);
  }
  const endLabel = sameMonth
    ? `${endParts.day}, ${endParts.year}`
    : new Intl.DateTimeFormat(undefined, {
      month: "short", day: "numeric", year: "numeric", timeZone: safeTimeZone(timeZone)
    }).format(end);
  return `${startLabel} - ${endLabel}`;
}
