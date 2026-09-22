import { createHash } from "node:crypto";
import { transitReadingReaderCopy } from "./transit-reading-reader-copy.js";
import { GENERATED_REPORT_JUDGE_CATEGORIES, type GeneratedReportJudgeCategory } from "./transit-reading-judge-rules.js";
import type { ReportModelUsage } from "./report-model-client.js";

export const SCOPED_REVIEW_VERSION = "generated-report-scoped-review-v1.8";
export const SCOPED_REVIEW_SCHEMAS = {
  facts: "tldr_generated_report_facts_judge",
  writing: "tldr_generated_report_writing_judge"
} as const;
export type TransitReadingReviewScope = keyof typeof SCOPED_REVIEW_SCHEMAS;
export type TransitReadingReviewMode = "combined" | "scoped";
export const FACT_REVIEW_CATEGORIES = ["astrology_chronology", "factual_traceability"] as const;
export const WRITING_REVIEW_CATEGORIES = GENERATED_REPORT_JUDGE_CATEGORIES.filter(
  category => !FACT_REVIEW_CATEGORIES.includes(category as typeof FACT_REVIEW_CATEGORIES[number])
);
export const REVIEW_CATEGORIES: Record<TransitReadingReviewScope, readonly GeneratedReportJudgeCategory[]> = {
  facts: FACT_REVIEW_CATEGORIES, writing: WRITING_REVIEW_CATEGORIES
};
export const REVIEW_FINDINGS = {
  facts: [...FACT_REVIEW_CATEGORIES, "over_specification", "unsupported_interpretation", "unsupported_timing"],
  writing: [...WRITING_REVIEW_CATEGORIES, "narrative_repetition", "owner_language"]
} as const;

// Experimental opt-in only. Production remains on the current combined gate
// until the separately documented calibration and release gates are satisfied.
export function transitReadingReviewMode(): TransitReadingReviewMode {
  const mode = process.env.GENERATED_REPORT_REVIEW_MODE?.trim() || "combined";
  if (mode !== "combined" && mode !== "scoped") throw new Error("Invalid generated report review mode.");
  return mode;
}

export function transitReadingDraftHash(draft: Parameters<typeof transitReadingReaderCopy>[0]) {
  return createHash("sha256").update(JSON.stringify(transitReadingReaderCopy(draft))).digest("hex");
}

export type TransitReadingScopedReviewReceipt = {
  scope: TransitReadingReviewScope;
  draftSha256: string;
  requestSha256: string;
  responseSha256: string;
  provider: string;
  model: string;
  responseId?: string;
  usage: ReportModelUsage;
};
