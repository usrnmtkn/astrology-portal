import { traditionalRulers, type ZodiacWheelFacts } from "../../web/src/services/zodiacWheelFacts";
import type { WheelTooltipName } from "../../web/src/content/wheelTooltipCatalog";

export function wheelPreviewRuler(facts: ZodiacWheelFacts, house: number) {
  if (!Number.isInteger(house) || house < 1 || house > 12) return undefined;
  const sign = facts.signOfHouse(house);
  return sign === null ? undefined : facts.planets.find(point => point.name === traditionalRulers[sign]);
}

/** Adapt a source family to actual chart facts, never an edited ordinal string. */
export function wheelSourceForHouse(source: WheelTooltipName, facts: ZodiacWheelFacts, house: number): WheelTooltipName {
  if (source === "ruler/rising" || source === "ruler/house") return house === 1 ? "ruler/rising" : "ruler/house";
  const own = wheelPreviewRuler(facts, house)?.house === house;
  if (source === "ruler/title" || source === "ruler/title-own") return own ? "ruler/title-own" : "ruler/title";
  if (source === "ruler/placement" || source === "ruler/placement-own") return own ? "ruler/placement-own" : "ruler/placement";
  return source;
}

export function wheelHouseForSource(source: WheelTooltipName, facts: ZodiacWheelFacts, preferred: number): number | null {
  if (!facts.hasHouses) return null;
  if (!Number.isInteger(preferred) || preferred < 1 || preferred > 12) preferred = 1;
  const houses = [preferred, ...Array.from({ length: 12 }, (_, i) => i + 1).filter(house => house !== preferred)];
  return houses.find(house => wheelSourceForHouse(source, facts, house) === source) ?? null;
}
