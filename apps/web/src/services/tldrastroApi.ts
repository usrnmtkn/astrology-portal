type DateTimeInput = {
  date: string;
  time?: string | null;
  timeKnown?: boolean;
  timeZone?: string | null;
  utc?: string | null;
};

type LocationInput = {
  label: string;
  latitude: number;
  longitude: number;
  timeZone?: string | null;
};

type ChartSettings = {
  houseSystem?: "whole_sign" | "placidus" | "koch" | "equal" | "porphyry" | "regiomontanus";
  zodiac?: "tropical" | "sidereal";
  ayanamsa?: string | null;
  aspectProfile?: "standard" | "tight";
  orbs?: Record<string, number> | null;
};

export type TldrAstroSubject = {
  name?: string | null;
  datetime: DateTimeInput;
  location: LocationInput;
  settings?: ChartSettings;
};

export type TldrAstroAppContract = {
  headline: string;
  summary: string;
  keyFactors: string[];
  timingTags: string[];
  relationshipTags: string[];
  confidence: number;
  contentFactIds: string[];
};

type TldrAstroContentFact = {
  surface: string;
  eventType: string;
  headline: string;
  priority: number;
  timeSensitivity: string;
  facts: Record<string, unknown>;
  knowledgeIds: string[];
};

type ApiEnvelope = {
  app: TldrAstroAppContract;
  contentFacts: TldrAstroContentFact[];
};

export type PersonalTimingResponse = ApiEnvelope & {
  activatedHouse: number;
  activatedSign: string;
  activatedRuler: string;
  activatedNatalPlanets: string[];
  topTransits: Array<Record<string, unknown>>;
  timingBoostedTransits: Array<Record<string, unknown>>;
};

export type RelationshipCompareResponse = ApiEnvelope & {
  relationshipThemes: Array<{
    id: string;
    label: string;
    score: number;
    source: "synastry" | "composite" | "overlay";
    knowledgeIds: string[];
  }>;
  synastry: ApiEnvelope;
  composite: ApiEnvelope;
};

type PersonalTimingRequest = {
  natalSubject: TldrAstroSubject;
  targetDatetime: DateTimeInput;
  targetLocation: LocationInput;
  settings?: ChartSettings;
  includeContentFacts?: boolean;
  maxTransits?: number;
};

type RelationshipRequest = {
  personA: TldrAstroSubject;
  personB: TldrAstroSubject;
  settings?: ChartSettings;
  includeContentFacts?: boolean;
};

const configuredBaseUrl = import.meta.env.VITE_TLDRASTRO_API_URL as string | undefined;
const tldrAstroApiBaseUrl = configuredBaseUrl?.replace(/\/$/, "") ?? "";

export const isTldrAstroApiConfigured = Boolean(tldrAstroApiBaseUrl);

async function postTldrAstro<TResponse>(path: string, body: unknown): Promise<TResponse> {
  if (!tldrAstroApiBaseUrl) {
    throw new Error("VITE_TLDRASTRO_API_URL is required to call the TLDR Astro API.");
  }

  const response = await fetch(`${tldrAstroApiBaseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`TLDR Astro API ${response.status}: ${message}`);
  }

  return response.json() as Promise<TResponse>;
}

export function getPersonalTiming(request: PersonalTimingRequest) {
  return postTldrAstro<PersonalTimingResponse>("/timing/personal", request);
}

export function compareRelationship(request: RelationshipRequest) {
  return postTldrAstro<RelationshipCompareResponse>("/relationship/compare", request);
}

export function getSynastry(request: RelationshipRequest) {
  return postTldrAstro<ApiEnvelope>("/relationship/synastry", request);
}

export function getComposite(request: RelationshipRequest) {
  return postTldrAstro<ApiEnvelope>("/relationship/composite", request);
}
