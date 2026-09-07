import type { SkySnapshot } from "../types";

const ANGLE_NAMES = new Set([
  "ascendant",
  "descendant",
  "midheaven",
  "mc",
  "imum-coeli",
  "imum coeli",
  "ic"
]);

function normalizedAngleName(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function isAngleName(value: unknown) {
  return ANGLE_NAMES.has(normalizedAngleName(value));
}

export function natalSnapshotBirthTimeIsKnown(snapshot: SkySnapshot | null | undefined) {
  return snapshot?.birthTimeKnown === true;
}

export function natalSnapshotWithBirthTimeReliability(
  snapshot: SkySnapshot | null | undefined,
  birthTimeKnown: boolean
): SkySnapshot | null {
  if (!snapshot) {
    return null;
  }

  if (birthTimeKnown) {
    return {
      ...snapshot,
      birthTimeKnown: true
    };
  }

  return {
    ...snapshot,
    birthTimeKnown: false,
    ascendant: "",
    ascendantLongitude: undefined,
    midheaven: "",
    midheavenLongitude: undefined,
    houseCusps: undefined,
    positions: snapshot.positions
      .filter((position) => !isAngleName(position.planet))
      .map((position) => ({ ...position, house: 0 })),
    aspects: snapshot.aspects.filter((aspect) => (
      !isAngleName(aspect.from)
      && !isAngleName(aspect.to)
      && !isAngleName(aspect.bodyA)
      && !isAngleName(aspect.bodyB)
    ))
  };
}
