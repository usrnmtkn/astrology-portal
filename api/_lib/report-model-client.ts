import { reportFulfillmentConfig } from "./report-fulfillment-config.ts";

export type ReportModelUsage = { inputTokens: number; outputTokens: number; totalTokens: number };
export type ReportModelResult<T> = { value: T; model: string; provider: string; responseId?: string; usage: ReportModelUsage };
export type ReportModelCall = <T>(input: {
  provider: string;
  model: string;
  prompt: string;
  schemaName: string;
  schema: Record<string, unknown>;
}) => Promise<ReportModelResult<T>>;

function usage(inputTokens = 0, outputTokens = 0): ReportModelUsage {
  return { inputTokens, outputTokens, totalTokens: inputTokens + outputTokens };
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
}): Promise<ReportModelResult<T>> {
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
  const text = outputText(payload);
  if (!text) throw new Error("Report model response contained no structured output.");
  const rawUsage = payload.usage && typeof payload.usage === "object" ? payload.usage as Record<string, unknown> : {};
  const inputTokens = typeof rawUsage.input_tokens === "number" ? rawUsage.input_tokens : 0;
  const outputTokens = typeof rawUsage.output_tokens === "number" ? rawUsage.output_tokens : 0;
  return {
    value: JSON.parse(text) as T,
    model: input.model,
    provider: input.provider,
    responseId: payload.id,
    usage: usage(inputTokens, outputTokens)
  };
}

async function callClaude<T>(input: {
  provider: string; model: string; prompt: string; schemaName: string; schema: Record<string, unknown>;
}): Promise<ReportModelResult<T>> {
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
  const value = payload.content?.find((entry) => entry.type === "tool_use" && entry.name === input.schemaName)?.input;
  if (!value) throw new Error("Anthropic report response contained no structured output.");
  return {
    value, model: input.model, provider: "claude", responseId: payload.id,
    usage: usage(payload.usage?.input_tokens, payload.usage?.output_tokens)
  };
}

async function directReportModelCall<T>(input: {
  provider: string; model: string; prompt: string; schemaName: string; schema: Record<string, unknown>;
}) {
  if (input.provider === "openai") return callOpenAi<T>(input);
  if (input.provider === "claude" || input.provider === "anthropic") return callClaude<T>(input);
  throw new Error(`Unsupported report fulfillment provider '${input.provider}'.`);
}

export const callReportModel: ReportModelCall = async <T>(input: {
  provider: string; model: string; prompt: string; schemaName: string; schema: Record<string, unknown>;
}) => {
  try {
    return await directReportModelCall<T>(input);
  } catch (error) {
    const config = reportFulfillmentConfig();
    if (!config.fallbackProvider || !config.fallbackModel
      || (config.fallbackProvider === input.provider && config.fallbackModel === input.model)) throw error;
    return directReportModelCall<T>({ ...input, provider: config.fallbackProvider, model: config.fallbackModel });
  }
};

export function writerModelTarget() {
  const config = reportFulfillmentConfig();
  return { provider: config.writerProvider, model: config.writerModel };
}

export function judgeModelTarget() {
  const config = reportFulfillmentConfig();
  return { provider: config.judgeProvider, model: config.judgeModel };
}
