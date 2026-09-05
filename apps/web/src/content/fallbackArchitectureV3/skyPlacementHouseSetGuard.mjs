const HOUSE_CORE_KEY = /^house-horoscope-core\/([^/]+)\/([^/]+)\/house-(\d+)$/u;

function parsedHouseCore(contentKey) {
  const match = String(contentKey ?? "").match(HOUSE_CORE_KEY);
  if (!match) return null;
  const house = Number(match[3]);
  if (!Number.isInteger(house) || house < 1 || house > 12) return null;
  return {
    placementKey: `${match[1]}/${match[2]}`,
    house
  };
}

function approvedOwnerRowsByPlacement(ownerRows) {
  const placements = new Map();
  for (const row of ownerRows ?? []) {
    if (row?.review_status !== "approved" || typeof row?.body_you !== "string" || !row.body_you.trim()) continue;
    const parsed = parsedHouseCore(row.contentKey);
    if (!parsed) continue;
    const houses = placements.get(parsed.placementKey) ?? new Map();
    houses.set(parsed.house, row.body_you);
    placements.set(parsed.placementKey, houses);
  }
  return placements;
}

function bundledRowsByPlacement(houseRows) {
  const placements = new Map();
  for (const row of houseRows ?? []) {
    const parsed = parsedHouseCore(row?.contentKey);
    if (!parsed) continue;
    const houses = placements.get(parsed.placementKey) ?? new Map();
    houses.set(parsed.house, typeof row?.body_you === "string" ? row.body_you : "");
    placements.set(parsed.placementKey, houses);
  }
  return placements;
}

export function incompleteOwnerAuthoredHousePlacementKeys(houseRows, ownerRows) {
  const ownerPlacements = approvedOwnerRowsByPlacement(ownerRows);
  const bundledPlacements = bundledRowsByPlacement(houseRows);
  const incomplete = new Set();

  for (const [placementKey, ownerHouses] of ownerPlacements) {
    const bundledHouses = bundledPlacements.get(placementKey) ?? new Map();
    const completeOwnerSet = ownerHouses.size === 12;
    const bundleMatchesOwnerSet = completeOwnerSet
      && bundledHouses.size === 12
      && [...ownerHouses].every(([house, body]) => bundledHouses.get(house) === body);

    if (!bundleMatchesOwnerSet) incomplete.add(placementKey);
  }

  return incomplete;
}

export function filterMixedDepthSkyPlacementHouseRows(houseRows, ownerRows) {
  const incompletePlacements = incompleteOwnerAuthoredHousePlacementKeys(houseRows, ownerRows);
  if (incompletePlacements.size === 0) return houseRows;

  return houseRows.filter((row) => {
    const parsed = parsedHouseCore(row?.contentKey);
    return !parsed || !incompletePlacements.has(parsed.placementKey);
  });
}
