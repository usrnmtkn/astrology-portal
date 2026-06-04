import skyKnowledge from "@tldr/astro-knowledge/sky";
import { createDomainRegistry } from "./domainRegistry";

export const {
  approvedVoiceOrKnowledgeFallback,
  aspectContentId,
  natalAspectContentId,
  currentSkyAspectContentId,
  transitNatalContentId,
  placementContentId,
  skyPlacementContentId,
  natalPlacementContentId
} = createDomainRegistry(skyKnowledge);
