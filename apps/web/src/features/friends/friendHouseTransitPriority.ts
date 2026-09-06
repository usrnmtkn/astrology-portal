const FRIEND_HOUSE_TRANSIT_SIGNIFICANCE_TIERS: Record<string, number> = {
  pluto: 0,
  neptune: 0,
  uranus: 0,
  chiron: 0,
  saturn: 0,
  jupiter: 1,
  "north-node": 1,
  "south-node": 1,
  mars: 2,
  lilith: 2,
  sun: 3,
  venus: 3,
  mercury: 3,
  moon: 4
};

function normalizedKeyPart(value: string) {
  return value.trim().toLowerCase().replace(/\s+/gu, "-");
}

export function friendHouseTransitSignificanceTier(planet: string) {
  return FRIEND_HOUSE_TRANSIT_SIGNIFICANCE_TIERS[normalizedKeyPart(planet)] ?? 3;
}

export function rankFriendHouseTransitActivations<T extends { house: number; planet: string }>(activations: T[]) {
  return [...activations].sort((first, second) => {
    const tierDelta = friendHouseTransitSignificanceTier(first.planet)
      - friendHouseTransitSignificanceTier(second.planet);

    if (tierDelta !== 0) return tierDelta;

    const firstAngular = [1, 4, 7, 10].includes(first.house) ? 0 : 1;
    const secondAngular = [1, 4, 7, 10].includes(second.house) ? 0 : 1;

    return firstAngular - secondAngular || first.house - second.house;
  });
}
