import { transitReadingReaderCopy } from "./transit-reading-reader-copy.js";
import { GENERATED_REPORT_JUDGE_CATEGORIES, GENERATED_REPORT_JUDGE_FINDING_CATEGORIES,
  type GeneratedReportJudgeFinding, type GeneratedReportJudgeScores } from "./transit-reading-judge-rules.js";

export function findingScoreCategory(category: GeneratedReportJudgeFinding["category"]) {
  if (GENERATED_REPORT_JUDGE_CATEGORIES.includes(category as keyof GeneratedReportJudgeScores)) return category as keyof GeneratedReportJudgeScores;
  const blockingScores: Partial<Record<GeneratedReportJudgeFinding["category"], keyof GeneratedReportJudgeScores>> = {
    over_specification: "factual_traceability", unsupported_interpretation: "factual_traceability",
    unsupported_timing: "astrology_chronology", narrative_repetition: "interpretive_movement", owner_language: "owner_voice"
  };
  return blockingScores[category]!;
}

export const GENERATED_REPORT_JUDGE_EVIDENCE_CONTRACT = [
  "DIAGNOSTIC EVIDENCE CONTRACT",
  "Every finding must diagnose a defect, quote its exact reader-visible wording in draftQuote, and explain why it fails the supplied rubric. Do not propose replacement prose.",
  "Copy draftQuote as one contiguous substring of a single reader-visible field, preserving its exact punctuation and whitespace. Never shorten it with an ellipsis, join separate sentences or paragraphs, or paraphrase. For a defect spanning passages, quote one exact passage and identify the other location in finding; use separate findings when they diagnose separate defects. Apply the same exact-substring rule to sourceQuote.",
  "Use sourcePath as an RFC 6901 JSON pointer into GOVERNED BRIEF and sourceQuote as an exact excerpt from that string when comparing a claim with its source. If no supplied passage supports the claim, use null for both and name the missing support in finding. For style-only findings, both may also be null.",
  "Every owner_voice finding requires at least one ownerComparisons entry: cite an eligible OWNER PASSAGE evidenceId, one exact contiguous quote from it, and explain the observable difference in sentence movement, ordinary wording, consequence, or judgment, using its supplied function. A statement that the tone does not match is insufficient. Do not cite the candidate or another report. Other categories may use an empty array; owner_language identifies an explicit contextual owner rule rather than general likeness.",
  "Necessary reference to a TLDR topic is not itself narrative repetition. Identify the repeated conclusion that adds no explanation or consequence. An explanation within supplied meaning and life domains is not an invented event. A transit end date or retrograde theme does not establish that a specific opportunity will recur.",
  "Scores must agree with findings: a category with a defect cannot score 4. Map over_specification and unsupported_interpretation to factual_traceability; unsupported_timing to astrology_chronology; narrative_repetition to interpretive_movement; owner_language to owner_voice. Other findings map to their own score category.",
  "For any score below a release floor, include a finding with concrete draft evidence. Do not lower a score merely to manufacture agreement: reconsider the finding against the source and rubric first. Do not invent a flaw to fill a category."
].join("\n");

/** Check diagnostic integrity; the approved rubric still determines quality. */
export function assertGeneratedReportJudgeEvidence(value: unknown, input: {
  draft: { headline: string; summary: string; body: string }; brief: unknown;
  ownerComparisonSet?: ReadonlyArray<{ evidenceId: string; text: string }>;
}): { scores: GeneratedReportJudgeScores; findings: GeneratedReportJudgeFinding[] } {
  const fail = (message: string): never => { throw new Error(`Generated report judge diagnostic invalid: ${message}`); };
  if (!value || typeof value !== "object" || Array.isArray(value)) return fail("expected scores and findings.");
  const payload = value as { scores: GeneratedReportJudgeScores; findings: GeneratedReportJudgeFinding[] };
  if (!payload.scores || typeof payload.scores !== "object" || !Array.isArray(payload.findings)) return fail("missing scores or findings.");
  for (const category of GENERATED_REPORT_JUDGE_CATEGORIES) {
    const score = payload.scores[category];
    if (!Number.isFinite(score) || score < 0 || score > 4) return fail(`invalid ${category} score.`);
  }
  const fields = Object.values(transitReadingReaderCopy(input.draft));
  for (const finding of payload.findings) {
    if (!finding || !GENERATED_REPORT_JUDGE_FINDING_CATEGORIES.includes(finding.category)
      || typeof finding.location !== "string" || !finding.location.trim()
      || typeof finding.finding !== "string" || !finding.finding.trim()) return fail("malformed finding.");
    if (typeof finding.draftQuote !== "string" || !finding.draftQuote.trim()
      || !fields.some(field => field.includes(finding.draftQuote!))) return fail("draftQuote does not occur in reader-visible copy.");
    if (payload.scores[findingScoreCategory(finding.category)] === 4) return fail("finding contradicts a perfect category score.");
    if (!Array.isArray(finding.ownerComparisons)) return fail("ownerComparisons must be an array.");
    if (finding.category === "owner_voice" && !finding.ownerComparisons.length) return fail("owner_voice lacks eligible comparison evidence.");
    const cited = new Set<string>();
    for (const comparison of finding.ownerComparisons) {
      const passage = input.ownerComparisonSet?.find(entry => entry.evidenceId === comparison?.evidenceId);
      if (!passage || cited.has(comparison.evidenceId)) return fail("owner comparison evidence is ineligible or duplicated.");
      cited.add(comparison.evidenceId);
      if (typeof comparison.quote !== "string" || !comparison.quote.trim() || !passage.text.includes(comparison.quote)) return fail("owner comparison quote is not exact.");
      if (typeof comparison.difference !== "string" || !comparison.difference.trim()) return fail("owner comparison needs an observable difference.");
    }
    if (finding.sourcePath === null && finding.sourceQuote === null) continue;
    if (typeof finding.sourcePath !== "string" || !finding.sourcePath.startsWith("/")
      || typeof finding.sourceQuote !== "string" || !finding.sourceQuote.trim()) return fail("source citation must contain both path and quote, or two nulls.");
    let source: unknown = input.brief;
    for (const key of finding.sourcePath.slice(1).split("/").map(part => part.replace(/~1/gu, "/").replace(/~0/gu, "~"))) {
      if (!source || typeof source !== "object" || !Object.hasOwn(source, key)) return fail("sourcePath does not exist in the governed brief.");
      source = (source as Record<string, unknown>)[key];
    }
    if (typeof source !== "string" || !source.includes(finding.sourceQuote)) return fail("sourceQuote does not occur at sourcePath.");
  }
  const floor: Partial<GeneratedReportJudgeScores> = { astrology_chronology: 3, factual_traceability: 3, lived_experience: 3, interpretive_movement: 3, owner_voice: 4, natural_language: 4 };
  for (const [category, minimum] of Object.entries(floor)) {
    if (payload.scores[category as keyof GeneratedReportJudgeScores] < minimum
      && !payload.findings.some(finding => findingScoreCategory(finding.category) === category)) return fail(`below-floor ${category} score has no diagnostic evidence.`);
  }
  return payload;
}
