import {
  CARD_WRITING_INSTRUCTIONS_VERSION,
  CANONICAL_REVIEWER_INSTRUCTIONS_VERSION,
  CANONICAL_WRITING_INSTRUCTIONS_VERSION
} from "./canonicalInstructions.mjs";

export const WRITING_COMPONENT_VERSIONS = Object.freeze({
  astrology_contract: "owner-contract-2026-08-09",
  writing_contract: CANONICAL_WRITING_INSTRUCTIONS_VERSION,
  review_rubric: CANONICAL_REVIEWER_INSTRUCTIONS_VERSION,
  owner_corpus: "owner-corpus-through-2026-08-09",
  fixture_set: "lilith-vertical-slice-v1-2026-08-09",
  writer_prompt: CANONICAL_WRITING_INSTRUCTIONS_VERSION,
  reviewer_prompt: CANONICAL_REVIEWER_INSTRUCTIONS_VERSION
});

export function writeGenerationMetadata({ role, model = null, reasoningEffort = null, sourceIds = [] } = {}) {
  const cardCandidate = String(role ?? "").startsWith("CARD_");
  return {
    role: role ?? "WRITER",
    model,
    reasoningEffort,
    components: {
      ...WRITING_COMPONENT_VERSIONS,
      ...(cardCandidate ? { writer_prompt: CARD_WRITING_INSTRUCTIONS_VERSION } : {})
    },
    sourceIds: [...new Set(sourceIds)].sort()
  };
}

export function attachGenerationMetadata(output, metadata) {
  return { ...output, generation_metadata: metadata };
}
