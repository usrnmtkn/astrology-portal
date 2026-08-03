import skyKnowledge from "@tldr/astro-knowledge/sky-web";
import { createDomainRegistry } from "./domainRegistry";

export const {
  approvedExactSkyAspectCopy,
  approvedVoiceOrKnowledgeFallback,
  retrogradePlanetMeaning,
  aspectContentId,
  natalAspectContentId,
  currentSkyAspectContentId,
  transitNatalContentId,
  placementContentId,
  skyPlacementContentId,
  natalPlacementContentId
} = createDomainRegistry(skyKnowledge);
