
import { connectionPoints as compatibilityAspectPoints, connectionAspects as compatibilityAspectTypes } from "../../web/src/content/connectionTransitIdentity.js";
export { compatibilityAspectPoints, compatibilityAspectTypes };
export type CompatibilityAspectSelection = { first: string; aspect: string; second: string };
const prefix = "fallback-hook/synastry-pair/";

export function compatibilityAspectKey(selection: CompatibilityAspectSelection) {
  if (!compatibilityAspectPoints.some(point => point === selection.first)
    || !compatibilityAspectPoints.some(point => point === selection.second)
    || !compatibilityAspectTypes.some(aspect => aspect === selection.aspect)) return null;
  return `${prefix}${selection.first}/${selection.second}/${selection.aspect}`;
}

export function compatibilityAspectFromSearch(query: string): CompatibilityAspectSelection {
  const words = query.toLowerCase().replace(/\bmc\b/g, "midheaven").replace(/\bic\b/g, "imum coeli")
    .replace(/\basc\b/g, "ascendant").replace(/\bdsc\b/g, "descendant").replace(/[-_/+.]+/g, " ");
  const points = [...words.matchAll(/\b(sun|moon|mercury|venus|mars|jupiter|saturn|uranus|neptune|pluto|chiron|lilith|north node|south node|ascendant|descendant|midheaven|imum coeli)\b/g)]
    .map(match => match[0].replace(/ /g, "-"));
  const aspect = /\b(conjunction|conjunct|sextile|square|trine|opposition|opposite)\b/.exec(words)?.[0] ?? "";
  return { first: points[0] ?? "", second: points[1] ?? "", aspect: aspect === "conjunct" ? "conjunction" : aspect === "opposite" ? "opposition" : aspect };
}

export function compatibilityAspectSearchText(contentKey: string) {
  if (!contentKey.startsWith(prefix)) return "";
  const [first, second, aspect] = contentKey.slice(prefix.length).split("/");
  const aspects = aspect === "hard" ? ["square", "opposition", "opposite"]
    : aspect === "soft" ? ["trine", "sextile"] : aspect === "conjunction" ? ["conjunction", "conjunct"] : [aspect];
  return aspects.flatMap(value => [`${first} ${value} ${second}`, `${second} ${value} ${first}`]).join(" ").replace(/-/g, " ");
}
