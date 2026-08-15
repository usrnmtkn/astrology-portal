import {
  CARD_WRITING_INSTRUCTIONS_VERSION,
  CANONICAL_REVIEWER_INSTRUCTIONS_VERSION,
  CANONICAL_WRITING_INSTRUCTIONS_VERSION
} from "./canonicalInstructions.mjs";
import { SPINE_REGISTRY_VERSION } from "./spineRegistry.mjs";

export const WRITING_COMPONENT_VERSIONS = Object.freeze({
  pipeline: "writing-pipeline-v3-sky-placement-spine-2026-08-14",
  argument_gate: "argument-outline-v3-sky-placement-spine-2026-08-14",
  content_spines: SPINE_REGISTRY_VERSION,
  correction_pair_selector: "owner-correction-pairs-v1-2026-08-12",
  deterministic_layer: "writing-deterministic-v6-sky-placement-spine-2026-08-14",
  astrology_contract: "owner-contract-2026-08-09",
  writing_contract: CANONICAL_WRITING_INSTRUCTIONS_VERSION,
  review_rubric: CANONICAL_REVIEWER_INSTRUCTIONS_VERSION,
  owner_corpus: "owner-corpus-through-2026-08-09",
  fixture_set: "lilith-vertical-slice-v1-2026-08-09",
  writer_prompt: CANONICAL_WRITING_INSTRUCTIONS_VERSION,
  reviewer_prompt: CANONICAL_REVIEWER_INSTRUCTIONS_VERSION,
  shared_evidence: "shared-evidence-standard-v1-2026-08-13",
  surface_register_contract: "surface-register-contract-v1-2026-08-15"
});

export function writeGenerationMetadata({ role, provider = null, model = null, reasoningEffort = null, thinkingLevel = null, sourceIds = [], evidencePacket = null } = {}) {
  const cardCandidate = String(role ?? "").startsWith("CARD_");
  return {
    role: role ?? "WRITER",
    provider,
    model,
    reasoningEffort,
    thinkingLevel,
    components: {
      ...WRITING_COMPONENT_VERSIONS,
      ...(cardCandidate ? { writer_prompt: CARD_WRITING_INSTRUCTIONS_VERSION } : {})
    },
    sourceIds: [...new Set(sourceIds)].sort(),
    evidencePacket
  };
}

export function attachGenerationMetadata(output, metadata) {
  return { ...output, generation_metadata: metadata };
}
