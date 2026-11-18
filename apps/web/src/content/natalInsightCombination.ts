import { natalInsightSigns, natalInsightTopics, type NatalInsightId } from "./natalInsightDefinitions.js";
import { traditionalSignRulers } from "./skySunSeason.js";

export const natalInsightCompletePrefix = "cms/natal-insight/complete/v1/";
type Sign = typeof natalInsightSigns[number];
export type NatalInsightCombination = {
  topic: NatalInsightId;
  audience: "you" | "friend";
  timed: boolean;
  sourceSign?: string;
  planets: Record<string, string>;
  midheaven?: string;
};
const signIndex = (sign?: string) => natalInsightSigns.indexOf(sign as Sign);
const title = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
const offsetSign = (sign: string, offset: number) => natalInsightSigns[(signIndex(sign) + offset + 24) % 12];

/** The one editable house sign fixes every other whole-sign house. */
export function natalInsightAnchorHouse(topic: NatalInsightId) {
  return ({ approach: 1, "home-belonging": 4, "creativity-pleasure": 5,
    "style-expression": 5, "money-resources": 2, "work-direction": 10 } as Partial<Record<NatalInsightId, number>>)[topic];
}

export function natalInsightCombinationFields(selection: NatalInsightCombination) {
  const anchor = natalInsightAnchorHouse(selection.topic);
  const needsHouse = !["approach", "emotional-needs", "style-expression"].includes(selection.topic);
  const unavailable = needsHouse && !selection.timed;
  const houses = selection.timed && anchor ? selection.topic === "work-direction" ? [10, 6, 2]
    : selection.topic === "style-expression" ? [] : [anchor] : [];
  const chains = signIndex(selection.sourceSign) < 0 ? [] : houses.map(house => {
    const sign = offsetSign(selection.sourceSign!, house - anchor!);
    const planet = traditionalSignRulers[sign.toLowerCase()];
    const rulerSign = selection.planets[planet];
    const ascendant = offsetSign(selection.sourceSign!, 1 - anchor!);
    return { house, sign, planet, rulerSign, destinationHouse: signIndex(rulerSign) < 0 ? null
      : (signIndex(rulerSign) - signIndex(ascendant) + 12) % 12 + 1 };
  });
  const extraPlanets = selection.topic === "approach" ? selection.timed ? ["sun"] : ["sun", "moon"]
    : selection.topic === "emotional-needs" ? ["moon", "sun"]
    : selection.topic === "style-expression" ? ["venus", "moon"]
    : selection.topic === "creativity-pleasure" ? ["venus"] : [];
  return { anchor, unavailable, chains, planets: [...new Set([...chains.map(chain => chain.planet), ...extraPlanets])] };
}

/** Discrete topic facts only. No birth data, degrees, account IDs or prose. */
export function natalInsightCombinationKey(selection: NatalInsightCombination): string | null {
  if (!natalInsightTopics.some(topic => topic.id === selection.topic)
    || !["you", "friend"].includes(selection.audience)) return null;
  const { anchor, unavailable, chains, planets } = natalInsightCombinationFields(selection);
  if (unavailable || (selection.timed && anchor && signIndex(selection.sourceSign) < 0)
    || planets.some(planet => signIndex(selection.planets[planet]) < 0)
    || (selection.midheaven !== undefined && signIndex(selection.midheaven) < 0)) return null;
  const parts: string[] = [];
  if (!selection.timed && selection.topic !== "emotional-needs") parts.push("untimed");
  const used = new Set<string>();
  for (const chain of chains) {
    parts.push(chain.house === 1 ? `rising-${chain.sign.toLowerCase()}` : `house-${chain.house}-${chain.sign.toLowerCase()}`,
      `${chain.planet}-${chain.rulerSign.toLowerCase()}`, `house-${chain.destinationHouse}`);
    used.add(chain.planet);
  }
  if (selection.topic === "style-expression" && selection.timed) parts.push(`house-5-${selection.sourceSign!.toLowerCase()}`);
  for (const planet of planets) if (!used.has(planet)) parts.push(`${planet}-${selection.planets[planet].toLowerCase()}`);
  if (selection.topic === "work-direction") parts.push(`mc-${selection.midheaven?.toLowerCase() ?? "unavailable"}`);
  return `${natalInsightCompletePrefix}${selection.audience === "friend" ? "they" : "you"}/${selection.topic}/${parts.join("/")}`;
}

/** Decode, then require an exact canonical round trip. Forged rulers, houses,
 * extra tokens and private fingerprints cannot enter the shared-content gate. */
export function parseNatalInsightCombinationKey(key: string | null | undefined): NatalInsightCombination | null {
  if (!key?.startsWith(natalInsightCompletePrefix)) return null;
  const [audience, topic, ...parts] = key.slice(natalInsightCompletePrefix.length).split("/");
  if (!["you", "they"].includes(audience) || !natalInsightTopics.some(item => item.id === topic)) return null;
  const selection: NatalInsightCombination = { topic: topic as NatalInsightId,
    audience: audience === "they" ? "friend" : "you", timed: parts[0] !== "untimed", planets: {} };
  for (const part of parts) {
    const house = /^(?:rising|house-\d+)-([a-z]+)$/.exec(part);
    if (house && !selection.sourceSign) selection.sourceSign = title(house[1]);
    const planet = /^(sun|moon|mercury|venus|mars|jupiter|saturn)-([a-z]+)$/.exec(part);
    if (planet) {
      if (selection.planets[planet[1]]) return null;
      selection.planets[planet[1]] = title(planet[2]);
    }
    if (part.startsWith("mc-") && part !== "mc-unavailable") selection.midheaven = title(part.slice(3));
  }
  return natalInsightCombinationKey(selection) === key ? selection : null;
}

export function natalInsightCombinationLabel(selection: NatalInsightCombination) {
  const { chains, planets } = natalInsightCombinationFields(selection);
  const used = new Set(chains.map(chain => chain.planet));
  return [
    ...chains.map(chain => `${chain.house === 1 ? "Rising" : `House ${chain.house}`}: ${chain.sign} → ${title(chain.planet)} in ${chain.rulerSign || "…"}${chain.destinationHouse ? `, house ${chain.destinationHouse}` : ""}`),
    ...(selection.topic === "style-expression" && selection.timed && selection.sourceSign ? [`House 5: ${selection.sourceSign}`] : []),
    ...planets.filter(planet => !used.has(planet)).map(planet => `${title(planet)} in ${selection.planets[planet] || "…"}`),
    ...(selection.topic === "work-direction" ? [`Midheaven: ${selection.midheaven ?? "unavailable"}`] : []),
    ...(!selection.timed && selection.topic !== "emotional-needs" ? ["Without birth time"] : [])
  ].join(" · ");
}
