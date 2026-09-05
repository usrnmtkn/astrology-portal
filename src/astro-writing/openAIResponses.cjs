"use strict";

const {
  candidateCardAstrologyWritingInstructions,
  canonicalAstrologyReviewInstructions,
  canonicalAstrologyWritingInstructions,
  coldRenderedProseReviewInstructions
} = require("./canonicalInstructions.cjs");
const { renderEffectiveRulesForPrompt } = require("./effectiveRules.cjs");
const { assertProductionPreCallGate } = require("./productionPreCallGate.cjs");

const CARD_REVIEWER_V3_CANDIDATE_INSTRUCTIONS = `ROLE: TLDR ASTRO CARD JUDGE V3 CANDIDATE

This role is calibration-only and is not active in production. Apply only the supplied CARD-surface rubric and same-surface comparison evidence. Return findings only. Never return a verdict, severity, score, or replacement prose.`;

const ROLES = new Set(["MEANING_PLANNER", "WRITER", "COLD_REVIEWER", "REVIEWER", "REVISER", "CARD_WRITER_V3", "CARD_REVISER_V3", "CARD_REVIEWER_V3"]);
const EFFECTIVE_RULE_ROLES = new Set(["WRITER", "REVIEWER", "REVISER", "CARD_WRITER_V3", "CARD_REVISER_V3"]);

function instructionsForRole(role, taskInstructions = "") {
  if (!ROLES.has(role)) throw new Error(`Unknown astrology prose role: ${role}`);
  const canonical = role === "COLD_REVIEWER"
    ? coldRenderedProseReviewInstructions
    : role === "CARD_REVIEWER_V3"
    ? CARD_REVIEWER_V3_CANDIDATE_INSTRUCTIONS
    : role === "CARD_WRITER_V3" || role === "CARD_REVISER_V3"
      ? candidateCardAstrologyWritingInstructions
      : role === "REVIEWER"
        ? canonicalAstrologyReviewInstructions
        : canonicalAstrologyWritingInstructions;
  return taskInstructions.trim() ? `${canonical}\n\n${taskInstructions.trim()}` : canonical;
}

function inferredPromptContext(request, { surface = "", family = "" } = {}) {
  const input = typeof request?.input === "string" ? request.input : JSON.stringify(request?.input ?? "");
  const inferredSurface = surface
    || input.match(/(?:^|\n\n)SURFACE\n([^\n]+)/u)?.[1]?.trim()
    || input.match(/"surface"\s*:\s*"([^"]+)"/u)?.[1]
    || "";
  const inferredFamily = family
    || input.match(/(?:^|\n\n)CONTENT FAMILY\n([^\n]+)/u)?.[1]?.trim()
    || input.match(/"family"\s*:\s*"([^"]+)"/u)?.[1]
    || "";
  return { surface: inferredSurface, family: inferredFamily };
}

function governedInstructionsForRole(role, {
  taskInstructions = "",
  governedInstructions = "",
  surface = "",
  family = ""
} = {}) {
  const canonical = instructionsForRole(role);
  const supplied = String(governedInstructions ?? "").trim();
  if (supplied) {
    if (!supplied.startsWith(canonical)) {
      throw new Error("Governed astrology instructions must preserve the canonical role instructions as their prefix.");
    }
    return taskInstructions.trim() ? `${supplied}\n\n${taskInstructions.trim()}` : supplied;
  }
  if (!EFFECTIVE_RULE_ROLES.has(role)) return instructionsForRole(role, taskInstructions);
  const resolvedSurface = surface || (role.startsWith("CARD_") ? "card" : "generic");
  const effectiveRules = renderEffectiveRulesForPrompt({ surface: resolvedSurface, family }).trim();
  const reviewerGovernance = role === "REVIEWER"
    ? "MODEL REVIEW GOVERNANCE: Every model-authored editorial finding is advisory evidence for the owner. Do not claim approval authority, and do not use severity to authorize an automatic rewrite."
    : "";
  const base = [canonical, effectiveRules, reviewerGovernance].filter(Boolean).join("\n\n");
  return taskInstructions.trim() ? `${base}\n\n${taskInstructions.trim()}` : base;
}

async function callOpenAIResponses({
  apiKey,
  role,
  request,
  taskInstructions = "",
  governedInstructions = "",
  surface = "",
  family = "",
  fetchImpl = globalThis.fetch
}) {
  if (!apiKey) throw new Error("OpenAI Responses request requires an API key.");
  if (typeof fetchImpl !== "function") throw new Error("OpenAI Responses request requires fetch.");
  if (!request || typeof request !== "object") throw new Error("OpenAI Responses request body is required.");
  if (Object.hasOwn(request, "instructions")) {
    throw new Error("Call sites may not override canonical astrology instructions.");
  }
  if (Object.hasOwn(request, "previous_response_id")) {
    throw new Error("Astrology prose calls may not rely on previous-response instruction persistence.");
  }
  const context = inferredPromptContext(request, { surface, family });
  const body = {
    ...request,
    instructions: governedInstructionsForRole(role, {
      taskInstructions,
      governedInstructions,
      surface: context.surface,
      family: context.family
    })
  };
  const response = await fetchImpl("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });
  const payload = await response.json();
  return { response, payload, role, instructions: body.instructions };
}

async function callGovernedOpenAIResponses({
  productionGate,
  productionInput,
  ...requestInput
}) {
  const governedClearance = assertProductionPreCallGate(productionGate, {
    role: requestInput.role,
    input: productionInput
  });
  const result = await callOpenAIResponses(requestInput);
  return { ...result, governedClearance };
}

module.exports = {
  CARD_REVIEWER_V3_CANDIDATE_INSTRUCTIONS,
  callGovernedOpenAIResponses,
  callOpenAIResponses,
  governedInstructionsForRole,
  inferredPromptContext,
  instructionsForRole
};
