import { isEligibleTransitReturn } from "./fallbackArchitectureV3/resolver/transitReturns.mjs";

const transitBodies = new Set(["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto", "chiron", "north-node", "south-node", "lilith"]);

/** New exact personal-transit articles use the same keys as the bundled reader. */
export function isDynamicTransitNatalExactKey(contentKey: string) {
  const parts = contentKey.split("/");
  if (parts[0] !== "authored") return false;
  if (parts[1] === "transit-return") {
    return parts.length === 3 && transitBodies.has(parts[2])
      && isEligibleTransitReturn(parts[2], parts[2], "conjunction");
  }
  if (parts[1] !== "transit-aspect" || parts.length !== 5) return false;
  const [, , transiting, natal, aspect] = parts;
  return transitBodies.has(transiting)
    && (transitBodies.has(natal) || ["ascendant", "descendant", "midheaven", "imum-coeli"].includes(natal))
    && ["conjunction", "opposition", "square", "trine", "sextile"].includes(aspect)
    && (natal !== "lilith" || ["conjunction", "opposition"].includes(aspect))
    && !isEligibleTransitReturn(transiting, natal, aspect);
}

