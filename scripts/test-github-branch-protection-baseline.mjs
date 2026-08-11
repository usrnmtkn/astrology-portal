#!/usr/bin/env node

import assert from "node:assert/strict";
import { compareProtectionToBaseline } from "./check-github-branch-protection-baseline.mjs";

const baseline = {
  required_approving_review_count: 1,
  dismiss_stale_reviews: false,
  require_code_owner_reviews: false,
  require_last_push_approval: false
};

const matching = compareProtectionToBaseline({ required_pull_request_reviews: baseline }, baseline);
assert.equal(matching.matches, true);
assert.deepEqual(matching.mismatches, []);

const drifted = compareProtectionToBaseline({
  required_pull_request_reviews: {
    ...baseline,
    required_approving_review_count: 0
  }
}, baseline);
assert.equal(drifted.matches, false);
assert.deepEqual(drifted.mismatches, [{
  key: "required_approving_review_count",
  expected: 1,
  actual: 0
}]);

console.log("GitHub branch-protection baseline checker passed.");
