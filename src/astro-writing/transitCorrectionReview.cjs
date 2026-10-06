"use strict";

// This is permission to diagnose a complete candidate, never to serve it.
// Only lexical findings may accompany a passed fact/register/shape check.
function isTransitCorrectionReview(value) {
  return value?.purpose === "transit-report-correction-review-v1"
    && value.checked === true && value.passed === false && value.factLockPassed === true
    && value.shapePassed === true && /^[a-f0-9]{64}$/u.test(value.draftSha256 ?? "")
    && Array.isArray(value.violations) && value.violations.length > 0
    && value.violations.every(v => v?.category === "banned_language"
      && typeof v.detail === "string" && v.detail.trim().length > 0);
}

module.exports = { isTransitCorrectionReview };
