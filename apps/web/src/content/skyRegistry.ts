import sharedKnowledge from "@tldr/astro-knowledge/shared-web";
import skyRuntimeKnowledge from "@tldr/astro-knowledge/sky-runtime-web";
import { createDomainRegistry } from "./domainRegistry";

const skyKnowledge = { ...sharedKnowledge, ...skyRuntimeKnowledge };

export const {
  approvedExactSkyAspectCopy,
  skyCalendarComposedCard,
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
