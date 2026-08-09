import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const REPORT_CRITIQUE_PROMPT_PATH = "tldr-astro-phrasebank/TLDR-REPORT-CRITIQUE-CHECKLIST-OWNER.md";
export const REPORT_JUDGE_PROMPT_PATH = "tldr-astro-phrasebank/TLDR-REPORT-JUDGE-RUBRIC-OWNER.md";

export function loadVersionedReportPrompt(sourcePath: string) {
  const text = fs.readFileSync(path.join(process.cwd(), sourcePath), "utf8");
  const sha256 = crypto.createHash("sha256").update(text).digest("hex");
  return { sourcePath, text, sha256, version: `${path.basename(sourcePath)}:${sha256.slice(0, 16)}` };
}

export function reportSystemPromptVersions(canonicalPath: string) {
  return {
    canonical: loadVersionedReportPrompt(canonicalPath),
    critique: loadVersionedReportPrompt(REPORT_CRITIQUE_PROMPT_PATH),
    judge: loadVersionedReportPrompt(REPORT_JUDGE_PROMPT_PATH)
  };
}
