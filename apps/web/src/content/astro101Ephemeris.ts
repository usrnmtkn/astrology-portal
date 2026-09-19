const MONTH_NAMES: Record<number, string> = {
  3: "three months",
  3.5: "three and a half months",
  4: "four months",
  4.5: "four and a half months",
  5: "five months"
};

export const ASTRO_101_EPHEMERIS_SLOT_KEYS = [
  "jupiter_rx_span",
  "jupiter_rx_duration",
  "jupiter_rx_frequency",
  "saturn_rx_span",
  "saturn_rx_duration",
  "saturn_rx_frequency"
] as const;

export type Astro101EphemerisSlotKey = (typeof ASTRO_101_EPHEMERIS_SLOT_KEYS)[number];

export type Astro101RxMeans = {
  daysPerYear: number;
  meanPeriodDays: number;
  meanGapDays: number;
};

const SLOT_PATTERN = /\{\{ephemeris:(jupiter_rx_span|jupiter_rx_duration|jupiter_rx_frequency|saturn_rx_span|saturn_rx_duration|saturn_rx_frequency)\}\}/gu;

function monthsLabel(days: number) {
  const half = Math.round((days / 30.437) * 2) / 2;
  return MONTH_NAMES[half] ?? `${half} months`;
}

function frequencyLabel(meanGapDays: number) {
  const months = meanGapDays / 30.437;
  if (months >= 11 && months <= 14) return "about once a year";
  return `about every ${Math.round(months)} months`;
}

export function astro101RxPhrasesFromMeans(jupiter: Astro101RxMeans, saturn: Astro101RxMeans) {
  return {
    jupiter_rx_span: `about ${monthsLabel(jupiter.daysPerYear)} of every year`,
    jupiter_rx_duration: `about ${monthsLabel(jupiter.meanPeriodDays)}`,
    jupiter_rx_frequency: frequencyLabel(jupiter.meanGapDays),
    saturn_rx_span: `about ${monthsLabel(saturn.daysPerYear)} of every year`,
    saturn_rx_duration: `about ${monthsLabel(saturn.meanPeriodDays)}`,
    saturn_rx_frequency: frequencyLabel(saturn.meanGapDays)
  } as const satisfies Record<Astro101EphemerisSlotKey, string>;
}

// Locked against Swiss Ephemeris True Node / planetary speed, 1950-01-01 to 2050-01-01 UTC, 1-day steps.
export const ASTRO_101_EPHEMERIS_PHRASES = astro101RxPhrasesFromMeans(
  { daysPerYear: 110.0077410677618, meanPeriodDays: 120.43956043956044, meanGapDays: 398.97802197802196 },
  { daysPerYear: 133.75725338809036, meanPeriodDays: 137.89690721649484, meanGapDays: 377.96875 }
);

export function astro101HasUnresolvedEphemerisSlot(value: unknown): boolean {
  if (typeof value === "string") return /\{\{ephemeris:[^}]+\}\}/u.test(value);
  if (Array.isArray(value)) return value.some(astro101HasUnresolvedEphemerisSlot);
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).some(([key, nested]) => {
      if (key === "reviewer_notes") return false;
      return astro101HasUnresolvedEphemerisSlot(nested);
    });
  }
  return false;
}

export function fillAstro101EphemerisSlots<T>(value: T): T {
  if (typeof value === "string") {
    return value.replace(SLOT_PATTERN, (_match, key: Astro101EphemerisSlotKey) => (
      ASTRO_101_EPHEMERIS_PHRASES[key]
    )) as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => fillAstro101EphemerisSlots(item)) as T;
  }
  if (value && typeof value === "object") {
    const next: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      next[key] = key === "reviewer_notes" ? nested : fillAstro101EphemerisSlots(nested);
    }
    return next as T;
  }
  return value;
}
