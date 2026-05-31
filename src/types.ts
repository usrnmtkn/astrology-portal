export type AccountMode = "guest" | "member";

export type HoroscopePeriod = "daily" | "weekly" | "monthly";

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
};

export type SkySnapshot = {
  location: LocationInput;
  generatedAt: string;
  ascendant: string;
  ascendantLongitude?: number;
  midheaven: string;
  midheavenLongitude?: number;
  moonPhase: string;
  moonEvent?: {
    name: "Full Moon" | "New Moon";
    sign: string;
    occursAt: string;
    days: number;
  };
  dominantElement: "Fire" | "Earth" | "Air" | "Water";
  positions: PlanetPosition[];
  aspects: Array<{
    from: string;
    to: string;
    type: string;
    orb: number;
    meaning: string;
  }>;
};

export type Horoscope = {
  period: HoroscopePeriod;
  title: string;
  summary: string;
  focus: string[];
  reflection: string;
};
