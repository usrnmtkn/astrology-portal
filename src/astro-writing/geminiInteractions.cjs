"use strict";

const GEMINI_INTERACTIONS_URL = "https://generativelanguage.googleapis.com/v1beta/interactions";
const DEFAULT_GEMINI_MODEL = "gemini-3.6-flash";

class GeminiInteractionError extends Error {
  constructor(message, { status = null, code = null } = {}) {
    super(message);
    this.name = "GeminiInteractionError";
    this.status = status;
    this.code = code;
  }
}

function buildGeminiInteractionBody({
  model = DEFAULT_GEMINI_MODEL,
  systemInstruction,
  input,
  thinkingLevel = "high"
}) {
  if (!model || typeof model !== "string") throw new Error("Gemini model must be a non-empty string.");
  if (!systemInstruction || typeof systemInstruction !== "string") {
    throw new Error("Gemini system_instruction must be a non-empty string.");
  }
  if (typeof input !== "string") throw new Error("Gemini input must be a string.");
  if (!thinkingLevel || typeof thinkingLevel !== "string") {
    throw new Error("Gemini thinking_level must be a non-empty string.");
  }
  return {
    model,
    system_instruction: systemInstruction,
    input,
    generation_config: { thinking_level: thinkingLevel },
    store: false
  };
}

function textFromBlock(block) {
  if (typeof block === "string") return block;
  if (!block || typeof block !== "object") return "";
  if (typeof block.text === "string") return block.text;
  if (typeof block.output_text === "string") return block.output_text;
  return "";
}

function textFromGroup(group) {
  if (!group || typeof group !== "object") return textFromBlock(group);
  for (const key of ["content", "parts", "blocks"]) {
    if (!Array.isArray(group[key])) continue;
    const text = group[key].map(textFromBlock).filter(Boolean).join("");
    if (text) return text;
  }
  return textFromBlock(group);
}

function geminiOutputText(payload) {
  if (typeof payload?.output_text === "string") return payload.output_text;
  // The Interactions API replaced the legacy `outputs` array with `steps` in
  // June 2026. Keep both shapes readable so preserved fixtures and current
  // responses use the same adapter.
  for (const key of ["steps", "outputs", "output", "candidates"]) {
    if (!Array.isArray(payload?.[key])) continue;
    for (let index = payload[key].length - 1; index >= 0; index -= 1) {
      const text = textFromGroup(payload[key][index]);
      if (text) return text;
    }
  }
  return textFromGroup(payload);
}

async function callGeminiInteractions({
  apiKey,
  model = DEFAULT_GEMINI_MODEL,
  systemInstruction,
  input,
  thinkingLevel = "high",
  fetchImpl = globalThis.fetch
}) {
  if (!apiKey) throw new Error("Gemini Interactions request requires an API key.");
  if (typeof fetchImpl !== "function") throw new Error("Gemini Interactions request requires fetch.");
  const body = buildGeminiInteractionBody({ model, systemInstruction, input, thinkingLevel });
  const response = await fetchImpl(GEMINI_INTERACTIONS_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-goog-api-key": apiKey
    },
    body: JSON.stringify(body)
  });
  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new GeminiInteractionError(`Gemini interaction failed with HTTP ${response.status}.`, {
      status: response.status
    });
  }
  if (!response.ok) {
    const code = payload?.error?.status ?? payload?.error?.code ?? null;
    const detail = payload?.error?.message;
    throw new GeminiInteractionError(
      detail ? `Gemini interaction failed: ${detail}` : `Gemini interaction failed with HTTP ${response.status}.`,
      { status: response.status, code }
    );
  }
  const text = geminiOutputText(payload);
  if (!text) throw new GeminiInteractionError("Gemini interaction returned no text output.", { status: response.status });
  const rawStatus = payload.status ?? "completed";
  const status = ["completed", "succeeded"].includes(String(rawStatus).toLowerCase()) ? "completed" : rawStatus;
  return {
    response,
    payload,
    body,
    text,
    responseId: payload.id ?? payload.interaction_id ?? null,
    status,
    usage: payload.usage ?? payload.usage_metadata ?? null,
    model: payload.model ?? payload.model_version ?? model
  };
}

module.exports = {
  DEFAULT_GEMINI_MODEL,
  GEMINI_INTERACTIONS_URL,
  GeminiInteractionError,
  buildGeminiInteractionBody,
  callGeminiInteractions,
  geminiOutputText
};
