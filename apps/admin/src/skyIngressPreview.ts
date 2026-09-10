import { getSkyPlacementTransitFactsOffMainThread } from "../../web/src/services/skyCalculationClient";
import type { SkyPlacementTransitFacts } from "../../web/src/services/ephemeris";

/** No fixture dates or prose: the editor uses the same calculated residency as the app. */
export function skyIngressPreviewInput(facts: SkyPlacementTransitFacts, requested: Date) {
  const passes = facts.residencyPasses;
  const pass = passes.find(item => Date.parse(item.entryDate) <= requested.getTime() && requested.getTime() < Date.parse(item.exitDate))
    ?? passes.find(item => Date.parse(item.entryDate) > requested.getTime());
  if (!pass) throw new Error("No calculated pass is available for this reference date.");
  const asOf = requested.getTime() >= Date.parse(pass.entryDate) ? requested : new Date(Date.parse(pass.entryDate) + 60_000);
  const station = facts.residencyStations.filter(item => Date.parse(item.occursAt) <= asOf.getTime()).sort((a, b) => Date.parse(b.occursAt) - Date.parse(a.occursAt))[0];
  const format = (date: string) => new Intl.DateTimeFormat("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: facts.timeZone }).format(new Date(date));
  return {
    route: "placement", planet: facts.planet.toLowerCase(), sign: facts.sign.toLowerCase(),
    isRetrograde: station ? station.direction === "retrograde" : pass.entryMotion === "retrograde",
    facts: { entryDate: format(passes[0].entryDate), exitDate: format(passes[passes.length - 1].exitDate) },
    ingressOccurrence: { passes, asOfDate: asOf.toISOString(), timeZone: facts.timeZone },
    aspectFacts: { planet: facts.planet, sign: facts.sign, timeZone: facts.timeZone, inSign: facts.rankedEventsDuringTransit }
  };
}

export async function calculateSkyIngressPreview(planet: string, sign: string, date: string, timeZone: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(date)) throw new Error("Choose a reference date.");
  const requested = new Date(`${date}T12:00:00Z`);
  const facts = await getSkyPlacementTransitFactsOffMainThread(planet, sign, requested, timeZone);
  return { input: skyIngressPreviewInput(facts, requested) };
}
