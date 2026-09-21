import { calendarMoonContinuationText } from "./calendarPhaseLabel";

function slugContentPart(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export type CalendarDayMoonReading = {
  contentKey: string;
  body: string;
};

export type CalendarMoonWritingRole = "lunation" | "leftover";

export type CalendarMoonWritingPiece = CalendarDayMoonReading & {
  role: CalendarMoonWritingRole;
};

type CalendarDayLunation = {
  title: string;
  sign?: string;
  eclipseType?: string;
};

export function calendarLunationMacroKey(lunation: CalendarDayLunation | null | undefined, moonSign: string) {
  if (!lunation) return "";
  const sign = slugContentPart(lunation.sign ?? moonSign);
  if (!sign) return "";
  if (lunation.eclipseType === "lunar" || /full moon/i.test(lunation.title)) {
    return `authored/sky-lunation-macro/full-moon/${sign}`;
  }
  if (lunation.eclipseType === "solar" || /new moon/i.test(lunation.title)) {
    return `authored/sky-lunation-macro/new-moon/${sign}`;
  }
  return "";
}

function usableReading(contentKey: string, body?: string | null): CalendarDayMoonReading | null {
  const text = body?.trim() ?? "";
  if (!contentKey || !text) return null;
  // Calendar leftover Moon-sign passages only. Sky Placement Moon
  // articles stay on Sky and are not a Calendar source.
  if (contentKey.includes("sky-placement-lived")) return null;
  return { contentKey, body: text };
}

function normalizedBody(body: string) {
  return body.replace(/\s+/g, " ").trim();
}

export function calendarMoonWritingWithoutRepeat(
  pieces: CalendarMoonWritingPiece[],
  previousBodies: Iterable<string> = []
) {
  const previous = new Set([...previousBodies].map((body) => normalizedBody(body)).filter(Boolean));
  return pieces.filter((piece) => !previous.has(normalizedBody(piece.body)));
}

export function calendarMoonWritingSequenceWithoutRepeat<T>(
  items: T[],
  piecesForItem: (item: T, index: number) => CalendarMoonWritingPiece[],
  fallbackForItem?: (item: T, index: number) => CalendarMoonWritingPiece | null | undefined
) {
  const used: string[] = [];
  return items.map((item, index) => {
    const pieces = calendarMoonWritingWithoutRepeat(piecesForItem(item, index), used);
    if (pieces.length) {
      used.push(...pieces.map((piece) => piece.body));
      return pieces;
    }
    const fallback = fallbackForItem?.(item, index);
    if (!fallback || used.some((body) => normalizedBody(body) === normalizedBody(fallback.body))) {
      return [];
    }
    used.push(fallback.body);
    return [fallback];
  });
}

export function calendarMoonContinuationPiece(
  day: { date: string; dateKey: string; moonSign: string },
  previousMoonSign: string | null | undefined,
  timeZone: string,
  phase: string
): CalendarMoonWritingPiece | null {
  const body = calendarMoonContinuationText({
    date: day.date,
    timeZone,
    moonSign: day.moonSign,
    phase,
    previousMoonSign
  });
  if (!body) return null;
  return {
    role: "leftover",
    contentKey: `generated/calendar-moon-continuation/${day.dateKey}`,
    body
  };
}

export function calendarDayMoonWriting({
  moonSign,
  lunation,
  lunationBody,
  leftoverFallback
}: {
  moonSign: string;
  lunation?: CalendarDayLunation | null;
  lunationBody?: string | null;
  leftoverFallback?: CalendarDayMoonReading | null;
}): CalendarMoonWritingPiece[] {
  const pieces: CalendarMoonWritingPiece[] = [];
  const seen = new Set<string>();
  const push = (role: CalendarMoonWritingRole, reading: CalendarDayMoonReading | null) => {
    if (!reading) return;
    const key = normalizedBody(reading.body);
    if (!key || seen.has(key)) return;
    seen.add(key);
    pieces.push({ ...reading, role });
  };

  const lunationReading = usableReading(calendarLunationMacroKey(lunation, moonSign), lunationBody);
  push("lunation", lunationReading);
  if (lunationReading) return pieces;
  const leftover = leftoverFallback?.contentKey && leftoverFallback.body?.trim()
    ? usableReading(leftoverFallback.contentKey, leftoverFallback.body)
    : null;
  if (leftover) {
    push("leftover", leftover);
  }

  return pieces;
}

export function calendarDayMoonReading(options: Parameters<typeof calendarDayMoonWriting>[0]) {
  return calendarDayMoonWriting(options)[0] ?? null;
}

export function calendarMoonWritingParagraphs(
  pieces: CalendarMoonWritingPiece[],
  paragraphLimit?: number
) {
  return pieces.flatMap((piece) => {
    const paragraphs = piece.body.split(/\n\n+/).map((paragraph) => paragraph.trim()).filter(Boolean);
    return paragraphLimit == null ? paragraphs : paragraphs.slice(0, paragraphLimit);
  });
}
