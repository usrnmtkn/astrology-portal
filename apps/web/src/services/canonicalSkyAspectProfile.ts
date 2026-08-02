import profile from "../../../../services/tldrastro-api/src/tldrastro_api/data/sky_aspect_profile.json" with { type: "json" };

export type CanonicalSkyAspectType =
  | "conjunction"
  | "sextile"
  | "square"
  | "trine"
  | "quincunx"
  | "opposition";

type CanonicalSkyAspectProfile = {
  id: string;
  evaluationTime: {
    kind: "fixed-local-time";
    time: string;
    description: string;
  };
  points: Array<{
    id: string;
    name: string;
    axis?: string;
    derivedFrom?: string;
    offsetDegrees?: number;
  }>;
  aspects: Array<{
    id: CanonicalSkyAspectType;
    angle: number;
    orb: number;
  }>;
  nodeAxis: {
    deduplicate: boolean;
    canonicalPoint: string;
    description: string;
  };
};

export const canonicalSkyAspectProfile = profile as CanonicalSkyAspectProfile;
export const canonicalSkyPointNames = canonicalSkyAspectProfile.points.map((point) => point.name);
export const canonicalSkyAspectDefinitions = canonicalSkyAspectProfile.aspects.map(
  (aspect) => [aspect.id, aspect.angle] as const
);
export const canonicalSkyAspectOrbs = Object.fromEntries(
  canonicalSkyAspectProfile.aspects.map((aspect) => [aspect.id, aspect.orb])
) as Record<CanonicalSkyAspectType, number>;
export const canonicalSkyEvaluationLocalTime = canonicalSkyAspectProfile.evaluationTime.time;

export function assertCanonicalSkyPoints(actualPointNames: string[]) {
  if (actualPointNames.join("|") !== canonicalSkyPointNames.join("|")) {
    throw new Error("Sky calculation points have drifted from canonical-sky-aspect-v1.");
  }
}
