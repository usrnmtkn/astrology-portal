import skyKnowledge from "@tldr/astro-knowledge/sky";
import { createDomainRegistry } from "./domainRegistry";

export const {
  approvedVoiceOrKnowledgeFallback,
  aspectContentId,
  currentSkyAspectContentId,
  placementContentId
} = createDomainRegistry(skyKnowledge);
