import { reportFulfillmentConfig } from "./report-fulfillment-config.js";

export type ReportModelUsage = { inputTokens: number; cachedInputTokens?: number; outputTokens: number; totalTokens: number };
export type ReportModelResult<T> = { value: T; model: string; provider: string; responseId?: string; usage: ReportModelUsage };
export type ReportProviderAttempt = { provider: string; model: string; schemaName: string };
export const REPORT_MODEL_RESPONSE_RETRY_CAP = 3;
export class ReportModelResponseRejectedError extends Error {
  constructor(
    message: string,
    readonly usage?: ReportModelUsage,
    readonly responseId?: string
  ) {
    super(message);
    this.name = "ReportModelResponseRejectedError";
  }
}
export class ReportModelLifecycleError extends Error {
  constructor(stage: "before" | "after" | "error", cause: unknown) {
    super(`REPORT_MODEL_LIFECYCLE_${stage.toUpperCase()}: ${cause instanceof Error ? cause.message : "provider lifecycle hook failed"}`, { cause });
    this.name = "ReportModelLifecycleError";
  }
}
export type ReportModelCallInput<T> = {
  provider: string;
  model: string;
  prompt: string;
  schemaName: string;
  schema: Record<string, unknown>;
  validateResponse?: (value: T) => void;
  beforeProviderCall?: (attempt: ReportProviderAttempt) => Promise<void>;
  afterProviderCall?: (attempt: ReportProviderAttempt, result: ReportModelResult<T>) => Promise<void>;
  onProviderCallError?: (attempt: ReportProviderAttempt, error: unknown) => Promise<void>;
};
export type ReportModelCall = <T>(input: ReportModelCallInput<T>) => Promise<ReportModelResult<T>>;

function usage(inputTokens = 0, outputTokens = 0, cachedInputTokens = 0): ReportModelUsage {
  return { inputTokens, cachedInputTokens, outputTokens, totalTokens: inputTokens + outputTokens };
}

function outputText(payload: Record<string, unknown>) {
  if (typeof payload.output_text === "string") return payload.output_text;
  const output = Array.isArray(payload.output) ? payload.output : [];
  return output.flatMap((item) => {
    const content = item && typeof item === "object" && Array.isArray((item as { content?: unknown[] }).content)
      ? (item as { content: unknown[] }).content : [];
    return content.flatMap((entry) => entry && typeof entry === "object" && typeof (entry as { text?: unknown }).text === "string"
      ? [(entry as { text: string }).text] : []);
  }).join("\n");
}

async function callOpenAi<T>(input: {
  provider: string;
  model: string;
  prompt: string;
  schemaName: string;
  schema: Record<string, unknown>;
  validateResponse?: (value: T) => void;
  beforeProviderCall?: (attempt: ReportProviderAttempt) => Promise<void>;
  afterProviderCall?: (attempt: ReportProviderAttempt, result: ReportModelResult<T>) => Promise<void>;
  onProviderCallError?: (attempt: ReportProviderAttempt, error: unknown) => Promise<void>;
}): Promise<ReportModelResult<T>> {
  const attempt = { provider: input.provider, model: input.model, schemaName: input.schemaName };
  try { await input.beforeProviderCall?.(attempt); } catch (error) { throw new ReportModelLifecycleError("before", error); }
  let result: ReportModelResult<T>;
  try {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error("OPENAI_API_KEY is not configured.");
    const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: input.model,
      input: input.prompt,
      text: { format: { type: "json_schema", name: input.schemaName, strict: true, schema: input.schema } }
    })
  });
    const payload = await response.json() as Record<string, unknown> & { error?: { message?: string }; id?: string };
    if (!response.ok) throw new Error(payload.error?.message ?? `Report model call failed with ${response.status}.`);
    const rawUsage = payload.usage && typeof payload.usage === "object" ? payload.usage as Record<string, unknown> : {};
    const inputTokens = typeof rawUsage.input_tokens === "number" ? rawUsage.input_tokens : 0;
    const outputTokens = typeof rawUsage.output_tokens === "number" ? rawUsage.output_tokens : 0;
    const details = rawUsage.input_tokens_details && typeof rawUsage.input_tokens_details === "object"
      ? rawUsage.input_tokens_details as Record<string, unknown> : {};
    const cachedInputTokens = typeof details.cached_tokens === "number" ? details.cached_tokens : 0;
    const responseUsage = usage(inputTokens, outputTokens, cachedInputTokens);
    const text = outputText(payload);
    if (!text) throw new ReportModelResponseRejectedError(
      "Report model response contained no structured output.", responseUsage, payload.id
    );
    let value: T;
    try {
      value = JSON.parse(text) as T;
    } catch (error) {
      throw new ReportModelResponseRejectedError(
        `Report model response contained malformed JSON: ${error instanceof Error ? error.message : "parse failed"}.`,
        responseUsage,
        payload.id
      );
    }
    try {
      input.validateResponse?.(value);
    } catch (error) {
      throw new ReportModelResponseRejectedError(
        error instanceof Error ? error.message : "Report model response failed structured validation.",
        responseUsage,
        payload.id
      );
    }
    result = {
      value, model: input.model, provider: input.provider,
      responseId: payload.id, usage: responseUsage
    };
  } catch (error) {
    try { await input.onProviderCallError?.(attempt, error); } catch (hookError) { throw new ReportModelLifecycleError("error", hookError); }
    throw error;
  }
  try { await input.afterProviderCall?.(attempt, result); } catch (error) { throw new ReportModelLifecycleError("after", error); }
  return result;
}

async function callClaude<T>(input: {
  provider: string; model: string; prompt: string; schemaName: string; schema: Record<string, unknown>;
  validateResponse?: (value: T) => void;
  beforeProviderCall?: (attempt: ReportProviderAttempt) => Promise<void>;
  afterProviderCall?: (attempt: ReportProviderAttempt, result: ReportModelResult<T>) => Promise<void>;
  onProviderCallError?: (attempt: ReportProviderAttempt, error: unknown) => Promise<void>;
}): Promise<ReportModelResult<T>> {
  const attempt = { provider: input.provider, model: input.model, schemaName: input.schemaName };
  try { await input.beforeProviderCall?.(attempt); } catch (error) { throw new ReportModelLifecycleError("before", error); }
  let result: ReportModelResult<T>;
  try {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error("ANTHROPIC_API_KEY is not configured.");
    const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: input.model,
      max_tokens: 12_000,
      messages: [{ role: "user", content: input.prompt }],
      tools: [{ name: input.schemaName, description: "Return structured report fulfillment output.", input_schema: input.schema }],
      tool_choice: { type: "tool", name: input.schemaName }
    })
  });
    const payload = await response.json() as {
    id?: string; content?: Array<{ type?: string; name?: string; input?: T }>;
    usage?: { input_tokens?: number; output_tokens?: number }; error?: { message?: string };
  };
    if (!response.ok) throw new Error(payload.error?.message ?? `Anthropic report call failed with ${response.status}.`);
    const responseUsage = usage(payload.usage?.input_tokens, payload.usage?.output_tokens);
    const value = payload.content?.find((entry) => entry.type === "tool_use" && entry.name === input.schemaName)?.input;
    if (!value) throw new ReportModelResponseRejectedError(
      "Anthropic report response contained no structured output.", responseUsage, payload.id
    );
    try {
      input.validateResponse?.(value);
    } catch (error) {
      throw new ReportModelResponseRejectedError(
        error instanceof Error ? error.message : "Anthropic report response failed structured validation.",
        responseUsage,
        payload.id
      );
    }
    result = { value, model: input.model, provider: "claude", responseId: payload.id, usage: responseUsage };
  } catch (error) {
    try { await input.onProviderCallError?.(attempt, error); } catch (hookError) { throw new ReportModelLifecycleError("error", hookError); }
    throw error;
  }
  try { await input.afterProviderCall?.(attempt, result); } catch (error) { throw new ReportModelLifecycleError("after", error); }
  return result;
}

async function directReportModelCall<T>(input: {
  provider: string; model: string; prompt: string; schemaName: string; schema: Record<string, unknown>;
  validateResponse?: (value: T) => void;
  beforeProviderCall?: (attempt: ReportProviderAttempt) => Promise<void>;
  afterProviderCall?: (attempt: ReportProviderAttempt, result: ReportModelResult<T>) => Promise<void>;
  onProviderCallError?: (attempt: ReportProviderAttempt, error: unknown) => Promise<void>;
}) {
  if (input.provider === "openai") return callOpenAi<T>(input);
  if (input.provider === "claude" || input.provider === "anthropic") return callClaude<T>(input);
  throw new Error(`Unsupported report fulfillment provider '${input.provider}'.`);
}

export const callReportModel: ReportModelCall = async <T>(input: {
  provider: string; model: string; prompt: string; schemaName: string; schema: Record<string, unknown>;
  validateResponse?: (value: T) => void;
  beforeProviderCall?: (attempt: ReportProviderAttempt) => Promise<void>;
  afterProviderCall?: (attempt: ReportProviderAttempt, result: ReportModelResult<T>) => Promise<void>;
  onProviderCallError?: (attempt: ReportProviderAttempt, error: unknown) => Promise<void>;
}) => {
  try {
    return await directReportModelCall<T>(input);
  } catch (error) {
    if (error instanceof ReportModelLifecycleError || error instanceof ReportModelResponseRejectedError) throw error;
    const config = reportFulfillmentConfig();
    if (!config.fallbackProvider || !config.fallbackModel
      || (config.fallbackProvider === input.provider && config.fallbackModel === input.model)) throw error;
    return directReportModelCall<T>({ ...input, provider: config.fallbackProvider, model: config.fallbackModel });
  }
};

function responseRetryPrompt(prompt: string, reason: string, retryNumber: number) {
  return [
    prompt,
    "RESPONSE_REJECTION",
    `The previous structured response was rejected before downstream processing: ${reason}`,
    `Return the same requested output again, corrected to satisfy the schema and runtime contract. This is response retry ${retryNumber} of ${REPORT_MODEL_RESPONSE_RETRY_CAP}.`
  ].join("\n\n");
}

/**
 * Retries only model-response contract failures. Provider, model, schema, and
 * call purpose stay fixed; every retry remains an independently metered call.
 */
export function withReportModelResponseRetries(
  providerCall: ReportModelCall,
  retryCap = REPORT_MODEL_RESPONSE_RETRY_CAP
): ReportModelCall {
  return async <T>(input: ReportModelCallInput<T>) => {
    let prompt = input.prompt;
    for (let retry = 0; ; retry += 1) {
      try {
        return await providerCall<T>({ ...input, prompt });
      } catch (error) {
        if (!(error instanceof ReportModelResponseRejectedError) || retry >= retryCap) throw error;
        prompt = responseRetryPrompt(input.prompt, error.message, retry + 1);
      }
    }
  };
}

export function writerModelTarget() {
  const config = reportFulfillmentConfig();
  return { provider: config.writerProvider, model: config.writerModel };
}

export function judgeModelTarget() {
  const config = reportFulfillmentConfig();
  return { provider: config.judgeProvider, model: config.judgeModel };
}
