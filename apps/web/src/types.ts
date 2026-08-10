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
  longitude?: number;
  latitude?: number | null;
  speed?: number | null;
  sign: string;
  signGlyph: string;
  degree: number;
  house: number;
  houseSystem?: "whole_sign";
  motion: "direct" | "retrograde";
  theme?: string;
  transitStart?: string | null;
  transitEnd?: string | null;
  transitTimeZone?: string | null;
  transitRemainingLabel?: string | null;
  priorTransitSign?: string | null;
  priorTransitStart?: string | null;
  priorTransitEnd?: string | null;
  previousSignResidencyStart?: string | null;
  previousSignResidencyEnd?: string | null;
  residencyPasses?: Array<{
    entryDate: string;
    exitDate: string;
  }> | null;
  retrogradeStart?: string | null;
  retrogradeEnd?: string | null;
  retrogradeWindowSource?: "station" | "sign-transit" | null;
  retrogradePhase?: "retrograde-passage" | null;
  retrogradeShadowStart?: string | null;
  retrogradeShadowEnd?: string | null;
  cazimi?: boolean | null;
  cazimiOrb?: number | null;
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
  cacheState?: {
    source: "last-known-verified";
    schema: "tldrastro-verified-sky-v2";
    verifiedAt: string;
    ageMs: number;
  };
  calculationProvenance?: {
    source: string;
    library: string;
    libraryVersion: string;
    ephemerisFiles: string[];
    zodiac: "tropical" | "sidereal";
    frame: "geocentric" | "topocentric";
    houseSystem: "whole_sign";
    planetHouseSystem: "whole_sign";
    nodeType: "mean" | "true";
    lilithType: "mean" | "true";
    calculationVersion: string;
    actualEphemeris?: "swiss";
    returnedEphemerisFlags?: number[];
  };
  ascendant: string;
  ascendantLongitude?: number;
  midheaven: string;
  midheavenLongitude?: number;
  houseCusps?: Array<{
    house: number;
    longitude: number;
    sign: string;
    degree: number;
    houseSystem: "whole_sign";
  }>;
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
    id?: string;
    bodyA?: string;
    bodyB?: string;
    from: string;
    to: string;
    type: string;
    exactAngle?: number;
    separation?: number;
    orb: number;
    exactAt?: string | null;
    applying?: boolean;
    timing?: {
      group: "this-week" | "this-season" | "undercurrent";
      phase: "building" | "exact" | "fading";
      engagementStart: string;
      engagementEnd: string;
      timeZone?: string;
      buildsAllWeek?: boolean;
      passIndex: number;
      exactPasses: Array<{
        exactAt: string;
        firstMotion: "direct" | "retrograde";
        secondMotion: "direct" | "retrograde";
      }>;
      cycleLocation?: {
        previousYear?: number | null;
        nextYear?: number | null;
        cycleYears?: number | null;
        ambiguous?: boolean;
      } | null;
      relation?: {
        fastPlanet: string;
        undercurrentA: string;
        undercurrentB: string;
      } | null;
    } | null;
    series?: {
      index: number;
      count: number;
      throughLabel: string;
    } | null;
    conditions?: AspectConditions;
  }>;
  transitToNatalAspects?: Array<{
    id?: string;
    movingBody?: string;
    transitPlanet?: string;
    transitingPlanet?: string;
    targetNatalPlanet?: string;
    natalPoint?: string;
    natalPlanet?: string;
    aspectType?: string;
    type?: string;
    aspect?: string;
    orb?: number | string;
    orbValue?: number;
    orbDegrees?: number;
    applying?: boolean;
    direction?: "applying" | "separating" | string;
    exactAt?: string;
    bodyA?: string;
    bodyB?: string;
    from?: string;
    to?: string;
    conditions?: {
      applying?: boolean;
    };
  }>;
  aspectPatterns?: import("@tldr/astro-knowledge/aspect-pattern-engine").AspectPatternDetectionResult;
  facts?: import("./services/astrologyFacts.js").AstrologyFact[];
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
