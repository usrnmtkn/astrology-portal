export const NATAL_WRITING_GATE_POLICY_VERSION = "natal-writing-gates-v2-semantic-quality-2026-08-13";

export const NATAL_ADVISORY_DETERMINISTIC_CATEGORIES = Object.freeze(new Set([
  "abstract_noun_subject",
  "abstract_subject_grammar",
  "archetype_soup",
  "astrology_summary",
  "chart_deixis",
  "example_proves_astrology",
  "generic_self_help",
  "invented_motive",
  "literal_first_read_clarity",
  "metaphor_requires_translation",
  "observable_behavior",
  "photograph_test",
  "stock_trope",
  "therapy_register_cluster",
  "trait_entry",
  "whole_passage_sentence_role",
  "zero_concrete_nouns"
]));

export function isNatalAuthoringFamily(family) {
  return /^natal(?:-|$)/iu.test(String(family || ""));
}

export function classifyNatalDeterministicFindings(violations = []) {
  const blocking = [];
  const advisory = [];
  for (const violation of violations) {
    (NATAL_ADVISORY_DETERMINISTIC_CATEGORIES.has(violation.category) ? advisory : blocking).push(violation);
  }
  return {
    policyVersion: NATAL_WRITING_GATE_POLICY_VERSION,
    passed: blocking.length === 0,
    blocking,
    advisory
  };
}
