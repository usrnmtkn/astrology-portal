import { createRequire } from "node:module";
import type { SkySnapshot } from "../../apps/web/src/types.js";

type AspectPatternDetectionResult = import("../../packages/astro-knowledge/engine/aspect-patterns").AspectPatternDetectionResult;
type AspectType = import("../../packages/astro-knowledge/engine/aspect-patterns").AspectType;
type NormalizedAspect = import("../../packages/astro-knowledge/engine/aspect-patterns").NormalizedAspect;
type NormalizedPlanet = import("../../packages/astro-knowledge/engine/aspect-patterns").NormalizedPlanet;

const require = createRequire(import.meta.url);
const { detectPatterns } = require("../../packages/astro-knowledge/engine/aspect-patterns/index.js") as {
  detectPatterns(input: {
    planets: NormalizedPlanet[];
    aspects: NormalizedAspect[];
  }): AspectPatternDetectionResult;
};

const aspectPatternPlanetIds = new Set([
  "sun",
  "moon",
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
  "pluto"
]);

const aspectPatternTypes = new Set([
  "opposition",
  "trine",
  "square",
  "sextile",
  "quincunx"
]);

function slugPart(value: string | number | null | undefined) {
  return String(value ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function aspectPatternPointId(value: string | number | null | undefined) {
  const normalized = slugPart(value);
  return aspectPatternPlanetIds.has(normalized) ? normalized : null;
}

function aspectPatternType(value: string | number | null | undefined): AspectType | null {
  const normalized = slugPart(value);
  return aspectPatternTypes.has(normalized) ? normalized as AspectType : null;
}

function normalizedAspectPatternPlanets(snapshot: SkySnapshot): NormalizedPlanet[] {
  return snapshot.positions.flatMap((position) => {
    const id = aspectPatternPointId(position.planet);
    if (!id) return [];

    return {
      id,
      longitude: position.longitude,
      sign: slugPart(position.sign),
      house: position.house
    } as NormalizedPlanet;
  });
}

function normalizedAspectPatternAspects(snapshot: SkySnapshot): NormalizedAspect[] {
  return snapshot.aspects.flatMap((aspect) => {
    const pointA = aspectPatternPointId(aspect.from);
    const pointB = aspectPatternPointId(aspect.to);
    const type = aspectPatternType(aspect.type);

    if (!pointA || !pointB || !type) return [];

    const [first, second] = [pointA, pointB].sort();

    return {
      id: `snapshot.aspect.${first}.${type}.${second}`,
      pointA: first,
      pointB: second,
      type,
      exactAngle: aspect.exactAngle ?? aspect.separation ?? 0,
      orb: aspect.orb,
      applying: aspect.applying ?? aspect.conditions?.applying,
      outOfSign: false
    } as NormalizedAspect;
  });
}

export function aspectPatternsFromSkySnapshot(snapshot: SkySnapshot): AspectPatternDetectionResult {
  return detectPatterns({
    planets: normalizedAspectPatternPlanets(snapshot),
    aspects: normalizedAspectPatternAspects(snapshot)
  });
}
