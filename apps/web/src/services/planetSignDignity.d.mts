export type EssentialDignity = "domicile" | "exaltation" | "detriment" | "fall";
export type DignityVariant = EssentialDignity | "domicile_exaltation" | "detriment_fall" | "none";
export type PlanetSignDignity = { framework: string; planet: string; sign: string; dignities: EssentialDignity[]; variant: DignityVariant | null; status: "known" | "not_applicable" | "invalid"; reason: string };
export const DIGNITY_FRAMEWORK: string;
export const DIGNITY_VARIANTS: readonly DignityVariant[];
export const DIGNITY_SIGNS: readonly string[];
export function planetSignDignity(planet: unknown, sign: unknown): PlanetSignDignity;
