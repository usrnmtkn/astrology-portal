"use strict";

const { DEFAULT_GEMINI_MODEL, buildGeminiInteractionBody } = require("./geminiInteractions.cjs");

const PROVIDERS = new Set(["openai", "gemini"]);
const DEFAULTS = Object.freeze({
  writer: Object.freeze({ model: "gpt-5.6-sol", reasoningEffort: "xhigh", maxOutputTokens: 12000 }),
  judge: Object.freeze({ model: "gpt-5.6-terra", reasoningEffort: "medium", maxOutputTokens: 3000 })
});

function normalizeProviderConfig(value = {}, role = "writer") {
  if (!Object.hasOwn(DEFAULTS, role)) throw new Error(`Unknown offline model role: ${role}`);
  const provider = value.provider ?? "openai";
  if (!PROVIDERS.has(provider)) throw new Error(`Unsupported ${role} provider: ${provider}`);
  const roleDefaults = DEFAULTS[role];
  return {
    ...value,
    provider,
    model: value.model ?? (provider === "gemini" ? DEFAULT_GEMINI_MODEL : roleDefaults.model),
    reasoningEffort: value.reasoningEffort ?? roleDefaults.reasoningEffort,
    thinkingLevel: value.thinkingLevel ?? "high",
    maxOutputTokens: value.maxOutputTokens ?? roleDefaults.maxOutputTokens
  };
}

function buildOpenAIRequestBody({ config, input, systemInstruction = null, schema = null, stage = "draft" }) {
  const body = {
    model: config.model,
    reasoning: { effort: config.reasoningEffort },
    max_output_tokens: config.maxOutputTokens,
    input
  };
  if (systemInstruction) body.instructions = systemInstruction;
  if (schema) {
    body.text = { format: { type: "json_schema", name: `tldr_astro_${stage}`, strict: true, schema } };
  }
  return body;
}

function buildProviderRequest({ config: rawConfig, role, systemInstruction, input, schema = null, stage = role }) {
  const config = normalizeProviderConfig(rawConfig, role);
  return config.provider === "gemini"
    ? buildGeminiInteractionBody({
      model: config.model,
      systemInstruction,
      input,
      thinkingLevel: config.thinkingLevel
    })
    : buildOpenAIRequestBody({ config, input, systemInstruction, schema, stage });
}

module.exports = {
  DEFAULTS,
  PROVIDERS,
  buildOpenAIRequestBody,
  buildProviderRequest,
  normalizeProviderConfig
};
