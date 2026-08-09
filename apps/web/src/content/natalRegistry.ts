import sharedKnowledge from "@tldr/astro-knowledge/shared-web";
import natalInsightsKnowledge from "@tldr/astro-knowledge/natal-insights-web";
import natalPlacementsKnowledge from "@tldr/astro-knowledge/natal-placements-web";
import natalTransitsKnowledge from "@tldr/astro-knowledge/natal-transits-web";
import { createDomainRegistry } from "./domainRegistry";

const natalKnowledge = {
  ...sharedKnowledge,
  ...natalInsightsKnowledge,
  ...natalTransitsKnowledge,
  ...natalPlacementsKnowledge
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
} = createDomainRegistry(natalKnowledge);
