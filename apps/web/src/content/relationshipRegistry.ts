import relationshipKnowledge from "@tldr/astro-knowledge/relationships";
import { createDomainRegistry } from "./domainRegistry";

export const {
  approvedVoiceOrKnowledgeFallback,
  aspectContentId,
  currentSkyAspectContentId,
  placementContentId
} = createDomainRegistry(relationshipKnowledge);
