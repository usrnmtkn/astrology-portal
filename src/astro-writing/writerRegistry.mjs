export const CURRENT_PRODUCTION_WRITER = null;

export const CANDIDATE_WRITER = Object.freeze({
  laneId: "writer:sky-placement",
  releaseId: "sky-placement-writer-openai-gpt-5.6-sol-candidate-v2",
  model: "gpt-5.6-sol",
  reasoningEffort: "xhigh",
  promoted: false
});

export function validateWriterPromotion(report) {
  const failures = [];
  if (report?.goldPassed !== 12) failures.push("all 12 owner-locked gold fixtures must PASS");
  if (report?.negativePassed !== 8) failures.push("all 8 negative fixtures must be rejected with expected categories");
  if ((report?.falsePositives ?? 0) !== 0) failures.push("false positives must be zero");
  if ((report?.falseNegatives ?? 0) !== 0) failures.push("false negatives must be zero");
  if ((report?.blockingRegressions ?? 0) !== 0) failures.push("blocking regressions must be zero");
  return { passed: failures.length === 0, failures };
}

export function promoteCandidateWriter(report, { exactOwnerAuthorization } = {}) {
  const validation = validateWriterPromotion(report);
  if (!validation.passed) throw new Error(`Candidate writer promotion blocked: ${validation.failures.join("; ")}`);
  if (typeof exactOwnerAuthorization !== "string" || !exactOwnerAuthorization.trim()) {
    throw new Error("Candidate writer promotion requires explicit owner authorization.");
  }
  return { ...CANDIDATE_WRITER, promoted: true, exactOwnerAuthorization: exactOwnerAuthorization.trim() };
}
