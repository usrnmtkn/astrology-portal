import fs from "node:fs";
import { DEFAULT_BANNED, NEGATION_PIVOT_PAGE_CAP, STOCK_TROPES } from "../../src/astro-writing/validateCopy.mjs";
import { WRITING_POLICY_DATA } from "../../src/astro-writing/policyData.generated.mjs";

export const GENERATED_REPORT_WRITING_CONTRACT_PATH = "tldr-astro-phrasebank/TLDR-GENERATED-REPORT-BREADTH-AND-VOICE-V1.md";

export function generatedReportWritingContract() {
  return fs.readFileSync(GENERATED_REPORT_WRITING_CONTRACT_PATH, "utf8");
}

// Use the validator's current policy rather than maintaining a second list in
// prompt prose. This applies to newly generated reader copy, not source evidence.
export function generatedReportLanguageContract() {
  const contextualPolicies = (WRITING_POLICY_DATA.wordPolicies ?? [])
    .filter((entry) => !["HARD_BAN", "WAIVED"].includes(entry.policyClass));
  return [
    "EXISTING READER-COPY VALIDATION RULES",
    "Apply these rules to every generated reader field on the first draft and every revision. Preserve supplied source evidence unchanged.",
    `Forbidden words and phrases: ${JSON.stringify([...new Set(DEFAULT_BANNED)])}`,
    `Forbidden stock examples: ${JSON.stringify(STOCK_TROPES)}`,
    "Generated reader text must be ASCII only: use straight quotation marks and apostrophes; do not use em or en dashes.",
    `Use at most ${NEGATION_PIVOT_PAGE_CAP} negation pivot across the visible TLDR and body combined. This includes not-X-but-Y, the-problem-is-not, and is-not-X/it-is-Y constructions. Count the tldr/summary storage aliases once.`,
    "The following word policies retain their existing scope. AI_TELL_PREVENTIVE is blocking only in a matched context; a matching literalContextPatterns exception permits the literal use. contextPatterns restrict a rule when supplied. EDITORIAL_REVIEW and REPLACEMENT_SUGGESTION are advisory, not bans. WAIVED terms are omitted. Patterns are case-insensitive regular expressions. Suggested alternatives do not authorize new claims or substitute for the supplied owner voice evidence.",
    `Contextual and advisory word policies: ${JSON.stringify(contextualPolicies)}`,
    "These mechanical checks do not establish writing quality. Develop the supplied meaning in the owner's language and sentence movement; the independent review still applies."
  ].join("\n");
}
