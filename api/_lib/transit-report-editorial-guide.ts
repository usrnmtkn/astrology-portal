/** Owner direction from 2026-09-23, thread 01a0c440-92d0-7822-bda6-af3338840786.
 * Rules only. The private approved report is an editorial benchmark, never
 * factual input or an example bank for another person's chart. */
export const TRANSIT_REPORT_EDITORIAL_VERSION = "transit-report-plain-language-v1";

export function transitReportEditorialGuide() {
  return [
    `CURRENT OWNER REPORT DIRECTION: ${TRANSIT_REPORT_EDITORIAL_VERSION} (2026-09-23)`,
    "These report-specific directions supersede older instructions demanding an exact prewritten scene, a fixed paragraph movement, or a short Friends word target. Preserve all factual, source-protection, and privacy boundaries.",
    "Write for understanding on the first read. Use everyday words. Name what the person might do, what they are waiting for, or what they need to say, and explain why it could matter to them.",
    "Explain the emotional reason plainly without inventing a psychological history, motives, relationship status, trauma, or a guaranteed outcome. Connect the action to its consequence in the same passage.",
    "One hypothetical ordinary example may clarify a meaning already supplied in the governed reader text. It need not repeat a prewritten scene verbatim. Mark it as a possibility with if, may, might, or could. The source must support both its life domain and its emotional/causal meaning. A technical planet or house label alone does not license an example. Do not add a fact, biography, medical claim, or outcome, or transplant an anecdote from a voice benchmark.",
    "Keep natural connected sentences. Explain reasons and conditions with words such as because, if, and when where useful. Avoid strings of declarations, overloaded clauses, and a fixed sentence-length target.",
    "Give each transit its own supported experience. Do not make every passage about overwork, boundaries, apologizing, or asking for help. Vary the paragraph structure and where the astrology appears. An example or advice is optional, never a required closing beat.",
    "Replace abstract or clever phrasing with its meaning. If the reader cannot tell what the situation, arrangement, friction, pressure, practical response, or it refers to, name it. Remove unnecessary metaphors, forced symmetry, repeated advice, and clever closing lines. Do not solve an unclear sentence by adding another sentence that explains it.",
    "Organize one report: explain how immediate conditions and longer transits relate only where the supplied meanings support that connection. Do not invent a shared story to join unrelated transits. Discuss each distinct contact once; preserve separate contacts or windows when their timing differs. Make the TLDR reflect the main body rather than copy the daily forecast automatically.",
    "Use one date style: spelled-out month, day, and year when the year is explicitly supplied. Preserve supplied facts and dates. If an end year is missing or sources conflict, do not infer a year from the report date, import one from the benchmark, or imply a precise chronology; leave that timing claim out of new prose and record it for input review separately.",
    "In Friends reports use the friend and they/them for personal conditions. Put any reader relationship material in a final section labeled exactly '## Between you and <friend name>'. Only supplied relationship connections authorize that section or its second person. In You reports retain you/your throughout.",
    "The approved writing benchmark is for a separate editorial comparison, not astrology facts or material to insert in a fresh report. Preserve it verbatim. Judge clarity by reading the complete passage, not a banned-word count or readability score. New writing remains for owner review."
  ].join("\n");
}

export function transitReportEditorialReviewGuide() {
  return [transitReportEditorialGuide(),
    "REVIEW APPLICATION: Distinguish a hypothetical illustration of supplied meaning from an assertion about the person's actual life. A scene is not unsupported solely because its exact nouns are absent from the source. Identify the unsupported domain, cause, claim, or conclusion if diagnosing an invention; hedging does not rescue an unsupported claim.",
    "Compare the complete wording for clear actions, emotional reasons, and consequences. Do not require an example, advice, a contrast, or a fixed structure in every passage. The explicit Friends relationship section licenses a clear change of viewpoint; it does not license new chart connections. Existing review thresholds and evidence citations still apply."
  ].join("\n\n");
}
