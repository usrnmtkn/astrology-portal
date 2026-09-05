import {
  renderEffectiveRulesForPrompt,
  tierForFindingCategory
} from "./effectiveRules.mjs";

export function effectiveRulePrompt(baseInstructions, { surface = "generic", family = "" } = {}) {
  const base = String(baseInstructions ?? "").trim();
  const rules = renderEffectiveRulesForPrompt({ surface, family }).trim();
  return [base, rules].filter(Boolean).join("\n\n");
}

export function findingGovernanceTier(category, { surface = "generic", family = "" } = {}) {
  return tierForFindingCategory(String(category ?? ""), { surface, family });
}

export function governedFindingSeverity(category, context = {}) {
  return findingGovernanceTier(category, context) === "blocking" ? "blocking" : "nonblocking";
}

export function governValidationResult(result, context = {}) {
  const blockingViolations = [];
  const advisoryFindings = [...(result?.advisories ?? [])];

  for (const finding of result?.violations ?? []) {
    const governanceTier = findingGovernanceTier(finding.category, context);
    if (governanceTier === "blocking") {
      blockingViolations.push({ ...finding, governanceTier });
    } else {
      advisoryFindings.push({
        ...finding,
        advisory: true,
        ownerReviewRequired: true,
        governanceTier
      });
    }
  }

  return {
    ...result,
    passed: blockingViolations.length === 0,
    violations: blockingViolations,
    advisories: advisoryFindings,
    governance: {
      authority: "owner-only",
      modelJudges: "advisory-only",
      blockingViolationCount: blockingViolations.length,
      advisoryFindingCount: advisoryFindings.length
    }
  };
}

export function advisoryModelViolation(violation) {
  return {
    ...violation,
    severity: "nonblocking",
    governanceTier: "advisory",
    ownerReviewRequired: true
  };
}
