import {
  calculateSkyAspects,
  canonicalizeNodeAxisAspects
} from "@tldr/astro-knowledge/sky-aspect-engine";

export type LocationInput = {
  label: string;
  latitude: number;
  longitude: number;
  timeZone?: string;
};

export type PlanetPosition = {
  planet: string;
  glyph: string;
  longitude: number;
  speed: number | null;
  sign: string;
  signGlyph: string;
  degree: number;
  house: number;
  motion: "direct" | "retrograde";
  theme: string;
  transitStart?: string | null;
  transitEnd?: string | null;
  transitRemainingLabel?: string | null;
};

export type SkyAspect = {
  id?: string;
  bodyA?: string;
  bodyB?: string;
  from: string;
  to: string;
  type: string;
  exactAngle?: number;
  separation?: number;
  orb: number;
  applying?: boolean;
  meaning: string;
  series?: {
    index: number;
    count: number;
    throughLabel: string;
  } | null;
  conditions?: AspectConditions;
};

export type AspectConditions = {
  applying: boolean;
  perfects: boolean;
  receiverRetrograde: boolean;
  receiverCombust: boolean;
  reception: boolean;
  favorEligible: boolean;
};

export type SkySnapshot = {
  location: LocationInput;
  generatedAt: string;
  ascendant: string;
  ascendantLongitude?: number;
  midheaven: string;
  midheavenLongitude?: number;
  moonPhase: string;
  moonStatus?: {
    kind: "sign" | "void";
    label: string;
    sign: string;
    nextSign?: string;
    until?: string;
    remainingLabel?: string;
  } | null;
  moonSignTransition?: {
    from: string;
    to: string;
    occursAt: string;
  } | null;
  moonEvent?: {
    name: "Full Moon" | "New Moon";
    sign: string;
    occursAt: string;
    days: number;
  };
  dominantElement: "Fire" | "Earth" | "Air" | "Water";
  positions: PlanetPosition[];
  aspects: SkyAspect[];
};

type CloudRunPosition = {
  point?: string;
  planet?: string;
  glyph?: string;
  longitude?: number;
  speed?: number | null;
  sign?: string;
  signGlyph?: string;
  degree?: number;
  minute?: number;
  degreeDecimal?: number;
  house?: number | null;
  motion?: "direct" | "retrograde";
  theme?: string | null;
  transitStart?: string | null;
  transitEnd?: string | null;
  transitRemainingLabel?: string | null;
};

type CloudRunSkyResponse = Partial<Omit<SkySnapshot, "positions" | "aspects">> & {
  positions?: CloudRunPosition[];
};

const defaultLocation: LocationInput = {
  label: "New York, NY",
  latitude: 40.7128,
  longitude: -74.006,
  timeZone: "America/New_York"
};

const signs = [
  ["Aries", "♈"],
  ["Taurus", "♉"],
  ["Gemini", "♊"],
  ["Cancer", "♋"],
  ["Leo", "♌"],
  ["Virgo", "♍"],
  ["Libra", "♎"],
  ["Scorpio", "♏"],
  ["Sagittarius", "♐"],
  ["Capricorn", "♑"],
  ["Aquarius", "♒"],
  ["Pisces", "♓"]
] as const;

const signElements: Record<string, SkySnapshot["dominantElement"]> = {
  Aries: "Fire",
  Leo: "Fire",
  Sagittarius: "Fire",
  Taurus: "Earth",
  Virgo: "Earth",
  Capricorn: "Earth",
  Gemini: "Air",
  Libra: "Air",
  Aquarius: "Air",
  Cancer: "Water",
  Scorpio: "Water",
  Pisces: "Water"
};

function dateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function tldrAstroApiUrl() {
  return (process.env.TLDRASTRO_API_URL || process.env.VITE_TLDRASTRO_API_URL || "https://tldrastro-api-27165565299.us-central1.run.app").replace(/\/$/, "");
}

function themeForPoint(point: string) {
  const themes: Record<string, string> = {
    Sun: "identity",
    Moon: "mood",
    Mercury: "language",
    Venus: "desire",
    Mars: "momentum",
    Jupiter: "growth",
    Saturn: "structure",
    Uranus: "change",
    Neptune: "imagination",
    Pluto: "depth",
    Chiron: "integration",
    Lilith: "instinct and refusal",
    "North Node": "direction",
    "South Node": "familiar patterns and release"
  };

  return themes[point] ?? point.toLowerCase();
}

function dominantElementForPositions(positions: PlanetPosition[]): SkySnapshot["dominantElement"] {
  const counts = positions.reduce<Record<SkySnapshot["dominantElement"], number>>((totals, position) => {
    const element = signElements[position.sign];

    if (element) {
      totals[element] += 1;
    }

    return totals;
  }, { Fire: 0, Earth: 0, Air: 0, Water: 0 });

  return (Object.entries(counts).sort((first, second) => second[1] - first[1])[0]?.[0] ?? "Fire") as SkySnapshot["dominantElement"];
}

function normalizePosition(position: CloudRunPosition): PlanetPosition {
  const planet = position.planet || position.point || "Unknown";

  return {
    planet,
    glyph: position.glyph ?? "",
    longitude: Number(position.longitude),
    speed: Number.isFinite(position.speed) ? Number(position.speed) : null,
    sign: position.sign ?? "Aries",
    signGlyph: position.signGlyph ?? "",
    degree: Number(position.degreeDecimal ?? position.degree ?? 0),
    house: position.house ?? 0,
    motion: position.motion ?? "direct",
    theme: position.theme ?? themeForPoint(planet),
    transitStart: position.transitStart ?? null,
    transitEnd: position.transitEnd ?? null,
    transitRemainingLabel: position.transitRemainingLabel ?? null
  };
}

function normalizeDegrees(degrees: number) {
  return ((degrees % 360) + 360) % 360;
}

function signForLongitude(longitude: number) {
  const normalized = normalizeDegrees(longitude);
  const signIndex = Math.floor(normalized / 30);
  const [sign, signGlyph] = signs[signIndex];

  return {
    sign,
    signGlyph,
    degree: Number((normalized % 30).toFixed(6))
  };
}

function wholeSignHouse(sign: string, ascendant: string) {
  const signIndex = signs.findIndex(([name]) => name === sign);
  const ascendantIndex = signs.findIndex(([name]) => name === ascendant);

  if (signIndex < 0 || ascendantIndex < 0) {
    return 0;
  }

  return ((signIndex - ascendantIndex + 12) % 12) + 1;
}

function southNodePositionFromNorthNode(northNode: PlanetPosition, ascendant: string): PlanetPosition {
  const longitude = normalizeDegrees(northNode.longitude + 180);
  const { sign, signGlyph, degree } = signForLongitude(longitude);

  return {
    ...northNode,
    planet: "South Node",
    glyph: "☋",
    longitude: Number(longitude.toFixed(6)),
    sign,
    signGlyph,
    degree,
    house: wholeSignHouse(sign, ascendant),
    theme: themeForPoint("South Node")
  };
}

async function postTldrAstro<TResponse>(path: string, body: unknown): Promise<TResponse> {
  const response = await fetch(`${tldrAstroApiUrl()}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(`TLDR Astro API ${response.status}: ${JSON.stringify(payload)}`);
  }

  return payload as TResponse;
}

export async function currentSkyFacts(date: Date): Promise<SkySnapshot> {
  const sky = await postTldrAstro<CloudRunSkyResponse>("/sky/current", {
    datetime: {
      date: dateOnly(date),
      timeKnown: true,
      timeZone: defaultLocation.timeZone,
      utc: date.toISOString()
    },
    location: defaultLocation,
    settings: {
      houseSystem: "whole_sign",
      zodiac: "tropical",
      aspectProfile: "standard"
    },
    includeContentFacts: false
  });
  const normalizedPositions = (sky.positions ?? []).map(normalizePosition);
  const northNode = normalizedPositions.find((position) => position.planet === "North Node");
  const positions = northNode && Number.isFinite(northNode.longitude)
    ? [...normalizedPositions, southNodePositionFromNorthNode(northNode, sky.ascendant ?? "")]
    : normalizedPositions;
  const aspects = canonicalizeNodeAxisAspects(calculateSkyAspects(positions)).map((aspect) => ({
    ...aspect,
    meaning: `${aspect.from} ${aspect.type} ${aspect.to} is active now.`,
    series: null
  }));

  return {
    location: sky.location ?? defaultLocation,
    generatedAt: sky.generatedAt ?? date.toISOString(),
    ascendant: sky.ascendant ?? "",
    ascendantLongitude: sky.ascendantLongitude,
    midheaven: sky.midheaven ?? "",
    midheavenLongitude: sky.midheavenLongitude,
    moonPhase: sky.moonPhase ?? "",
    moonStatus: sky.moonStatus ?? null,
    moonSignTransition: sky.moonSignTransition ?? null,
    moonEvent: sky.moonEvent,
    dominantElement: sky.dominantElement ?? dominantElementForPositions(positions),
    positions,
    aspects
  };
}
