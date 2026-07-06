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
  transitStart?: string | null;
  transitEnd?: string | null;
  transitRemainingLabel?: string | null;
  retrogradeStart?: string | null;
  retrogradeEnd?: string | null;
  retrogradeWindowSource?: "station" | "sign-transit" | null;
};

export type SolarDaylight = {
  sunrise: string | null;
  sunset: string | null;
  dayLengthMinutes: number | null;
  sunriseRisingSign?: string | null;
  sunsetSettingSign?: string | null;
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
    startsAt?: string;
    until?: string;
    durationLabel?: string;
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
  solarDaylight?: SolarDaylight;
  dominantElement: "Fire" | "Earth" | "Air" | "Water";
  positions: PlanetPosition[];
  aspects: Array<{
    from: string;
    to: string;
    type: string;
    orb: number;
    conditions?: AspectConditions;
  }>;
};

export type AspectConditions = {
  applying: boolean;
  perfects: boolean;
  receiverRetrograde: boolean;
  receiverCombust: boolean;
  reception: boolean;
  favorEligible: boolean;
};

export type Horoscope = {
  period: HoroscopePeriod;
  title: string;
  summary: string;
  focus: string[];
  reflection: string;
};
