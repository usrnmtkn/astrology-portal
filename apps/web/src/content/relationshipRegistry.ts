import sharedKnowledge from "@tldr/astro-knowledge/shared-web";
import relationshipCompositeKnowledge from "@tldr/astro-knowledge/relationships-composite-web";
import relationshipSynastryKnowledge from "@tldr/astro-knowledge/relationships-synastry-web";
import { createDomainRegistry } from "./domainRegistry";

const relationshipKnowledge = {
  ...sharedKnowledge,
  ...relationshipSynastryKnowledge,
  ...relationshipCompositeKnowledge
};

export const {
  approvedVoiceOrKnowledgeFallback,
  retrogradePlanetMeaning,
  aspectContentId,
  natalAspectContentId,
  currentSkyAspectContentId,
  transitNatalContentId,
  placementContentId,
  skyPlacementContentId,
  natalPlacementContentId
} = createDomainRegistry(relationshipKnowledge);
