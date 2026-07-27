import { createRequire } from "node:module";
import type { SkySnapshot } from "../../apps/web/src/types.js";

type AspectPatternDetectionResult = import("../../packages/astro-knowledge/engine/aspect-patterns").AspectPatternDetectionResult;
type AuthoredAspectPatternActivationRecord = import("../../packages/astro-knowledge/engine/aspect-patterns").AuthoredAspectPatternActivationRecord;
type AuthoredAspectPatternRecord = import("../../packages/astro-knowledge/engine/aspect-patterns").AuthoredAspectPatternRecord;
type AspectType = import("../../packages/astro-knowledge/engine/aspect-patterns").AspectType;
type NormalizedAspect = import("../../packages/astro-knowledge/engine/aspect-patterns").NormalizedAspect;
type NormalizedPlanet = import("../../packages/astro-knowledge/engine/aspect-patterns").NormalizedPlanet;
type TransitToNatalActivationAspect = import("../../packages/astro-knowledge/engine/aspect-patterns").TransitToNatalActivationAspect;

const require = createRequire(import.meta.url);
const {
  buildAspectPatternActivationInterpretationContexts,
  buildAspectPatternInterpretationContexts,
  buildPatternActivations,
  detectPatterns,
  rankAspectPatterns,
  resolveAspectPatternActivationCopies,
  resolveAspectPatternCopies
} = require("../../packages/astro-knowledge/engine/aspect-patterns/index.js") as {
  buildAspectPatternActivationInterpretationContexts(
    detectionResult: AspectPatternDetectionResult,
    options: Record<string, unknown>
  ): NonNullable<NonNullable<AspectPatternDetectionResult["activation"]>["interpretationContexts"]>;
  buildAspectPatternInterpretationContexts(
    detectionResult: AspectPatternDetectionResult,
    context: Record<string, unknown>
  ): NonNullable<AspectPatternDetectionResult["interpretationContexts"]>;
  detectPatterns(input: {
    planets: NormalizedPlanet[];
    aspects: NormalizedAspect[];
  }): AspectPatternDetectionResult;
  rankAspectPatterns(
    detectionResult: AspectPatternDetectionResult,
    context: Record<string, unknown>
  ): NonNullable<AspectPatternDetectionResult["ranking"]>;
  buildPatternActivations(
    detectionResult: AspectPatternDetectionResult,
    transitAspects: TransitToNatalActivationAspect[],
    options: { calculatedFor?: string }
  ): NonNullable<AspectPatternDetectionResult["activation"]>;
  resolveAspectPatternCopies(
    contexts: NonNullable<AspectPatternDetectionResult["interpretationContexts"]>,
    options?: { authoredRecords?: AuthoredAspectPatternRecord[] }
  ): Array<Record<string, unknown>>;
  resolveAspectPatternActivationCopies(
    contexts: NonNullable<NonNullable<AspectPatternDetectionResult["activation"]>["interpretationContexts"]>,
    options?: { authoredRecords?: AuthoredAspectPatternActivationRecord[] }
  ): Array<Record<string, unknown>>;
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

function normalizedAspectPatternPlanets(snapshot: SkySnapshot, includeHouses: boolean): NormalizedPlanet[] {
  return snapshot.positions.flatMap((position) => {
    const id = aspectPatternPointId(position.planet);
    if (!id) return [];

    return {
      id,
      longitude: position.longitude,
      sign: slugPart(position.sign),
      ...(includeHouses ? { house: position.house } : {})
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

function transitActivationAspectsFromSnapshot(snapshot: SkySnapshot): TransitToNatalActivationAspect[] {
  const candidate = snapshot as SkySnapshot & {
    transitToNatalAspects?: TransitToNatalActivationAspect[];
    transitsToNatal?: TransitToNatalActivationAspect[];
    personalTransits?: TransitToNatalActivationAspect[];
  };

  if (Array.isArray(candidate.transitToNatalAspects)) return candidate.transitToNatalAspects;
  if (Array.isArray(candidate.transitsToNatal)) return candidate.transitsToNatal;
  if (Array.isArray(candidate.personalTransits)) return candidate.personalTransits;
  return [];
}

export function aspectPatternsFromSkySnapshot(
  snapshot: SkySnapshot,
  options: {
    includeCopy?: boolean;
    includeActivation?: boolean;
    includeActivationContexts?: boolean;
    includeActivationCopy?: boolean;
    calculatedFor?: string;
    transitAspects?: TransitToNatalActivationAspect[];
    authoredRecords?: AuthoredAspectPatternRecord[];
    activationAuthoredRecords?: AuthoredAspectPatternActivationRecord[];
    timeKnown?: boolean;
  } = {}
): AspectPatternDetectionResult {
  const timeKnown = options.timeKnown !== false;
  const planets = normalizedAspectPatternPlanets(snapshot, timeKnown);
  const detection = detectPatterns({
    planets,
    aspects: normalizedAspectPatternAspects(snapshot)
  });
  const rankingContext = timeKnown
    ? {
        planets,
        ascendantSign: snapshot.ascendant,
        ascendantLongitude: snapshot.ascendantLongitude,
        midheavenLongitude: snapshot.midheavenLongitude
      }
    : { planets };
  const ranking = rankAspectPatterns(detection, rankingContext);
  const rankedDetection = {
    ...detection,
    ranking
  };

  const interpretationContexts = buildAspectPatternInterpretationContexts(rankedDetection, rankingContext);
  const result = {
    ...rankedDetection,
    interpretationContexts
  };
  const resultWithActivation = options.includeActivation
    ? (() => {
        const activation = buildPatternActivations(
          result,
          options.transitAspects ?? transitActivationAspectsFromSnapshot(snapshot),
          { calculatedFor: options.calculatedFor ?? snapshot.generatedAt }
        );
        const activationWithContexts = options.includeActivationContexts
          ? {
              ...activation,
              interpretationContexts: buildAspectPatternActivationInterpretationContexts(
                { ...result, activation },
                { activation, natalContexts: interpretationContexts }
              )
            }
          : activation;
        const activationWithCopy = options.includeActivationCopy && activationWithContexts.interpretationContexts
          ? {
              ...activationWithContexts,
              resolvedCopy: resolveAspectPatternActivationCopies(activationWithContexts.interpretationContexts, options.activationAuthoredRecords
                ? { authoredRecords: options.activationAuthoredRecords }
                : undefined)
            }
          : activationWithContexts;
        return {
          ...result,
          activation: activationWithCopy
        };
      })()
    : result;

  return options.includeCopy
    ? {
        ...resultWithActivation,
        resolvedCopy: resolveAspectPatternCopies(interpretationContexts, options.authoredRecords
          ? { authoredRecords: options.authoredRecords }
          : undefined)
      } as AspectPatternDetectionResult & { resolvedCopy: Array<Record<string, unknown>> }
    : resultWithActivation;
}
