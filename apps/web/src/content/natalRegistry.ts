import natalKnowledge from "@tldr/astro-knowledge/natal";
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
} = createDomainRegistry(natalKnowledge);
