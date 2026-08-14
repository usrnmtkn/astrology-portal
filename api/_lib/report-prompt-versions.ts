import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const REPORT_CRITIQUE_BASELINE_PROMPT_PATH = "tldr-astro-phrasebank/TLDR-REPORT-CRITIQUE-CHECKLIST-V3-OWNER.md";
export const REPORT_CRITIQUE_PREVIOUS_PROMPT_PATH = "tldr-astro-phrasebank/TLDR-REPORT-CRITIQUE-CHECKLIST-V5-OWNER.md";
export const REPORT_CRITIQUE_PROMPT_PATH = "tldr-astro-phrasebank/TLDR-REPORT-CRITIQUE-CHECKLIST-V6-OWNER.md";
export const REPORT_CRITIQUE_CANDIDATE_PROMPT_PATH = "tldr-astro-phrasebank/TLDR-REPORT-CRITIQUE-CHECKLIST-V7-DRAFT.md";
export const REPORT_JUDGE_BASELINE_PROMPT_PATH = "tldr-astro-phrasebank/TLDR-REPORT-JUDGE-RUBRIC-V3-OWNER.md";
export const REPORT_JUDGE_PREVIOUS_PROMPT_PATH = "tldr-astro-phrasebank/TLDR-REPORT-JUDGE-RUBRIC-V3.2-OWNER.md";
export const REPORT_JUDGE_PROMPT_PATH = "tldr-astro-phrasebank/TLDR-REPORT-JUDGE-RUBRIC-V3.3-OWNER.md";
export const REPORT_JUDGE_CANDIDATE_PROMPT_PATH = "tldr-astro-phrasebank/TLDR-REPORT-JUDGE-RUBRIC-V3.4-DRAFT.md";
export const REPORT_NO_CLEVERNESS_RULING_PATH = "tldr-astro-phrasebank/TLDR-REPORT-NO-CLEVERNESS-TAX-RULING-OWNER.md";
export const REPORT_OWNER_REVIEW_EVIDENCE_PATH = "tldr-astro-phrasebank/TLDR-REPORT-OWNER-REVIEW-EVIDENCE-2026-08-11.md";
export const REPORT_REDUNDANCY_PROMPT_PATH = "tldr-astro-phrasebank/TLDR-REPORT-REDUNDANCY-PASS-V1-OWNER.md";
export const REPORT_COLD_PROSE_RULE_PATH = "tldr-astro-phrasebank/TLDR-REPORT-COLD-PROSE-RULE-OWNER.md";
export const REPORT_EARNED_SENTENCE_RULING_PATH = "tldr-astro-phrasebank/TLDR-REPORT-EARNED-SENTENCE-RULING-OWNER.md";
export const REPORT_NATURALNESS_RULING_PATH = "tldr-astro-phrasebank/TLDR-REPORT-NATURALNESS-RULING-OWNER.md";
export const REPORT_CRITIQUE_PROMPT_VERSION = "report-critique-checklist-v6";
export const REPORT_JUDGE_PROMPT_VERSION = "report-judge-rubric-v3.3";
export const REPORT_CRITIQUE_CANDIDATE_PROMPT_VERSION = "report-critique-checklist-v7-draft";
export const REPORT_JUDGE_CANDIDATE_PROMPT_VERSION = "report-judge-rubric-v3.4-draft";

export type ReportPromptMode = "active" | "naturalness_candidate";

export function loadVersionedReportPrompt(sourcePath: string) {
  const text = fs.readFileSync(path.join(process.cwd(), sourcePath), "utf8");
  const sha256 = crypto.createHash("sha256").update(text).digest("hex");
  return { sourcePath, text, sha256, version: `${path.basename(sourcePath)}:${sha256.slice(0, 16)}` };
}

function loadLayeredReportPrompt(sourcePaths: string[], version: string) {
  const sources = sourcePaths.map(loadVersionedReportPrompt);
  const text = sources
    .map((source, index) => `GOVERNED_PROMPT_LAYER_${index + 1}\nSOURCE_PATH: ${source.sourcePath}\n\n${source.text}`)
    .join("\n\n==================================================\n\n");
  const sha256 = crypto.createHash("sha256").update(text).digest("hex");
  return {
    sourcePath: sourcePaths[sourcePaths.length - 1],
    sourcePaths,
    text,
    sha256,
    version: `${version}:${sha256.slice(0, 16)}`
  };
}

export function loadActiveReportCritiquePrompt() {
  return loadLayeredReportPrompt([
    REPORT_CRITIQUE_BASELINE_PROMPT_PATH,
    REPORT_CRITIQUE_PREVIOUS_PROMPT_PATH,
    REPORT_CRITIQUE_PROMPT_PATH
  ], REPORT_CRITIQUE_PROMPT_VERSION);
}

export function loadActiveReportJudgePrompt() {
  return loadLayeredReportPrompt([
    REPORT_JUDGE_BASELINE_PROMPT_PATH,
    REPORT_JUDGE_PREVIOUS_PROMPT_PATH,
    REPORT_JUDGE_PROMPT_PATH
  ], REPORT_JUDGE_PROMPT_VERSION);
}

export function loadCandidateReportCritiquePrompt() {
  return loadLayeredReportPrompt([
    REPORT_CRITIQUE_BASELINE_PROMPT_PATH,
    REPORT_CRITIQUE_PREVIOUS_PROMPT_PATH,
    REPORT_CRITIQUE_PROMPT_PATH,
    REPORT_CRITIQUE_CANDIDATE_PROMPT_PATH
  ], REPORT_CRITIQUE_CANDIDATE_PROMPT_VERSION);
}

export function loadCandidateReportJudgePrompt() {
  return loadLayeredReportPrompt([
    REPORT_JUDGE_BASELINE_PROMPT_PATH,
    REPORT_JUDGE_PREVIOUS_PROMPT_PATH,
    REPORT_JUDGE_PROMPT_PATH,
    REPORT_JUDGE_CANDIDATE_PROMPT_PATH
  ], REPORT_JUDGE_CANDIDATE_PROMPT_VERSION);
}

export function reportSystemPromptVersions(canonicalPath: string, mode: ReportPromptMode = "active") {
  const critique = mode === "naturalness_candidate"
    ? loadCandidateReportCritiquePrompt()
    : loadActiveReportCritiquePrompt();
  const judge = mode === "naturalness_candidate"
    ? loadCandidateReportJudgePrompt()
    : loadActiveReportJudgePrompt();
  return {
    canonical: loadVersionedReportPrompt(canonicalPath),
    critique,
    judge,
    noCleverness: loadVersionedReportPrompt(REPORT_NO_CLEVERNESS_RULING_PATH),
    ownerReviewEvidence: loadVersionedReportPrompt(REPORT_OWNER_REVIEW_EVIDENCE_PATH),
    redundancy: loadVersionedReportPrompt(REPORT_REDUNDANCY_PROMPT_PATH),
    coldProse: loadVersionedReportPrompt(REPORT_COLD_PROSE_RULE_PATH),
    earnedSentence: loadVersionedReportPrompt(REPORT_EARNED_SENTENCE_RULING_PATH),
    ...(mode === "naturalness_candidate"
      ? { naturalness: loadVersionedReportPrompt(REPORT_NATURALNESS_RULING_PATH) }
      : {})
  };
}
