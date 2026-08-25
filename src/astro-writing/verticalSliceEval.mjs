import { deterministicEditorialReview } from "./reviewDraft.mjs";

function signFromFixtureId(fixtureId) {
  return String(fixtureId).match(/^neg-([a-z]+)-/u)?.[1] ?? null;
}

function evaluateGold(fixture) {
  const fields = ["tagline", "hook", "lived", "turn"];
  const missing = fields.filter((field) => typeof fixture[field] !== "string" || !fixture[field].trim());
  const passed = fixture.status === "owner-locked" && fixture.expected === "PASS" && missing.length === 0;
  return {
    fixtureId: fixture.fixture_id,
    expected: "PASS",
    actual: passed ? "PASS" : "FAIL",
    categories: missing.map((field) => `missing_${field}`),
    authority: "exact-owner-locked"
  };
}

function evaluateNegative(fixture) {
  const review = deterministicEditorialReview({
    draft: { body: fixture.bad_text },
    plan: { sign: signFromFixtureId(fixture.fixture_id), house: null },
    context: { corrections: [] },
    family: fixture.content_family,
    register: "collective",
    expectedPlaceholders: [],
    requiredFields: ["body"],
    protectedOwnerLines: [],
    validationProfile: "sky-placement"
  });
  const categories = [...new Set(review.violations.map((item) => item.category))];
  const missed = fixture.expected_failures.filter((category) => !categories.includes(category));
  const matchingFindings = review.violations.filter((item) => fixture.expected_failures.includes(item.category));
  return {
    fixtureId: fixture.fixture_id,
    expected: "FLAG",
    actual: review.decision,
    expectedCategories: fixture.expected_failures,
    categories,
    missed,
    detectionTier: matchingFindings.some((item) => item.severity === "blocking") ? "blocking" : "advisory",
    passed: missed.length === 0
  };
}

export function evaluateLilithVerticalSlice({ gold, negatives }) {
  const goldResults = gold.map(evaluateGold);
  const negativeResults = negatives.map(evaluateNegative);
  const falsePositives = goldResults.filter((result) => result.actual !== "PASS").length;
  const falseNegatives = negativeResults.filter((result) => !result.passed).length;
  return {
    goldResults,
    negativeResults,
    goldPassed: goldResults.length - falsePositives,
    negativePassed: negativeResults.length - falseNegatives,
    falsePositives,
    falseNegatives,
    blockingRegressions: falsePositives,
    passed: goldResults.length === 12
      && negativeResults.length === 8
      && falsePositives === 0
      && falseNegatives === 0
  };
}
