"use strict";

const {
  canonicalAstrologyReviewInstructions,
  canonicalAstrologyWritingInstructions
} = require("./canonicalInstructions.cjs");

const ROLES = new Set(["MEANING_PLANNER", "WRITER", "REVIEWER", "REVISER"]);

function instructionsForRole(role, taskInstructions = "") {
  if (!ROLES.has(role)) throw new Error(`Unknown astrology prose role: ${role}`);
  const canonical = role === "REVIEWER"
    ? canonicalAstrologyReviewInstructions
    : canonicalAstrologyWritingInstructions;
  return taskInstructions.trim() ? `${canonical}\n\n${taskInstructions.trim()}` : canonical;
}

async function callOpenAIResponses({
  apiKey,
  role,
  request,
  taskInstructions = "",
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
  const body = {
    ...request,
    instructions: instructionsForRole(role, taskInstructions)
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

module.exports = {
  callOpenAIResponses,
  instructionsForRole
};
