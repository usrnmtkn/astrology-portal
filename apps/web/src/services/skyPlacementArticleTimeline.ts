const DAY_MS = 86_400_000;

/** Visits this long use the current motion chapter instead of the whole stay. */
export const LONG_STAY_VISIT_MS = 90 * DAY_MS;

export type PlacementArticleTimelineWindow = {
  start: Date;
  end: Date;
};

export type PlacementArticleTimelineInput = {
  articleMode?: "current" | "archive";
  generatedAt: string;
  isRetrograde: boolean;
  visitStart: Date;
  visitEnd: Date;
  retrogradeStart?: string | null;
  retrogradeEnd?: string | null;
  stations?: Array<{ occursAt: string }> | null;
};

function validRange(start: Date, end: Date): PlacementArticleTimelineWindow | null {
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start.getTime() > end.getTime()) {
    return null;
  }
  return { start, end };
}

function inclusiveRange(startValue?: string | null, endValue?: string | null): PlacementArticleTimelineWindow | null {
  if (!startValue || !endValue) return null;
  return validRange(new Date(startValue), new Date(endValue));
}

function motionChapter(
  input: PlacementArticleTimelineInput,
  visit: PlacementArticleTimelineWindow
): PlacementArticleTimelineWindow {
  const generatedTime = new Date(input.generatedAt).getTime();
  if (Number.isNaN(generatedTime)) return visit;

  const stations = (input.stations ?? [])
    .map((station) => new Date(station.occursAt))
    .filter((date) => {
      const time = date.getTime();
      return !Number.isNaN(time)
        && time >= visit.start.getTime()
        && time <= visit.end.getTime();
    })
    .sort((left, right) => left.getTime() - right.getTime());

  if (stations.length === 0) return visit;

  const last = [...stations].reverse().find((date) => date.getTime() <= generatedTime) ?? visit.start;
  const next = stations.find((date) => date.getTime() > generatedTime) ?? visit.end;
  return { start: last, end: next };
}

/**
 * Reader Key dates and Gifts/Lessons follow the article's shorter duration:
 * retrograde station-to-station, a short visit as-is, and a long direct stay's
 * current motion chapter. Archive articles keep the full historical list.
 */
export function placementArticleTimelineWindow(
  input: PlacementArticleTimelineInput
): PlacementArticleTimelineWindow | null {
  if (input.articleMode === "archive") return null;

  if (input.isRetrograde) {
    const retrograde = inclusiveRange(input.retrogradeStart, input.retrogradeEnd);
    if (retrograde) return retrograde;
  }

  const visit = validRange(input.visitStart, input.visitEnd);
  if (!visit) return null;
  if (visit.end.getTime() - visit.start.getTime() < LONG_STAY_VISIT_MS) return visit;
  return motionChapter(input, visit);
}

export function timestampInInclusiveWindow(
  value: string | Date,
  window: PlacementArticleTimelineWindow | null
): boolean {
  if (!window) return true;
  const time = value instanceof Date ? value.getTime() : Date.parse(String(value));
  if (Number.isNaN(time)) return false;
  return time >= window.start.getTime() && time <= window.end.getTime();
}

export function dateRangeContainedInWindow(
  start: string | Date,
  end: string | Date,
  window: PlacementArticleTimelineWindow | null
): boolean {
  if (!window) return true;
  const startTime = start instanceof Date ? start.getTime() : Date.parse(String(start));
  const endTime = end instanceof Date ? end.getTime() : Date.parse(String(end));
  if (Number.isNaN(startTime) || Number.isNaN(endTime)) return false;
  return startTime >= window.start.getTime() && endTime <= window.end.getTime();
}

export function filterPlacementTimelineEvents<T extends { occursAt: string }>(
  events: T[],
  window: PlacementArticleTimelineWindow | null
): T[] {
  return events.filter((event) => timestampInInclusiveWindow(event.occursAt, window));
}
