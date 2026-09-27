export type ReasoningPositionInput = {
  planet?: unknown;
  sign?: unknown;
  degree?: number | null;
  longitude?: number | null;
  motion?: string | null;
  transitStart?: string | null;
  transitEnd?: string | null;
};

export type PlanetCondition = {
  planet: string;
  sign: string;
  degree: string | null;
  motion: "direct" | "retrograde";
  dignities: string[];
  domicileRuler: string | null;
  exaltationRuler: string | null;
};

export type DispositorChain =
  | { chain: string[]; ends: "domicile"; endPlanet: string }
  | { chain: string[]; ends: "loop"; loop: string[] }
  | { chain: string[]; ends: "missing"; endPlanet: string | null };

export type MutualReception = {
  planets: [string, string];
  by: "domicile" | "exaltation" | "mixed";
  detail: string;
  dignities: Record<string, string[]>;
  wholeSignAspect: string | null;
};

export type SeedConjunction = {
  pair: [string, string];
  passes: Array<{ date: string; degree: string | null; past: boolean }>;
  seedDate: string;
  seedDegree: string | null;
  distanceFromEvent: number | null;
  planetsStillInEventSign: string[];
  currentMotion: Record<string, string | null>;
};

export type IngressRulerReading = {
  planet: string;
  sign: string;
  planetDignityInSign: string[];
  ruler: string | null;
  rulerIsSelf: boolean;
  rulerCondition: PlanetCondition | null;
  rulerSeesSign: string | null;
  receivedBy: Array<{ planet: string; by: "domicile" | "exaltation" }>;
  mutualReceptionWithRuler: boolean;
};

export type NearbyIngress = { planet: string; sign: string; at: string; hoursFromEvent: number | null; reading: IngressRulerReading };
export type GoverningPlanet = { planet: string; score: number; reasons: string[] };

export type LunationReasoningFacts =
  | { version: string; status: "incomplete"; reason: string }
  | {
      version: string;
      status: "complete";
      event: { kind: "new-moon" | "full-moon" | "solar-eclipse" | "lunar-eclipse"; occursAt: string; moon: string | null; sun: string | null; weekday: string | null; dayRuler: string | null; timeZone: string };
      skyAnchor: { bodiesInLunation: unknown[]; moonBetween: [string, string] | null; otherBodiesInMoonSign: unknown[] };
      cycleAnchor: { seedConjunctions: SeedConjunction[] };
      lights: Record<string, unknown>;
      axis: unknown;
      receptions: MutualReception[];
      ingressesInWindow: NearbyIngress[];
      governingPlanet: GoverningPlanet | null;
      governingPlanetRanking: GoverningPlanet[];
    };

export type IngressReasoningFacts = {
  version: string;
  status: "complete" | "incomplete";
  event: Record<string, unknown>;
  rulerReading: IngressRulerReading;
  rulerDispositorChain: DispositorChain | null;
  receptions: MutualReception[];
  seedConjunctions: SeedConjunction[];
  otherIngressesInWindow: NearbyIngress[];
};

export const SKY_EVENT_REASONING_FACTS_VERSION: string;
export const ZODIAC_SIGNS: readonly string[];
export const TRADITIONAL_PLANETS: readonly string[];
export const DOMICILE_RULERS: Readonly<Record<string, string>>;
export const EXALTATION_RULERS: Readonly<Record<string, string>>;
export const DAY_RULERS: Readonly<Record<string, string>>;
export const SLOW_CONJUNCTIONS: ReadonlyArray<{ pair: [string, string]; passes: Array<[string, number]> }>;

export function wholeSignAspect(signA: unknown, signB: unknown): string | null;
export function dayRulerFor(occursAt: string | Date, timeZone?: string): { weekday: string; ruler: string | null; timeZone: string } | null;
export function dispositorChain(start: string, rows: ReadonlyArray<{ planet: string; sign: string }>): DispositorChain;
export function mutualReceptions(rows: ReadonlyArray<{ planet: string; sign: string }>): MutualReception[];
export function axisDignityPattern(signA: string, signB: string, rows: ReadonlyArray<{ planet: string; sign: string }>): unknown;
export function seedConjunctions(input: { occursAt: string; focusLongitude: number | null; focusSign: string; rows: ReadonlyArray<{ planet: string; sign: string; motion?: string }> }): SeedConjunction[];
export function ingressesNear(input: { occursAt: string; rows: ReadonlyArray<unknown>; windowHours?: number }): NearbyIngress[];
export function ingressRulerReading(planet: string, sign: string, rows: ReadonlyArray<unknown>): IngressRulerReading;
export function lunationReasoningFacts(input: {
  positions: ReadonlyArray<ReasoningPositionInput> | null | undefined;
  moonEvent?: { name?: string; sign?: string; occursAt?: string; eclipseType?: string | null } | null;
  occursAt?: string;
  timeZone?: string;
}): LunationReasoningFacts;
export function ingressReasoningFacts(input: {
  positions: ReadonlyArray<ReasoningPositionInput> | null | undefined;
  planet: string;
  sign: string;
  occursAt?: string;
  timeZone?: string;
}): IngressReasoningFacts;
