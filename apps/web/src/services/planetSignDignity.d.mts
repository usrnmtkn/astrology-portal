export type EssentialDignity = "domicile" | "exaltation" | "detriment" | "fall";
export type DignityVariant = EssentialDignity | "domicile_exaltation" | "detriment_fall" | "none";
export type PlanetSignDignity = { framework: string; planet: string; sign: string; dignities: EssentialDignity[]; variant: DignityVariant | null; status: "known" | "not_applicable" | "invalid"; reason: string };
export type TraditionalDignityPlanet = "Sun" | "Moon" | "Mercury" | "Venus" | "Mars" | "Jupiter" | "Saturn";
export type PlanetSignDebility = {
  planet: string;
  sign: string;
  dignities: Array<Extract<EssentialDignity, "detriment" | "fall">>;
};
export type TraditionalSkyDebilities = {
  framework: string;
  traditionalCount: number;
  knownCount: number;
  count: number;
  planets: PlanetSignDebility[];
};
export const DIGNITY_FRAMEWORK: string;
export const DIGNITY_VARIANTS: readonly DignityVariant[];
export const DIGNITY_SIGNS: readonly string[];
export const TRADITIONAL_DIGNITY_PLANETS: readonly TraditionalDignityPlanet[];
export function planetSignDignity(planet: unknown, sign: unknown): PlanetSignDignity;
export function planetSignDebilities(planet: unknown, sign: unknown): PlanetSignDebility["dignities"];
export function traditionalSkyDebilities(positions: ReadonlyArray<{ planet?: unknown; sign?: unknown }> | null | undefined): TraditionalSkyDebilities;
