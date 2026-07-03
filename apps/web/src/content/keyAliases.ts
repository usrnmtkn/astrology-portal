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
    `natal.sign.${moduleKeyPart(planetPart)}.${moduleKeyPart(signPart)}`
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
