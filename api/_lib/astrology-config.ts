export const SKY_BODY_ORDER = [
  "Sun",
  "Moon",
  "Mercury",
  "Venus",
  "Mars",
  "Jupiter",
  "Saturn",
  "Uranus",
  "Neptune",
  "Pluto",
  "Chiron",
  "Lilith",
  "North Node",
  "South Node"
] as const;

export type SkyBodyName = (typeof SKY_BODY_ORDER)[number];

export type TransitToNatalOrbCutoff = {
  default?: number;
  applying?: number;
  separating?: number;
};

export const TRANSIT_TO_NATAL_ORB_CUTOFFS: Record<SkyBodyName, TransitToNatalOrbCutoff> = {
  Sun: { default: 3 },
  Moon: { default: 2 },
  Mercury: { default: 3 },
  Venus: { default: 3 },
  Mars: { default: 3 },
  Jupiter: { applying: 3, separating: 2 },
  Saturn: { applying: 3, separating: 2 },
  Uranus: { applying: 2, separating: 1 },
  Neptune: { applying: 2, separating: 1 },
  Pluto: { applying: 2, separating: 1 },
  Chiron: { default: 2 },
  Lilith: { default: 2 },
  "North Node": { default: 2 },
  "South Node": { default: 2 }
};

export function normalizeSkyBodyName(body: string) {
  const normalized = body.trim().toLowerCase();

  if (normalized === "true node" || normalized === "northnode" || normalized === "north node") {
    return "North Node";
  }

  if (normalized === "southnode" || normalized === "south node") {
    return "South Node";
  }

  if (normalized === "black moon lilith" || normalized === "lilith") {
    return "Lilith";
  }

  return SKY_BODY_ORDER.find((candidate) => candidate.toLowerCase() === normalized) ?? body;
}

export function skyBodyOrderIndex(body: string) {
  const normalized = normalizeSkyBodyName(body);
  const index = SKY_BODY_ORDER.indexOf(normalized as SkyBodyName);

  return index >= 0 ? index : SKY_BODY_ORDER.length;
}

export function transitToNatalOrbLimit(body: string, direction?: string) {
  const normalized = normalizeSkyBodyName(body) as SkyBodyName;
  const cutoff = TRANSIT_TO_NATAL_ORB_CUTOFFS[normalized];

  if (!cutoff) {
    return 0;
  }

  const motion = direction?.toLowerCase();

  if (motion === "applying" || motion === "forming") {
    return cutoff.applying ?? cutoff.default ?? 0;
  }

  if (motion === "separating") {
    return cutoff.separating ?? cutoff.default ?? 0;
  }

  return cutoff.default ?? Math.max(cutoff.applying ?? 0, cutoff.separating ?? 0);
}
