import { normalizeRelationshipContextKey, type RelationshipContextKey } from "./relationshipContext";

export const samePlanetSynastryRuntimeFallbackKey = "fallback-hook/friends.same-planet";
export const samePlanetSynastryEmergencyKey = "fallback-hook/emergency/synastry_same_planet";

export const samePlanetSynastryPlanets = [
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
] as const;

export const samePlanetSynastryRelationshipContexts = [
  "romantic",
  "friendship",
  "family",
  "coworkers",
  "creative",
  "exes",
  "complicated"
] as const satisfies RelationshipContextKey[];

const samePlanetSet = new Set<string>(samePlanetSynastryPlanets);

function keyPart(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "-");
}

export function samePlanetSynastryPlanetKey(point: string | null | undefined) {
  const key = keyPart(point ?? "");
  return samePlanetSet.has(key) ? key : "";
}

export function isSamePlanetSynastryContact(firstPoint: string | null | undefined, secondPoint: string | null | undefined) {
  const firstKey = samePlanetSynastryPlanetKey(firstPoint);

  return Boolean(firstKey && firstKey === samePlanetSynastryPlanetKey(secondPoint));
}

export function samePlanetSynastryAspectFamily(aspect: string | null | undefined) {
  const aspectKey = keyPart(aspect ?? "");

  if (aspectKey === "square" || aspectKey === "opposition") {
    return "challenging";
  }

  if (aspectKey === "trine" || aspectKey === "sextile") {
    return "supportive";
  }

  return aspectKey || "contact";
}

export function samePlanetSynastryContentKeys(
  planet: string,
  aspect: string,
  relationshipContext?: string | null
) {
  const planetKey = samePlanetSynastryPlanetKey(planet);

  if (!planetKey) {
    return [];
  }

  const aspectKey = keyPart(aspect);
  const aspectFamily = samePlanetSynastryAspectFamily(aspectKey);
  const contextKey = normalizeRelationshipContextKey(relationshipContext);
  const keys = [
    `${samePlanetSynastryRuntimeFallbackKey}/context/${contextKey}/${planetKey}/${aspectKey}`,
    aspectFamily !== aspectKey ? `${samePlanetSynastryRuntimeFallbackKey}/context/${contextKey}/${planetKey}/${aspectFamily}` : "",
    `${samePlanetSynastryRuntimeFallbackKey}/${planetKey}/${aspectKey}`,
    aspectFamily !== aspectKey ? `${samePlanetSynastryRuntimeFallbackKey}/${planetKey}/${aspectFamily}` : "",
    samePlanetSynastryEmergencyKey
  ].filter(Boolean);

  return Array.from(new Set(keys));
}

export function samePlanetSynastryNeutralContentKeys(
  planet: string,
  relationshipContext?: string | null
) {
  const planetKey = samePlanetSynastryPlanetKey(planet);

  if (!planetKey) {
    return [];
  }

  const contextKey = normalizeRelationshipContextKey(relationshipContext);

  return Array.from(new Set([
    `${samePlanetSynastryRuntimeFallbackKey}/context/${contextKey}/${planetKey}`,
    `${samePlanetSynastryRuntimeFallbackKey}/${planetKey}`,
    samePlanetSynastryEmergencyKey
  ]));
}
