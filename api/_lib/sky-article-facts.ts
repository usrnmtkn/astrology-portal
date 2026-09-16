const defaultTimeZone = "America/New_York";

type SkyArticleFactsSnapshot = {
  generatedAt: string;
  location: { timeZone?: string };
  positions: Array<{
    planet: string;
    sign: string;
    transitStart?: string | null;
    transitEnd?: string | null;
  }>;
};

function normalizeToken(value: string) {
  return value.trim().toLowerCase().replace(/[_\s]+/gu, "-");
}

function titleCase(value: string) {
  return value.split("-").map((part) => part ? `${part[0].toUpperCase()}${part.slice(1)}` : part).join(" ");
}

function partsForInstant(instant: string, timeZone: string) {
  const date = new Date(instant);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid calculated Sky instant: ${instant}`);
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return { year: value("year"), month: value("month"), day: value("day") };
}

function dateKey(instant: string, timeZone: string) {
  const parts = partsForInstant(instant, timeZone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function dateLabel(instant: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone
  }).format(new Date(instant));
}

function stayLengthLabel(start: string, end: string) {
  const days = Math.max(1, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86_400_000));
  if (days >= 730) return `${Math.round((days / 365.2425) * 10) / 10} years`;
  if (days >= 60) return `${Math.round((days / 30.436875) * 10) / 10} months`;
  return `${days} days`;
}

export function skyArticleEditionFactsFromSnapshot(snapshot: SkyArticleFactsSnapshot, requestedPlanet: string) {
  const planet = normalizeToken(requestedPlanet);
  const position = snapshot.positions.find((candidate) => normalizeToken(candidate.planet) === planet);
  if (!position) throw new Error(`${titleCase(planet)} is not present in the calculated Sky snapshot.`);
  if (!position.transitStart || !position.transitEnd) {
    throw new Error(`The calculation layer did not return a complete sign-residency window for ${position.planet}.`);
  }
  const timeZone = snapshot.location.timeZone || defaultTimeZone;
  const validFrom = dateKey(position.transitStart, timeZone);
  const validTo = dateKey(position.transitEnd, timeZone);

  return {
    schema: "tldrastro-sky-article-engine-facts-v1",
    calculationSource: "local Swiss Ephemeris sign-residency calculation",
    generatedAt: snapshot.generatedAt,
    referenceTimeZone: timeZone,
    planet,
    sign: normalizeToken(position.sign),
    entryYear: Number(validFrom.slice(0, 4)),
    validFrom,
    validTo,
    transitStartInstant: position.transitStart,
    transitEndInstant: position.transitEnd,
    slotValues: {
      sign: titleCase(normalizeToken(position.sign)),
      entryDate: dateLabel(position.transitStart, timeZone),
      exitDate: dateLabel(position.transitEnd, timeZone),
      stayLength: stayLengthLabel(position.transitStart, position.transitEnd),
      entryYear: validFrom.slice(0, 4)
    }
  };
}

/**
 * Calculate the complete dated article residency with the same packaged Swiss
 * Ephemeris engine used by the reader and `/api/astrology-facts`. This keeps
 * article authoring independent of an older Cloud Run deployment omitting the
 * optional transitWindows response.
 */
export async function calculateSkyArticleEditionFacts(referenceInstant: Date, requestedPlanet: string) {
  const { defaultLocation, getAstrodienstSky } = await import("../../apps/web/src/services/ephemeris.js");
  const snapshot = await getAstrodienstSky(defaultLocation, referenceInstant, {
    includeDailyEvents: false,
    includeTransitWindows: true
  });
  return skyArticleEditionFactsFromSnapshot(snapshot, requestedPlanet);
}
