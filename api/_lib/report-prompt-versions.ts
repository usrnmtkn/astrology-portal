import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const REPORT_CRITIQUE_PROMPT_PATH = "tldr-astro-phrasebank/TLDR-REPORT-CRITIQUE-CHECKLIST-V3-OWNER.md";
export const REPORT_JUDGE_PROMPT_PATH = "tldr-astro-phrasebank/TLDR-REPORT-JUDGE-RUBRIC-V3-OWNER.md";
export const REPORT_NO_CLEVERNESS_RULING_PATH = "tldr-astro-phrasebank/TLDR-REPORT-NO-CLEVERNESS-TAX-RULING-OWNER.md";
export const REPORT_OWNER_REVIEW_EVIDENCE_PATH = "tldr-astro-phrasebank/TLDR-REPORT-OWNER-REVIEW-EVIDENCE-2026-08-11.md";
export const REPORT_REDUNDANCY_PROMPT_PATH = "tldr-astro-phrasebank/TLDR-REPORT-REDUNDANCY-PASS-V1-OWNER.md";
export const REPORT_CRITIQUE_PROMPT_VERSION = "report-critique-checklist-v3";
export const REPORT_JUDGE_PROMPT_VERSION = "report-judge-rubric-v3.1";

export function loadVersionedReportPrompt(sourcePath: string) {
  const text = fs.readFileSync(path.join(process.cwd(), sourcePath), "utf8");
  const sha256 = crypto.createHash("sha256").update(text).digest("hex");
  return { sourcePath, text, sha256, version: `${path.basename(sourcePath)}:${sha256.slice(0, 16)}` };
}

export function reportSystemPromptVersions(canonicalPath: string) {
  return {
    canonical: loadVersionedReportPrompt(canonicalPath),
    critique: loadVersionedReportPrompt(REPORT_CRITIQUE_PROMPT_PATH),
    judge: loadVersionedReportPrompt(REPORT_JUDGE_PROMPT_PATH),
    noCleverness: loadVersionedReportPrompt(REPORT_NO_CLEVERNESS_RULING_PATH),
    ownerReviewEvidence: loadVersionedReportPrompt(REPORT_OWNER_REVIEW_EVIDENCE_PATH),
    redundancy: loadVersionedReportPrompt(REPORT_REDUNDANCY_PROMPT_PATH)
  };
}
