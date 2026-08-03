"use strict";

function editorialGate({ score, disagreement = false, contractViolation = false, exactApprovedGold = false } = {}) {
  if (exactApprovedGold) {
    return {
      gate: "auto-publish",
      recommendation: "approved-exact-match",
      approvalSource: "approved-exact-match"
    };
  }

  if (disagreement) {
    return {
      gate: "human-review",
      recommendation: "resolve-judge-disagreement",
      approvalSource: "llm-advisory"
    };
  }

  if (contractViolation) {
    return {
      gate: "human-review",
      recommendation: "resolve-judge-contract-violation",
      approvalSource: "llm-advisory"
    };
  }

  if (score >= 3) {
    return {
      gate: "human-review",
      recommendation: "approve",
      approvalSource: "llm-advisory"
    };
  }

  if (score === 2) {
    return {
      gate: "human-review",
      recommendation: "revise",
      approvalSource: "llm-advisory"
    };
  }

  return {
    gate: "regenerate",
    recommendation: "regenerate",
    approvalSource: "llm-advisory"
  };
}

module.exports = { editorialGate };
