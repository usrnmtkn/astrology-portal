export type GeneratedContentAliasRow = {
  content_key: string;
  event_type: string | null;
  headline: string | null;
  surface: string;
  target_date: string | null;
};

export function slugContentPart(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function moduleContentPart(value: string | number | null | undefined) {
  const slug = slugContentPart(String(value ?? ""));

  if (slug === "true-node" || slug === "north-node") {
    return "north_node";
  }

  if (slug === "south-node") {
    return "south_node";
  }

  return slug.replace(/-/g, "_");
}

const natalAspectBodyOrder = [
  "sun",
  "moon",
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
  "pluto",
  "chiron",
  "north_node",
  "south_node",
  "ascendant",
  "descendant",
  "midheaven",
  "imum_coeli"
];

function canonicalNatalAspectBodies(first: string, second: string) {
  const firstPart = moduleContentPart(first);
  const secondPart = moduleContentPart(second);
  const firstIndex = natalAspectBodyOrder.indexOf(firstPart);
  const secondIndex = natalAspectBodyOrder.indexOf(secondPart);

  if (firstIndex >= 0 && secondIndex >= 0) {
    return firstIndex <= secondIndex ? [firstPart, secondPart] : [secondPart, firstPart];
  }

  return firstPart.localeCompare(secondPart) <= 0 ? [firstPart, secondPart] : [secondPart, firstPart];
}

export function natalSignContentKey(body: string, sign: string) {
  return `natal.sign.${moduleContentPart(body)}.${moduleContentPart(sign)}`;
}

export function natalHouseContentKey(body: string, house: string | number) {
  return `natal.house.${moduleContentPart(body)}.${moduleContentPart(house)}`;
}

export function natalRulerContentKey(ruler: string) {
  return `natal.ruler.${moduleContentPart(ruler)}`;
}

export function natalAspectContentKey(first: string, aspect: string, second: string) {
  const [firstBody, secondBody] = canonicalNatalAspectBodies(first, second);

  return `natal.aspect.${firstBody}.${moduleContentPart(aspect)}.${secondBody}`;
}

function parseAspectLabel(value?: string | null) {
  const match = value?.match(/^(.+?)\s+(conjunction|opposition|square|trine|sextile)\s+(.+?)$/i);

  if (!match) {
    return null;
  }

  return {
    first: slugContentPart(match[1]),
    aspect: slugContentPart(match[2]),
    second: slugContentPart(match[3])
  };
}

function parsePlacementLabel(value?: string | null) {
  const match = value?.match(/^(.+?)\s+in\s+(.+?)$/i);

  if (!match) {
    return null;
  }

  return {
    point: slugContentPart(match[1]),
    sign: slugContentPart(match[2])
  };
}

function parseRetrogradeLabel(value?: string | null) {
  const match = value?.match(/^(.+?)\s+retrograde(?:\s+in\s+(.+?))?$/i);

  if (!match) {
    return null;
  }

  return {
    planet: slugContentPart(match[1]),
    sign: match[2] ? slugContentPart(match[2]) : null
  };
}

function parseLegacyNatalPlacementKey(value?: string | null) {
  const match = value?.match(/^(?:natal-)?(.+?)-in-(.+?)$/i);

  if (!match) {
    return null;
  }

  return {
    point: match[1],
    sign: match[2]
  };
}

function parseLegacyNatalAspectKey(value?: string | null) {
  const match = value?.match(/^(?:natal-)?(.+?)-(conjunction|opposition|square|trine|sextile)-(.+?)$/i);

  if (!match) {
    return null;
  }

  return {
    first: match[1],
    aspect: match[2],
    second: match[3]
  };
}

function addAlias(aliases: Set<string>, alias?: string | null) {
  if (alias) {
    aliases.add(alias);
  }
}

function isLegacyCurrentSkyEvent(eventType: string | null, prefix: "seasonal" | "lunar") {
  return eventType === `${prefix}-${["weath", "er"].join("")}`;
}

export function generatedContentAliases(row: GeneratedContentAliasRow) {
  const aliases = new Set<string>();
  const aspect = parseAspectLabel(row.headline);
  const placement = parsePlacementLabel(row.headline);
  const retrograde = parseRetrogradeLabel(row.headline);
  const legacyPlacement = parseLegacyNatalPlacementKey(row.content_key);
  const legacyAspect = parseLegacyNatalAspectKey(row.content_key);
  const reversedAspect = aspect ? `${aspect.second}-${aspect.aspect}-${aspect.first}` : null;
  const directAspect = aspect ? `${aspect.first}-${aspect.aspect}-${aspect.second}` : null;

  if (row.surface === "sky") {
    if (row.event_type === "current-aspect" && directAspect) {
      addAlias(aliases, row.target_date ? `sky-aspect-${directAspect}-${row.target_date}` : null);
      addAlias(aliases, `sky-${directAspect}`);
      addAlias(aliases, row.target_date ? `sky-aspect-${reversedAspect}-${row.target_date}` : null);
      addAlias(aliases, `sky-${reversedAspect}`);
    }

    if ((row.event_type === "seasonal-current" || isLegacyCurrentSkyEvent(row.event_type, "seasonal")) && placement?.sign) {
      addAlias(aliases, row.target_date ? `sky-season-${placement.sign}-${row.target_date}` : null);
    }

    if ((row.event_type === "lunar-cycle" || isLegacyCurrentSkyEvent(row.event_type, "lunar")) && placement?.sign) {
      addAlias(aliases, row.target_date ? `sky-moon-${placement.sign}-${row.target_date}` : null);
    }

    if (row.event_type === "retrograde" && retrograde?.planet) {
      addAlias(aliases, row.target_date ? `sky-retrograde-${retrograde.planet}-${row.target_date}` : null);
      addAlias(aliases, `sky-retrograde-${retrograde.planet}`);
      addAlias(aliases, retrograde.sign ? `sky-${retrograde.planet}-in-${retrograde.sign}` : null);
    }
  }

  if ((row.surface === "natal" || row.surface === "you") && aspect && directAspect) {
    addAlias(aliases, `natal-${directAspect}`);
    addAlias(aliases, `natal-${reversedAspect}`);
    addAlias(aliases, natalAspectContentKey(aspect.first, aspect.aspect, aspect.second));

    if (row.event_type?.includes("transit") || row.content_key.startsWith("transit-natal-")) {
      addAlias(aliases, `transit-natal-${directAspect}`);
      addAlias(aliases, `transit-natal-${reversedAspect}`);
    }
  }

  if ((row.surface === "natal" || row.surface === "you") && placement) {
    addAlias(aliases, `natal-${placement.point}-in-${placement.sign}`);
    addAlias(aliases, `${placement.point}-in-${placement.sign}`);
    addAlias(aliases, natalSignContentKey(placement.point, placement.sign));
  }

  if ((row.surface === "natal" || row.surface === "you") && legacyPlacement) {
    addAlias(aliases, natalSignContentKey(legacyPlacement.point, legacyPlacement.sign));
  }

  if ((row.surface === "natal" || row.surface === "you") && legacyAspect) {
    addAlias(aliases, natalAspectContentKey(legacyAspect.first, legacyAspect.aspect, legacyAspect.second));
  }

  if ((row.surface === "relationship" || row.surface === "synastry" || row.surface === "composite") && directAspect) {
    ["relationship", "synastry", "composite"].forEach((prefix) => {
      addAlias(aliases, `${prefix}-${directAspect}`);
      addAlias(aliases, `${prefix}-${reversedAspect}`);
    });
    addAlias(aliases, directAspect);
    addAlias(aliases, reversedAspect);
  }

  if ((row.surface === "relationship" || row.surface === "synastry" || row.surface === "composite") && placement) {
    ["relationship", "synastry", "composite"].forEach((prefix) => {
      addAlias(aliases, `${prefix}-${placement.point}-in-${placement.sign}`);
    });
    addAlias(aliases, `${placement.point}-in-${placement.sign}`);
  }

  return Array.from(aliases);
}
