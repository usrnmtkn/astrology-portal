export type SkyAspectStoryPacketEditorialStatus =
  | "approved-user-locked"
  | "approved-user"
  | "editorially-refined-review-ready";

export type SkyAspectStoryPacketInput = {
  planetA: string;
  planetB: string;
  aspect: string;
  signA?: string;
  signB?: string;
  audience?: "reader" | "admin" | "shadow";
  surface?: "sky" | "personalized";
  includeCalculatedFact?: boolean;
  signSpecificPlanetaryDynamic?: {
    text: string;
    reviewed?: boolean;
    previewOnly?: boolean;
    sourceKey?: string;
  };
};

export type SkyAspectSentenceRoles = {
  humanMoment: string;
  developmentDetail: string;
  planetaryDynamic: string;
  aspectMechanic: string;
  conditionalConsequence: string;
};

export type SkyAspectStoryPacketRecord = {
  id: string;
  order: number;
  planetA: string;
  planetB: string;
  aspect: string;
  title: string;
  editorialStatus: SkyAspectStoryPacketEditorialStatus;
  sourceEditorialStatus?: SkyAspectStoryPacketEditorialStatus;
  authoringMode: "complete-story-packet";
  collectiveLeadEligible: boolean;
  optionalCollectiveFactLead: string | null;
  sentenceRoles: SkyAspectSentenceRoles;
  body: string;
};

export type SkyAspectStoryPacketResolution = {
  headline: string;
  body: string;
  packetId: string;
  editorialStatus: SkyAspectStoryPacketEditorialStatus;
  sourceEditorialStatus: SkyAspectStoryPacketEditorialStatus;
  facts: {
    planetA: string;
    planetB: string;
    aspect: string;
    signA?: string;
    signB?: string;
    reversedInput: boolean;
  };
  sentenceRoles: SkyAspectSentenceRoles;
  provenance: {
    resolver: "sky-aspect-exact-story-packets-v10.1";
    packetId: string;
    selectionKey: string;
    fallbackLevel: "exact-aspect-story-packet";
    collectiveLeadUsed: boolean;
    planetaryDynamicSource:
      | "packet-base"
      | "admin-preview-only"
      | "reviewed-sign-substitution";
    planetaryDynamicSourceKey: string;
  };
};

export class SkyAspectStoryPacketSourceGapError extends Error {}

export function getSkyAspectStoryPacketLibrary(): {
  id: string;
  version: string;
  totalRecords: number;
  records: SkyAspectStoryPacketRecord[];
};

export function getSkyAspectStoryPacketRecords(): SkyAspectStoryPacketRecord[];

export function resolveSkyAspectStoryPacket(
  input: SkyAspectStoryPacketInput,
): SkyAspectStoryPacketResolution;

export function readerSkyAspectStoryBody(
  input: Omit<SkyAspectStoryPacketInput, "audience">,
): string;
