const defaultTimeZone = "America/New_York";
import { isSkyIngressEssay, skyIngressEssayFields, type SkyArticleFormat } from "../../apps/web/src/content/skyIngressEssay.mjs";
import { planetSignDignity } from "../../apps/web/src/services/planetSignDignity.mjs";

type SkyArticleFactsSnapshot = {
  generatedAt: string;
  location: { timeZone?: string };
  calculationProvenance?: unknown;
  positions: Array<{
    planet: string;
    sign: string;
    transitStart?: string | null;
    transitEnd?: string | null;
    longitude?: number;
    residencyPasses?: Array<{ entryDate: string; exitDate: string }> | null;
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

export function skyArticleEditionFactsFromSnapshot(snapshot: SkyArticleFactsSnapshot, requestedPlanet: string, format?: SkyArticleFormat) {
  const planet = normalizeToken(requestedPlanet);
  const position = snapshot.positions.find((candidate) => normalizeToken(candidate.planet) === planet);
  if (!position) throw new Error(`${titleCase(planet)} is not present in the calculated Sky snapshot.`);
  if (!position.transitStart || !position.transitEnd) {
    throw new Error(`The calculation layer did not return a complete sign-residency window for ${position.planet}.`);
  }
  const timeZone = isSkyIngressEssay(format) ? defaultTimeZone : snapshot.location.timeZone || defaultTimeZone;
  const pass = isSkyIngressEssay(format) ? position.residencyPasses?.find(pass => Date.parse(pass.entryDate) <= Date.parse(snapshot.generatedAt)
    && Date.parse(snapshot.generatedAt) < Date.parse(pass.exitDate)) : undefined;
  const start = pass?.entryDate ?? position.transitStart;
  const end = pass?.exitDate ?? position.transitEnd;
  const validFrom = dateKey(start, timeZone);
  const validTo = dateKey(end, timeZone);

  return {
    schema: "tldrastro-sky-article-engine-facts-v1",
    calculationSource: "local Swiss Ephemeris sign-residency calculation",
    generatedAt: snapshot.generatedAt,
    ...(isSkyIngressEssay(format) ? { articleFormat: format, templateFields: skyIngressEssayFields, calculationProvenance: snapshot.calculationProvenance,
      retrievedAt: new Date().toISOString(), request: { planet, referenceInstant: snapshot.generatedAt, timeZone } } : {}),
    referenceTimeZone: timeZone,
    planet,
    sign: normalizeToken(position.sign),
    entryYear: Number(validFrom.slice(0, 4)),
    validFrom,
    validTo,
    transitStartInstant: start,
    transitEndInstant: end,
    slotValues: {
      sign: titleCase(normalizeToken(position.sign)),
      entryDate: dateLabel(start, timeZone),
      exitDate: dateLabel(end, timeZone),
      stayLength: stayLengthLabel(start, end),
      entryYear: validFrom.slice(0, 4),
      ...(isSkyIngressEssay(format) ? {
        articleTitle: planet === "sun" ? `${titleCase(normalizeToken(position.sign))} Season ${validFrom.slice(0, 4)}`
          : `${titleCase(planet)} in ${titleCase(normalizeToken(position.sign))} ${validFrom.slice(0, 4)}`,
        when: `${dateLabel(start, timeZone)} at ${ingressTimeLabel(start)} to ${dateLabel(end, timeZone)} at ${ingressTimeLabel(end)}`
      } : {})
    }
  };
}

export function ingressTimeLabel(instant: string) {
  return `${new Intl.DateTimeFormat("en-US", { timeZone: defaultTimeZone, hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(instant))} ET`;
}

/** Use the same packaged Swiss engine as the reader and astrology facts API. */
export async function calculateSkyArticleEditionFacts(referenceInstant: Date, requestedPlanet: string, format?: SkyArticleFormat) {
  const { defaultLocation, getAstrodienstSky, getSkyIngressArticleEvents, getRetrogradeHistory } = await import("../../apps/web/src/services/ephemeris.js");
  const snapshot = await getAstrodienstSky(defaultLocation, referenceInstant, {
    includeDailyEvents: false,
    includeTransitWindows: true
  });
  const placementFacts = skyArticleEditionFactsFromSnapshot(snapshot, requestedPlanet, format);
  const retrogradeHistory = await getRetrogradeHistory({ planet: placementFacts.planet, sign: placementFacts.sign, referenceDate: referenceInstant });
  const facts = { ...placementFacts, retrogradeHistory };
  if (!isSkyIngressEssay(format)) return facts;
  const { skyIngressNasaReceipt, skyIngressNasaExplanation } = await import("./sky-ingress-nasa.js");
  const events = await getSkyIngressArticleEvents(facts.planet, new Date(facts.transitStartInstant), new Date(facts.transitEndInstant), defaultTimeZone);
  const position = snapshot.positions.find(position => normalizeToken(position.planet) === facts.planet);
  const [nasa, nasaExplanatoryText] = await Promise.all([
    skyIngressNasaReceipt(facts.planet, snapshot.generatedAt, position?.longitude), skyIngressNasaExplanation(facts.planet)
  ]);
  return { ...facts, ...events, nasa, nasaExplanatoryText,
    dignity: planetSignDignity(facts.planet, facts.sign),
    events: events.events.map(event => ({ ...event, timeLabel: ingressTimeLabel(event.startsAt), dateLabel: dateLabel(event.startsAt, defaultTimeZone),
      participants: event.participants.map(participant => ({ ...participant, dignity: planetSignDignity(participant.planet, participant.sign) })) })) };
}
