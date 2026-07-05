export type LocationInput = {
  label: string;
  latitude: number;
  longitude: number;
  timeZone?: string;
};

export type PlanetPosition = {
  planet: string;
  glyph: string;
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
  from: string;
  to: string;
  type: string;
  orb: number;
  meaning: string;
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
  aspects?: Partial<SkyAspect>[];
};

const defaultLocation: LocationInput = {
  label: "New York, NY",
  latitude: 40.7128,
  longitude: -74.006,
  timeZone: "America/New_York"
};

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
    "North Node": "direction"
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

function normalizeAspect(aspect: Partial<SkyAspect>): SkyAspect | null {
  if (!aspect.from || !aspect.to || !aspect.type) {
    return null;
  }

  return {
    from: aspect.from,
    to: aspect.to,
    type: aspect.type,
    orb: Number(aspect.orb ?? 0),
    meaning: `${aspect.from} ${aspect.type} ${aspect.to} is active now.`,
    conditions: aspect.conditions
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
      time: "12:00",
      timeKnown: true,
      timeZone: defaultLocation.timeZone
    },
    location: defaultLocation,
    settings: {
      houseSystem: "whole_sign",
      zodiac: "tropical",
      aspectProfile: "standard"
    },
    includeContentFacts: false
  });
  const positions = (sky.positions ?? []).map(normalizePosition);
  const aspects = (sky.aspects ?? []).map(normalizeAspect).filter((aspect): aspect is SkyAspect => Boolean(aspect));

  return {
    location: sky.location ?? defaultLocation,
    generatedAt: sky.generatedAt ?? new Date().toISOString(),
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
