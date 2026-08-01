export type SkyAspectType =
  | "conjunction"
  | "sextile"
  | "square"
  | "trine"
  | "quincunx"
  | "opposition";

export type SkyAspectPosition = {
  planet?: string;
  point?: string;
  longitude: number;
  speed?: number | null;
};

export type CalculatedSkyAspect = {
  id: string;
  bodyA: string;
  bodyB: string;
  from: string;
  to: string;
  type: SkyAspectType;
  exactAngle: number;
  separation: number;
  orb: number;
  applying: boolean;
};

export const SKY_ASPECT_DEFINITIONS: ReadonlyArray<Readonly<{
  type: SkyAspectType;
  exactAngle: number;
  maxOrb: number;
}>>;
export const SKY_ASPECT_POINT_ORDER: readonly string[];

export function normalizeDegrees(degrees: number): number;
export function shortestAngleDistance(degrees: number): number;
export function angularSeparation(first: number, second: number): number;
export function canonicalizeNodeAxisAspects<T extends {
  from: string;
  to: string;
  orb: number;
}>(aspects: T[]): T[];
export function calculateSkyAspects(positions: SkyAspectPosition[]): CalculatedSkyAspect[];
