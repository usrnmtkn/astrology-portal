import type { IncomingMessage, ServerResponse } from "node:http";
import { contentGenerationProvider } from "./_lib/provider-config.js";
import {
  FRIEND_TRANSIT_READING_PROMPT_VERSION,
  friendTransitReadingPrompt,
  friendTransitReadingRequestLock,
  validateFriendTransitReadingDraft,
  type FriendTransitReadingBrief,
  type FriendTransitReadingDraft
} from "./_lib/friend-transit-reading.js";
import { callOpenAIResponses } from "../src/astro-writing/openAIResponses.cjs";
import { validateCopy } from "../src/astro-writing/validateCopy.mjs";

type FriendTransitReadingRequest = {
  subjectType?: string;
  subjectId: string;
  targetDate?: string;
  facts?: Record<string, unknown>;
};

type SupabaseUserPayload = {
  id?: string;
  user?: { id?: string };
  error?: string;
  msg?: string;
};

type FriendTransitReadingRow = {
  id: string;
  content_key: string;
  surface: string;
  mode: string;
  status: string;
  event_type: string | null;
  target_date: string | null;
  headline: string | null;
  summary: string | null;
  body: string;
  sections: unknown | null;
  provider: string | null;
  model: string | null;
  updated_at: string;
};

type ProviderPayload = {
  headline?: unknown;
  tldr?: unknown;
  summary?: unknown;
  body?: unknown;
};

type GeneratedFriendTransitReading = FriendTransitReadingDraft & {
  model: string;
  responseId?: string;
  retryCount: number;
};

class FriendTransitReadingQualityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FriendTransitReadingQualityError";
  }
}

export const FRIEND_TRANSIT_READING_PROVIDER_SCHEMA = {
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

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

function supabaseUrl() {
  return process.env.SUPABASE_URL ?? requireEnv("VITE_SUPABASE_URL");
}

function serviceRoleKey() {
  return requireEnv("SUPABASE_SERVICE_ROLE_KEY");
}

function supabaseAnonKey() {
  return (
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
    process.env.VITE_SUPABASE_ANON_KEY ??
    serviceRoleKey()
  );
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify(body));
}

async function readJsonBody(req: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as FriendTransitReadingRequest;
}

function bearerToken(req: IncomingMessage) {
  const match = req.headers.authorization?.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? "";
}

async function requireAuthenticatedUser(req: IncomingMessage) {
  const token = bearerToken(req);
  if (!token) throw new Error("Sign in before generating personalized content.");

  const response = await fetch(`${supabaseUrl()}/auth/v1/user`, {
    headers: {
      apikey: supabaseAnonKey(),
      authorization: `Bearer ${token}`
    }
  });
  const payload = await response.json().catch(() => null) as SupabaseUserPayload | null;
  const userId = payload?.id ?? payload?.user?.id;
  if (!response.ok || !userId) {
    throw new Error(payload?.error ?? payload?.msg ?? "Could not verify signed-in user.");
  }
  return userId;
}

function generationProvider() {
  return contentGenerationProvider({ contentType: "friend_transit_reading" });
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
}) {
  return payload.content?.find((item) => (
    item.type === "tool_use" &&
    item.name === "tldr_astro_friend_transit_reading" &&
    item.input
  ))?.input;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function stripTldrPrefix(value: string) {
  return value.trim().replace(/^tldr\s*:\s*/iu, "").trim();
}

function normalizeProviderDraft(
  payload: ProviderPayload,
  expectedHeadline: string,
  model: string,
  responseId: string | undefined,
  retryCount: number
): GeneratedFriendTransitReading {
  const tldr = stripTldrPrefix(stringValue(payload.tldr) || stringValue(payload.summary));
  const body = stringValue(payload.body);
  if (!tldr || !body) {
    throw new FriendTransitReadingQualityError("The provider did not return a complete Friends reading.");
  }
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

function validateGeneratedReading(
  draft: GeneratedFriendTransitReading,
  brief: FriendTransitReadingBrief,
  expectedHeadline: string
) {
  if (draft.summary.trim().length < 40) {
    throw new FriendTransitReadingQualityError("Friends reading summary is too thin.");
  }
  if (draft.body.trim().length < 180) {
    throw new FriendTransitReadingQualityError("Friends reading body is too thin.");
  }
  if (draft.body.includes("—") || draft.summary.includes("—")) {
    throw new FriendTransitReadingQualityError("Friends reading used an em dash.");
  }

  const factLock = validateFriendTransitReadingDraft({ draft, brief, expectedHeadline });
  if (!factLock.passed) {
    throw new FriendTransitReadingQualityError(
      `Friends reading failed fact lock: ${factLock.issues.map((issue) => `${issue.code}: ${issue.message}`).join(" ")}`
    );
  }

  const writingValidation = validateCopy(draft, {
    validationProfile: "friends-transit",
    family: "friend-transit-reading",
    register: "third_person"
  });
  if (!writingValidation.passed) {
    throw new FriendTransitReadingQualityError(
      `Friends reading failed writing validation: ${writingValidation.violations.map((issue: { category?: string; detail?: string }) => `${issue.category ?? "rule"}: ${issue.detail ?? "failed"}`).join("; ")}`
    );
  }
}

function promptForAttempt(brief: FriendTransitReadingBrief, headline: string, feedback: string) {
  return [
    friendTransitReadingPrompt({ brief, headline }),
    "",
    "PROVIDER RESPONSE CONTRACT",
    "Return exactly four JSON fields: headline, tldr, summary, body.",
    "Do not return action, timing, sections, sceneLock, or astrologyDrilldown. The server supplies those empty fields after validation.",
    feedback ? `\nRETRY CORRECTION\n${feedback}` : ""
  ].filter(Boolean).join("\n");
}

async function generateOpenAI(
  brief: FriendTransitReadingBrief,
  headline: string,
  feedback: string,
  retryCount: number
) {
  const apiKey = requireEnv("OPENAI_API_KEY");
  const model = process.env.OPENAI_GENERATION_MODEL ?? process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
  const { response, payload } = await callOpenAIResponses({
    apiKey,
    role: "WRITER",
    surface: "friends",
    family: "friends-transit",
    request: {
      model,
      input: promptForAttempt(brief, headline, feedback),
      text: {
        format: {
          type: "json_schema",
          name: "tldr_astro_friend_transit_reading",
          strict: true,
          schema: FRIEND_TRANSIT_READING_PROVIDER_SCHEMA
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
  if (!response.ok) throw new Error(typedPayload.error?.message ?? `OpenAI Friends reading request failed with ${response.status}.`);
  const output = responseOutputText(typedPayload);
  if (!output) throw new Error("OpenAI Friends reading response did not include generated text.");
  const parsed = JSON.parse(output) as ProviderPayload;
  return normalizeProviderDraft(parsed, headline, model, typedPayload.id, retryCount);
}

async function generateClaude(
  brief: FriendTransitReadingBrief,
  headline: string,
  feedback: string,
  retryCount: number
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
      max_tokens: 2200,
      messages: [{
        role: "user",
        content: [{ type: "text", text: promptForAttempt(brief, headline, feedback) }]
      }],
      tools: [{
        name: "tldr_astro_friend_transit_reading",
        description: "Return the short TLDR Astro Friends transit reading.",
        input_schema: FRIEND_TRANSIT_READING_PROVIDER_SCHEMA
      }],
      tool_choice: { type: "tool", name: "tldr_astro_friend_transit_reading" }
    })
  });
  const payload = await response.json().catch(() => null) as {
    id?: string;
    content?: Array<{ type?: string; name?: string; input?: unknown }>;
    error?: { message?: string };
  } | null;
  if (!response.ok) throw new Error(payload?.error?.message ?? `Claude Friends reading request failed with ${response.status}.`);
  const toolInput = payload ? claudeToolInput(payload) : null;
  if (!toolInput || typeof toolInput !== "object" || Array.isArray(toolInput)) {
    throw new Error("Claude Friends reading response did not include generated content.");
  }
  return normalizeProviderDraft(toolInput as ProviderPayload, headline, model, payload?.id, retryCount);
}

function compactBriefForRecovery(brief: FriendTransitReadingBrief): FriendTransitReadingBrief {
  const primaryThemes = brief.primaryThemes.slice(0, 2);
  const longerCycles = brief.longerCycles.slice(0, 2);
  const relationshipActivations = brief.relationshipActivations.slice(0, 1);
  const houseContext = brief.houseContext.slice(0, 2);
  const activePatterns = brief.activePatterns.slice(0, 1);
  return {
    ...brief,
    primaryThemes,
    relationshipActivations,
    houseContext,
    longerCycles,
    activePatterns,
    counts: {
      ...brief.counts,
      primaryThemes: primaryThemes.length,
      relationshipActivations: relationshipActivations.length,
      houseContext: houseContext.length,
      longerCycles: longerCycles.length,
      activePatterns: activePatterns.length
    }
  };
}

async function generateReading(brief: FriendTransitReadingBrief, headline: string) {
  const provider = generationProvider();
  let feedback = "";
  let lastQualityError: FriendTransitReadingQualityError | null = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const draft = provider === "claude"
        ? await generateClaude(brief, headline, feedback, attempt)
        : await generateOpenAI(brief, headline, feedback, attempt);
      validateGeneratedReading(draft, brief, headline);
      return { draft, provider };
    } catch (error) {
      if (!(error instanceof FriendTransitReadingQualityError)) throw error;
      lastQualityError = error;
      feedback = `${error.message}\nRewrite the short reading from the same governed brief. Do not add new facts, examples, sections, or technical claims.`;
    }
  }

  const recoveryBrief = compactBriefForRecovery(brief);
  const recoveryFeedback = [
    lastQualityError?.message ?? "The earlier draft did not pass the Friends reading quality lock.",
    "Final recovery attempt: use only the strongest evidence in this reduced governed brief.",
    "Keep the synthesis plain and concise. Do not add facts, examples, sections, dates, houses, signs, or technical claims that are not explicitly supplied."
  ].join("\n");
  try {
    const draft = provider === "claude"
      ? await generateClaude(recoveryBrief, headline, recoveryFeedback, 2)
      : await generateOpenAI(recoveryBrief, headline, recoveryFeedback, 2);
    validateGeneratedReading(draft, recoveryBrief, headline);
    return { draft, provider };
  } catch (error) {
    if (!(error instanceof FriendTransitReadingQualityError)) throw error;
    throw error;
  }
}

async function existingReading(userId: string, subjectId: string, contentKey: string, targetDate: string) {
  const params = new URLSearchParams({
    user_id: `eq.${userId}`,
    subject_type: "eq.friend_transit_reading",
    subject_id: `eq.${subjectId}`,
    content_key: `eq.${contentKey}`,
    target_date: `eq.${targetDate}`,
    mode: "eq.in_depth",
    select: "id,content_key,surface,mode,status,event_type,target_date,headline,summary,body,sections,provider,model,updated_at",
    order: "updated_at.desc",
    limit: "1"
  });
  const response = await fetch(`${supabaseUrl()}/rest/v1/user_generated_interpretations?${params.toString()}`, {
    headers: {
      apikey: serviceRoleKey(),
      authorization: `Bearer ${serviceRoleKey()}`
    }
  });
  const payload = await response.json().catch(() => null) as FriendTransitReadingRow[] | null;
  if (!response.ok) throw new Error(`Supabase Friends reading lookup failed with ${response.status}.`);
  return payload?.[0] ?? null;
}

async function saveReading(
  userId: string,
  subjectId: string,
  targetDate: string,
  locked: ReturnType<typeof friendTransitReadingRequestLock>,
  generated: GeneratedFriendTransitReading,
  provider: "openai" | "claude"
) {
  const response = await fetch(`${supabaseUrl()}/rest/v1/user_generated_interpretations?on_conflict=user_id,subject_type,subject_id,content_key,target_date,mode`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey(),
      authorization: `Bearer ${serviceRoleKey()}`,
      "content-type": "application/json",
      prefer: "resolution=merge-duplicates,return=representation"
    },
    body: JSON.stringify({
      user_id: userId,
      subject_type: "friend_transit_reading",
      subject_id: subjectId,
      content_key: locked.contentKey,
      surface: locked.surface,
      mode: locked.mode,
      status: "DRAFT",
      event_type: locked.eventType,
      target_date: targetDate,
      facts: locked.facts,
      knowledge_ids: locked.knowledgeIds,
      source_snapshot: locked.sourceSnapshot,
      prompt_version: FRIEND_TRANSIT_READING_PROMPT_VERSION,
      provider,
      model: generated.model,
      headline: generated.headline,
      summary: generated.summary,
      body: generated.body,
      sections: { sections: [], sceneLock: null, astrologyDrilldown: null },
      response_id: generated.responseId,
      error: null
    })
  });
  const payload = await response.json().catch(() => null) as FriendTransitReadingRow[] | null;
  if (!response.ok) throw new Error(`Supabase Friends reading save failed with ${response.status}.`);
  return payload ?? [];
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Use POST." });
    return;
  }

  try {
    const userId = await requireAuthenticatedUser(req);
    const input = await readJsonBody(req);
    if (input.subjectType !== "friend_transit_reading") {
      sendJson(res, 400, { ok: false, error: "Unsupported reading request." });
      return;
    }

    const subjectId = stringValue(input.subjectId);
    const targetDate = stringValue(input.targetDate);
    const locked = friendTransitReadingRequestLock({
      brief: input.facts?.friendTransitsBrief,
      subjectId,
      targetDate
    });

    const existing = await existingReading(userId, subjectId, locked.contentKey, targetDate);
    if (existing && ["DRAFT", "REVIEWED", "LIVE"].includes(existing.status) && existing.body.trim()) {
      sendJson(res, 200, { ok: true, reused: true, contentKey: locked.contentKey, saved: [existing] });
      return;
    }

    const { draft, provider } = await generateReading(locked.brief, locked.headline);
    const saved = await saveReading(userId, subjectId, targetDate, locked, draft, provider);
    sendJson(res, 200, { ok: true, contentKey: locked.contentKey, generated: draft, saved });
  } catch (error) {
    console.error("generate-friend-transit-reading failed", error);
    sendJson(res, 500, {
      ok: false,
      errorType: "paid_reading_unavailable",
      error: "This paid reading is currently unavailable."
    });
  }
}
