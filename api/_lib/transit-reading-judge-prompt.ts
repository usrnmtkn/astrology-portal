import { loadVersionedReportPrompt, REPORT_JUDGE_BASELINE_PROMPT_PATH,
  REPORT_JUDGE_FOUNDATION_PROMPT_PATH, REPORT_JUDGE_PREVIOUS_PROMPT_PATH,
  REPORT_JUDGE_PROMPT_PATH } from "./report-prompt-versions.js";

export const GENERATED_REPORT_JUDGE_RUBRIC_PATHS = [
  REPORT_JUDGE_BASELINE_PROMPT_PATH, REPORT_JUDGE_FOUNDATION_PROMPT_PATH,
  REPORT_JUDGE_PREVIOUS_PROMPT_PATH, REPORT_JUDGE_PROMPT_PATH
] as const;

// Preserve the approved evaluation rules verbatim. Only the premium transport
// sections are replaced by the short-report schema; source documents stay intact.
export function generatedReportJudgeRubric() {
  return GENERATED_REPORT_JUDGE_RUBRIC_PATHS.map(path => {
    const source = loadVersionedReportPrompt(path);
    const sections = source.text.split(/(?=^## )/mu);
    const rules = sections.filter(section => !/^## Output (?:contract|and verdict)\s*$/mu.test(section)).join("");
    return `GOVERNED REPORT RUBRIC\nSOURCE_PATH: ${path}\nSOURCE_SHA256: ${source.sha256}\n${rules}`;
  }).join("\n\n");
}

export const GENERATED_REPORT_JUDGE_PACKET_CONTRACT = [
  "ROLE: GENERATED REPORT REVIEWER",
  "Evaluate the supplied report against the complete approved report rubric and its short-report adapter. Do not presume a defect; return an empty findings array when no defect is supported.",
  "The rubric layers below are in chronological order; later amendments and the short-report adapter govern their stated scope. Premium output-contract sections are omitted because this call uses the short-report response schema below. No card-review instructions apply.",
  "PACKET MAPPING: COMPLETE READER-VISIBLE DRAFT is COMPLETE_UNIT and RENDERED_UNIT. GOVERNED BRIEF is UNIT_FACTS. EXACT OWNER-AUTHORED REPORT VOICE EVIDENCE is OWNER_COMPARISON_SET; each passage includes its supplied function. Labeled negative examples in the rubric are negative evidence only. Deterministic validation has passed for this draft, which establishes neither prose quality nor semantic correctness.",
  "REFERENCE ROUTING v1.7: the supplied reference packet replaces the historical overview-only retrieval described in adapter v1.2. It contains connected report development and, when provisioned, a complete short forecast selected for the target horizon. Use its declared reference roles and comparison scope; the underlying rubric and release floors have not changed. Missing short-format coverage is a reference-coverage limitation, never evidence that the draft is badly written.",
  "Read the rendered prose and owner comparisons first for prose categories. Consult the brief for factual categories afterward; source explanations cannot rescue unclear prose. These are two evaluation lenses within this call, not context-isolated model calls.",
  "The fixed product headline is metadata, not editable writer prose. Do not demand a new headline or grade it as an invented voice choice. The visible TLDR and body are distinct substantive prose paragraphs; count the tldr/summary aliases once. The short-report schema therefore scores movement across that complete unit.",
  "Findings use the short-report categories: owner_voice_drift maps to owner_voice, density_violation to density, interpretive_gap to interpretive_movement, and unlived_abstraction to lived_experience. Only diagnose observable differences, never missing biography or a demand to copy an owner's wording.",
  "Before scoring, distinguish a source contradiction or unsupported claim from an editorial weakness. For a factual objection, identify the precise added claim and the missing or contradictory brief support. For an editorial objection, identify what the reader cannot follow, what is repeated without development, or what differs from an applicable owner comparison. Do not use an owner passage as factual evidence, or reclassify a subjective preference as unsupported astrology. A high prose score does not excuse an unsupported claim, and an unsupported claim does not independently establish voice drift.",
  "Score 4 means the category satisfies its supplied rubric, not that no stronger alternative could ever be written. Judge the complete causal development, useful distinctions, and consequence; grammatical compliance and a smooth ending do not establish those qualities. Do not invent a weakness to avoid a perfect score or reward a weaker report solely because it avoids stylistic risks.",
  "OUTPUT CONTRACT: Return the diagnostic fields required by the supplied response schema: scores and findings, plus reconciliation for a correction review. Do not return PASS/REVISE, a verdict, overall, applicability, or replacement prose. Runtime computes the verdict. The existing 0.85 threshold, hard gates, and 4/4 owner_voice and natural_language release floors remain unchanged. A score of 3 still means minor drift under the rubric, even where the release floor requires 4."
].join("\n");
