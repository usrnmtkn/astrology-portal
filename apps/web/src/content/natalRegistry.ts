import natalKnowledge from "@tldr/astro-knowledge/natal";
import { createDomainRegistry } from "./domainRegistry";

export const {
  approvedVoiceOrKnowledgeFallback,
  aspectContentId,
  currentSkyAspectContentId,
  placementContentId
} = createDomainRegistry(natalKnowledge);
