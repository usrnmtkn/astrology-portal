import {
  calculateNatalAspects,
  canonicalizeNodeAxisAspects,
  NATAL_ASPECT_POINT_ORDER
} from "@tldr/astro-knowledge/sky-aspect-engine";
import type { PlanetPosition, SkySnapshot } from "../types";

type NatalAspectSnapshot = Pick<
  SkySnapshot,
  "positions" | "aspects" | "ascendantLongitude" | "midheavenLongitude"
>;

const canonicalNatalPoints = new Set<string>(NATAL_ASPECT_POINT_ORDER);
const natalZodiacSigns = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces"
] as const;

function fixedNatalLongitude(position: PlanetPosition) {
  if (typeof position.longitude === "number" && Number.isFinite(position.longitude)) {
    return position.longitude;
  }

  const signIndex = natalZodiacSigns.indexOf(position.sign as typeof natalZodiacSigns[number]);
  if (
    signIndex < 0
    || typeof position.degree !== "number"
    || !Number.isFinite(position.degree)
    || position.degree < 0
    || position.degree >= 30
  ) {
    return null;
  }

  return signIndex * 30 + position.degree;
}

function canonicalNatalPositions(snapshot: NatalAspectSnapshot) {
  const positions = snapshot.positions.flatMap((position) => {
    const longitude = fixedNatalLongitude(position);

    if (!canonicalNatalPoints.has(position.planet) || longitude === null) {
      return [];
    }

    return [{
      planet: position.planet,
      longitude,
      speed: position.speed
    }];
  });

  const anglePositions = [
    { planet: "Ascendant", longitude: snapshot.ascendantLongitude },
    { planet: "Midheaven", longitude: snapshot.midheavenLongitude }
  ].filter((position): position is { planet: string; longitude: number } => (
    typeof position.longitude === "number"
    && Number.isFinite(position.longitude)
    && !positions.some((candidate) => candidate.planet === position.planet)
  ));

  return [...positions, ...anglePositions];
}

/**
 * Natal reader surfaces derive aspects from the chart's fixed longitudes.
 * Legacy saved charts may encode that longitude as the equivalent sign and
 * degree pair, which is still a complete fixed natal position.
 * The snapshot's incoming `aspects` array is deliberately ignored: it may be
 * stale, transit-timed, hydrated through a cross-surface alias, or otherwise
 * inconsistent with the natal positions.
 */
export function canonicalNatalAspectsForSnapshot(
  snapshot: NatalAspectSnapshot | null | undefined
): SkySnapshot["aspects"] {
  if (!snapshot) return [];

  const calculated = calculateNatalAspects(canonicalNatalPositions(snapshot));
  return canonicalizeNodeAxisAspects(calculated);
}
