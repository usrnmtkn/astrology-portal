import { equivalentAstroContentKeys } from "../content/keyAliases";

export type GeneratedContentAliasRow = {
  content_key: string;
  event_type: string | null;
  headline: string | null;
  source_snapshot?: Record<string, unknown> | null;
  surface: string;
  target_date: string | null;
};

export type AspectContentFamily =
  | "natal_aspect"
  | "sky_aspect"
  | "transit_to_natal_aspect"
  | "synastry_aspect"
  | "composite_aspect";

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

function canonicalAspectBodies(first: string, second: string) {
  return canonicalNatalAspectBodies(first, second);
}

function aspectPart(value: string) {
  return moduleContentPart(value);
}

export function natalSignContentKey(body: string, sign: string) {
  return `natal.sign.${moduleContentPart(body)}.${moduleContentPart(sign)}`;
}

export function natalHouseContentKey(body: string, house: string | number) {
  return `natal.house.${moduleContentPart(body)}.${moduleContentPart(house)}`;
}

export function natalAngleContentKey(angle: string, sign: string) {
  return `natal.angle.${moduleContentPart(angle)}.${moduleContentPart(sign)}`;
}

export function natalPlacementContentKey(body: string, sign: string, house: string | number) {
  return `natal.placement.${moduleContentPart(body)}.${moduleContentPart(sign)}.house_${moduleContentPart(house)}`;
}

export function skyPlacementContentKey(body: string, sign: string) {
  return `sky.placement.${moduleContentPart(body)}.${moduleContentPart(sign)}`;
}

export function natalRulerContentKey(ruler: string) {
  return `natal.ruler.${moduleContentPart(ruler)}`;
}

export function natalAspectContentKey(first: string, aspect: string, second: string) {
  const [firstBody, secondBody] = canonicalAspectBodies(first, second);

  return `natal.aspect.${firstBody}.${moduleContentPart(aspect)}.${secondBody}`;
}

export function skyAspectContentKey(first: string, aspect: string, second: string) {
  const [firstBody, secondBody] = canonicalAspectBodies(first, second);

  return `sky.aspect.${firstBody}.${aspectPart(aspect)}.${secondBody}`;
}

export function skyIngressContentKey(planet: string, sign: string) {
  return `sky.ingress.${moduleContentPart(planet)}.${moduleContentPart(sign)}`;
}

export function skyIngressInstanceContentKey(
  planet: string,
  sign: string,
  options: {
    targetDate?: string | null;
  } = {}
) {
  const datePart = options.targetDate ? `.${slugContentPart(options.targetDate)}` : "";

  return `${skyIngressContentKey(planet, sign)}${datePart}`;
}

export function skyAspectInstanceContentKey(
  first: string,
  aspect: string,
  second: string,
  options: {
    firstSign?: string | null;
    secondSign?: string | null;
    targetDate?: string | null;
  } = {}
) {
  const baseKey = skyAspectContentKey(first, aspect, second);
  const signParts = [options.firstSign, options.secondSign]
    .map((value) => value ? aspectPart(value) : "")
    .filter(Boolean);
  const datePart = options.targetDate ? `.${slugContentPart(options.targetDate)}` : "";

  return signParts.length === 2 ? `${baseKey}.${signParts.join(".")}${datePart}` : `${baseKey}${datePart}`;
}

export function transitToNatalAspectContentKey(transiting: string, aspect: string, natal: string) {
  return `transit.aspect.${aspectPart(transiting)}.${aspectPart(aspect)}.${aspectPart(natal)}`;
}

export function transitHouseContentKey(transiting: string, house: string | number) {
  return `transit.house.${aspectPart(transiting)}.${aspectPart(String(house))}`;
}

export function transitToNatalAspectInstanceContentKey(
  transiting: string,
  aspect: string,
  natal: string,
  options: {
    transitingSign?: string | null;
    natalSign?: string | null;
    natalHouse?: string | number | null;
    targetDate?: string | null;
  } = {}
) {
  const baseKey = transitToNatalAspectContentKey(transiting, aspect, natal);
  const parts = [
    options.transitingSign ? aspectPart(options.transitingSign) : "",
    options.natalSign ? aspectPart(options.natalSign) : "",
    options.natalHouse ? `house_${aspectPart(String(options.natalHouse))}` : "",
    options.targetDate ? slugContentPart(options.targetDate) : ""
  ].filter(Boolean);

  return parts.length ? `${baseKey}.${parts.join(".")}` : baseKey;
}

export function synastryAspectContentKey(personA: string, aspect: string, personB: string) {
  return `synastry.aspect.${aspectPart(personA)}.${aspectPart(aspect)}.${aspectPart(personB)}`;
}

export function compositePointContentKey(body: string) {
  return `composite.${moduleContentPart(body)}`;
}

export function compositeSignContentKey(body: string, sign: string) {
  return `composite-${slugContentPart(body)}-in-${slugContentPart(sign)}`;
}

export function compositeHouseContentKey(body: string, house: string | number) {
  return `composite.house.${moduleContentPart(body)}.house_${moduleContentPart(house)}`;
}

export function compositeAspectContentKey(first: string, aspect: string, second: string) {
  const [firstBody, secondBody] = canonicalAspectBodies(first, second);

  return `composite.aspect.${firstBody}.${aspectPart(aspect)}.${secondBody}`;
}

export function aspectContentKeyForFamily(
  family: AspectContentFamily,
  first: string,
  aspect: string,
  second: string
) {
  if (family === "natal_aspect") return natalAspectContentKey(first, aspect, second);
  if (family === "sky_aspect") return skyAspectContentKey(first, aspect, second);
  if (family === "transit_to_natal_aspect") return transitToNatalAspectContentKey(first, aspect, second);
  if (family === "synastry_aspect") return synastryAspectContentKey(first, aspect, second);

  return compositeAspectContentKey(first, aspect, second);
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

function parseIngressLabel(value?: string | null) {
  const match = value?.match(/^(.+?)\s+enters\s+(.+?)$/i);

  if (!match) {
    return null;
  }

  return {
    planet: slugContentPart(match[1]),
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

function addAlias(aliases: Set<string>, alias?: string | null) {
  if (alias) {
    aliases.add(alias);
  }
}

const domainRegistrySkyAspectAliases: Record<string, { first: string; aspect: string; second: string }> = {
  "domain-registry/sky-aspect/mercury-neptune": {
    first: "mercury",
    aspect: "square",
    second: "neptune"
  },
  "domain-registry/sky-aspect/moon-uranus": {
    first: "moon",
    aspect: "trine",
    second: "uranus"
  },
  "domain-registry/sky-aspect/sun-saturn": {
    first: "sun",
    aspect: "sextile",
    second: "saturn"
  },
  "domain-registry/sky-aspect/venus-saturn": {
    first: "venus",
    aspect: "square",
    second: "saturn"
  },
  "domain-registry/sky-aspect/mars-saturn": {
    first: "mars",
    aspect: "square",
    second: "saturn"
  },
  "domain-registry/sky-aspect/moon-venus": {
    first: "moon",
    aspect: "sextile",
    second: "venus"
  },
  "domain-registry/sky-aspect/mercury-saturn": {
    first: "mercury",
    aspect: "sextile",
    second: "saturn"
  },
  "domain-registry/sky-aspect/venus-mars": {
    first: "venus",
    aspect: "square",
    second: "mars"
  },
  "domain-registry/sky-aspect/sun-neptune": {
    first: "sun",
    aspect: "square",
    second: "neptune"
  },
  "domain-registry/sky-aspect/moon-pluto": {
    first: "moon",
    aspect: "conjunction",
    second: "pluto"
  }
};

function addSkyAspectScopedAliases(
  aliases: Set<string>,
  first: string,
  aspect: string,
  second: string
) {
  const firstPart = aspectPart(first);
  const secondPart = aspectPart(second);
  const aspectSlug = aspectPart(aspect);

  addAlias(aliases, skyAspectContentKey(first, aspect, second));
  addAlias(aliases, `sky-${firstPart}-${aspectSlug}-${secondPart}`);
  addAlias(aliases, `sky-${secondPart}-${aspectSlug}-${firstPart}`);
}

function isLegacyCurrentSkyEvent(eventType: string | null, prefix: "seasonal" | "lunar") {
  return eventType === `${prefix}-${["weath", "er"].join("")}`;
}

export function generatedContentAliases(row: GeneratedContentAliasRow) {
  const aliases = new Set<string>();
  const aspect = parseAspectLabel(row.headline);
  const placement = parsePlacementLabel(row.headline);
  const ingress = parseIngressLabel(row.headline);
  const retrograde = parseRetrogradeLabel(row.headline);
  const reversedAspect = aspect ? `${aspect.second}-${aspect.aspect}-${aspect.first}` : null;
  const directAspect = aspect ? `${aspect.first}-${aspect.aspect}-${aspect.second}` : null;

  equivalentAstroContentKeys(row.content_key).forEach((alias) => addAlias(aliases, alias));

  if (row.surface === "sky") {
    const domainRegistrySkyAspect = domainRegistrySkyAspectAliases[row.content_key];

    if (domainRegistrySkyAspect) {
      addSkyAspectScopedAliases(
        aliases,
        domainRegistrySkyAspect.first,
        domainRegistrySkyAspect.aspect,
        domainRegistrySkyAspect.second
      );
    }

    if (row.event_type === "current-aspect" && aspect && directAspect) {
      addAlias(aliases, row.target_date ? `sky-aspect-${directAspect}-${row.target_date}` : null);
      addAlias(aliases, `sky-${directAspect}`);
      addAlias(aliases, row.target_date ? `sky-aspect-${reversedAspect}-${row.target_date}` : null);
      addAlias(aliases, `sky-${reversedAspect}`);
      addAlias(aliases, skyAspectContentKey(aspect.first, aspect.aspect, aspect.second));
    }

    if (placement?.point && placement.sign) {
      addAlias(aliases, `sky-${placement.point}-in-${placement.sign}`);
      addAlias(aliases, skyPlacementContentKey(placement.point, placement.sign));
    }

    if (ingress?.planet && ingress.sign) {
      addAlias(aliases, row.target_date ? `sky-ingress-${ingress.planet}-${ingress.sign}-${row.target_date}` : null);
      addAlias(aliases, `sky-ingress-${ingress.planet}-${ingress.sign}`);
      addAlias(aliases, row.target_date ? skyIngressInstanceContentKey(ingress.planet, ingress.sign, { targetDate: row.target_date }) : null);
      addAlias(aliases, skyIngressContentKey(ingress.planet, ingress.sign));
      addAlias(aliases, `sky-${ingress.planet}-enters-${ingress.sign}`);
      addAlias(aliases, `sky-${ingress.planet}-in-${ingress.sign}`);
    }

    if ((row.event_type === "seasonal-current" || isLegacyCurrentSkyEvent(row.event_type, "seasonal")) && placement?.sign) {
      addAlias(aliases, row.target_date ? `sky-season-${placement.sign}-${row.target_date}` : null);
    }

    if ((row.event_type === "lunar-cycle" || isLegacyCurrentSkyEvent(row.event_type, "lunar")) && placement?.sign) {
      addAlias(aliases, row.target_date ? `sky-moon-${placement.sign}-${row.target_date}` : null);
    }

    if (row.event_type === "retrograde" && retrograde?.planet) {
      const normalizedPhase = typeof row.source_snapshot?.phase === "string"
        ? row.source_snapshot.phase.replace(/-/g, "_")
        : null;
      const normalizedSign = retrograde.sign ?? (typeof row.source_snapshot?.sign === "string" ? row.source_snapshot.sign : null);

      addAlias(aliases, row.target_date ? `sky-retrograde-${retrograde.planet}-${row.target_date}` : null);
      addAlias(aliases, normalizedSign && normalizedPhase ? `sky.retrograde.${retrograde.planet}.${normalizedSign}.${normalizedPhase}` : null);
      addAlias(aliases, normalizedSign && typeof row.source_snapshot?.phase === "string"
        ? `fallback-hook/sky.retrograde/${retrograde.planet}/${normalizedSign}/${row.source_snapshot.phase}`
        : null);
    }
  }

  if ((row.surface === "natal" || row.surface === "you") && aspect && directAspect) {
    addAlias(aliases, `natal-${directAspect}`);
    addAlias(aliases, `natal-${reversedAspect}`);
    addAlias(aliases, natalAspectContentKey(aspect.first, aspect.aspect, aspect.second));

    if (row.event_type?.includes("transit") || row.content_key.startsWith("transit-natal-")) {
      addAlias(aliases, `transit-natal-${directAspect}`);
      addAlias(aliases, `transit-natal-${reversedAspect}`);
      addAlias(aliases, transitToNatalAspectContentKey(aspect.first, aspect.aspect, aspect.second));
    }
  }

  if ((row.surface === "natal" || row.surface === "you") && placement) {
    addAlias(aliases, `natal-${placement.point}-in-${placement.sign}`);
    addAlias(aliases, `${placement.point}-in-${placement.sign}`);
    addAlias(aliases, natalSignContentKey(placement.point, placement.sign));
    if (placement.point === "ascendant" || placement.point === "midheaven") {
      addAlias(aliases, natalAngleContentKey(placement.point, placement.sign));
    }
  }

  if ((row.surface === "relationship" || row.surface === "synastry" || row.surface === "composite") && aspect && directAspect) {
    ["relationship", "synastry", "composite"].forEach((prefix) => {
      addAlias(aliases, `${prefix}-${directAspect}`);
      addAlias(aliases, `${prefix}-${reversedAspect}`);
    });
    addAlias(aliases, directAspect);
    addAlias(aliases, reversedAspect);

    if (row.surface === "synastry" || row.surface === "relationship") {
      addAlias(aliases, synastryAspectContentKey(aspect.first, aspect.aspect, aspect.second));
    }

    if (row.surface === "composite" || row.surface === "relationship") {
      addAlias(aliases, compositeAspectContentKey(aspect.first, aspect.aspect, aspect.second));
    }
  }

  if ((row.surface === "relationship" || row.surface === "synastry" || row.surface === "composite") && placement) {
    ["relationship", "synastry", "composite"].forEach((prefix) => {
      addAlias(aliases, `${prefix}-${placement.point}-in-${placement.sign}`);
    });
    addAlias(aliases, `${placement.point}-in-${placement.sign}`);
  }

  return Array.from(aliases);
}
