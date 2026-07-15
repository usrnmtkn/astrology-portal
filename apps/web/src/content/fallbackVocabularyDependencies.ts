import dependencyData from "./fallback-vocabulary-dependencies.json";

export type FallbackDependencyFamilyId =
  | "sky-aspect-fallback"
  | "transit-to-natal-fallback"
  | "ingress-fallback"
  | "retrograde-phase-fallback"
  | "retrograde-per-planet-fallback"
  | "eclipse-fallback"
  | "multi-retrograde-fallback"
  | "synastry-short-fallback"
  | "planet-lived-behavior-vocab";

export type HouseOverlayDirection = "their-planet-in-your-house" | "your-planet-in-their-house";

export type HouseOverlayReliabilityInput = {
  direction: HouseOverlayDirection;
  yourReliableBirthTime: boolean;
  theirReliableBirthTime: boolean;
  house?: string | number | null;
};

export const fallbackVocabularyDependencyFamilies = dependencyData.families;
export const fallbackVocabularyHouseReliabilityRules = dependencyData.houseReliabilityRules;
export const fallbackVocabularyReferenceLanePolicy = dependencyData.referenceLanePolicy;

export function resolveHouseOverlayDependency(input: HouseOverlayReliabilityInput) {
  const rule = fallbackVocabularyHouseReliabilityRules.find((item) => item.direction === input.direction);
  const hasRequiredBirthTime = rule?.requires === "yourReliableBirthTime"
    ? input.yourReliableBirthTime
    : rule?.requires === "theirReliableBirthTime"
      ? input.theirReliableBirthTime
      : false;
  const house = String(input.house ?? "").trim();

  if (!rule || !house || !hasRequiredBirthTime) {
    return {
      allowed: false,
      keys: [] as string[],
      reason: rule?.reason ?? "No house overlay rule found for this direction."
    };
  }

  return {
    allowed: true,
    keys: [`ms/synastry-house-overlay/${house}`],
    reason: rule.reason
  };
}
