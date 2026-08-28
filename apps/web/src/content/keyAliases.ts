const aspectNames = new Set(["conjunction", "opposition", "square", "trine", "sextile"]);

export function aliasKeyPart(value: string | number | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function moduleKeyPart(value: string | number | null | undefined) {
  const part = aliasKeyPart(value);

  if (part === "true-node" || part === "north-node") {
    return "north_node";
  }

  if (part === "south-node") {
    return "south_node";
  }

  return part.replace(/-/g, "_");
}

function addAlias(aliases: Set<string>, alias?: string | null) {
  if (alias) {
    aliases.add(alias);
  }
}

function placementAliases(planet: string, sign: string) {
  const planetPart = aliasKeyPart(planet);
  const signPart = aliasKeyPart(sign);

  return [
    `${planetPart}-${signPart}`,
    `${planetPart}-in-${signPart}`,
    `natal-${planetPart}-in-${signPart}`,
    `sky-${planetPart}-in-${signPart}`,
    `library-natal-placement-${planetPart}-${signPart}`,
    `natal.sign.${moduleKeyPart(planetPart)}.${moduleKeyPart(signPart)}`,
    `sky.placement.${moduleKeyPart(planetPart)}.${moduleKeyPart(signPart)}`
  ];
}

function houseAliases(planet: string, house: string) {
  const planetPart = aliasKeyPart(planet);
  const housePart = aliasKeyPart(house).replace(/^house-?/, "");

  return [
    `${planetPart}-${housePart}`,
    `${planetPart}-house-${housePart}`,
    `${planetPart}-house${housePart}`,
    `${planetPart}_house_${housePart}`,
    `${planetPart}_${housePart}`,
    `natal.house.${moduleKeyPart(planetPart)}.${moduleKeyPart(housePart)}`
  ];
}

function aspectAliases(first: string, aspect: string, second: string) {
  const firstPart = aliasKeyPart(first);
  const aspectPart = aliasKeyPart(aspect);
  const secondPart = aliasKeyPart(second);
  const firstModule = moduleKeyPart(firstPart);
  const secondModule = moduleKeyPart(secondPart);
  const aspectModule = moduleKeyPart(aspectPart);

  return [
    `${firstPart}-${aspectPart}-${secondPart}`,
    `${secondPart}-${aspectPart}-${firstPart}`,
    `natal-${firstPart}-${aspectPart}-${secondPart}`,
    `natal-${secondPart}-${aspectPart}-${firstPart}`,
    `sky-${firstPart}-${aspectPart}-${secondPart}`,
    `sky-${secondPart}-${aspectPart}-${firstPart}`,
    `transit-natal-${firstPart}-${aspectPart}-${secondPart}`,
    `transit-natal-${secondPart}-${aspectPart}-${firstPart}`,
    `library-natal-aspect-${firstPart}-${aspectPart}-${secondPart}`,
    `library-natal-aspect-${secondPart}-${aspectPart}-${firstPart}`,
    `natal.aspect.${firstModule}.${aspectModule}.${secondModule}`,
    `natal.aspect.${secondModule}.${aspectModule}.${firstModule}`,
    `sky.aspect.${firstModule}.${aspectModule}.${secondModule}`,
    `sky.aspect.${secondModule}.${aspectModule}.${firstModule}`,
    `transit.aspect.${firstModule}.${aspectModule}.${secondModule}`,
    `transit.aspect.${secondModule}.${aspectModule}.${firstModule}`,
    `${firstPart}_${secondPart}_${aspectPart}`,
    `${secondPart}_${firstPart}_${aspectPart}`,
    `${firstPart}_${aspectPart}_${secondPart}`,
    `${secondPart}_${aspectPart}_${firstPart}`
  ];
}

export function equivalentAstroContentKeys(key: string) {
  const aliases = new Set<string>();
  const normalized = key.trim();
  const dashKey = aliasKeyPart(normalized);
  let matchedStructuredAspect = false;
  addAlias(aliases, normalized);
  addAlias(aliases, dashKey);

  const ccFallbackHook = normalized.match(/^cc\/fallback-hook\/(.+)$/);
  if (ccFallbackHook) {
    addAlias(aliases, `fallback-hook/${ccFallbackHook[1]}`);
  }

  const ccPlanetInSign = normalized.match(/^cc\/planet-in-sign\/(.+?)-in-([a-z-]+)$/);
  if (ccPlanetInSign && ccPlanetInSign[2] !== "sign") {
    placementAliases(ccPlanetInSign[1], ccPlanetInSign[2]).forEach((alias) => addAlias(aliases, alias));
  }

  const ccTransitHouse = normalized.match(/^cc\/transit\/([^/]+)\/house-([0-9]{1,2})$/);
  if (ccTransitHouse) {
    const planet = aliasKeyPart(ccTransitHouse[1]);
    const house = aliasKeyPart(ccTransitHouse[2]);
    addAlias(aliases, `transit.house.${moduleKeyPart(planet)}.${moduleKeyPart(house)}`);
    addAlias(aliases, `transit-${planet}-house-${house}`);
    addAlias(aliases, `fallback-hook/you.transit-through-house/${planet}/house-${house}`);
  }

  const ccAspectPair = normalized.match(/^cc\/aspect-pair\/(.+?)-(conjunction|opposition|square|trine|sextile)-(.+)$/);
  if (ccAspectPair) {
    aspectAliases(ccAspectPair[1], ccAspectPair[2], ccAspectPair[3]).forEach((alias) => addAlias(aliases, alias));
  }

  const legacyNatalAspect = normalized.match(/^natal\.([a-z_]+)\.([a-z_]+)\.([a-z_]+)$/);
  if (legacyNatalAspect && aspectNames.has(aliasKeyPart(legacyNatalAspect[2]))) {
    aspectAliases(legacyNatalAspect[1], legacyNatalAspect[2], legacyNatalAspect[3]).forEach((alias) => addAlias(aliases, alias));
  }

  const midheaven = normalized.match(/^ms\/midheaven\/([a-z-]+)$/);
  if (midheaven) {
    addAlias(aliases, `midheaven-in-${aliasKeyPart(midheaven[1])}`);
    addAlias(aliases, `natal.angle.midheaven.${moduleKeyPart(midheaven[1])}`);
  }

  const retrograde = normalized.match(/^ms\/retrograde\/([a-z-]+)$/);
  if (retrograde) {
    const planet = aliasKeyPart(retrograde[1]);
    addAlias(aliases, `sky-retrograde-${planet}`);
    addAlias(aliases, `sky.retrograde.${moduleKeyPart(planet)}`);
    addAlias(aliases, `fallback-hook/sky.retrograde/${planet}`);
  }

  const ingress = normalized.match(/^ms\/ingress\/([a-z-]+)$/);
  if (ingress) {
    const planet = aliasKeyPart(ingress[1]);
    addAlias(aliases, `fallback-hook/sky.ingress.${planet}`);
    addAlias(aliases, `fallback-hook/sky.ingress/${planet}`);
  }

  if (normalized === "cc/fallback/retrograde/collective-mercury-flavor") {
    addAlias(aliases, "fallback-hook/sky.retrograde");
    addAlias(aliases, "fallback-hook/sky.retrograde/mercury");
  }

  if (normalized.startsWith("cc/fallback/ingress/")) {
    addAlias(aliases, "fallback-hook/sky.ingress");
  }

  if (normalized === "cc/fallback/cazimi/collective") {
    addAlias(aliases, "fallback-hook/sky.cazimi");
  }

  if (normalized === "cc/fallback/daily/house-personalized-cc-motif-set") {
    addAlias(aliases, "fallback-hook/you.daily-timing");
  }

  const slotTemplateAliases: Record<string, string[]> = {
    "slot-template/3A": ["fallback-hook/sky.planetary-placement", "fallback-hook/sky.planetary-placement-retrograde"],
    "slot-template/3B": ["fallback-hook/you.transit-through-house"],
    "slot-template/3C": ["fallback-hook/you.transit-through-house"],
    "slot-template/3D": ["fallback-hook/you.transit-through-house"],
    "slot-template/3E": ["fallback-hook/you.transit-through-house"],
    "slot-template/4A": ["fallback-hook/you.transit-to-natal"],
    "slot-template/4B": ["fallback-hook/you.transit-to-natal"],
    "slot-template/4C": ["fallback-hook/you.transit-to-natal"],
    "slot-template/4D": ["fallback-hook/you.transit-to-angle"],
    "slot-template/4E": ["fallback-hook/you.transit-to-natal"],
    "slot-template/4F": ["fallback-hook/you.transit-to-natal"],
    "slot-template/4G": ["fallback-hook/you.transit-to-natal"],
    "slot-template/4H": ["fallback-hook/you.transit-to-natal"],
    "slot-template/4I": ["fallback-hook/you.transit-to-natal"],
    "slot-template/5K": ["fallback-hook/you.natal-placement", "fallback-hook/you.natal-synthesis"],
    "slot-template/5L": ["fallback-hook/you.natal-angle-placement"],
    "slot-template/5M": ["fallback-hook/you.natal-angle-placement"],
    "slot-template/5N": ["fallback-hook/you.natal-angle-placement"],
    "slot-template/5O": ["fallback-hook/you.natal-angle-placement"],
    "slot-template/5P": ["fallback-hook/you.natal-aspect"],
    "slot-template/5Q": ["fallback-hook/you.natal-aspect"],
    "slot-template/5R": ["fallback-hook/you.natal-aspect"],
    "slot-template/5S": ["fallback-hook/you.natal-aspect"],
    "slot-template/6A": ["fallback-hook/sky.planetary-placement", "fallback-hook/sky.planetary-placement-retrograde"],
    "slot-template/6B": ["fallback-hook/sky.planetary-placement"],
    "slot-template/6C": ["fallback-hook/sky.planetary-placement"],
    "slot-template/6D": ["fallback-hook/sky.planetary-placement"],
    "slot-template/6E": ["fallback-hook/sky.aspect-detail", "fallback-hook/sky.aspect-row"],
    "slot-template/6F": ["fallback-hook/sky.aspect-detail", "fallback-hook/sky.aspect-row"],
    "slot-template/6G": ["fallback-hook/sky.retrograde-section"],
    "slot-template/6H": ["fallback-hook/sky.station", "fallback-hook/sky.retrograde-section"],
    "slot-template/6I": ["fallback-hook/sky.retrograde"],
    "slot-template/6J": ["fallback-hook/sky.cazimi", "fallback-hook/sky.retrograde-section"],
    "slot-template/6K": ["fallback-hook/sky.station", "fallback-hook/sky.retrograde-section"],
    "slot-template/6L": ["fallback-hook/sky.retrograde-section"],
    "slot-template/6M": ["fallback-hook/sky.ingress"],
    "slot-template/6N": ["fallback-hook/sky.aspect-detail"]
  };

  (slotTemplateAliases[normalized] ?? []).forEach((alias) => addAlias(aliases, alias));

  const libraryPlacement = dashKey.match(/^library-natal-placement-(.+?)-([a-z]+)$/);
  if (libraryPlacement) {
    placementAliases(libraryPlacement[1], libraryPlacement[2]).forEach((alias) => addAlias(aliases, alias));
  }

  const libraryAspect = dashKey.match(/^library-natal-aspect-(.+?)-(conjunction|opposition|square|trine|sextile)-(.+)$/);
  if (libraryAspect) {
    matchedStructuredAspect = true;
    aspectAliases(libraryAspect[1], libraryAspect[2], libraryAspect[3]).forEach((alias) => addAlias(aliases, alias));
  }

  const dotPlacement = normalized.match(/^natal\.sign\.([^.]+)\.([^.]+)$/);
  if (dotPlacement) {
    placementAliases(dotPlacement[1], dotPlacement[2]).forEach((alias) => addAlias(aliases, alias));
  }

  const dotHouse = normalized.match(/^natal\.house\.([^.]+)\.([^.]+)$/);
  if (dotHouse) {
    houseAliases(dotHouse[1], dotHouse[2]).forEach((alias) => addAlias(aliases, alias));
  }

  const dotAspect = normalized.match(/^(?:natal|sky|transit)\.aspect\.([^.]+)\.([^.]+)\.([^.]+)$/);
  if (dotAspect) {
    matchedStructuredAspect = true;
    aspectAliases(dotAspect[1], dotAspect[2], dotAspect[3]).forEach((alias) => addAlias(aliases, alias));
  }

  const placement = dashKey.match(/^(?:natal-|sky-)?(.+?)-in-([a-z]+)$/);
  if (placement) {
    placementAliases(placement[1], placement[2]).forEach((alias) => addAlias(aliases, alias));
  }

  const house = dashKey.match(/^(?:natal-)?(.+?)-(?:house-?|in-)?([0-9]{1,2})(?:-house)?$/);
  if (house) {
    houseAliases(house[1], house[2]).forEach((alias) => addAlias(aliases, alias));
  }

  const transit = dashKey.match(/^transit-natal-(.+?)-(conjunction|opposition|square|trine|sextile)-(.+)$/);
  if (transit) {
    matchedStructuredAspect = true;
    aspectAliases(transit[1], transit[2], transit[3]).forEach((alias) => addAlias(aliases, alias));
  }

  const aspectKey = dashKey.replace(/^(?:natal-|sky-)/, "");
  const parts = aspectKey.split("-");
  const aspectIndex = parts.findIndex((part) => aspectNames.has(part));

  if (!matchedStructuredAspect && aspectIndex > 0 && aspectIndex < parts.length - 1) {
    aspectAliases(parts.slice(0, aspectIndex).join("-"), parts[aspectIndex], parts.slice(aspectIndex + 1).join("-"))
      .forEach((alias) => addAlias(aliases, alias));
  }

  return Array.from(aliases);
}
