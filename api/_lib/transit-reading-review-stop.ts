export const REPORT_REVIEW_REQUIRED = "Report review required:";
export const REPORT_REVIEW_REQUIRED_MESSAGE = "This report needs review before it can finish. Automatic rewriting has stopped.";

export class TransitReadingReviewRequiredError extends Error {
  readonly code = "TRANSIT_READING_REVIEW_REQUIRED";
  constructor(readonly diagnostic: { reason: string; draftSha256: string; detail?: unknown }, options?: ErrorOptions) {
    super(`${REPORT_REVIEW_REQUIRED} ${REPORT_REVIEW_REQUIRED_MESSAGE}`, options);
    this.name = "TransitReadingReviewRequiredError";
  }
}

export function isTransitReadingReviewRequiredError(error: unknown): error is TransitReadingReviewRequiredError {
  return error instanceof TransitReadingReviewRequiredError;
}

export function isReportReviewHeld(job: { state: string; last_error?: string | null }) {
  return job.state === "failed" && hasCompletedReportReview(job.last_error);
}

export function hasCompletedReportReview(message?: string | null) {
  return Boolean(message?.startsWith(REPORT_REVIEW_REQUIRED)
    || message?.startsWith("Writing quality gate did not pass after one corrective rewrite and re-judge."));
}

/** Only call around review, so a bad writer response is not mislabeled as a bad evaluator. */
export function isInvalidReportReview(error: unknown) {
  const seen = new Set<unknown>();
  while (error instanceof Error && !seen.has(error)) {
    seen.add(error);
    if (["ReportModelResponseRejectedError", "GeneratedReportJudgeEvidenceError"].includes(error.name)) return true;
    error = error.cause;
  }
  return false;
}
