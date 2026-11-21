import { traditionalSignRulers } from "../content/skySunSeason";
import { wholeSignHouseForSign, zodiacSigns } from "./chartMath";

import { natalInsightTopics } from "../content/natalInsightCatalog";
export { natalInsightTopics } from "../content/natalInsightCatalog";

type InsightPlacement = { planet: string; sign: string; house: number | null };
const angles = new Set(["ascendant", "descendant", "midheaven", "mc", "imum coeli", "ic"]);

export function natalInsightPlacements<T extends InsightPlacement>(
  topic: typeof natalInsightTopics[number],
  placements: readonly T[],
  ascendant: string,
  birthTimeKnown: boolean
): T[] {
  const reliableHouses = birthTimeKnown && zodiacSigns.includes(ascendant);
  const available = placements.filter((placement) => (
    zodiacSigns.includes(placement.sign)
    && (reliableHouses || !angles.has(placement.planet.toLowerCase()))
  ));
  const names = new Set<string>(topic.planets.map((planet) => planet.toLowerCase()));

  if (reliableHouses) {
    if ("chartRuler" in topic && topic.chartRuler) {
      const ruler = traditionalSignRulers[ascendant.toLowerCase()];
      if (ruler) names.add(ruler);
    }
    for (const house of topic.houses) {
      const sign = zodiacSigns.find((candidate) => wholeSignHouseForSign(candidate, ascendant) === house);
      const ruler = sign ? traditionalSignRulers[sign.toLowerCase()] : undefined;
      if (ruler) names.add(ruler);
      for (const placement of available) {
        if (placement.house === house && !angles.has(placement.planet.toLowerCase())) {
          names.add(placement.planet.toLowerCase());
        }
      }
    }
  }

  // Preserve topic emphasis (for example Moon before Sun), followed by rulers
  // and occupants; a planet participating in several roles appears only once.
  return [...names].flatMap((name) => {
    const placement = available.find((candidate) => candidate.planet.toLowerCase() === name);
    return placement ? [placement] : [];
  });
}
