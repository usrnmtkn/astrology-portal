import { isEligibleTransitReturn } from "./fallbackArchitectureV3/resolver/transitReturns.mjs";
// @ts-expect-error Shared ESM; the resolver folder is excluded from app tsc.
import { transitAspectSituationKey } from "./fallbackArchitectureV3/resolver/transitAspectSourcePriority.mjs";

const transitBodies = new Set(["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto", "chiron", "north-node", "south-node", "lilith"]);
const natalPoints = new Set([...transitBodies, "ascendant", "descendant", "midheaven", "imum-coeli"]);
const aspects = new Set(["conjunction", "opposition", "square", "trine", "sextile"]);

function isTransitAspectContactKey(parts: string[]) {
  if (parts.length !== 5 || parts[0] !== "authored" || parts[1] !== "transit-aspect") return false;
  const [, , transiting, natal, aspect] = parts;
  return transitBodies.has(transiting)
    && natalPoints.has(natal)
    && aspects.has(aspect)
    && (natal !== "lilith" || aspect === "conjunction" || aspect === "opposition")
    && !isEligibleTransitReturn(transiting, natal, aspect);
}

/** New exact personal-transit articles use the same keys as the bundled reader. */
export function isDynamicTransitNatalExactKey(contentKey: string) {
  const parts = contentKey.split("/");
  if (parts[0] !== "authored") return false;
  if (parts[1] === "transit-return") {
    return parts.length === 3 && transitBodies.has(parts[2])
      && isEligibleTransitReturn(parts[2], parts[2], "conjunction");
  }
  if (parts[1] !== "transit-aspect") return false;
  if (parts.length === 5) return isTransitAspectContactKey(parts);
  if (parts.length !== 8) return false;
  return isTransitAspectContactKey(parts.slice(0, 5))
    && transitAspectSituationKey(parts[2], parts[3], parts[4], parts[5], parts[6], parts[7]) === contentKey;
}

export { transitAspectSituationKey };
