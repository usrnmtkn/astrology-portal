import { contentGenerationProvider } from "./provider-config.js";
import { callOpenAIResponses } from "../../src/astro-writing/openAIResponses.cjs";

export type TransitReadingProvider = "openai" | "claude";

export type GeneratedTransitReadingDraft = {
  headline: string;
  tldr: string;
  summary: string;
  body: string;
  action: string;
  timing: string;
  sections: [];
  model: string;
  responseId?: string;
  retryCount: number;
};

export type TransitReadingValidationResult = {
  passed: boolean;
  message?: string;
};

export type GovernedTransitReadingOptions<TBrief> = {
  brief: TBrief;
  headline: string;
  contentType: string;
  surface: "friends" | "you";
  family: string;
  schemaName: string;
  toolDescription: string;
  promptForAttempt: (brief: TBrief, headline: string, feedback: string) => string;
  validate: (draft: GeneratedTransitReadingDraft, brief: TBrief, headline: string) => TransitReadingValidationResult;
  compactBriefForRecovery: (brief: TBrief) => TBrief;
  minSummaryLength?: number;
  minBodyLength?: number;
  maxBodyLength?: number;
  claudeMaxTokens?: number;
  recoveryLabel: string;
};

export const TRANSIT_READING_PROVIDER_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["headline", "tldr", "summary", "body"],
  properties: {
    headline: { type: "string" },
    tldr: { type: "string" },
    summary: { type: "string" },
    body: { type: "string" }
  }
} as const;

class TransitReadingQualityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TransitReadingQualityError";
  }
}

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function stripTldrPrefix(value: string) {
  return value.trim().replace(/^tldr\s*:\s*/iu, "").trim();
}

function responseOutputText(payload: {
  output_text?: string;
  output?: Array<{ content?: Array<{ text?: string }> }>;
}) {
  if (payload.output_text) return payload.output_text;
  return payload.output
    ?.flatMap((item) => item.content ?? [])
    .map((content) => content.text)
    .filter((text): text is string => Boolean(text))
    .join("\n")
    .trim();
}

function claudeToolInput(payload: {
  content?: Array<{ type?: string; name?: string; input?: unknown }>;
}, schemaName: string) {
  return payload.content?.find((item) => (
    item.type === "tool_use" && item.name === schemaName && item.input
  ))?.input;
}

function normalizeProviderDraft(
  payload: Record<string, unknown>,
  expectedHeadline: string,
  model: string,
  responseId: string | undefined,
  retryCount: number
): GeneratedTransitReadingDraft {
  const tldr = stripTldrPrefix(stringValue(payload.tldr) || stringValue(payload.summary));
  const body = stringValue(payload.body);
  if (!tldr || !body) throw new TransitReadingQualityError("The provider did not return a complete transit reading.");
  return {
    headline: expectedHeadline,
    tldr,
    summary: tldr,
    body,
    action: "",
    timing: "",
    sections: [],
    model,
    responseId,
    retryCount
  };
}

function validateShape<TBrief>(draft: GeneratedTransitReadingDraft, options: GovernedTransitReadingOptions<TBrief>, brief: TBrief) {
  const minSummaryLength = options.minSummaryLength ?? 40;
  const minBodyLength = options.minBodyLength ?? 180;
  if (draft.summary.trim().length < minSummaryLength) {
    throw new TransitReadingQualityError(`${options.recoveryLabel} summary is too thin.`);
  }
  if (draft.body.trim().length < minBodyLength) {
    throw new TransitReadingQualityError(`${options.recoveryLabel} body is too thin.`);
  }
  if (options.maxBodyLength && draft.body.trim().length > options.maxBodyLength) {
    throw new TransitReadingQualityError(`${options.recoveryLabel} body is too long.`);
  }
  if (draft.body.includes("—") || draft.summary.includes("—")) {
    throw new TransitReadingQualityError(`${options.recoveryLabel} used an em dash.`);
  }
  const validation = options.validate(draft, brief, options.headline);
  if (!validation.passed) {
    throw new TransitReadingQualityError(validation.message || `${options.recoveryLabel} failed its governed validation.`);
  }
}

async function generateOpenAI<TBrief>(
  brief: TBrief,
  feedback: string,
  retryCount: number,
  options: GovernedTransitReadingOptions<TBrief>
) {
  const apiKey = requireEnv("OPENAI_API_KEY");
  const model = process.env.OPENAI_GENERATION_MODEL ?? process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
  const { response, payload } = await callOpenAIResponses({
    apiKey,
    role: "WRITER",
    surface: options.surface,
    family: options.family,
    request: {
      model,
      input: options.promptForAttempt(brief, options.headline, feedback),
      text: {
        format: {
          type: "json_schema",
          name: options.schemaName,
          strict: true,
          schema: TRANSIT_READING_PROVIDER_SCHEMA
        }
      }
    }
  });
  const typedPayload = payload as {
    id?: string;
    output_text?: string;
    output?: Array<{ content?: Array<{ text?: string }> }>;
    error?: { message?: string };
  };
  if (!response.ok) throw new Error(typedPayload.error?.message ?? `OpenAI transit reading request failed with ${response.status}.`);
  const output = responseOutputText(typedPayload);
  if (!output) throw new Error("OpenAI transit reading response did not include generated text.");
  return normalizeProviderDraft(JSON.parse(output) as Record<string, unknown>, options.headline, model, typedPayload.id, retryCount);
}

async function generateClaude<TBrief>(
  brief: TBrief,
  feedback: string,
  retryCount: number,
  options: GovernedTransitReadingOptions<TBrief>
) {
  const apiKey = requireEnv("ANTHROPIC_API_KEY");
  const model = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model,
      max_tokens: options.claudeMaxTokens ?? 2200,
      messages: [{
        role: "user",
        content: [{ type: "text", text: options.promptForAttempt(brief, options.headline, feedback) }]
      }],
      tools: [{
        name: options.schemaName,
        description: options.toolDescription,
        input_schema: TRANSIT_READING_PROVIDER_SCHEMA
      }],
      tool_choice: { type: "tool", name: options.schemaName }
    })
  });
  const payload = await response.json().catch(() => null) as {
    id?: string;
    content?: Array<{ type?: string; name?: string; input?: unknown }>;
    error?: { message?: string };
  } | null;
  if (!response.ok) throw new Error(payload?.error?.message ?? `Claude transit reading request failed with ${response.status}.`);
  const toolInput = payload ? claudeToolInput(payload, options.schemaName) : null;
  if (!toolInput || typeof toolInput !== "object" || Array.isArray(toolInput)) {
    throw new Error("Claude transit reading response did not include generated content.");
  }
  return normalizeProviderDraft(toolInput as Record<string, unknown>, options.headline, model, payload?.id, retryCount);
}

async function providerDraft<TBrief>(
  provider: TransitReadingProvider,
  brief: TBrief,
  feedback: string,
  retryCount: number,
  options: GovernedTransitReadingOptions<TBrief>
) {
  return provider === "claude"
    ? generateClaude(brief, feedback, retryCount, options)
    : generateOpenAI(brief, feedback, retryCount, options);
}

export async function generateGovernedTransitReading<TBrief>(options: GovernedTransitReadingOptions<TBrief>) {
  const provider = contentGenerationProvider({ contentType: options.contentType }) as TransitReadingProvider;
  let feedback = "";
  let lastQualityError: TransitReadingQualityError | null = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const draft = await providerDraft(provider, options.brief, feedback, attempt, options);
      validateShape(draft, options, options.brief);
      return { draft, provider };
    } catch (error) {
      if (!(error instanceof TransitReadingQualityError)) throw error;
      lastQualityError = error;
      feedback = `${error.message}\nRewrite the reading from the same governed brief. Do not add new facts, examples, sections, or technical claims.`;
    }
  }

  const recoveryBrief = options.compactBriefForRecovery(options.brief);
  const recoveryFeedback = [
    lastQualityError?.message ?? `The earlier ${options.recoveryLabel} draft did not pass the quality lock.`,
    "Final recovery attempt: use only the strongest evidence in this reduced governed brief.",
    "Keep the synthesis plain and concise. Do not add facts, examples, sections, dates, houses, signs, or technical claims that are not explicitly supplied."
  ].join("\n");
  const draft = await providerDraft(provider, recoveryBrief, recoveryFeedback, 2, options);
  validateShape(draft, options, recoveryBrief);
  return { draft, provider };
}
